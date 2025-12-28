"""
ML 기반 좌석 추천 모델
RandomForestClassifier를 사용한 행/열 예측
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os
from typing import List, Dict, Tuple, Optional, Any

from app.config import settings


class SeatRecommender:
    """RandomForest 기반 좌석 추천 모델"""

    def __init__(self):
        self.row_model: Optional[RandomForestClassifier] = None
        self.col_model: Optional[RandomForestClassifier] = None
        self.part_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.is_trained = False
        self._fitted_parts = ["SOPRANO", "ALTO", "TENOR", "BASS"]

        # 파트 인코더 사전 학습
        self.part_encoder.fit(self._fitted_parts)

    def extract_features(self, member: Dict[str, Any], stats: Optional[Dict[str, Any]] = None) -> np.ndarray:
        """대원 정보에서 피처 추출"""
        part_encoded = self.part_encoder.transform([member.get("part", "SOPRANO")])[0]

        features = [
            part_encoded,
            member.get("height", 170) or 170,
            member.get("experience", 0) or 0,
            1 if member.get("is_leader", False) else 0,
        ]

        # 통계 정보가 있으면 추가
        if stats:
            features.extend([
                stats.get("preferred_row", 3) or 3,
                stats.get("preferred_col", 8) or 8,
                (stats.get("row_consistency", 50) or 50) / 100,
                (stats.get("col_consistency", 50) or 50) / 100,
                1 if stats.get("is_fixed_seat", False) else 0,
                min(stats.get("total_appearances", 0) or 0, 50) / 50,  # 정규화
            ])
        else:
            # 기본값
            features.extend([3, 8, 0.5, 0.5, 0, 0])

        return np.array(features).reshape(1, -1)

    def train(self, training_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """학습 데이터로 모델 훈련"""
        if len(training_data) < settings.MIN_TRAINING_SAMPLES:
            raise ValueError(f"최소 {settings.MIN_TRAINING_SAMPLES}개의 샘플이 필요합니다. (현재: {len(training_data)})")

        # 피처 및 레이블 추출
        X, y_row, y_col = [], [], []

        for record in training_data:
            member = record.get("member", {})
            stats = record.get("stats", {})
            features = self.extract_features(member, stats)
            X.append(features.flatten())
            y_row.append(record.get("seat_row", 3))
            y_col.append(record.get("seat_col", 8))

        X = np.array(X)
        y_row = np.array(y_row)
        y_col = np.array(y_col)

        # 스케일링
        X = self.scaler.fit_transform(X)

        # 학습/테스트 분리
        X_train, X_test, y_row_train, y_row_test, y_col_train, y_col_test = train_test_split(
            X, y_row, y_col, test_size=0.2, random_state=42
        )

        # 행 예측 모델
        self.row_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.row_model.fit(X_train, y_row_train)

        # 열 예측 모델
        self.col_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.col_model.fit(X_train, y_col_train)

        self.is_trained = True

        # 정확도 계산
        row_accuracy = accuracy_score(y_row_test, self.row_model.predict(X_test))
        col_accuracy = accuracy_score(y_col_test, self.col_model.predict(X_test))

        return {
            "row_accuracy": row_accuracy,
            "col_accuracy": col_accuracy,
            "samples_used": len(training_data),
        }

    def recommend(
        self,
        members: List[Dict[str, Any]],
        member_stats: Dict[str, Dict[str, Any]],
        grid_layout: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """대원 목록에 대한 좌석 추천"""
        if not self.is_trained:
            raise ValueError("모델이 학습되지 않았습니다. /api/v1/train을 먼저 호출하세요.")

        recommendations = []
        occupied: set = set()  # (row, col) 점유 상태

        rows = grid_layout.get("rows", 6)
        row_capacities = grid_layout.get("row_capacities", [15] * rows)

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
            features = self.extract_features(member, stats)
            features_scaled = self.scaler.transform(features)

            # 예측
            pred_row = int(self.row_model.predict(features_scaled)[0])
            pred_col = int(self.col_model.predict(features_scaled)[0])

            # 0-based로 변환 (모델이 1-based를 학습했다면)
            pred_row = max(0, pred_row - 1) if pred_row > 0 else pred_row
            pred_col = max(0, pred_col - 1) if pred_col > 0 else pred_col

            # 범위 제한
            pred_row = min(pred_row, rows - 1)
            pred_col = min(pred_col, row_capacities[pred_row] - 1) if pred_row < len(row_capacities) else pred_col

            # 충돌 해결
            row, col = self._resolve_collision(pred_row, pred_col, occupied, rows, row_capacities)

            if row is not None and col is not None:
                occupied.add((row, col))
                recommendations.append({
                    "member_id": member["id"],
                    "member_name": member["name"],
                    "part": member["part"],
                    "row": row,
                    "col": col,
                })

        return recommendations

    def _resolve_collision(
        self,
        row: int,
        col: int,
        occupied: set,
        rows: int,
        row_capacities: List[int]
    ) -> Tuple[Optional[int], Optional[int]]:
        """좌석 충돌 해결 - 가장 가까운 빈 좌석 찾기"""
        if (row, col) not in occupied:
            return row, col

        # BFS로 인접 좌석 탐색
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

        return None, None  # 빈 좌석 없음

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
        }
        joblib.dump(model_data, save_path)
        print(f"[ML] Model saved to {save_path}")

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
        print(f"[ML] Model loaded from {load_path}")


# 싱글톤 인스턴스
recommender = SeatRecommender()
