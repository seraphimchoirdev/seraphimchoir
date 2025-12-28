# Requirements Specification

**프로젝트**: 찬양대 자리배치 시스템
**버전**: 2.0 (Supabase)
**최종 수정일**: 2025년 1월 18일

---

## 목차

1. [개요](#1-개요)
2. [기능 요구사항](#2-기능-요구사항)
3. [데이터 요구사항](#3-데이터-요구사항)
4. [API 요구사항](#4-api-요구사항)
5. [UI/UX 요구사항](#5-uiux-요구사항)
6. [보안 요구사항](#6-보안-요구사항)
7. [성능 요구사항](#7-성능-요구사항)
8. [테스트 요구사항](#8-테스트-요구사항)
9. [배포 요구사항](#9-배포-요구사항)

---

## 1. 개요

### 1.1 문서 목적

이 문서는 찬양대 자리배치 시스템의 기술적 요구사항을 상세히 정의합니다. 개발자가 구현해야 할 기능의 구체적인 스펙과 제약사항을 명시합니다.

### 1.2 시스템 아키텍처

```
┌─────────────────────────────────────────────────┐
│         클라이언트 (Next.js 16 + React 19)      │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ UI Components│  │   State Management       │ │
│  │  (React)     │  │  - Zustand (Client)      │ │
│  │              │  │  - React Query (Server)  │ │
│  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↕️
┌─────────────────────────────────────────────────┐
│            Supabase Backend                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐│
│  │PostgreSQL│  │   Auth   │  │    Storage    ││
│  │   + RLS  │  │          │  │               ││
│  └──────────┘  └──────────┘  └───────────────┘│
│  ┌──────────────────────────────────────────┐ │
│  │         Realtime (선택적)                │ │
│  └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
                      ↕️
┌─────────────────────────────────────────────────┐
│        ML Service (Python FastAPI)              │
│  - AI 배치 추천 알고리즘                        │
│  - 과거 데이터 학습                             │
└─────────────────────────────────────────────────┘
```

---

## 2. 기능 요구사항

### 2.1 인증 및 권한 관리

#### REQ-AUTH-001: 사용자 회원가입

- **설명**: Supabase Auth를 사용한 이메일/비밀번호 회원가입
- **입력**:
  - 이메일 (필수, 유효한 이메일 형식)
  - 비밀번호 (필수, 최소 8자, 영문/숫자/특수문자 포함)
  - 이름 (필수, 2-50자)
- **출력**:
  - 성공: 회원가입 완료 메시지, 이메일 인증 요청
  - 실패: 에러 메시지 (중복 이메일, 약한 비밀번호 등)
- **비즈니스 규칙**:
  - 이메일은 고유해야 함
  - 회원가입 시 user_profiles 테이블에 자동으로 프로필 생성 (역할은 null 또는 기본값)
  - **역할/권한 부여는 ADMIN만 가능** (회원가입 후 별도 절차)
  - 이메일 인증 후 로그인 가능
- **구현**:

```typescript
// 회원가입 (역할 없음)
const { data, error } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    data: {
      name: formData.name,
    },
  },
});

// 역할 부여는 ADMIN이 별도로 수행
// (API Route에서 ADMIN 권한 확인 후 실행)
const { error: updateError } = await supabase
  .from('user_profiles')
  .update({ role: 'CONDUCTOR' })
  .eq('id', userId);
```

#### REQ-AUTH-002: 사용자 로그인

- **설명**: 이메일/비밀번호 로그인 (기본), Kakao OAuth (Phase 6)
- **지원 방식**:
  - **이메일/비밀번호** (기본)
  - **Kakao OAuth** (Phase 6에서 추가 지원 예정)
- **세션 관리**:
  - 쿠키 기반 세션
  - 액세스 토큰 유효기간: 1시간
  - 리프레시 토큰 유효기간: 30일
- **구현**:

```typescript
// 이메일/비밀번호 로그인 (기본)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Kakao OAuth 로그인 (Phase 6)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: { redirectTo: `${origin}/auth/callback` },
});
```

#### REQ-AUTH-003: 역할 기반 접근 제어 (RBAC)

- **역할 정의**:
  - `ADMIN`: 시스템 전체 관리
  - `CONDUCTOR`: 지휘자, 배치 작성/수정/삭제
  - `MANAGER`: 총무, 등단 현황 관리
  - `MEMBER`: 일반 찬양대원, 읽기 전용
- **권한 매트릭스**:

| 기능           | ADMIN | CONDUCTOR | MANAGER | MEMBER |
| -------------- | ----- | --------- | ------- | ------ |
| 찬양대원 관리  | ✅    | ✅        | ✅      | ❌     |
| 등단 현황 관리 | ✅    | ✅        | ✅      | 본인만 |
| 자리배치 작성  | ✅    | ✅        | ❌      | ❌     |
| 자리배치 조회  | ✅    | ✅        | ✅      | ✅     |
| 사용자 관리    | ✅    | ❌        | ❌      | ❌     |

- **RLS 정책 예시**:

```sql
-- 찬양대원은 자신의 등단 현황만 수정 가능
CREATE POLICY "Members can update their own attendance"
  ON attendances FOR UPDATE
  TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members
      WHERE email = auth.jwt() ->> 'email'
    )
  );
```

### 2.2 찬양대원 관리

#### REQ-MEMBER-001: 찬양대원 등록

- **필수 필드**:
  - `name`: 이름 (2-50자, 한글/영문)
  - `part`: 파트 (SOPRANO, ALTO, TENOR, BASS)
- **선택 필드**:
  - `height`: 키 (cm, 100-250 범위)
  - `experience`: 경력 (년, 0-50 범위)
  - `is_leader`: 리더 여부 (boolean)
  - `phone_number`: 전화번호 (010-XXXX-XXXX 형식)
  - `email`: 이메일 (유효한 형식)
  - `notes`: 특이사항 (최대 500자)
- **유효성 검증**:

```typescript
const memberSchema = z.object({
  name: z.string().min(2).max(50),
  part: z.enum(['SOPRANO', 'ALTO', 'TENOR', 'BASS', 'SPECIAL']),
  height: z.number().min(100).max(250).nullable(),
  experience: z.number().min(0).max(50).default(0),
  is_leader: z.boolean().default(false),
  phone_number: z
    .string()
    .regex(/^010-\d{4}-\d{4}$/)
    .nullable(),
  email: z.string().email().nullable(),
  notes: z.string().max(500).nullable(),
});
```

#### REQ-MEMBER-002: 찬양대원 목록 조회

- **필터링 옵션**:
  - 파트별 필터 (단일 또는 복수 선택)
  - 리더 여부 필터
  - 이름 검색 (부분 일치)
- **정렬 옵션**:
  - 이름 (오름차순/내림차순)
  - 파트 (SOPRANO → ALTO → TENOR → BASS)
  - 경력 (오름차순/내림차순)
  - 등록일 (최신순/오래된순)
- **페이지네이션**:
  - 기본 페이지 크기: 20
  - 최대 페이지 크기: 100
  - offset/limit 방식
- **구현 예시**:

```typescript
const { data, count } = await supabase
  .from('members')
  .select('*', { count: 'exact' })
  .in('part', selectedParts)
  .ilike('name', `%${searchTerm}%`)
  .order('name', { ascending: true })
  .range(offset, offset + limit - 1);
```

#### REQ-MEMBER-003: 찬양대원 수정

- **수정 가능 필드**: 모든 필드
- **제약사항**:
  - `id`는 수정 불가
  - `created_at`는 자동 관리
  - `updated_at`는 자동 업데이트 (트리거)
- **낙관적 잠금**: `updated_at` 비교로 동시 수정 감지

#### REQ-MEMBER-004: 찬양대원 삭제

- **Cascade 삭제**:
  - 해당 찬양대원의 모든 `attendances` 레코드 삭제
  - 해당 찬양대원의 모든 `seats` 레코드 삭제
- **소프트 삭제 고려**: 향후 구현 가능
- **확인 단계**: 삭제 전 사용자 확인 필수

### 2.3 등단 현황 관리

#### REQ-ATTEND-001: 등단 현황 입력

- **입력 방식**:
  - 개별 입력: 찬양대원별로 등단 여부 선택
  - 일괄 입력: 전체 찬양대원 목록에서 체크박스로 선택
  - 캘린더 입력: 캘린더 뷰에서 날짜 클릭 → 해당 날짜 등단 현황 입력
- **필드**:
  - `member_id`: 찬양대원 ID (필수)
  - `date`: 예배 날짜 (필수, DATE 타입)
  - `is_available`: 등단 가능 여부 (필수, 기본값: true)
  - `notes`: 비고 (선택, 최대 200자)
- **제약조건**:
  - `(member_id, date)` 조합은 고유해야 함 (UNIQUE constraint)
  - 동일 날짜/찬양대원에 대해 upsert 처리
- **구현**:

```typescript
const { data, error } = await supabase.from('attendances').upsert(
  {
    member_id: memberId,
    date: serviceDate,
    is_available: isAvailable,
    notes: notes,
  },
  {
    onConflict: 'member_id,date',
  }
);
```

#### REQ-ATTEND-002: 파트별 등단 현황 통계

- **표시 정보**:
  - 파트별 총 인원
  - 파트별 등단 가능 인원
  - 파트별 등단 불가 인원
  - 파트별 미응답 인원
- **실시간 업데이트** (선택적):
  - Supabase Realtime 사용
  - 등단 현황 변경 시 자동 갱신
- **구현 (RPC 함수)**:

```sql
CREATE OR REPLACE FUNCTION get_attendance_stats_by_date(target_date DATE)
RETURNS TABLE(
  part part,
  total_count BIGINT,
  available_count BIGINT,
  unavailable_count BIGINT,
  no_response_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.part,
    COUNT(m.id) as total_count,
    COUNT(a.id) FILTER (WHERE a.is_available = true) as available_count,
    COUNT(a.id) FILTER (WHERE a.is_available = false) as unavailable_count,
    COUNT(m.id) - COUNT(a.id) as no_response_count
  FROM members m
  LEFT JOIN attendances a ON m.id = a.member_id AND a.date = target_date
  GROUP BY m.part
  ORDER BY m.part;
END;
$$ LANGUAGE plpgsql;
```

#### REQ-ATTEND-003: 캘린더 뷰

- **표시 형식**: 월별 캘린더
- **날짜별 표시 정보**:
  - 등단 가능 인원 수
  - 배치 완료 여부 (arrangements 존재 시)
- **상호작용**:
  - 날짜 클릭 → 해당 날짜 등단 현황 상세 페이지 이동
  - 이전/다음 달 이동
  - 오늘로 돌아가기
- **라이브러리**: React DayPicker 또는 직접 구현

### 2.4 자리배치 UI

#### REQ-ARRANGE-001: 좌석 그리드 시스템

- **그리드 구조**:
  - 행(Row): 1-10 (가변, 최대 20)
  - 열(Column): 1-15 (가변, 최대 30)
  - 총 최대 좌석 수: 600
- **파트별 영역**:
  - 파트별 색상 구분 (UXUI_DESIGN_SYSTEM.md 참고)
  - 경계선으로 파트 구역 표시
  - 파트별 인원수 표시
- **좌석 상태**:
  - 빈 좌석: 회색 테두리
  - 배치된 좌석: 파트 색상 배경
  - 선택된 좌석: 강조 표시
  - 드래그 중인 좌석: 반투명
- **표시 정보**:
  - 찬양대원 이름
  - 리더 표시 (⭐ 아이콘)
  - 경력 표시 (선택적)

#### REQ-ARRANGE-002: 드래그 앤 드롭

- **라이브러리**: React DnD
- **드래그 소스**:
  - 좌석 → 다른 좌석 (위치 교환)
  - 사이드바 찬양대원 목록 → 좌석 (배치)
- **드래그 대상**:
  - 빈 좌석: 드롭 가능
  - 배치된 좌석: 드롭 시 교환
- **드래그 제약**:
  - 파트가 다른 영역으로는 드래그 불가 (경고 표시)
  - 드래그 중 ESC 키로 취소
- **시각적 피드백**:
  - 드래그 가능: 커서 변경
  - 드롭 가능: 좌석 하이라이트
  - 드롭 불가: 빨간색 테두리
- **구현 예시**:

```typescript
const [{ isDragging }, drag] = useDrag(() => ({
  type: 'MEMBER',
  item: { memberId, currentSeat },
  collect: (monitor) => ({
    isDragging: monitor.isDragging(),
  }),
}));

const [{ isOver, canDrop }, drop] = useDrop(() => ({
  accept: 'MEMBER',
  canDrop: (item) => isValidDrop(item, targetSeat),
  drop: (item) => handleDrop(item, targetSeat),
  collect: (monitor) => ({
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }),
}));
```

#### REQ-ARRANGE-003: Undo/Redo

- **구현 방식**: Command 패턴
- **히스토리 관리**:
  - 최대 50개 히스토리 유지
  - 액션 타입: 배치, 이동, 교환, 삭제
- **단축키**:
  - Undo: Ctrl+Z (Mac: Cmd+Z)
  - Redo: Ctrl+Shift+Z (Mac: Cmd+Shift+Z)
- **상태 관리** (Zustand):

```typescript
interface ArrangementStore {
  history: ArrangementState[];
  currentIndex: number;
  undo: () => void;
  redo: () => void;
  addHistory: (state: ArrangementState) => void;
}
```

#### REQ-ARRANGE-004: 배치 템플릿

- **저장**:
  - 현재 배치를 템플릿으로 저장
  - 템플릿 이름 (필수, 최대 100자)
  - 템플릿 설명 (선택, 최대 500자)
- **불러오기**:
  - 템플릿 선택 → 현재 배치에 적용
  - 기존 배치 덮어쓰기 경고
- **관리**:
  - 템플릿 목록 조회
  - 템플릿 수정
  - 템플릿 삭제
- **데이터 모델** (별도 테이블 추가 필요):

```sql
CREATE TABLE arrangement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- seats 배열 저장
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 AI 자동 배치

#### REQ-AI-001: AI 배치 추천 요청

- **입력**:
  - 예배 날짜
  - 등단 가능 찬양대원 목록
  - 배치 규칙 (선택)
- **출력**:
  - 추천 배치 1순위, 2순위, 3순위
  - 각 배치의 점수 및 근거
- **ML 서비스 API**:

```typescript
// POST /api/ai/recommend
{
  "date": "2025-01-19",
  "availableMembers": [
    { "id": "uuid", "name": "김소프라노", "part": "SOPRANO", ... }
  ],
  "rules": {
    "heightOrder": "ascending", // ascending, descending, ignore
    "experienceDistribution": true,
    "fixedPositions": [
      { "memberId": "uuid", "row": 1, "column": 5 }
    ]
  }
}

// Response
{
  "recommendations": [
    {
      "rank": 1,
      "score": 0.95,
      "seats": [...],
      "reasons": [
        "파트별 균형이 우수합니다",
        "키 순서가 적절합니다"
      ]
    }
  ]
}
```

#### REQ-AI-002: 배치 규칙 설정

- **키 순서 규칙**:
  - `ascending`: 앞쪽 작은 키, 뒤쪽 큰 키
  - `descending`: 앞쪽 큰 키, 뒤쪽 작은 키
  - `ignore`: 키 무시
- **경력 분산**:
  - 초보자와 경력자를 골고루 배치
  - 리더를 각 구역에 배치
- **고정 위치**:
  - 특정 찬양대원을 특정 위치에 고정
  - 여러 개 설정 가능
- **인접 배치 금지**:
  - 특정 찬양대원 간 인접 배치 금지
  - 예: 부부, 형제자매
- **저장**: user_profiles 또는 별도 settings 테이블에 JSON 형태로 저장

#### REQ-AI-003: 과거 배치 학습

- **학습 데이터**:
  - 최소 10회 이상의 배치 기록
  - 각 배치의 찬양대원 정보 (파트, 키, 경력)
  - 좌석 위치 정보
- **학습 주기**:
  - 새 배치 저장 시마다 자동 학습 (비동기)
  - 또는 수동 학습 트리거
- **ML 모델**:
  - 협업 필터링 또는 강화학습
  - Python FastAPI로 구현

### 2.6 배치표 이미지 생성

#### REQ-IMAGE-001: 배치표 미리보기

- **레이아웃**:
  - 제목: 날짜 + "등단자리표"
  - 예배 정보: 본 찬양, 축도 등
  - 지휘자 정보
  - 파트별 좌석 표 (4개 테이블)
  - 날짜 및 생성 시간
- **스타일**:
  - 폰트: Pretendard Variable (본문), Noto Serif KR (제목)
  - 색상: 파트별 색상 (UXUI_DESIGN_SYSTEM.md)
  - 여백: 충분한 공백으로 가독성 확보
- **반응형**:
  - PC: 전체 레이아웃
  - 모바일: 파트별로 분할 표시

#### REQ-IMAGE-002: 이미지 생성 및 저장

- **생성 라이브러리**:
  - html2canvas (클라이언트)
  - 또는 Puppeteer (서버, Vercel Edge Functions 제약 고려)
- **이미지 형식**:
  - PNG (기본, 투명 배경 지원)
  - JPG (선택, 파일 크기 작음)
- **해상도**:
  - 화면용: 1920x1080
  - 인쇄용: 3840x2160 (2배 스케일)
- **저장 위치**:
  - Supabase Storage: `choir-seat-images/arrangements/{arrangementId}/arrangement.png`
- **구현 예시**:

```typescript
import html2canvas from 'html2canvas';

async function generateImage(elementId: string) {
  const element = document.getElementById(elementId);
  const canvas = await html2canvas(element, {
    scale: 2, // 고해상도
    backgroundColor: '#ffffff',
  });

  return canvas.toBlob((blob) => {
    // Supabase Storage 업로드
    return supabase.storage
      .from('choir-seat-images')
      .upload(`arrangements/${id}/arrangement.png`, blob);
  }, 'image/png');
}
```

#### REQ-IMAGE-003: 이미지 공유

- **다운로드**:
  - PNG 파일 다운로드
  - 파일명: `찬양대_자리배치표_YYYYMMDD.png`
- **클립보드 복사**:
  - 이미지를 클립보드에 복사
  - Clipboard API 사용
- **카카오톡 공유** (Phase 6):
  - Kakao SDK 사용
  - 이미지 + 링크 공유

### 2.7 카카오톡 연동 (Phase 6)

#### REQ-KAKAO-001: 등단 현황 수집

- **워크플로우**:
  1. 지휘자가 등단 현황 수집 요청 (날짜 지정)
  2. 시스템이 카카오톡 메시지 발송 (전체 찬양대원)
  3. 찬양대원이 "참석" 또는 "불참" 버튼 클릭
  4. 응답이 attendances 테이블에 자동 저장
  5. 미응답자에게 리마인더 발송 (D-1, D-Day)
- **메시지 템플릿**:

```
[찬양대 등단 현황 조사]

{이름} 찬양대원님,
{날짜} {요일} 예배 등단 가능 여부를 알려주세요.

[참석] [불참]

※ 불참 시 사유를 간단히 입력해주세요.
```

- **Kakao API**:
  - Kakao Developers 앱 등록
  - 메시지 템플릿 등록
  - 친구 목록 연동 (전화번호 기반)

#### REQ-KAKAO-002: 배치표 공유

- **발송 시점**:
  - 배치 완료 후 수동 발송
  - 또는 예약 발송 (예배 2일 전)
- **발송 대상**:
  - 단체 채팅방 (전체)
  - 개인 메시지 (개별 자리 안내)
- **메시지 내용**:
  - 배치표 이미지
  - 개인별 좌석 위치 텍스트
  - 예배 정보

### 2.8 통계 및 리포트

#### REQ-STATS-001: 찬양대원별 출석률

- **계산 방식**:
  - 출석률 = (참석 횟수 / 총 예배 횟수) × 100%
  - 기간: 최근 3개월, 6개월, 1년
- **표시 정보**:
  - 찬양대원 이름
  - 파트
  - 출석률 (%)
  - 참석 횟수 / 총 횟수
- **정렬**: 출석률 높은 순
- **필터링**: 파트별

#### REQ-STATS-002: 파트별 평균 등단 인원

- **계산 방식**:
  - 기간별 파트별 평균 인원
  - 최소/최대 인원
  - 표준편차
- **시각화**:
  - 선 그래프: 시간에 따른 변화
  - 막대 그래프: 파트별 비교

#### REQ-STATS-003: 월별/분기별 리포트

- **포함 정보**:
  - 총 예배 횟수
  - 평균 등단 인원
  - 파트별 출석률
  - 배치 완료율
- **내보내기**:
  - PDF 다운로드
  - Excel 다운로드

---

## 3. 데이터 요구사항

### 3.1 데이터 모델

#### 3.1.1 members 테이블

| 컬럼         | 타입        | 제약조건                                     | 설명        |
| ------------ | ----------- | -------------------------------------------- | ----------- |
| id           | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()       | 고유 ID     |
| name         | TEXT        | NOT NULL                                     | 이름        |
| part         | part        | NOT NULL                                     | 파트 (Enum) |
| height       | INTEGER     | CHECK (height >= 100 AND height <= 250)      | 키 (cm)     |
| experience   | INTEGER     | NOT NULL, DEFAULT 0, CHECK (experience >= 0) | 경력 (년)   |
| is_leader    | BOOLEAN     | NOT NULL, DEFAULT false                      | 리더 여부   |
| phone_number | TEXT        |                                              | 전화번호    |
| email        | TEXT        | UNIQUE                                       | 이메일      |
| notes        | TEXT        |                                              | 특이사항    |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                      | 생성 시간   |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                      | 수정 시간   |

**인덱스**:

- `idx_members_part` ON part
- `idx_members_name` ON name
- `idx_members_email` ON email (UNIQUE)

**RLS 정책**:

```sql
-- 인증된 사용자 모두 조회 가능
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT TO authenticated USING (true);

-- CONDUCTOR 이상만 수정 가능
CREATE POLICY "Members are editable by conductors"
  ON members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER')
    )
  );
```

#### 3.1.2 attendances 테이블

| 컬럼         | 타입        | 제약조건                                           | 설명           |
| ------------ | ----------- | -------------------------------------------------- | -------------- |
| id           | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()             | 고유 ID        |
| member_id    | UUID        | NOT NULL, REFERENCES members(id) ON DELETE CASCADE | 찬양대원 ID    |
| date         | DATE        | NOT NULL                                           | 예배 날짜      |
| is_available | BOOLEAN     | NOT NULL, DEFAULT true                             | 등단 가능 여부 |
| notes        | TEXT        |                                                    | 비고           |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                            | 생성 시간      |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                            | 수정 시간      |

**제약조건**:

- UNIQUE (member_id, date)

**인덱스**:

- `idx_attendances_date` ON date
- `idx_attendances_member_id` ON member_id
- `idx_attendances_is_available` ON is_available

**RLS 정책**:

```sql
-- 인증된 사용자 모두 조회 가능
CREATE POLICY "Attendances are viewable by authenticated users"
  ON attendances FOR SELECT TO authenticated USING (true);

-- 본인 또는 MANAGER 이상만 수정 가능
CREATE POLICY "Attendances are editable by self or managers"
  ON attendances FOR ALL TO authenticated
  USING (
    member_id IN (
      SELECT id FROM members WHERE email = auth.jwt() ->> 'email'
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER')
    )
  );
```

#### 3.1.3 arrangements 테이블

| 컬럼         | 타입        | 제약조건                               | 설명       |
| ------------ | ----------- | -------------------------------------- | ---------- |
| id           | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid() | 고유 ID    |
| date         | DATE        | NOT NULL, UNIQUE                       | 예배 날짜  |
| title        | TEXT        | NOT NULL                               | 제목       |
| service_info | TEXT        |                                        | 예배 정보  |
| conductor    | TEXT        |                                        | 지휘자     |
| image_url    | TEXT        |                                        | 이미지 URL |
| is_published | BOOLEAN     | NOT NULL, DEFAULT false                | 공개 여부  |
| created_at   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | 생성 시간  |
| updated_at   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                | 수정 시간  |

**인덱스**:

- `idx_arrangements_date` ON date (UNIQUE)
- `idx_arrangements_is_published` ON is_published

**RLS 정책**:

```sql
-- 인증된 사용자 모두 조회 가능
CREATE POLICY "Arrangements are viewable by authenticated users"
  ON arrangements FOR SELECT TO authenticated USING (true);

-- CONDUCTOR 이상만 생성/수정 가능
CREATE POLICY "Arrangements are editable by conductors"
  ON arrangements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('ADMIN', 'CONDUCTOR')
    )
  );
```

#### 3.1.4 seats 테이블

| 컬럼           | 타입        | 제약조건                                                | 설명                     |
| -------------- | ----------- | ------------------------------------------------------- | ------------------------ |
| id             | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid()                  | 고유 ID                  |
| arrangement_id | UUID        | NOT NULL, REFERENCES arrangements(id) ON DELETE CASCADE | 배치 ID                  |
| member_id      | UUID        | NOT NULL, REFERENCES members(id) ON DELETE CASCADE      | 찬양대원 ID              |
| row            | INTEGER     | NOT NULL, CHECK (row > 0)                               | 행 번호                  |
| column         | INTEGER     | NOT NULL, CHECK (column > 0)                            | 열 번호                  |
| part           | part        | NOT NULL                                                | 파트 (중복, 빠른 조회용) |
| created_at     | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                 | 생성 시간                |

**제약조건**:

- UNIQUE (arrangement_id, row, column)

**인덱스**:

- `idx_seats_arrangement_id` ON arrangement_id
- `idx_seats_member_id` ON member_id

**RLS 정책**: arrangements와 동일

#### 3.1.5 user_profiles 테이블

| 컬럼       | 타입        | 제약조건                                                 | 설명      |
| ---------- | ----------- | -------------------------------------------------------- | --------- |
| id         | UUID        | PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE | 사용자 ID |
| email      | TEXT        | NOT NULL, UNIQUE                                         | 이메일    |
| name       | TEXT        | NOT NULL                                                 | 이름      |
| role       | TEXT        | NOT NULL, DEFAULT 'CONDUCTOR'                            | 역할      |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                  | 생성 시간 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now()                                  | 수정 시간 |

**RLS 정책**:

```sql
-- 자신의 프로필만 조회/수정 가능
CREATE POLICY "Users can view and update their own profile"
  ON user_profiles FOR ALL TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ADMIN은 모든 프로필 관리 가능
CREATE POLICY "Admins can manage all profiles"
  ON user_profiles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

### 3.2 데이터 무결성

#### 3.2.1 참조 무결성

- 모든 외래 키는 ON DELETE CASCADE 설정
- 순환 참조 방지
- 트랜잭션으로 일관성 보장

#### 3.2.2 도메인 무결성

- CHECK 제약조건으로 유효 범위 검증
- Enum 타입으로 유효 값 제한
- NOT NULL 제약으로 필수 필드 보장

#### 3.2.3 엔티티 무결성

- 모든 테이블에 PRIMARY KEY (UUID)
- UNIQUE 제약으로 중복 방지

### 3.3 데이터 백업 및 복구

#### REQ-DATA-001: 자동 백업

- **빈도**: 일 1회 (Supabase 자동 백업)
- **보관 기간**: 7일 (무료 티어), 30일 (유료 티어)
- **복구 절차**: Supabase Dashboard에서 Point-in-Time Recovery

#### REQ-DATA-002: 데이터 내보내기

- **형식**: CSV, JSON
- **대상**: 전체 테이블 또는 선택적
- **구현**: Supabase Dashboard 또는 API

---

## 4. API 요구사항

### 4.1 Supabase Client API

모든 데이터베이스 작업은 Supabase Client를 통해 수행합니다.

#### REQ-API-001: 인증 API

- `supabase.auth.signUp()`: 회원가입
- `supabase.auth.signInWithPassword()`: 로그인
- `supabase.auth.signInWithOAuth()`: OAuth 로그인
- `supabase.auth.signOut()`: 로그아웃
- `supabase.auth.getUser()`: 현재 사용자 정보
- `supabase.auth.updateUser()`: 사용자 정보 수정
- `supabase.auth.resetPasswordForEmail()`: 비밀번호 재설정

#### REQ-API-002: 데이터베이스 API

- `supabase.from(table).select()`: 조회
- `supabase.from(table).insert()`: 삽입
- `supabase.from(table).update()`: 수정
- `supabase.from(table).upsert()`: Upsert
- `supabase.from(table).delete()`: 삭제
- `supabase.rpc(functionName, params)`: RPC 함수 호출

#### REQ-API-003: 스토리지 API

- `supabase.storage.from(bucket).upload()`: 업로드
- `supabase.storage.from(bucket).download()`: 다운로드
- `supabase.storage.from(bucket).getPublicUrl()`: 공개 URL 생성
- `supabase.storage.from(bucket).remove()`: 삭제

#### REQ-API-004: Realtime API

- `supabase.channel(name).on('postgres_changes', handler)`: 실시간 구독
- `channel.unsubscribe()`: 구독 해제

### 4.2 Next.js API Routes

복잡한 비즈니스 로직은 Next.js API Routes로 처리합니다.

#### REQ-API-101: POST /api/ai/recommend

- **설명**: AI 배치 추천 요청
- **입력**: 날짜, 등단 가능 찬양대원, 배치 규칙
- **출력**: 추천 배치 목록
- **에러**:
  - 400: 잘못된 요청
  - 404: 등단 현황 없음
  - 500: ML 서비스 에러

#### REQ-API-102: POST /api/arrangements/[id]/generate-image

- **설명**: 배치표 이미지 생성
- **입력**: arrangement_id
- **출력**: 이미지 URL
- **에러**:
  - 404: 배치 없음
  - 500: 이미지 생성 실패

#### REQ-API-103: POST /api/kakao/send-attendance-request

- **설명**: 등단 현황 수집 메시지 발송
- **입력**: 날짜, 대상 찬양대원 목록
- **출력**: 발송 결과
- **에러**:
  - 400: 잘못된 요청
  - 500: Kakao API 에러

### 4.3 API 보안

#### REQ-API-SEC-001: 인증

- 모든 API는 Supabase Auth 토큰 필요
- 토큰 검증 실패 시 401 반환

#### REQ-API-SEC-002: 권한 검증

- RLS 정책으로 자동 검증
- 또는 API Routes에서 수동 검증

#### REQ-API-SEC-003: Rate Limiting

- Supabase 기본 Rate Limit 적용
- 필요시 Vercel Edge Middleware에서 추가 제한

#### REQ-API-SEC-004: CORS

- Next.js에서 자동 처리
- 필요시 커스텀 헤더 설정

---

## 5. UI/UX 요구사항

### 5.1 반응형 디자인

#### REQ-UI-001: 브레이크포인트

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

#### REQ-UI-002: 레이아웃

- **Mobile**: 단일 컬럼, 햄버거 메뉴
- **Tablet**: 2컬럼, 사이드바 접기/펴기
- **Desktop**: 3컬럼, 고정 사이드바

### 5.2 접근성 (WCAG 2.1 AA)

#### REQ-UI-003: 키보드 네비게이션

- 모든 인터랙티브 요소 Tab으로 접근 가능
- 포커스 표시 (outline)
- 단축키 지원 (Ctrl+Z, Ctrl+S 등)

#### REQ-UI-004: 스크린 리더

- 모든 이미지에 alt 텍스트
- aria-label, aria-describedby 적절히 사용
- semantic HTML 사용 (header, nav, main, footer)

#### REQ-UI-005: 색상 대비

- 텍스트와 배경 대비 최소 4.5:1
- 큰 텍스트 (18pt+) 대비 최소 3:1
- 색상만으로 정보 전달 금지 (아이콘, 텍스트 병행)

### 5.3 성능

#### REQ-UI-006: 초기 로딩

- First Contentful Paint (FCP): < 1.5초
- Largest Contentful Paint (LCP): < 2.5초
- Time to Interactive (TTI): < 3.5초

#### REQ-UI-007: 이미지 최적화

- Next.js Image 컴포넌트 사용
- WebP 형식 (fallback: PNG/JPG)
- Lazy loading

#### REQ-UI-008: 코드 스플리팅

- 페이지별 자동 분할
- 동적 import로 큰 컴포넌트 분할
- React.lazy + Suspense

### 5.4 사용자 경험

#### REQ-UI-009: 로딩 상태

- 모든 비동기 작업에 로딩 인디케이터
- Skeleton UI 사용 (목록, 카드 등)
- 진행률 표시 (이미지 생성 등)

#### REQ-UI-010: 에러 처리

- 사용자 친화적인 에러 메시지
- 에러 복구 방법 제시
- 에러 바운더리로 전체 앱 크래시 방지

#### REQ-UI-011: 성공 피드백

- 액션 성공 시 토스트 메시지
- 아이콘 + 텍스트 (✅ 저장되었습니다)
- 3초 후 자동 사라짐

---

## 6. 보안 요구사항

### 6.1 인증 및 인가

#### REQ-SEC-001: 비밀번호 정책

- 최소 8자
- 영문, 숫자, 특수문자 각 1개 이상
- Supabase Auth 기본 정책 사용

#### REQ-SEC-002: 세션 관리

- 쿠키 기반 세션
- HttpOnly, Secure, SameSite=Lax 플래그
- 세션 만료: 30일
- 액세스 토큰 만료: 1시간

#### REQ-SEC-003: 다중 인증 (MFA)

- Phase 7 이후 구현
- TOTP (Google Authenticator 등)
- Supabase Auth MFA 기능 사용

### 6.2 데이터 보호

#### REQ-SEC-004: 전송 중 암호화

- HTTPS 강제 (Vercel 자동 처리)
- TLS 1.2 이상

#### REQ-SEC-005: 저장 암호화

- 비밀번호: bcrypt (Supabase Auth 자동)
- 민감 정보: Supabase 자동 암호화
- Service Role Key: 환경 변수, 서버 전용

#### REQ-SEC-006: Row Level Security (RLS)

- 모든 테이블에 RLS 활성화
- 최소 권한 원칙
- 정책 테스트 및 감사

### 6.3 입력 검증

#### REQ-SEC-007: 클라이언트 검증

- Zod 스키마로 타입 검증
- 필수 필드, 길이, 형식 검증
- 사용자 친화적인 에러 메시지

#### REQ-SEC-008: 서버 검증

- Supabase RLS 정책
- API Routes에서 추가 검증
- SQL Injection 방지 (Supabase Client 자동)

#### REQ-SEC-009: XSS 방지

- React 자동 escaping
- dangerouslySetInnerHTML 사용 금지
- Content Security Policy (CSP) 설정

### 6.4 로깅 및 모니터링

#### REQ-SEC-010: 보안 이벤트 로깅

- 로그인 시도 (성공/실패)
- 권한 위반 시도
- 데이터 변경 (생성/수정/삭제)
- Supabase Auth Logs 활용

#### REQ-SEC-011: 모니터링

- Vercel Analytics
- Sentry (에러 추적)
- Supabase Dashboard (데이터베이스 성능)

---

## 7. 성능 요구사항

### 7.1 응답 시간

#### REQ-PERF-001: 페이지 로딩

- 초기 로딩 (캐시 없음): < 3초
- 후속 로딩 (캐시 있음): < 1초
- 페이지 전환: < 500ms

#### REQ-PERF-002: API 응답

- 단순 조회: < 500ms
- 복잡한 조회 (JOIN): < 1초
- 데이터 삽입/수정: < 500ms
- AI 배치 추천: < 5초
- 이미지 생성: < 3초

#### REQ-PERF-003: 실시간 업데이트

- Realtime 이벤트 전달: < 100ms
- UI 반영: < 200ms

### 7.2 처리량

#### REQ-PERF-004: 동시 사용자

- 최소: 100명
- 목표: 500명
- Vercel, Supabase 자동 스케일링

#### REQ-PERF-005: 데이터 볼륨

- 찬양대원: 최대 500명
- 배치 기록: 무제한 (아카이브 고려)
- 이미지: 버킷당 최대 100GB (Supabase 무료 티어)

### 7.3 최적화 전략

#### REQ-PERF-006: 캐싱

- **클라이언트**: React Query (staleTime: 5분)
- **CDN**: Vercel Edge Network (정적 에셋)
- **데이터베이스**: Supabase Connection Pooling

#### REQ-PERF-007: 인덱싱

- 모든 외래 키에 인덱스
- 자주 조회하는 컬럼에 인덱스
- 복합 인덱스 (member_id, date 등)

#### REQ-PERF-008: 쿼리 최적화

- N+1 문제 방지 (JOIN 사용)
- 필요한 컬럼만 SELECT
- 페이지네이션으로 대량 데이터 처리

---

## 8. 테스트 요구사항

### 8.1 단위 테스트

#### REQ-TEST-001: 컴포넌트 테스트

- **프레임워크**: Vitest + React Testing Library
- **커버리지**: 80% 이상
- **대상**:
  - UI 컴포넌트
  - 커스텀 훅
  - 유틸리티 함수
- **예시**:

```typescript
import { render, screen } from '@testing-library/react';
import { MemberCard } from '@/components/features/members/MemberCard';

describe('MemberCard', () => {
  it('renders member information correctly', () => {
    const member = {
      id: '1',
      name: '김소프라노',
      part: 'SOPRANO',
    };
    render(<MemberCard member={member} />);
    expect(screen.getByText('김소프라노')).toBeInTheDocument();
  });
});
```

#### REQ-TEST-002: API 테스트

- **대상**: Next.js API Routes
- **Mock**: Supabase Client
- **검증**:
  - 정상 요청/응답
  - 에러 처리
  - 권한 검증

### 8.2 통합 테스트

#### REQ-TEST-003: E2E 테스트

- **프레임워크**: Playwright
- **커버리지**: 주요 사용자 플로우
- **시나리오**:
  - 회원가입 → 로그인
  - 찬양대원 등록 → 등단 현황 입력
  - 자리배치 생성 → 드래그 앤 드롭 → 저장
  - 배치표 이미지 생성 → 다운로드
- **환경**: Staging (Supabase Test 프로젝트)

### 8.3 성능 테스트

#### REQ-TEST-004: 부하 테스트

- **도구**: k6 또는 Artillery
- **시나리오**:
  - 동시 사용자 100명
  - 5분간 지속
- **검증**:
  - 응답 시간 < 1초 (95 percentile)
  - 에러율 < 1%

#### REQ-TEST-005: 스트레스 테스트

- **시나리오**: 동시 사용자 점진적 증가
- **목표**: 시스템 한계 확인

### 8.4 보안 테스트

#### REQ-TEST-006: RLS 정책 테스트

- **방법**: Supabase SQL Editor에서 수동 테스트
- **검증**:
  - 인증 없이 접근 불가
  - 다른 사용자 데이터 접근 불가
  - 권한에 따른 접근 제어

#### REQ-TEST-007: 취약점 스캔

- **도구**: OWASP ZAP 또는 Snyk
- **주기**: 월 1회

---

## 9. 배포 요구사항

### 9.1 환경 구성

#### REQ-DEPLOY-001: 환경 분리

- **Development**: 로컬 (Supabase CLI)
- **Staging**: Vercel Preview + Supabase Staging
- **Production**: Vercel Production + Supabase Production

#### REQ-DEPLOY-002: 환경 변수

- `.env.local` (로컬)
- Vercel Environment Variables (Staging, Production)
- 환경별로 다른 Supabase 프로젝트 사용

### 9.2 CI/CD

#### REQ-DEPLOY-003: 자동 배포

- **트리거**: main 브랜치 push
- **프로세스**:
  1. 린트 및 타입 체크
  2. 단위 테스트 실행
  3. 빌드
  4. Vercel 배포
  5. E2E 테스트 (Staging)
- **도구**: GitHub Actions + Vercel

#### REQ-DEPLOY-004: 마이그레이션

- Supabase 마이그레이션 파일 관리
- `npx supabase db push`로 원격 적용
- 롤백 전략: Supabase Point-in-Time Recovery

### 9.3 모니터링

#### REQ-DEPLOY-005: 애플리케이션 모니터링

- **Vercel Analytics**: 성능 메트릭
- **Sentry**: 에러 추적 및 알림
- **Supabase Dashboard**: 데이터베이스 성능

#### REQ-DEPLOY-006: 알림

- **에러 알림**: Sentry → Slack/Email
- **성능 저하**: Vercel → Email
- **데이터베이스 이슈**: Supabase → Email

### 9.4 백업 및 복구

#### REQ-DEPLOY-007: 백업

- **데이터베이스**: Supabase 자동 백업 (일 1회)
- **이미지**: Supabase Storage (자동 복제)
- **코드**: Git (GitHub)

#### REQ-DEPLOY-008: 재해 복구 (DR)

- **RTO** (Recovery Time Objective): 1시간
- **RPO** (Recovery Point Objective): 1일
- **절차**:
  1. Supabase 백업에서 복구
  2. Vercel에서 이전 배포 롤백
  3. 데이터 무결성 검증

---

## 10. 부록

### 10.1 용어 정의

| 용어 | 정의                                              |
| ---- | ------------------------------------------------- |
| 등단 | 찬양대원이 예배 시 찬양대석에 참여하는 것         |
| 파트 | 성부 (Soprano, Alto, Tenor, Bass, Special)        |
| 배치 | 찬양대원을 좌석에 할당하는 작업                   |
| RLS  | Row Level Security, Supabase의 행 수준 보안 정책  |
| RPC  | Remote Procedure Call, Supabase에서 SQL 함수 호출 |

### 10.2 참고 문서

- [PRD.md](./PRD.md) - 제품 요구사항 문서
- [CLAUDE.md](./CLAUDE.md) - 개발 가이드
- [API_SPECIFICATION_SUPABASE.md](./API_SPECIFICATION_SUPABASE.md) - API 명세서
- [UXUI_DESIGN_SYSTEM.md](./UXUI_DESIGN_SYSTEM.md) - 디자인 시스템
- [Supabase 문서](https://supabase.com/docs)
- [Next.js 문서](https://nextjs.org/docs)

### 10.3 변경 이력

| 버전 | 날짜       | 변경 내용                   | 작성자 |
| ---- | ---------- | --------------------------- | ------ |
| 2.0  | 2025-01-18 | Supabase 기반으로 전면 개편 | Team   |
| 1.0  | 2024-11-18 | 초기 작성                   | Team   |
