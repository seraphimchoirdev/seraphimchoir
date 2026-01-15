# 지휘자 메모 기반 AI 자동 배치 개인화 - 기술 검토

> **작성일**: 2026-01-15
> **상태**: 검토 완료 (구현 대기)

## 검토 요청

> 지휘자 전용 메모에 입력된 개인화된 조건들(선호 행, 비선호 행, 특정 대원 옆 배치 금지, 특정 파트 옆 비선호 등)을 AI 자동 배치에 반영하는 것이 가능한지 검토

---

## 1. 현재 시스템 구조

### 지휘자 메모 (Conductor Notes)

| 항목 | 현재 상태 |
|------|----------|
| **저장 형식** | 자유 텍스트 (구조화되지 않음) |
| **암호화** | AES-256-GCM (CONDUCTOR만 복호화 가능) |
| **위치** | `members.encrypted_conductor_notes` |
| **접근 권한** | CONDUCTOR 전용 (ADMIN도 불가) |

### AI 자동 배치 로직

| 항목 | 현재 상태 |
|------|----------|
| **ML 모델** | GradientBoosting (Python) + 규칙 기반 (TypeScript) |
| **개인화 방식** | 통계 기반 (출석 이력에서 자동 학습) |
| **고려 조건** | 파트, 키, 고정석 패턴(행/열 일관성), 파트 비율 |
| **NLP 기능** | 없음 |

---

## 2. 구현 가능성 평가

### 기술적으로 구현 가능

두 가지 접근 방식이 있습니다:

#### 방식 A: 구조화된 조건 입력 (권장)

```typescript
// 새로운 데이터 구조 예시
interface MemberPlacementConstraints {
  memberId: string;

  // 행 선호도
  preferredRows?: number[];      // [1, 2, 3]
  avoidRows?: number[];          // [5, 6]

  // 열 선호도
  preferredSide?: 'left' | 'right' | 'center';

  // 대원 관계
  avoidMembers?: string[];       // ["member-id-1", "member-id-2"]
  preferNearMembers?: string[];  // ["member-id-3"]

  // 파트 관계
  avoidAdjacentParts?: Part[];   // ["TENOR"]

  // 기타
  fixedSeat?: { row: number; col: number };  // 완전 고정
}
```

**장점:**
- 파싱 오류 없음 (100% 정확한 해석)
- UI에서 직관적인 입력 가능 (체크박스, 드롭다운)
- ML 피처로 직접 변환 용이
- 유효성 검증 가능 (존재하지 않는 대원 ID 체크 등)

**단점:**
- 새로운 UI 개발 필요
- 기존 메모 내용 마이그레이션 필요

#### 방식 B: 자연어 텍스트 파싱 (LLM 활용)

```
지휘자 메모 원문:
"3행을 선호함. 김철수 대원 옆에는 절대 배치하지 말 것.
테너 파트 옆에 서는 것을 싫어함. 키가 커서 뒷줄이 나을 듯."
     ↓
LLM 파싱 (Claude API 또는 GPT)
     ↓
구조화된 조건:
{
  preferredRows: [3],
  avoidMembers: ["김철수-id"],
  avoidAdjacentParts: ["TENOR"],
  preferredRows: [4, 5, 6]  // "뒷줄" 해석
}
```

**장점:**
- 기존 메모 형식 유지 가능
- 자유로운 표현 가능

**단점:**
- LLM API 비용 발생
- 파싱 오류 가능성 (모호한 표현, 오타 등)
- 대원 이름 → ID 매칭 필요 (동명이인 문제)
- 실시간 파싱 시 지연 발생

---

## 3. 구조화 vs 자유 텍스트 비교

| 기준 | 구조화 (방식 A) | 자유 텍스트 (방식 B) |
|------|----------------|---------------------|
| **정확도** | 100% | 80-95% (LLM 성능 의존) |
| **개발 복잡도** | 중간 (UI + DB) | 높음 (LLM 통합) |
| **운영 비용** | 없음 | LLM API 비용 |
| **사용자 경험** | 제한적이나 명확 | 자유롭지만 불확실 |
| **유지보수** | 쉬움 | 어려움 (프롬프트 관리) |

### 권장: **구조화된 조건 입력 (방식 A)**

단, 기존 자유 텍스트 메모도 유지하되, **별도의 "배치 조건" 섹션**을 추가하는 하이브리드 방식 권장

---

## 4. 구현 시 필요한 작업

### Phase 1: 데이터베이스 확장

```sql
-- 새 테이블: 대원별 배치 조건
CREATE TABLE member_placement_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,

  -- 행 선호도
  preferred_rows INTEGER[],
  avoid_rows INTEGER[],

  -- 열/좌우 선호도
  preferred_side TEXT CHECK (preferred_side IN ('left', 'right', 'center')),

  -- 대원 관계
  avoid_member_ids UUID[],
  prefer_near_member_ids UUID[],

  -- 파트 관계
  avoid_adjacent_parts TEXT[],

  -- 완전 고정석
  fixed_row INTEGER,
  fixed_col INTEGER,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS: CONDUCTOR만 접근 가능
ALTER TABLE member_placement_constraints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conductor_only" ON member_placement_constraints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'CONDUCTOR')
  );
```

### Phase 2: ML 피처 확장

```python
# seat_recommender.py에 추가
def extract_features_with_constraints(self, member, stats, context, constraints):
    features = self.extract_features(member, stats, context)

    # 조건 기반 피처 추가
    features.extend([
        1 if constraints.get('has_row_preference') else 0,
        1 if constraints.get('has_avoid_members') else 0,
        1 if constraints.get('has_fixed_seat') else 0,
    ])

    return features
```

### Phase 3: 배치 알고리즘 수정

```typescript
// ai-seat-algorithm.ts에 추가
function applyMemberConstraints(
  seat: SeatAssignment,
  constraints: MemberPlacementConstraints,
  allSeats: SeatAssignment[]
): boolean {
  // 1. 행 제약 확인
  if (constraints.avoidRows?.includes(seat.row)) return false;

  // 2. 인접 대원 제약 확인
  const adjacentSeats = getAdjacentSeats(seat, allSeats);
  for (const adj of adjacentSeats) {
    if (constraints.avoidMemberIds?.includes(adj.memberId)) return false;
  }

  // 3. 인접 파트 제약 확인
  for (const adj of adjacentSeats) {
    if (constraints.avoidAdjacentParts?.includes(adj.part)) return false;
  }

  return true;
}
```

### Phase 4: UI 개발

- 대원 상세 페이지에 "배치 조건" 탭/섹션 추가
- 드롭다운, 체크박스, 멤버 선택기 UI
- CONDUCTOR 권한 확인

---

## 5. 결론

| 질문 | 답변 |
|------|------|
| **구현 가능한가?** | 가능 |
| **자유 텍스트로도 가능한가?** | 가능하지만 LLM 비용/오류 위험 있음 |
| **규격화가 필요한가?** | 권장함 (구조화된 입력이 더 안정적) |
| **예상 개발 범위** | DB 스키마 + API + UI + 알고리즘 수정 |

### 권장 접근법

1. **새 테이블 생성**: `member_placement_constraints` (구조화된 조건 저장)
2. **기존 메모 유지**: 자유 텍스트 메모는 그대로 유지 (참고용)
3. **UI 분리**: "배치 조건" 섹션을 별도로 추가
4. **점진적 적용**: 먼저 핵심 조건(행 선호, 대원 회피)만 구현 후 확장

---

## 관련 파일

- `src/lib/ai-seat-algorithm.ts` - TypeScript 배치 알고리즘
- `src/lib/quality-metrics.ts` - 품질 평가 로직
- `ml-service/app/models/seat_recommender.py` - Python ML 모델
- `src/components/features/members/ConductorNotes.tsx` - 지휘자 메모 UI
- `src/app/api/members/[id]/conductor-notes/route.ts` - 지휘자 메모 API
