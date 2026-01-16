# Scripts 디렉토리

이 디렉토리에는 프로젝트에서 사용되는 다양한 스크립트가 포함되어 있습니다.

## 스크립트 카테고리

### OCR 및 데이터 처리 (Python)
- `ocr_seat_images.py` - 좌석 배치표 이미지 OCR
- `auto_ocr_all_images.py` - 전체 이미지 자동 OCR 처리
- `prepare_training_data.py` - ML 학습 데이터 준비
- `analyze_row_distribution_patterns.py` - 행 분포 패턴 분석

### 데이터 변환 및 임포트 (TypeScript)
- `convert-docx-to-db.ts` - DOCX 파일을 DB 형식으로 변환
- `convert_ocr_to_ml.ts` - OCR 결과를 ML 형식으로 변환
- `import-ml-data.ts` - ML 데이터 임포트
- `import-ml-history.ts` - ML 히스토리 임포트

### 테스트 및 검증
- `test_ai_algorithm.py` / `test_ai_algorithm.ts` - AI 알고리즘 테스트
- `verify-attendances.ts` - 출석 데이터 검증
- `verify-data.ts` - 데이터 무결성 검증
- `validate_ml_data.ts` - ML 데이터 유효성 검증

### 분석 스크립트
- `analyze-soprano-outliers.ts` - 소프라노 이상값 분석
- `attendance-statistics-2025.ts` - 2025년 출석 통계
- `check-arrangement-data.ts` - 배치표 데이터 확인

### 학습 스크립트
- `train_row_patterns.ts` - 행 패턴 학습
- `train_seat_patterns.ts` - 좌석 패턴 학습
- `relearn-col-patterns.ts` - 열 패턴 재학습

### 유틸리티
- `create-test-users.ts` - 테스트 사용자 생성
- `link-test-users.ts` - 테스트 사용자 연결
- `process-icons.js` - 아이콘 처리

## 실행 방법

### TypeScript 스크립트
```bash
npx tsx scripts/<script-name>.ts
```

### Python 스크립트
```bash
# 가상환경 활성화
source .venv/bin/activate
python scripts/<script-name>.py
```

### JavaScript 스크립트
```bash
node scripts/<script-name>.js
```

## 주의사항

- 일부 스크립트는 일회성으로 사용되었으며 다시 실행할 필요가 없을 수 있습니다
- 데이터 수정 스크립트 실행 전 백업을 권장합니다
- 환경 변수 설정이 필요한 스크립트는 `.env` 파일을 확인하세요
