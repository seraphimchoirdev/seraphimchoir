# API Specification (Supabase)

**버전**: 2.0
**최종 수정일**: 2025년 1월 18일
**작성자**: Choir Seat Arranger Team

---

## 목차

1. [개요](#1-개요)
2. [인증 (Supabase Auth)](#2-인증-supabase-auth)
3. [데이터베이스 작업 (Supabase Client)](#3-데이터베이스-작업-supabase-client)
4. [스토리지 (Supabase Storage)](#4-스토리지-supabase-storage)
5. [실시간 기능 (Supabase Realtime)](#5-실시간-기능-supabase-realtime)
6. [Next.js API Routes (보조)](#6-nextjs-api-routes-보조)
7. [에러 처리](#7-에러-처리)

---

## 1. 개요

### 1.1 아키텍처 변경

Supabase 도입으로 인한 주요 변경사항:

- **이전**: Next.js API Routes + Prisma ORM
- **현재**: Supabase Client (클라이언트 및 서버) + Next.js API Routes (보조적)

### 1.2 Supabase Client 사용 패턴

#### 클라이언트 컴포넌트

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';

export default function MemberList() {
  const supabase = createClient();

  // 데이터 조회
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('name');
}
```

#### 서버 컴포넌트

```typescript
import { createClient } from '@/lib/supabase/server';

export default async function MemberPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*');
}
```

#### API Routes

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
```

### 1.3 Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있으며, 인증된 사용자만 데이터에 접근할 수 있습니다.

```sql
-- 예시: members 테이블 RLS 정책
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (true);
```

---

## 2. 인증 (Supabase Auth)

### 2.1 회원가입

```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// 이메일/비밀번호 회원가입
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      name: '홍길동',
      role: 'CONDUCTOR'
    }
  }
});
```

**응답**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {
      "name": "홍길동",
      "role": "CONDUCTOR"
    }
  },
  "session": {
    "access_token": "eyJhbG...",
    "refresh_token": "...",
    "expires_in": 3600
  }
}
```

### 2.2 로그인

```typescript
// 이메일/비밀번호 로그인 (기본)
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});

// Kakao OAuth 로그인 (Phase 6)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: `${location.origin}/auth/callback`
  }
});
```

### 2.3 로그아웃

```typescript
const { error } = await supabase.auth.signOut();
```

### 2.4 현재 사용자 정보

```typescript
// 클라이언트에서
const { data: { user } } = await supabase.auth.getUser();

// 서버에서
const { data: { user } } = await supabase.auth.getUser();
```

### 2.5 비밀번호 재설정

```typescript
// 재설정 이메일 발송
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: `${location.origin}/auth/reset-password`
  }
);

// 새 비밀번호 설정
const { data, error } = await supabase.auth.updateUser({
  password: 'newpassword'
});
```

---

## 3. 데이터베이스 작업 (Supabase Client)

### 3.1 Members (찬양대원)

#### 3.1.1 찬양대원 목록 조회

```typescript
const supabase = createClient();

// 전체 조회
const { data, error } = await supabase
  .from('members')
  .select('*')
  .order('name');

// 파트별 필터링
const { data, error } = await supabase
  .from('members')
  .select('*')
  .eq('part', 'SOPRANO')
  .order('name');

// 검색
const { data, error } = await supabase
  .from('members')
  .select('*')
  .ilike('name', '%김%');

// 페이지네이션
const { data, error, count } = await supabase
  .from('members')
  .select('*', { count: 'exact' })
  .range(0, 9); // 0-9번째 레코드 (10개)
```

**응답**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "김소프라노",
      "part": "SOPRANO",
      "height": 165,
      "experience": 3,
      "is_leader": false,
      "phone_number": "010-1234-5678",
      "email": "soprano@example.com",
      "notes": null,
      "created_at": "2025-01-18T00:00:00Z",
      "updated_at": "2025-01-18T00:00:00Z"
    }
  ],
  "count": 42
}
```

#### 3.1.2 찬양대원 등록

```typescript
const { data, error } = await supabase
  .from('members')
  .insert({
    name: '박알토',
    part: 'ALTO',
    height: 160,
    experience: 2,
    is_leader: false,
    phone_number: '010-9876-5432',
    email: 'alto@example.com'
  })
  .select()
  .single();
```

#### 3.1.3 찬양대원 수정

```typescript
const { data, error } = await supabase
  .from('members')
  .update({
    height: 162,
    experience: 3,
    is_leader: true
  })
  .eq('id', 'member-uuid')
  .select()
  .single();
```

#### 3.1.4 찬양대원 삭제

```typescript
const { error } = await supabase
  .from('members')
  .delete()
  .eq('id', 'member-uuid');
```

### 3.2 Attendances (등단 현황)

#### 3.2.1 등단 현황 조회

```typescript
// 특정 날짜의 등단 현황 (Member 정보 포함)
const { data, error } = await supabase
  .from('attendances')
  .select(`
    *,
    member:members(id, name, part)
  `)
  .eq('date', '2025-01-19')
  .order('member.part', { ascending: true });
```

**응답**:
```json
{
  "data": [
    {
      "id": "uuid",
      "member_id": "member-uuid",
      "date": "2025-01-19",
      "is_available": true,
      "notes": null,
      "member": {
        "id": "member-uuid",
        "name": "김소프라노",
        "part": "SOPRANO"
      }
    }
  ]
}
```

#### 3.2.2 등단 현황 등록/수정 (Upsert)

```typescript
const { data, error } = await supabase
  .from('attendances')
  .upsert({
    member_id: 'member-uuid',
    date: '2025-01-19',
    is_available: true,
    notes: '정상 출석'
  }, {
    onConflict: 'member_id,date' // unique constraint
  })
  .select();
```

#### 3.2.3 파트별 등단 통계

```typescript
// RPC 함수 사용 (Supabase에서 미리 정의 필요)
const { data, error } = await supabase
  .rpc('get_attendance_stats_by_date', {
    target_date: '2025-01-19'
  });
```

### 3.3 Arrangements (자리배치표)

#### 3.3.1 자리배치표 목록 조회

```typescript
const { data, error } = await supabase
  .from('arrangements')
  .select('*')
  .order('date', { ascending: false })
  .limit(10);
```

#### 3.3.2 자리배치표 생성

```typescript
const { data, error } = await supabase
  .from('arrangements')
  .insert({
    date: '2025-01-19',
    title: '2025년 1월 19일 주일 예배 등단자리표',
    service_info: '본 찬양: 네 주는 강한 성이요',
    conductor: '김지휘',
    is_published: false
  })
  .select()
  .single();
```

#### 3.3.3 자리배치표 상세 조회 (Seats 포함)

```typescript
const { data, error } = await supabase
  .from('arrangements')
  .select(`
    *,
    seats(
      *,
      member:members(id, name, part)
    )
  `)
  .eq('id', 'arrangement-uuid')
  .single();
```

**응답**:
```json
{
  "id": "uuid",
  "date": "2025-01-19",
  "title": "2025년 1월 19일 주일 예배 등단자리표",
  "service_info": "본 찬양: 네 주는 강한 성이요",
  "conductor": "김지휘",
  "image_url": null,
  "is_published": false,
  "seats": [
    {
      "id": "seat-uuid",
      "arrangement_id": "arrangement-uuid",
      "member_id": "member-uuid",
      "row": 1,
      "column": 1,
      "part": "SOPRANO",
      "member": {
        "id": "member-uuid",
        "name": "김소프라노",
        "part": "SOPRANO"
      }
    }
  ]
}
```

### 3.4 Seats (좌석)

#### 3.4.1 좌석 배치 (Bulk Insert)

```typescript
const seats = [
  { arrangement_id: 'arr-uuid', member_id: 'm1-uuid', row: 1, column: 1, part: 'SOPRANO' },
  { arrangement_id: 'arr-uuid', member_id: 'm2-uuid', row: 1, column: 2, part: 'SOPRANO' },
  // ...
];

const { data, error } = await supabase
  .from('seats')
  .insert(seats)
  .select();
```

#### 3.4.2 좌석 위치 변경

```typescript
const { data, error } = await supabase
  .from('seats')
  .update({
    row: 2,
    column: 3
  })
  .eq('id', 'seat-uuid')
  .select();
```

#### 3.4.3 배치 초기화 (기존 좌석 삭제 후 재배치)

```typescript
// Transaction 사용 (RPC 함수 추천)
const { data, error } = await supabase
  .rpc('reset_and_rearrange_seats', {
    arrangement_id: 'arr-uuid',
    new_seats: [
      { member_id: 'm1-uuid', row: 1, column: 1, part: 'SOPRANO' },
      // ...
    ]
  });
```

---

## 4. 스토리지 (Supabase Storage)

### 4.1 버킷 구조

```
choir-seat-images/
├── arrangements/
│   └── {arrangement_id}/
│       └── arrangement.png
└── public/
    └── logos/
        └── church-logo.png
```

### 4.2 배치표 이미지 업로드

```typescript
const supabase = createClient();

// Blob 또는 File 객체
const imageBlob = await generateArrangementImage(arrangement);

const { data, error } = await supabase.storage
  .from('choir-seat-images')
  .upload(`arrangements/${arrangementId}/arrangement.png`, imageBlob, {
    contentType: 'image/png',
    upsert: true // 기존 파일 덮어쓰기
  });

// 업로드 후 public URL 생성
const { data: { publicUrl } } = supabase.storage
  .from('choir-seat-images')
  .getPublicUrl(`arrangements/${arrangementId}/arrangement.png`);

// arrangements 테이블 업데이트
await supabase
  .from('arrangements')
  .update({ image_url: publicUrl })
  .eq('id', arrangementId);
```

### 4.3 이미지 다운로드

```typescript
const { data, error } = await supabase.storage
  .from('choir-seat-images')
  .download(`arrangements/${arrangementId}/arrangement.png`);

// Blob을 URL로 변환
const url = URL.createObjectURL(data);
```

### 4.4 이미지 삭제

```typescript
const { error } = await supabase.storage
  .from('choir-seat-images')
  .remove([`arrangements/${arrangementId}/arrangement.png`]);
```

---

## 5. 실시간 기능 (Supabase Realtime)

### 5.1 등단 현황 실시간 업데이트

```typescript
const supabase = createClient();

// 특정 날짜의 등단 현황 구독
const channel = supabase
  .channel('attendances-2025-01-19')
  .on(
    'postgres_changes',
    {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'attendances',
      filter: `date=eq.2025-01-19`
    },
    (payload) => {
      console.log('Change received!', payload);
      // UI 업데이트 로직
    }
  )
  .subscribe();

// 구독 해제
channel.unsubscribe();
```

### 5.2 자리배치 실시간 협업

```typescript
// Seats 테이블 변경 구독
const channel = supabase
  .channel(`arrangement-${arrangementId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'seats',
      filter: `arrangement_id=eq.${arrangementId}`
    },
    (payload) => {
      // 좌석 변경 반영
      updateSeatsUI(payload);
    }
  )
  .subscribe();
```

---

## 6. Next.js API Routes (보조)

일부 복잡한 비즈니스 로직은 Next.js API Routes로 처리할 수 있습니다.

### 6.1 AI 배치 추천

```typescript
// app/api/ai/recommend/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { arrangementId } = await request.json();

  // 1. 출석 가능한 찬양대원 조회
  const { data: arrangement } = await supabase
    .from('arrangements')
    .select('date')
    .eq('id', arrangementId)
    .single();

  const { data: attendances } = await supabase
    .from('attendances')
    .select('member:members(*)')
    .eq('date', arrangement.date)
    .eq('is_available', true);

  // 2. ML 서비스 호출
  const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      members: attendances.map(a => a.member),
      rules: {} // 배치 규칙
    })
  });

  const recommendation = await mlResponse.json();

  return NextResponse.json({ data: recommendation });
}
```

### 6.2 배치표 이미지 생성

```typescript
// app/api/arrangements/[id]/generate-image/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const arrangementId = params.id;

  // 1. 배치 데이터 조회
  const { data: arrangement } = await supabase
    .from('arrangements')
    .select(`
      *,
      seats(*, member:members(*))
    `)
    .eq('id', arrangementId)
    .single();

  // 2. 이미지 생성 (Canvas API 또는 라이브러리 사용)
  const imageBuffer = await generateArrangementImage(arrangement);

  // 3. Supabase Storage에 업로드
  const { data: uploadData } = await supabase.storage
    .from('choir-seat-images')
    .upload(
      `arrangements/${arrangementId}/arrangement.png`,
      imageBuffer,
      { contentType: 'image/png', upsert: true }
    );

  const { data: { publicUrl } } = supabase.storage
    .from('choir-seat-images')
    .getPublicUrl(`arrangements/${arrangementId}/arrangement.png`);

  // 4. arrangements 테이블 업데이트
  await supabase
    .from('arrangements')
    .update({ image_url: publicUrl })
    .eq('id', arrangementId);

  return NextResponse.json({
    success: true,
    imageUrl: publicUrl
  });
}
```

---

## 7. 에러 처리

### 7.1 Supabase 에러 유형

```typescript
const { data, error } = await supabase
  .from('members')
  .select('*');

if (error) {
  // PostgrestError
  console.error('Code:', error.code);
  console.error('Message:', error.message);
  console.error('Details:', error.details);
  console.error('Hint:', error.hint);
}
```

### 7.2 일반적인 에러 코드

| 코드 | 의미 | 대응 방안 |
|------|------|-----------|
| `PGRST116` | Row Level Security 위반 | 인증 상태 확인 |
| `23505` | Unique constraint 위반 | 중복 데이터 확인 |
| `23503` | Foreign key constraint 위반 | 참조 데이터 존재 확인 |
| `42501` | 권한 부족 | RLS 정책 확인 |

### 7.3 에러 처리 패턴

```typescript
async function fetchMembers() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('members')
    .select('*');

  if (error) {
    // 인증 에러
    if (error.code === 'PGRST116') {
      throw new Error('로그인이 필요합니다.');
    }

    // 일반 에러
    throw new Error(`데이터 조회 실패: ${error.message}`);
  }

  return data;
}
```

---

## 8. TypeScript 타입 활용

```typescript
import type { Database } from '@/types/database.types';

// 헬퍼 타입 사용
import type { Member, MemberInsert, MemberUpdate } from '@/types/database.types';

// 새 찬양대원 등록
const newMember: MemberInsert = {
  name: '이테너',
  part: 'TENOR',
  height: 175,
  experience: 1
};

const { data } = await supabase
  .from('members')
  .insert(newMember)
  .select()
  .single();

// data의 타입은 Member
const member: Member = data;
```

---

## 9. 보안 고려사항

### 9.1 Service Role Key 사용 주의

```typescript
// ❌ 클라이언트에서 절대 사용 금지
import { createAdminClient } from '@/lib/supabase/server';

// ✅ 서버 컴포넌트 또는 API Routes에서만 사용
// app/api/admin/route.ts
export async function POST(request: NextRequest) {
  const supabase = createAdminClient(); // RLS 우회

  // 관리자 전용 작업
  const { data } = await supabase
    .from('user_profiles')
    .update({ role: 'ADMIN' })
    .eq('id', userId);
}
```

### 9.2 RLS 정책 테스트

```sql
-- Supabase Dashboard에서 테스트
-- Settings > Database > Roles > authenticator 선택
SELECT * FROM members; -- RLS 적용된 쿼리 테스트
```

---

## 10. 참고 자료

- [Supabase JavaScript Client 문서](https://supabase.com/docs/reference/javascript)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2.0 | 2025-01-18 | Supabase 기반으로 전면 개편 | Team |
| 1.0 | 2024-11-18 | Prisma 기반 초기 작성 | Team |
