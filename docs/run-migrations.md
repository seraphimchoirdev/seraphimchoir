# Supabase 마이그레이션 실행 가이드

원격 Supabase 데이터베이스에 마이그레이션을 적용하는 방법입니다.

## 방법 1: Supabase Dashboard SQL Editor 사용 (권장)

1. Supabase Dashboard에 로그인합니다
   - URL: https://supabase.com/dashboard/project/gjxvxcqujimkalloedbe

2. 왼쪽 메뉴에서 **SQL Editor** 선택

3. **New query** 버튼 클릭

4. 다음 마이그레이션 파일들을 순서대로 복사하여 실행:

### 4-1. Initial Schema (초기 스키마)
파일: `supabase/migrations/20250118000000_initial_schema.sql`

### 4-2. Add Member Status (멤버 상태 추가)
파일: `supabase/migrations/20250119000000_add_member_status.sql`

### 4-3. Fix RLS Infinite Recursion (RLS 무한 재귀 수정)
파일: `supabase/migrations/20250119020000_fix_rls_infinite_recursion.sql`

### 4-4. Setup Storage Buckets (Storage 버킷 설정)
파일: `supabase/migrations/20250119030000_setup_storage_buckets.sql`

## 방법 2: CLI 사용 (네트워크 문제 해결 후)

```bash
# 1. Supabase 프로젝트 연결 (이미 연결되어 있음)
npx supabase link --project-ref gjxvxcqujimkalloedbe

# 2. 마이그레이션 푸시
npx supabase db push
```

## 방법 3: 직접 psql 사용

```bash
# PostgreSQL 클라이언트로 직접 연결
PGPASSWORD='[#Sfhals3586]' psql \
  -h db.gjxvxcqujimkalloedbe.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f supabase/migrations/20250118000000_initial_schema.sql

# 나머지 마이그레이션도 동일하게 실행
```

## 마이그레이션 적용 확인

마이그레이션이 성공적으로 적용되었는지 확인하려면:

1. Supabase Dashboard > **Table Editor**에서 다음 테이블 확인:
   - `members`
   - `attendances`
   - `arrangements`
   - `seats`
   - `user_profiles`

2. **Storage**에서 `arrangements` 버킷 확인

3. **Database** > **Policies**에서 RLS 정책 확인

## 문제 해결

### 연결 오류
- IPv6 연결 문제가 발생하면 Dashboard 사용 권장
- 비밀번호에 특수문자가 포함되어 있어 URL 인코딩 필요

### 권한 오류
- Service Role Key가 올바르게 설정되어 있는지 확인
- Dashboard에서는 자동으로 admin 권한으로 실행됨
