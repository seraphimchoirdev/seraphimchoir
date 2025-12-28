# ML Training Data Transformation Summary

## 변경 개요

ML 학습 데이터 (`training_data/ml_training_data.json`)의 row/col 인덱싱을 0-based에서 1-based로 변경하고, row 순서를 UI 매핑에 맞게 조정했습니다.

## 변경 사항

### 1. Row/Col 인덱싱 변경

**변경 전 (0-based)**
```json
{
  "row": 0,  // 0부터 시작
  "col": 0   // 0부터 시작
}
```

**변경 후 (1-based)**
```json
{
  "row": 1,  // 1부터 시작 (UI와 동일)
  "col": 1   // 1부터 시작 (UI와 동일)
}
```

### 2. Row 번호 역순 변환

ML 데이터에서 row 0은 실제로는 맨 뒷줄(무대 가까운 쪽)을 의미했지만, UI에서는 row 1이 맨 앞줄을 의미합니다.

**변경 전 (ML 원본 순서)**
- row 0 → 맨 뒷줄 (무대 가까운 쪽)
- row 1 → 뒷줄
- row 2 → 중간
- row 3 → 중간
- row 4 → 앞줄
- row 5 → 맨 앞줄 (청중 가까운 쪽)

**변경 후 (UI 순서에 맞게 역순 변환)**
- row 6 → 맨 뒷줄 (무대 가까운 쪽, 원래 row 0)
- row 5 → 뒷줄 (원래 row 1)
- row 4 → 중간 (원래 row 2)
- row 3 → 중간 (원래 row 3)
- row 2 → 앞줄 (원래 row 4)
- row 1 → 맨 앞줄 (청중 가까운 쪽, 원래 row 5)

**변환 공식**
```typescript
// 6행 arrangement의 경우
new_row = 7 - old_row  // 0→6, 1→5, 2→4, 3→3, 4→2, 5→1
```

### 3. Row Capacities 역순 변환

`grid_layout.row_capacities` 배열도 역순으로 변환되었습니다.

**변경 전**
```json
{
  "row_capacities": [10, 12, 14, 16, 15, 14]  // row 0부터 row 5까지
}
```

**변경 후**
```json
{
  "row_capacities": [14, 15, 16, 14, 12, 10]  // row 1부터 row 6까지 (역순)
}
```

## 데이터 정합성 수정

### 1. Metadata Total Members 수정

일부 arrangement의 `metadata.total_members`가 실제 `seats` 개수와 일치하지 않는 문제를 수정했습니다.

**수정 전후 예시**
- ocr_2025-11-09_0: 88명 → 72명 (실제 seats 개수에 맞춤)
- ocr_2025-10-26_1: 84명 → 83명
- ocr_2025-11-02_2: 80명 → 79명

### 2. Row 번호 정규화

일부 arrangement가 row 2-6을 사용하고 있어, 모두 row 1부터 시작하도록 정규화했습니다.

**수정된 arrangement**
- ocr_2025-07-27_17
- ocr_2025-10-05_35
- ocr_2025-07-27_37
- ocr_2025-03-02_38
- ocr_2025-01-12_39

## 파트 배치 패턴 변경

### 변경 전 (ML 원본 기준)
- TENOR/BASS: row 0-2 (ML의 앞쪽 = 무대 가까운 위치)
- SOPRANO/ALTO: row 2-5 (ML의 뒤쪽)

### 변경 후 (UI 순서 기준)
- SOPRANO/ALTO: row 1-3 (UI의 앞쪽 = 청중 가까운 위치)
- TENOR/BASS: row 4-6 (UI의 뒤쪽 = 무대 가까운 위치)

## 영향을 받는 파일

### Python 스크립트
1. `scripts/transform_ml_data_to_ui_mapping.py` (신규)
   - Row/col을 1-based로 변환
   - Row 번호를 역순으로 변환
   - Row capacities를 역순으로 변환

2. `scripts/fix_metadata_totals.py` (신규)
   - Metadata total_members를 실제 seats 개수로 수정

3. `scripts/normalize_row_numbers.py` (신규)
   - 모든 arrangement를 row 1부터 시작하도록 정규화

4. `scripts/analyze_row_distribution_patterns.py` (수정)
   - 1-based row 인덱싱에 맞게 수정

### TypeScript 파일
1. `src/lib/ai-seat-algorithm.ts` (대폭 수정)
   - 1-based row/col 인덱싱 사용
   - PART_ROW_PREFERENCES를 UI 순서에 맞게 수정 (SOPRANO/ALTO → 앞쪽, TENOR/BASS → 뒤쪽)
   - Row 역순 변환 로직 제거 (이미 ML 데이터가 UI 순서로 변환됨)
   - `recommendRowDistribution` 사용하여 ML 학습 패턴 기반 row 구성

2. `src/lib/row-distribution-recommender.ts` (영향 없음)
   - 이미 UI 순서(1줄부터)로 패턴 저장하고 있었음

## 검증 결과

### Row Distribution Patterns
- 19개 학습 패턴 생성
- 모든 패턴이 row 1부터 시작
- 55명 이하: 5행 구성 (4개 패턴)
- 56명 이상: 6행 구성 (15개 패턴)

### ML Training Data
- 40개 arrangement 모두 변환 완료
- 3,139개 seat 모두 변환 완료
- Row 범위: 1 ~ 6 ✅
- Col 범위: 1 ~ 17 ✅
- 모든 arrangement가 row 1부터 시작 ✅

## 사용 예시

### AI 자동배치 API
```typescript
// arrangements 페이지에서 사용
const result = await fetch('/api/recommend-seats', {
  method: 'POST',
  body: JSON.stringify({
    arrangement_id: '...',
    attending_member_ids: [...]
  })
});

// 결과
{
  "seats": [
    {
      "member_id": "...",
      "row": 1,  // 1-based (맨 앞줄)
      "col": 1   // 1-based (맨 왼쪽)
    }
  ],
  "gridLayout": {
    "rows": 6,
    "rowCapacities": [14, 15, 16, 14, 12, 10]  // 1줄부터 6줄까지
  }
}
```

### 좌석 그리드 UI
```typescript
// UI에서 직접 사용 가능 (변환 불필요)
<div className="grid-row" data-row={seat.row}>  {/* 1-based */}
  <div className="seat" data-col={seat.col}>    {/* 1-based */}
    {seat.member_name}
  </div>
</div>
```

## 주의사항

1. **데이터베이스 저장**: seats 테이블에 저장할 때 row/col을 그대로 사용 (1-based)
2. **UI 표시**: row/col을 직접 표시 가능 (변환 불필요)
3. **배열 인덱싱**: rowCapacities[row - 1]처럼 array 접근 시 -1 필요
4. **파트 위치**: SOPRANO/ALTO는 앞쪽(1-3줄), TENOR/BASS는 뒤쪽(4-6줄)

## 실행된 스크립트 순서

```bash
# 1. Row/col을 1-based로 변환, row 역순 변환
python3 scripts/transform_ml_data_to_ui_mapping.py

# 2. Metadata total_members 수정
python3 scripts/fix_metadata_totals.py

# 3. Row 번호 정규화 (row 1부터 시작)
python3 scripts/normalize_row_numbers.py

# 4. Row distribution 패턴 재생성
python3 scripts/analyze_row_distribution_patterns.py
```

## 결론

모든 ML 학습 데이터가 UI 순서에 맞게 변환되어, 추가적인 row 역순 변환 없이 직접 사용할 수 있습니다.
- Row/Col: 1-based 인덱싱 (UI와 동일)
- Row 순서: row 1 = 맨 앞줄 (청중 가까운 쪽)
- Part 배치: SOPRANO/ALTO 앞쪽, TENOR/BASS 뒤쪽
