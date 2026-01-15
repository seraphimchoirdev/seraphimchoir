# 찬양대 자리배치 시스템 - 권한 시스템 가이드

> 이 문서는 시스템의 역할 기반 접근 제어(RBAC) 구조를 설명합니다.
> 마지막 업데이트: 2026-01-15

---

## 목차

1. [역할(Role) 구조](#역할role-구조)
2. [권한 매트릭스](#권한-매트릭스)
3. [페이지별 접근 권한](#페이지별-접근-권한)
4. [RLS 정책 (데이터베이스)](#rls-정책-데이터베이스)
5. [개발자 가이드](#개발자-가이드)

---

## 역할(Role) 구조

시스템은 6단계 역할 체계를 사용합니다.

| 역할 | 한글명 | 설명 |
|------|--------|------|
| `ADMIN` | 관리자 | 시스템 전체 관리 (사용자 관리, 역할 부여, 대원 연결 승인) |
| `CONDUCTOR` | 지휘자 | 자리배치 생성/편집/삭제, 대원 관리, 출석 관리, 지휘자 메모 |
| `MANAGER` | 총무 | 대원 관리, 출석 관리, 문서 관리, 긴급 자리배치 수정 (공유 상태만) |
| `STAFF` | 간사 | 문서 조회, 자리배치 조회, 본인 출석 관리 |
| `PART_LEADER` | 파트장 | 자기 파트 출석 관리, 자리배치 조회, 문서 조회 |
| `MEMBER` | 대원 | 본인 출석 관리, 자리배치 조회 |

### 역할 vs 직책 (title)

- **역할(role)**: 시스템 권한을 결정하는 분류 (예: MANAGER)
- **직책(title)**: 표시용 직책명 (예: 총무, 부총무, 회계, 서기)

같은 `MANAGER` 역할이라도 `title`이 "총무", "부총무", "회계" 등으로 다를 수 있습니다.

---

## 권한 매트릭스

각 역할별 세부 권한입니다. (`src/app/api/auth/types.ts` 참조)

### 사용자/시스템 관리

| 권한 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 사용자 관리 (`canManageUsers`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 역할 부여 (`canManageRoles`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 대원 연결 승인 (`canApproveLinks`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 관리자 페이지 접근 (`canAccessAdmin`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 대원 관리

| 권한 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 대원 추가/수정 (`canManageMembers`) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 대원 삭제 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 대원 목록 조회 (`canViewMembers`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

> PART_LEADER는 대원을 **등록** 및 **수정**할 수 있지만, **삭제**는 MANAGER 이상만 가능합니다.

### 출석 관리

| 권한 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 전체 출석 관리 (`canManageAttendance`) | ✅ | ✅ | ✅ | ❌ | ✅* | ❌ |
| 본인 출석 관리 (`canManageOwnAttendance`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 파트 제한 (`partRestricted`) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

> *PART_LEADER는 자기 파트 대원의 출석만 관리 가능

### 자리배치 관리

| 권한 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 배치표 생성 (`canCreateArrangements`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 배치표 편집 (`canEditArrangements`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 배치표 삭제 (`canDeleteArrangements`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 긴급 수정 (`canEmergencyEditArrangements`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 배치표 조회 (`canViewArrangements`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> 긴급 수정: 배치표 상태가 `SHARED`일 때만 MANAGER가 수정 가능

### 문서 관리

| 권한 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 문서 업로드/삭제 (`canManageDocuments`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 문서 조회 (`canViewDocuments`) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### 기타

| 권한 | ADMIN | CONDUCTOR | MANAGER | STAFF | PART_LEADER | MEMBER |
|------|:-----:|:---------:|:-------:|:-----:|:-----------:|:------:|
| 지휘자 메모 열람 (`canViewConductorNotes`) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

> **지휘자 메모 보안**: 지휘자 메모는 AES-256-GCM으로 암호화되어 저장되며, **오직 CONDUCTOR만** API 접근이 가능합니다. ADMIN을 포함한 다른 역할은 DB에서 직접 확인하거나 복호화할 수 없습니다.

---

## 페이지별 접근 권한

### 네비게이션 메뉴

| 메뉴 | URL | 접근 가능 역할 |
|------|-----|---------------|
| 대시보드 | `/dashboard` | 모든 인증 사용자 |
| 관리자 | `/admin` | ADMIN |
| 찬양대원 관리 | `/members` | ADMIN, CONDUCTOR, MANAGER, PART_LEADER |
| 출석 관리 | `/attendances` | ADMIN, CONDUCTOR, MANAGER, PART_LEADER |
| 자리배치 | `/arrangements` | 모든 역할 |
| 문서 아카이브 | `/documents` | ADMIN, CONDUCTOR, MANAGER, STAFF |
| 내 출석 | `/my-attendance` | 대원 연결된 사용자 |
| 통계 | `/statistics` | ADMIN, CONDUCTOR, MANAGER |
| 예배/행사 관리 | `/service-schedules` | ADMIN, CONDUCTOR, MANAGER |
| 지휘자 메모 | `/members/${memberId}/conductor-notes` | CONDUCTOR |

### 관리자 페이지 (`/admin/*`)

| 페이지 | 설명 | 접근 |
|--------|------|------|
| `/admin` | 관리자 대시보드 | ADMIN |
| `/admin/users` | 사용자/역할 관리 | ADMIN |
| `/admin/member-links` | 대원 연결 승인 | ADMIN |

### 자리배치 편집 권한

배치표 상태에 따른 편집 권한:

| 상태 | ADMIN | CONDUCTOR | MANAGER | 기타 |
|------|:-----:|:---------:|:-------:|:----:|
| `DRAFT` (초안) | ✅ | ✅ | ❌ | ❌ |
| `SHARED` (공유됨) | ✅ | ✅ | ✅* | ❌ |
| `CONFIRMED` (확정됨) | ❌ | ❌ | ❌ | ❌ |

> *MANAGER의 SHARED 상태 편집은 "긴급 수정" 모드로 표시됨

---

## RLS 정책 (데이터베이스)

Supabase Row Level Security(RLS) 정책입니다. (`supabase/migrations/20260115100000_update_rls_policies_for_new_roles.sql` 참조)

### 테이블별 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `members` | 모든 인증 사용자 | ADMIN~PART_LEADER | ADMIN~PART_LEADER | ADMIN, CONDUCTOR, MANAGER |
| `attendances` | 모든 인증 사용자 | MANAGER+ / PART_LEADER(파트) / MEMBER(본인) | ← | ← |
| `arrangements` | 모든 인증 사용자 | ADMIN, CONDUCTOR | ADMIN, CONDUCTOR / MANAGER(SHARED만) | ADMIN, CONDUCTOR |
| `seats` | 모든 인증 사용자 | ADMIN, CONDUCTOR / MANAGER(SHARED만) | ← | ← |
| `documents` | ADMIN~STAFF | ADMIN, CONDUCTOR, MANAGER | ← | ← |
| `service_schedules` | 모든 인증 사용자 | ADMIN, CONDUCTOR, MANAGER | ← | ← |
| `choir_events` | 모든 인증 사용자 | ADMIN, CONDUCTOR, MANAGER | ← | ← |

### attendances 테이블 상세

출석 테이블은 역할별로 다른 정책이 적용됩니다:

```sql
-- ADMIN, CONDUCTOR, MANAGER: 모든 출석 관리
CREATE POLICY "Attendances editable by managers"
  ON attendances FOR ALL
  USING (public.has_role(ARRAY['ADMIN', 'CONDUCTOR', 'MANAGER']));

-- PART_LEADER: 자기 파트만
CREATE POLICY "Attendances editable by part leaders for their part"
  ON attendances FOR ALL
  USING (
    public.get_user_role() = 'PART_LEADER'
    AND EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id = attendances.member_id
        AND m.part = public.get_linked_member_part()
    )
  );

-- MEMBER: 본인 출석만
CREATE POLICY "Attendances editable by member for self"
  ON attendances FOR ALL
  USING (
    public.get_user_role() = 'MEMBER'
    AND member_id = public.get_linked_member_id()
  );
```

### 헬퍼 함수

RLS에서 사용하는 PostgreSQL 함수:

| 함수 | 반환 타입 | 설명 |
|------|----------|------|
| `get_user_role()` | TEXT | 현재 사용자의 역할 |
| `has_role(TEXT[])` | BOOLEAN | 역할 배열 중 하나라도 가지고 있는지 |
| `get_linked_member_id()` | UUID | 현재 사용자와 연결된 대원 ID |
| `get_linked_member_part()` | part (ENUM) | 현재 사용자와 연결된 대원의 파트 |
| `get_arrangement_status(UUID)` | TEXT | 배치표의 상태 |

---

## 개발자 가이드

### 권한 체크 훅

`src/hooks/useAuth.ts`에서 제공하는 훅들:

#### 1. `useAuth()` - 기본 인증 훅

```tsx
const { user, profile, isLoading, hasRole, signOut } = useAuth();

// 역할 확인
if (hasRole(['ADMIN', 'CONDUCTOR'])) {
  // ADMIN 또는 CONDUCTOR만 실행
}
```

#### 2. `usePermission()` - 단일 권한 확인

```tsx
import { usePermission } from '@/hooks/useAuth';

function ArrangementEditor() {
  const canEdit = usePermission('canEditArrangements');
  const canDelete = usePermission('canDeleteArrangements');

  if (!canEdit) {
    return <div>편집 권한이 없습니다.</div>;
  }

  return (
    <>
      <Editor />
      {canDelete && <DeleteButton />}
    </>
  );
}
```

#### 3. `useAllPermissions()` - 전체 권한 객체

```tsx
import { useAllPermissions } from '@/hooks/useAuth';

function Dashboard() {
  const permissions = useAllPermissions();

  return (
    <nav>
      {permissions?.canAccessAdmin && <Link href="/admin">관리자</Link>}
      {permissions?.canManageMembers && <Link href="/members">대원 관리</Link>}
      {permissions?.canViewDocuments && <Link href="/documents">문서</Link>}
    </nav>
  );
}
```

#### 4. `useIsAdmin()` - 관리자 여부

```tsx
import { useIsAdmin } from '@/hooks/useAuth';

function SettingsPage() {
  const isAdmin = useIsAdmin();

  return (
    <div>
      {isAdmin && <AdminOnlySettings />}
    </div>
  );
}
```

### 서버 사이드 권한 체크

API Route에서 권한 확인:

```typescript
import { createClient } from '@/lib/supabase/server';
import { hasPermission } from '@/app/api/auth/types';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 사용자 프로필 조회
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // 권한 확인
  if (!hasPermission(profile.role, 'canManageMembers')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 로직 실행...
}
```

### 컴포넌트에서 조건부 렌더링

```tsx
function MemberActions({ memberId }: { memberId: string }) {
  const canManage = usePermission('canManageMembers');
  const canView = usePermission('canViewMembers');

  if (!canView) return null;

  return (
    <div>
      <ViewButton memberId={memberId} />
      {canManage && (
        <>
          <EditButton memberId={memberId} />
          <DeleteButton memberId={memberId} />
        </>
      )}
    </div>
  );
}
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/app/api/auth/types.ts` | 역할 타입 및 권한 매트릭스 정의 |
| `src/hooks/useAuth.ts` | 권한 체크 훅 (`usePermission`, `useAllPermissions`) |
| `src/components/layout/Navigation.tsx` | 역할 기반 메뉴 필터링 |
| `src/app/admin/layout.tsx` | 관리자 페이지 레이아웃 (ADMIN 전용) |
| `supabase/migrations/20260115000000_update_roles_and_titles.sql` | 역할/직책 스키마 |
| `supabase/migrations/20260115100000_update_rls_policies_for_new_roles.sql` | RLS 정책 |
| `supabase/migrations/20260115050616_add_part_leader_to_members_policy.sql` | PART_LEADER 대원 관리 권한 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-15 | 6단계 역할 체계 도입 (STAFF, MEMBER 추가) |
| 2026-01-15 | 직책(title) 필드 추가 |
| 2026-01-15 | RLS 정책 전면 업데이트 |
| 2026-01-15 | usePermission 훅 추가 |
| 2026-01-15 | 지휘자 메모 - CONDUCTOR 전용으로 변경 (ADMIN 접근 제거) |
| 2026-01-15 | 찬양대원 관리 - PART_LEADER 등록/수정 권한 추가 (삭제는 불가) |
