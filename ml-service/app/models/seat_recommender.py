"""
ML 기반 좌석 추천 모델 (v2)

개선 사항:
- GradientBoosting 모델 사용 (RandomForest 대비 성능 향상)
- 컨텍스트 피처 추가 (파트 비율, 총 인원)
- 파트 규칙 피처 추가 (앞/뒤줄, 좌/우 파트)
- 하이브리드 추천 (규칙 기반 + ML)
- 근접 정확도 메트릭 (±1행, ±2열)
- 파트장 위치 피처 제외
- 키/경력은 미래 대비용으로 유지 (현재 사용 안함)
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os
from typing import List, Dict, Tuple, Optional, Any

from app.config import settings


# 파트별 배치 규칙 (ML 데이터 분석 결과)
PART_RULES = {
    "SOPRANO": {"side": "left", "preferred_rows": [1, 2, 3], "overflow_rows": [4, 5, 6]},
    "ALTO": {"side": "right", "preferred_rows": [1, 2, 3], "overflow_rows": [4]},  # 5-6행 금지
    "TENOR": {"side": "left", "preferred_rows": [4, 5, 6], "overflow_rows": []},
    "BASS": {"side": "right", "preferred_rows": [4, 5, 6], "overflow_rows": []},
}


class SeatRecommender:
    """GradientBoosting 기반 좌석 추천 모델 (v2)"""

    def __init__(self):
        self.row_model: Optional[GradientBoostingClassifier] = None
        self.col_model: Optional[GradientBoostingClassifier] = None
        self.part_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.is_trained = False
        self._fitted_parts = ["SOPRANO", "ALTO", "TENOR", "BASS"]

        # 파트 인코더 사전 학습
        self.part_encoder.fit(self._fitted_parts)

    def extract_features(
        self,
        member: Dict[str, Any],
        stats: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> np.ndarray:
        """
        대원 정보에서 피처 추출 (개선됨)

        Features (18개):
        - 기본 (3): part, height, experience
        - 통계 (6): pref_row, pref_col, row_cons, col_cons, is_fixed, appearances
        - 컨텍스트 (5): total, s_ratio, a_ratio, t_ratio, b_ratio
        - 파트 규칙 (4): is_front, is_left, row_min, row_max
        """
        part = member.get("part", "SOPRANO")
        part_encoded = self.part_encoder.transform([part])[0]

        # 기본 피처 (키/경력은 미래 대비, 없으면 기본값)
        height = member.get("height") or 170
        experience = member.get("experience") or 0

        features = [
            part_encoded,
            height,
            experience,
        ]

        # 통계 피처
        if stats:
            features.extend([
                stats.get("preferred_row", 3) or 3,
                stats.get("preferred_col", 8) or 8,
                (stats.get("row_consistency", 50) or 50) / 100,
                (stats.get("col_consistency", 50) or 50) / 100,
                1 if stats.get("is_fixed_seat", False) else 0,
                min(stats.get("total_appearances", 0) or 0, 50) / 50,
            ])
        else:
            features.extend([3, 8, 0.5, 0.5, 0, 0])

        # 컨텍스트 피처
        if context:
            features.extend([
                min(context.get("total_members", 80), 100) / 100,  # 정규화
                context.get("soprano_ratio", 0.25),
                context.get("alto_ratio", 0.25),
                context.get("tenor_ratio", 0.25),
                context.get("bass_ratio", 0.25),
            ])
        else:
            features.extend([0.8, 0.25, 0.25, 0.25, 0.25])

        # 파트 규칙 피처 (NEW)
        rule = PART_RULES.get(part, PART_RULES["SOPRANO"])
        is_front_row_part = 1 if part in ["SOPRANO", "ALTO"] else 0
        is_left_side_part = 1 if part in ["SOPRANO", "TENOR"] else 0
        row_min = min(rule["preferred_rows"])
        row_max = max(rule["preferred_rows"])

        features.extend([
            is_front_row_part,
            is_left_side_part,
            row_min / 6,  # 정규화
            row_max / 6,
        ])

        return np.array(features).reshape(1, -1)

    def _calculate_near_accuracy(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        tolerance: int
    ) -> float:
        """근접 정확도 계산 (±tolerance 허용)"""
        return np.mean(np.abs(y_true - y_pred) <= tolerance)

    def _calculate_rule_compliance(
        self,
        y_row_pred: np.ndarray,
        y_col_pred: np.ndarray,
        parts: List[str],
        row_capacities: int = 15
    ) -> float:
        """파트 규칙 준수율 계산"""
        mid_col = row_capacities // 2
        compliant = 0

        for i, part in enumerate(parts):
            rule = PART_RULES.get(part, PART_RULES["SOPRANO"])
            row = y_row_pred[i]
            col = y_col_pred[i]

            # 행 규칙 확인
            all_rows = rule["preferred_rows"] + rule["overflow_rows"]
            row_ok = row in all_rows

            # 열 규칙 확인 (좌/우)
            if rule["side"] == "left":
                col_ok = col <= mid_col
            else:
                col_ok = col > mid_col

            if row_ok and col_ok:
                compliant += 1

        return compliant / len(parts) if parts else 0

    def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """학습 데이터로 모델 훈련 (개선됨)"""
        if len(training_data) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(f"최소 {settings.MIN_TRAINING_SAMPLES}개의 샘플이 필요합니다. (현재: {len(training_data)})")

        # 피처 및 레이블 추출
        X, y_row, y_col, parts = [], [], [], []

        for record in training_data:
            member = record.get("member", {})
            stats = record.get("stats", {})
            context = record.get("context", {})  # 새로 추가된 컨텍스트

            features = self.extract_features(member, stats, context)
            X.append(features.flatten())
            y_row.append(record.get("seat_row", 3))
            y_col.append(record.get("seat_col", 8))
            parts.append(member.get("part", "SOPRANO"))

        X = np.array(X)
        y_row = np.array(y_row)
        y_col = np.array(y_col)

        # 스케일링
        X = self.scaler.fit_transform(X)

        # 학습/테스트 분리
        X_train, X_test, y_row_train, y_row_test, y_col_train, y_col_test, parts_train, parts_test = \
            train_test_split(X, y_row, y_col, parts, test_size=0.2, random_state=42)

        # 행 예측 모델 (GradientBoosting)
        print("[ML] Training row model with GradientBoosting...")
        self.row_model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
        )
        self.row_model.fit(X_train, y_row_train)

        # 열 예측 모델 (GradientBoosting)
        print("[ML] Training col model with GradientBoosting...")
        self.col_model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
        )
        self.col_model.fit(X_train, y_col_train)

        self.is_trained = True

        # 예측
        y_row_pred = self.row_model.predict(X_test)
        y_col_pred = self.col_model.predict(X_test)

        # 정확도 계산 (다양한 메트릭)
        row_accuracy = accuracy_score(y_row_test, y_row_pred)
        col_accuracy = accuracy_score(y_col_test, y_col_pred)

        # 근접 정확도
        row_near_accuracy = self._calculate_near_accuracy(y_row_test, y_row_pred, tolerance=1)
        col_near_accuracy = self._calculate_near_accuracy(y_col_test, y_col_pred, tolerance=2)

        # 파트 규칙 준수율
        rule_compliance = self._calculate_rule_compliance(y_row_pred, y_col_pred, parts_test)

        return {
            "row_accuracy": round(row_accuracy, 4),
            "col_accuracy": round(col_accuracy, 4),
            "row_near_accuracy": round(row_near_accuracy, 4),  # ±1행
            "col_near_accuracy": round(col_near_accuracy, 4),  # ±2열
            "rule_compliance": round(rule_compliance, 4),
            "samples_used": float(len(training_data)),
        }

    def _get_valid_row_range(self, part: str) -> List[int]:
        """파트별 유효 행 범위 반환 (하이브리드)"""
        rule = PART_RULES.get(part, PART_RULES["SOPRANO"])
        return rule["preferred_rows"] + rule["overflow_rows"]

    def _get_valid_col_range(self, part: str, row_capacity: int) -> Tuple[int, int]:
        """파트별 유효 열 범위 반환 (하이브리드)"""
        rule = PART_RULES.get(part, PART_RULES["SOPRANO"])
        mid = row_capacity // 2

        if rule["side"] == "left":
            return (0, mid)  # 0-based
        else:
            return (mid, row_capacity - 1)

    def recommend(
        self,
        members: List[Dict[str, Any]],
        member_stats: Dict[str, Dict[str, Any]],
        grid_layout: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        대원 목록에 대한 좌석 추천 (하이브리드 방식)

        1. 파트 규칙으로 행/열 범위 제한
        2. ML 모델로 범위 내 세부 위치 예측
        3. 충돌 해결
        """
        if not self.is_trained:
            raise ValueError("모델이 학습되지 않았습니다. /api/v1/train을 먼저 호출하세요.")

        recommendations = []
        occupied: set = set()  # (row, col) 점유 상태

        rows = grid_layout.get("rows", 6)
        row_capacities = grid_layout.get("row_capacities", [15] * rows)

        # 배치 컨텍스트 계산
        part_counts = {}
        for m in members:
            p = m.get("part", "SOPRANO")
            part_counts[p] = part_counts.get(p, 0) + 1

        total = len(members)
        context = {
            "total_members": total,
            "soprano_ratio": part_counts.get("SOPRANO", 0) / total if total > 0 else 0.25,
            "alto_ratio": part_counts.get("ALTO", 0) / total if total > 0 else 0.25,
            "tenor_ratio": part_counts.get("TENOR", 0) / total if total > 0 else 0.25,
            "bass_ratio": part_counts.get("BASS", 0) / total if total > 0 else 0.25,
        }

        # 고정석 대원 우선 정렬
        sorted_members = sorted(
            members,
            key=lambda m: (
                not member_stats.get(m["id"], {}).get("is_fixed_seat", False),
                -(member_stats.get(m["id"], {}).get("total_appearances", 0) or 0)
            )
        )

        for member in sorted_members:
            stats = member_stats.get(member["id"], {})
            part = member.get("part", "SOPRANO")

            features = self.extract_features(member, stats, context)
            features_scaled = self.scaler.transform(features)

            # ML 예측
            pred_row = int(self.row_model.predict(features_scaled)[0])
            pred_col = int(self.col_model.predict(features_scaled)[0])

            # 1-based to 0-based 변환
            pred_row = max(0, pred_row - 1) if pred_row > 0 else pred_row
            pred_col = max(0, pred_col - 1) if pred_col > 0 else pred_col

            # 하이브리드: 파트 규칙으로 범위 제한
            valid_rows = self._get_valid_row_range(part)
            valid_rows_0based = [r - 1 for r in valid_rows if r - 1 < rows]

            # 예측 행이 유효 범위 밖이면 가장 가까운 유효 행으로 조정
            if pred_row not in valid_rows_0based and valid_rows_0based:
                pred_row = min(valid_rows_0based, key=lambda r: abs(r - pred_row))

            # 열 범위 제한
            if pred_row < len(row_capacities):
                col_min, col_max = self._get_valid_col_range(part, row_capacities[pred_row])
                pred_col = max(col_min, min(col_max, pred_col))

            # 범위 제한
            pred_row = min(pred_row, rows - 1)
            pred_col = min(pred_col, row_capacities[pred_row] - 1) if pred_row < len(row_capacities) else pred_col

            # 충돌 해결 (파트 규칙 준수하면서)
            row, col = self._resolve_collision_with_rules(
                pred_row, pred_col, occupied, rows, row_capacities, part
            )

            if row is not None and col is not None:
                occupied.add((row, col))
                recommendations.append({
                    "member_id": member["id"],
                    "member_name": member["name"],
                    "part": part,
                    "row": row + 1,  # 1-based로 반환
                    "col": col + 1,
                })

        return recommendations

    def _resolve_collision_with_rules(
        self,
        row: int,
        col: int,
        occupied: set,
        rows: int,
        row_capacities: List[int],
        part: str
    ) -> Tuple[Optional[int], Optional[int]]:
        """
        좌석 충돌 해결 (파트 규칙 준수)
        """
        if (row, col) not in occupied:
            return row, col

        valid_rows = self._get_valid_row_range(part)
        valid_rows_0based = [r - 1 for r in valid_rows if r - 1 < rows]

        # BFS로 인접 좌석 탐색 (파트 규칙 준수)
        for distance in range(1, max(rows, max(row_capacities, default=15)) + 1):
            for dr in range(-distance, distance + 1):
                for dc in range(-distance, distance + 1):
                    if abs(dr) + abs(dc) > distance:
                        continue

                    new_row = row + dr
                    new_col = col + dc

                    # 유효 행 범위 확인
                    if new_row not in valid_rows_0based:
                        continue
                    if new_row < 0 or new_row >= rows:
                        continue
                    if new_col < 0 or new_col >= row_capacities[new_row]:
                        continue

                    # 열 규칙 확인
                    col_min, col_max = self._get_valid_col_range(part, row_capacities[new_row])
                    if new_col < col_min or new_col > col_max:
                        continue

                    if (new_row, new_col) in occupied:
                        continue

                    return new_row, new_col

        # 규칙 준수 실패 시, 규칙 무시하고 빈 좌석 찾기
        for distance in range(1, max(rows, max(row_capacities, default=15)) + 1):
            for dr in range(-distance, distance + 1):
                for dc in range(-distance, distance + 1):
                    if abs(dr) + abs(dc) > distance:
                        continue

                    new_row = row + dr
                    new_col = col + dc

                    if new_row < 0 or new_row >= rows:
                        continue
                    if new_col < 0 or new_col >= row_capacities[new_row]:
                        continue
                    if (new_row, new_col) in occupied:
                        continue

                    return new_row, new_col

        return None, None

    def save_model(self, path: Optional[str] = None):
        """모델 저장"""
        if not self.is_trained:
            raise ValueError("학습된 모델이 없습니다.")

        save_path = path or settings.MODEL_PATH
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        model_data = {
            "row_model": self.row_model,
            "col_model": self.col_model,
            "scaler": self.scaler,
            "part_encoder": self.part_encoder,
            "version": "2.0",  # 버전 추가
        }
        joblib.dump(model_data, save_path)
        print(f"[ML] Model v2 saved to {save_path}")

    def load_model(self, path: Optional[str] = None):
        """모델 로드"""
        load_path = path or settings.MODEL_PATH

        if not os.path.exists(load_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {load_path}")

        model_data = joblib.load(load_path)
        self.row_model = model_data["row_model"]
        self.col_model = model_data["col_model"]
        self.scaler = model_data["scaler"]
        self.part_encoder = model_data["part_encoder"]
        self.is_trained = True

        version = model_data.get("version", "1.0")
        print(f"[ML] Model v{version} loaded from {load_path}")


# 싱글톤 인스턴스
recommender = SeatRecommender()
