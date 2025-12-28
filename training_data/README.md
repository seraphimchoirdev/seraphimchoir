# 찬양대 자리배치 학습 데이터

이 디렉토리에는 AI 자리배치 추천 모델 학습용 데이터가 포함되어 있습니다.

## 데이터 파일

### 1. `seat_arrangements_ocr.json`
- **설명**: seatimg/ 디렉토리의 이미지에서 OCR로 추출한 원본 배치 데이터
- **포맷**: 날짜별로 구성된 자리배치 정보
  ```json
  {
    "date": "2025-11-09",
    "service": "2부예배",
    "anthem": "만군의 주 전능의 왕",
    "offering_hymn_leader": "소원",
    "total": 88,
    "breakdown": {"소프라노": 30, "알토": 23, "테너": 14, "베이스": 15},
    "rows": [...]
  }
  ```

### 2. `ml_training_data.json`
- **설명**: ML 모델 학습에 직접 사용 가능한 포맷으로 변환된 데이터
- **포맷**: 각 배치마다 멤버 ID, 파트, 키, 경력 등의 상세 정보 포함
  ```json
  {
    "arrangement_id": "ocr_2025-11-09_0",
    "date": "2025-11-09",
    "metadata": {...},
    "grid_layout": {
      "rows": 6,
      "row_capacities": [9, 10, 13, 15, 14, 13],
      "zigzag_pattern": "even"
    },
    "seats": [
      {
        "member_id": "uuid",
        "member_name": "홍길동",
        "part": "TENOR",
        "height": 175,
        "experience_years": 3,
        "is_part_leader": false,
        "row": 0,
        "col": 0
      },
      ...
    ]
  }
  ```

## 데이터 통계

### OCR 추출 데이터
- **총 배치 수**: 3개
- **날짜 범위**: 2025-10-26 ~ 2025-11-09
- **평균 참석 인원**: 84명
- **파트별 평균 분포**:
  - 소프라노: 30.3명
  - 알토: 22.7명
  - 테너: 13.7명
  - 베이스: 15.3명

### 배치 패턴 분석
1. **2025-11-09 (88명)**
   - 행별 구성: 9-10-13-15-14-13
   - 특징: 뒷열로 갈수록 인원 증가, 마지막 열은 감소

2. **2025-10-26 (84명)**
   - 행별 구성: 11-13-15-16-15-14
   - 특징: 중앙부(4열)가 최대 인원

3. **2025-11-02 (80명)**
   - 행별 구성: 11-12-14-15-13-14
   - 특징: 중앙부에 인원 집중

## 데이터 생성 스크립트

### `scripts/ocr_seat_images.py`
이미지를 OCR로 분석하여 JSON으로 변환합니다.

```bash
python3 scripts/ocr_seat_images.py
```

### `scripts/prepare_training_data.py`
OCR 데이터를 ML 학습용 포맷으로 변환합니다.
데이터베이스의 멤버 정보와 매핑하여 파트, 키, 경력 등을 추가합니다.

```bash
# 환경 변수 설정 필요
source .env.local
python3 scripts/prepare_training_data.py
```

## ML 모델 학습 가이드

### 1. 데이터 준비
```python
import json

# ML 학습 데이터 로드
with open('training_data/ml_training_data.json', 'r', encoding='utf-8') as f:
    training_data = json.load(f)
```

### 2. 학습 패턴 추출
각 배치에서 다음 패턴을 학습할 수 있습니다:

- **위치 패턴**: 파트별 선호 위치 (앞열/뒷열, 좌우)
- **키 순서**: 각 파트 내 키 순서 패턴
- **경력 분포**: 신입/경력자 배치 패턴
- **리더 위치**: 파트장 배치 위치
- **행별 밸런스**: 각 행의 파트 균형

### 3. 모델 학습
```python
# FastAPI ML 서비스에서 학습 수행
# POST /api/train
# Body: training_data
```

## 추가 데이터 수집

새로운 배치 이미지를 추가하려면:

1. `seatimg/` 디렉토리에 이미지 추가
2. `scripts/ocr_seat_images.py`의 `MANUAL_OCR_DATA`에 수동 OCR 결과 추가
3. 스크립트 재실행으로 JSON 업데이트

## 데이터 품질 향상

현재 이슈:
- ⚠️ 일부 멤버 이름이 데이터베이스와 매칭되지 않음
  - OCR 오류로 인한 이름 오타
  - 데이터베이스에 등록되지 않은 멤버

해결 방법:
1. OCR 데이터의 이름을 데이터베이스 이름과 일치하도록 수정
2. 데이터베이스에 누락된 멤버 추가
3. 이름 매칭 알고리즘 개선 (유사도 기반 매칭)

## 라이선스 및 주의사항

- 이 데이터는 새로필 찬양대 내부 학습 목적으로만 사용됩니다.
- 개인정보(이름)가 포함되어 있으므로 외부 공개 금지
- 데이터 사용 시 개인정보 보호 규정 준수 필요
