# 낙관적 잠금(Optimistic Locking) 구현 문서

## 개요

찬양대원 정보 수정 시 동시성 문제를 해결하기 위해 낙관적 잠금(Optimistic Locking)을 구현했습니다.

## 구현 내용

### 1. 데이터베이스 스키마 변경

**마이그레이션 파일**: `supabase/migrations/20251120082825_add_version_to_members.sql`

- `members` 테이블에 `version` 컬럼 추가
  - 타입: `INTEGER`
  - `NOT NULL`
  - 기본값: `1`
  - 체크 제약: `version > 0`
- `members_public` View 업데이트 (version 컬럼 포함)
- 성능 최적화를 위한 인덱스 생성

```sql
-- version 컬럼 추가
ALTER TABLE members
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 체크 제약 조건
ALTER TABLE members
ADD CONSTRAINT members_version_positive CHECK (version > 0);

-- 인덱스 생성
CREATE INDEX idx_members_version ON members(version);
```

### 2. API 로직 수정

**파일**: `src/app/api/members/[id]/route.ts`

#### PATCH 엔드포인트 변경사항:

1. **요청 스키마 업데이트**
   - `version` 필드 추가 (optional number)

2. **버전 체크 로직**
   ```typescript
   // 클라이언트에서 받은 version
   const { version: clientVersion, ...updateData } = validation.data;

   // DB에서 현재 version 조회
   const { data: currentMember } = await supabase
     .from('members')
     .select('version')
     .eq('id', id)
     .single();

   // version 불일치 시 409 Conflict 응답
   if (currentMember.version !== clientVersion) {
     return NextResponse.json(
       {
         error: '이 회원 정보가 다른 곳에서 수정되었습니다. 페이지를 새로고침해주세요.',
         code: 'VERSION_CONFLICT',
       },
       { status: 409 }
     );
   }
   ```

3. **버전 증가**
   - 업데이트 성공 시 `version` 값을 1 증가

### 3. 프론트엔드 구현

#### A. MemberForm 컴포넌트
**파일**: `src/components/features/members/MemberForm.tsx`

1. **폼 상태에 version 추가**
   ```typescript
   const [formData, setFormData] = useState({
     // ... 기존 필드
     version: member?.version || 1,
   });
   ```

2. **버전 충돌 상태 관리**
   ```typescript
   const [versionConflict, setVersionConflict] = useState(false);
   ```

3. **제출 로직 수정**
   - 수정 모드일 때 `version`을 payload에 포함
   - 강제 업데이트 옵션 지원 (version 체크 무시)

4. **충돌 감지 및 UI**
   - 409 에러 발생 시 경고 메시지 표시
   - 두 가지 옵션 제공:
     - **새로고침**: 페이지 리로드하여 최신 데이터 가져오기
     - **무시하고 저장**: version 체크 없이 강제 저장

#### B. useMembers Hook
**파일**: `src/hooks/useMembers.ts`

1. **에러 처리 개선**
   ```typescript
   if (response.status === 409 && errorData.code === 'VERSION_CONFLICT') {
     const error: any = new Error(errorData.error);
     error.code = 'VERSION_CONFLICT';
     error.status = 409;
     throw error;
   }
   ```

2. **에러 객체에 메타데이터 포함**
   - `code`: 'VERSION_CONFLICT'
   - `status`: 409

### 4. TypeScript 타입 업데이트

**파일**: `src/types/database.types.ts`

- `members` 테이블 타입에 `version: number` 추가
- `members_public` View 타입에 `version: number | null` 추가
- Insert/Update 타입에도 `version?: number` 추가

## 사용 시나리오

### 시나리오 1: 정상 수정
1. 사용자 A가 회원 정보 수정 페이지 열기 (version: 1)
2. 사용자 A가 정보 수정 후 저장 (version: 1 전송)
3. DB에서 version 확인 (일치: 1 = 1)
4. 업데이트 성공, version 2로 증가

### 시나리오 2: 충돌 감지
1. 사용자 A가 회원 정보 수정 페이지 열기 (version: 1)
2. 사용자 B가 같은 회원 정보 수정 후 저장 (version: 1 → 2)
3. 사용자 A가 정보 수정 후 저장 시도 (version: 1 전송)
4. DB에서 version 확인 (불일치: 2 ≠ 1)
5. 409 Conflict 응답
6. 사용자 A에게 경고 메시지 표시

### 시나리오 3: 강제 저장
1. 충돌 감지 후 경고 메시지 표시
2. 사용자가 "무시하고 저장" 버튼 클릭
3. version 없이 요청 전송 (version 체크 우회)
4. 업데이트 성공

## 데이터베이스 마이그레이션 적용

### 로컬 개발 환경 (Docker 필요)
```bash
# Supabase 시작
npx supabase start

# 마이그레이션 적용
npx supabase db reset

# 타입 재생성
npx supabase gen types typescript --local > src/types/database.types.ts
```

### 원격 환경
```bash
# 프로젝트 연결
npx supabase link --project-ref <project-id>

# 마이그레이션 푸시
npx supabase db push

# 타입 재생성
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

## 주의사항

1. **기존 레코드**: 마이그레이션 실행 시 모든 기존 레코드의 version이 1로 초기화됩니다.

2. **RLS 정책**: version 컬럼은 일반 컬럼으로 RLS 정책 수정이 필요하지 않습니다.

3. **강제 저장**: 강제 저장 기능은 신중하게 사용해야 하며, 다른 사용자의 변경 사항을 덮어쓸 수 있습니다.

4. **API 호환성**: version 필드는 optional이므로 기존 API 클라이언트와 호환됩니다.

## 테스트 방법

### 수동 테스트

1. **정상 수정 테스트**
   ```bash
   # 개발 서버 실행
   npm run dev

   # 브라우저에서 회원 수정 페이지 접속
   # 정보 수정 후 저장
   # Network 탭에서 PATCH 요청의 version 확인
   ```

2. **충돌 감지 테스트**
   ```bash
   # 두 개의 브라우저 탭에서 동일한 회원 수정 페이지 열기
   # 첫 번째 탭에서 수정 후 저장
   # 두 번째 탭에서 수정 후 저장 시도
   # 충돌 경고 메시지 확인
   ```

### 빌드 테스트
```bash
# 타입 에러 확인
npm run build

# 성공 시 정상
```

## 성능 고려사항

1. **추가 쿼리**: version 체크를 위해 SELECT 쿼리 1회 추가 실행
2. **인덱스**: version 컬럼에 인덱스를 생성하여 조회 성능 최적화
3. **네트워크**: version 필드 추가로 인한 네트워크 오버헤드는 미미함 (4 bytes)

## 향후 개선 방안

1. **자동 재시도**: 충돌 발생 시 자동으로 최신 데이터를 불러오고 재시도
2. **변경 사항 비교**: 충돌 발생 시 현재 수정사항과 DB의 최신 데이터 비교 UI
3. **실시간 알림**: WebSocket을 통한 실시간 충돌 감지 및 알림
4. **낙관적 UI 업데이트**: 응답을 기다리지 않고 즉시 UI 업데이트 (React Query의 optimistic update 활용)

## 참고 자료

- [Optimistic Locking Pattern](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [PostgreSQL Row Versioning](https://www.postgresql.org/docs/current/mvcc-intro.html)
- [HTTP 409 Conflict](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409)
