# 지휘자 전용 메모 기능 가이드

## 개요

지휘자 전용 메모 기능은 CONDUCTOR 권한을 가진 사용자만 접근할 수 있는 암호화된 메모 시스템입니다. 이 기능을 통해 찬양대원에 대한 민감한 정보를 안전하게 저장하고 관리할 수 있습니다.

### 주요 특징

- **강력한 암호화**: AES-256-GCM 알고리즘 사용
- **CONDUCTOR 전용**: CONDUCTOR 또는 ADMIN 권한만 접근 가능
- **DB 레벨 보안**: ADMIN도 데이터베이스에서 직접 평문을 확인할 수 없음
- **API 기반 접근**: 암호화/복호화는 서버에서만 수행
- **무결성 검증**: 데이터 변조 감지 기능 내장

## 설정

### 1. 암호화 키 생성

환경 변수 파일(`.env`)에 암호화 키를 설정해야 합니다.

```bash
# 새로운 암호화 키 생성
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 출력된 64자리 16진수를 복사하여 .env 파일에 추가
```

`.env` 파일에 추가:

```env
CONDUCTOR_NOTES_ENCRYPTION_KEY="your-64-character-hex-key-here"
```

**⚠️ 중요:**
- 이 키를 절대 Git에 커밋하지 마세요
- 프로덕션 환경에서는 환경 변수로 안전하게 관리하세요
- 키를 분실하면 기존 암호화된 메모를 복호화할 수 없습니다

### 2. 데이터베이스 마이그레이션

마이그레이션을 실행하여 필요한 테이블 필드를 추가합니다.

```bash
# 로컬 Supabase
npx supabase db reset

# 원격 Supabase
npx supabase db push
```

### 3. 암호화 기능 테스트

테스트 스크립트로 암호화 기능이 올바르게 작동하는지 확인합니다.

```bash
npx tsx scripts/test-crypto.ts
```

## 데이터베이스 스키마

`members` 테이블에 다음 필드가 추가됩니다:

```sql
-- 지휘자 전용 암호화 메모 필드
encrypted_conductor_notes TEXT,        -- 암호화된 메모 텍스트
conductor_notes_iv TEXT,               -- 암호화 IV (Initialization Vector)
conductor_notes_auth_tag TEXT          -- 인증 태그 (무결성 검증용)
```

일반 사용자는 `members_public` View를 사용하여 이 필드들을 볼 수 없습니다.

## API 엔드포인트

### GET `/api/members/[id]/conductor-notes`

지휘자 메모를 조회합니다.

**권한**: CONDUCTOR 또는 ADMIN

**응답**:
```json
{
  "memberId": "uuid",
  "memberName": "홍길동",
  "notes": "복호화된 메모 내용"
}
```

### PUT `/api/members/[id]/conductor-notes`

지휘자 메모를 저장/업데이트합니다.

**권한**: CONDUCTOR 또는 ADMIN

**요청 본문**:
```json
{
  "notes": "저장할 메모 내용"
}
```

**응답**:
```json
{
  "success": true,
  "message": "메모가 저장되었습니다.",
  "memberId": "uuid",
  "memberName": "홍길동"
}
```

### DELETE `/api/members/[id]/conductor-notes`

지휘자 메모를 삭제합니다.

**권한**: CONDUCTOR 또는 ADMIN

**응답**:
```json
{
  "success": true,
  "message": "메모가 삭제되었습니다."
}
```

## 사용 방법

### React 컴포넌트에서 사용

찬양대원 상세 페이지에 `ConductorNotes` 컴포넌트를 추가합니다.

```tsx
import { ConductorNotes } from '@/components/features/members';

// 사용자 권한을 가져옴 (Supabase Auth)
const { data: profile } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', user.id)
  .single();

// 컴포넌트 렌더링
<ConductorNotes
  memberId={member.id}
  memberName={member.name}
  userRole={profile?.role}
/>
```

컴포넌트는 다음 기능을 제공합니다:

- ✅ 메모 조회 (자동)
- ✅ 메모 편집
- ✅ 메모 저장
- ✅ 메모 삭제
- ✅ 권한 확인 (CONDUCTOR가 아니면 렌더링하지 않음)
- ✅ 로딩 상태 표시
- ✅ 에러 처리
- ✅ 성공 메시지 표시

### 프로그래밍 방식으로 사용

암호화/복호화 유틸리티를 직접 사용할 수도 있습니다 (서버 컴포넌트/API Routes에서만).

```typescript
import { encryptConductorNotes, decryptConductorNotes } from '@/lib/crypto';

// 암호화
const { encryptedText, iv, authTag } = encryptConductorNotes('민감한 정보');

// 복호화
const plainText = decryptConductorNotes(encryptedText, iv, authTag);
```

**⚠️ 주의**: 클라이언트 컴포넌트에서는 이 함수들을 사용할 수 없습니다. Node.js의 `crypto` 모듈이 필요합니다.

## 보안 고려사항

### 1. 암호화 키 관리

- 암호화 키는 환경 변수로만 관리
- `.env` 파일을 `.gitignore`에 추가
- 프로덕션에서는 안전한 키 관리 서비스 사용 권장 (AWS Secrets Manager, Azure Key Vault 등)

### 2. 권한 검증

- API 레벨에서 이중 권한 검증
  1. Supabase Auth로 사용자 인증
  2. `user_profiles` 테이블에서 역할 확인
- RLS 정책으로 추가 보호

### 3. 데이터 무결성

- AES-GCM의 인증 태그로 데이터 변조 감지
- 변조된 데이터는 복호화 시 오류 발생

### 4. 네트워크 보안

- HTTPS 필수 (프로덕션)
- API 요청에 CSRF 보호 권장

## 문제 해결

### 암호화 키 오류

**오류**: `CONDUCTOR_NOTES_ENCRYPTION_KEY 환경 변수가 설정되지 않았습니다`

**해결**: `.env` 파일에 64자리 16진수 키를 추가하세요.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 복호화 실패

**오류**: `지휘자 메모 복호화에 실패했습니다`

**원인**:
- 암호화 키가 변경되었거나
- 데이터가 손상되었거나
- IV 또는 Auth Tag가 잘못되었을 수 있습니다

**해결**:
1. 암호화 키가 올바른지 확인
2. 데이터베이스의 `conductor_notes_iv`와 `conductor_notes_auth_tag` 필드 확인
3. 최악의 경우, 메모를 삭제하고 다시 작성

### 권한 오류

**오류**: `지휘자 권한이 필요합니다`

**해결**:
1. `user_profiles` 테이블에서 사용자의 `role`이 `CONDUCTOR` 또는 `ADMIN`인지 확인
2. ADMIN이 사용자에게 역할을 부여했는지 확인

## 모범 사례

1. **정기적인 백업**: 암호화 키와 데이터베이스를 정기적으로 백업하세요
2. **키 교체**: 보안 정책에 따라 정기적으로 암호화 키를 교체하세요 (키 교체 시 기존 데이터 재암호화 필요)
3. **감사 로그**: 민감한 정보 접근 시 감사 로그 기록 권장
4. **최소 권한 원칙**: CONDUCTOR 권한은 꼭 필요한 사용자에게만 부여

## 예제

### 찬양대원 상세 페이지 구현 예제

```tsx
// app/members/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { ConductorNotes } from '@/components/features/members';

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // 현재 사용자 정보
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 사용자 권한
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id || '')
    .single();

  // 찬양대원 정보 (암호화 필드 제외)
  const { data: member } = await supabase
    .from('members_public')  // View 사용
    .select('*')
    .eq('id', params.id)
    .single();

  if (!member) {
    return <div>찬양대원을 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <h1>{member.name}</h1>
      <p>파트: {member.part}</p>
      {/* ... 기타 정보 ... */}

      {/* CONDUCTOR 전용 메모 */}
      <ConductorNotes
        memberId={member.id}
        memberName={member.name}
        userRole={profile?.role}
      />
    </div>
  );
}
```

## 참고 자료

- [AES-GCM 암호화](https://en.wikipedia.org/wiki/Galois/Counter_Mode)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
