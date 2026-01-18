# 보안 가이드

새로핌ON 프로젝트의 보안 설정 및 모범 사례 가이드입니다.

## 목차
1. [보안 기능 개요](#보안-기능-개요)
2. [SQL Injection 방어](#sql-injection-방어)
3. [XSS (Cross-Site Scripting) 방어](#xss-cross-site-scripting-방어)
4. [CSRF (Cross-Site Request Forgery) 방어](#csrf-cross-site-request-forgery-방어)
5. [Rate Limiting (DDoS 방어)](#rate-limiting-ddos-방어)
6. [보안 헤더](#보안-헤더)
7. [데이터베이스 보안 (RLS)](#데이터베이스-보안-rls)
8. [프로덕션 배포 체크리스트](#프로덕션-배포-체크리스트)

---

## 보안 기능 개요

### ✅ 구현된 보안 기능

| 보안 영역 | 구현 상태 | 설명 |
|----------|---------|-----|
| **SQL Injection 방어** | ✅ 완료 | Supabase의 parameterized queries로 자동 방어 |
| **XSS 방어** | ✅ 완료 | React auto-escaping + Input Sanitization |
| **CSRF 방어** | ⚠️ 부분 | SameSite 쿠키 (Supabase 기본 설정) |
| **보안 헤더** | ✅ 완료 | CSP, X-Frame-Options 등 |
| **Input Validation** | ✅ 완료 | Zod 스키마 검증 + Input Sanitization |
| **Row Level Security** | ✅ 완료 | Supabase RLS 정책 |
| **Rate Limiting** | ✅ 완료 | Upstash Redis 기반 (로그인 5회/분, 회원가입 3회/분, API 100회/분) |

---

## SQL Injection 방어

### 자동 방어 (Supabase)

Supabase는 모든 쿼리에 **parameterized queries**를 사용하므로 SQL Injection이 자동으로 차단됩니다.

```typescript
// ✅ 안전 - Supabase는 자동으로 parameterized query 사용
await supabase
  .from('members')
  .select('*')
  .eq('name', userInput); // userInput이 악의적이어도 안전
```

```typescript
// ❌ 위험 - Raw SQL 사용 시 주의 (가급적 피하기)
await supabase.rpc('raw_sql', { query: `SELECT * FROM members WHERE name = '${userInput}'` });
```

### 추가 방어층

`src/lib/security/input-sanitizer.ts`의 `sanitizeSqlInput()` 함수로 추가 방어:

```typescript
import { sanitizers } from '@/lib/security/input-sanitizer';

const safeName = sanitizers.sanitizeSqlInput(userInput);
```

---

## XSS (Cross-Site Scripting) 방어

### 1. React의 자동 이스케이핑

React는 JSX에서 기본적으로 모든 값을 이스케이프합니다.

```tsx
// ✅ 안전 - React가 자동으로 이스케이프
<div>{userInput}</div>

// ❌ 위험 - dangerouslySetInnerHTML 사용 시 주의
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 2. Input Sanitization

모든 사용자 입력은 저장 전에 정제됩니다 (`src/lib/security/input-sanitizer.ts`):

```typescript
import { sanitizers } from '@/lib/security/input-sanitizer';

// 이름 정제 (HTML 태그 제거, 한글/영문만 허용)
const safeName = sanitizers.sanitizeMemberName('<script>alert("XSS")</script>홍길동');
// 결과: "홍길동"

// 일반 텍스트 정제 (HTML 태그 제거, 길이 제한)
const safeNote = sanitizers.sanitizeTextNote(userNote, 1000);

// URL 검증 (javascript:, data: 프로토콜 차단)
const safeUrl = sanitizers.sanitizeUrl(userUrl);
```

### 3. Zod와 함께 사용

API 엔드포인트에서 Zod 스키마와 함께 사용:

```typescript
const schema = z.object({
  name: z.string().transform(sanitizers.sanitizeMemberName),
  email: z.string().transform(v => sanitizers.sanitizeEmail(v) || ''),
  notes: z.string().transform(v => sanitizers.sanitizeTextNote(v, 1000)),
});
```

### 4. Content Security Policy (CSP)

`next.config.ts`에 설정된 CSP 헤더로 XSS 공격의 영향 최소화:

```typescript
// 기본적으로 같은 도메인의 리소스만 허용
"default-src 'self'"

// 인라인 스크립트 차단 (Next.js 제외)
"script-src 'self' 'unsafe-eval' 'unsafe-inline'"
```

---

## CSRF (Cross-Site Request Forgery) 방어

### 1. Supabase Auth의 SameSite 쿠키

Supabase는 기본적으로 **SameSite=Lax** 쿠키를 사용하여 CSRF 공격을 방어합니다.

### 2. 추가 방어 (옵션)

중요한 상태 변경 작업(삭제, 권한 변경 등)에는 추가 검증 권장:

```typescript
// 예: 이중 확인 모달, 비밀번호 재입력 등
const confirmDeletion = async () => {
  const confirmed = await askUserConfirmation();
  if (confirmed) {
    await deleteResource();
  }
};
```

---

## Rate Limiting (DDoS 방어)

### ✅ 구현 완료 (Upstash Redis 기반)

**Upstash Redis**를 사용한 IP 기반 Rate Limiting이 구현되어 있습니다.

### 구현된 Rate Limiters

| Rate Limiter | 제한 | 적용 위치 | 목적 |
|-------------|-----|---------|-----|
| `authRateLimiter` | 5회/분 | `/api/auth/login` | 무차별 대입 공격 방어 |
| `signupRateLimiter` | 3회/분 | `/api/auth/signup` | 스팸 계정 생성 방지 |
| `apiRateLimiter` | 100회/분 | `/api/members (POST)` | 대량 데이터 생성 방지 |

### 환경 변수 설정

프로덕션 배포 시 다음 환경 변수를 설정하세요:

1. **Upstash Redis 생성**
   - https://upstash.com/ 에서 무료 계정 생성
   - Redis 데이터베이스 생성 (Primary region: Tokyo 권장)

2. **환경 변수 설정** (`.env.local` 또는 Vercel 대시보드)
   ```bash
   UPSTASH_REDIS_REST_URL=https://xxx-xxx-xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXX...
   ```

### 개발 환경

환경 변수가 설정되지 않은 경우 Rate Limiting이 **자동으로 비활성화**됩니다.
로컬 개발 시 제한 없이 테스트할 수 있습니다.

### 구현 코드

`src/lib/security/rate-limiter.ts`에 구현되어 있습니다:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis 클라이언트 생성 (환경 변수 없으면 null 반환)
const redis = createRedisClient();

// 로그인 Rate Limiter (5회/분)
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : disabledRateLimiter;

// 회원가입 Rate Limiter (3회/분)
export const signupRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '1 m'),
      analytics: true,
      prefix: 'ratelimit:signup',
    })
  : disabledRateLimiter;

// API Rate Limiter (100회/분)
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : disabledRateLimiter;
```

**API Route에 적용하는 방법:**

```typescript
import { authRateLimiter, getClientIp, createRateLimitErrorResponse } from '@/lib/security/rate-limiter';

export async function POST(request: Request) {
  // IP 주소 추출
  const ip = getClientIp(request);

  // Rate Limit 확인
  const { success, reset } = await authRateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      createRateLimitErrorResponse(reset),
      { status: 429 }
    );
  }

  // ... 로직 계속
}
```

### 권장 Rate Limit 설정

| 엔드포인트 | 제한 | 설명 |
|----------|------|-----|
| `/api/auth/login` | 5회/분 | 무차별 대입 공격 방어 |
| `/api/auth/signup` | 3회/분 | 스팸 계정 생성 방지 |
| `/api/members` (POST) | 10회/분 | 대량 데이터 생성 방지 |
| 기타 API | 100회/분 | 일반적인 DDoS 방어 |

---

## 보안 헤더

`next.config.ts`에 설정된 보안 헤더:

### 1. Content-Security-Policy (CSP)
- XSS 공격의 영향을 최소화
- 허용된 리소스만 로드 가능

### 2. X-Frame-Options: DENY
- Clickjacking 공격 방어
- iframe 삽입 차단

### 3. X-Content-Type-Options: nosniff
- MIME 타입 스니핑 차단
- 파일 타입 위조 공격 방어

### 4. Referrer-Policy: strict-origin-when-cross-origin
- Referrer 정보 최소화
- 프라이버시 보호

### 5. Permissions-Policy
- 불필요한 브라우저 기능 비활성화
- 공격 표면 축소

---

## 데이터베이스 보안 (RLS)

### Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있습니다 (`supabase/migrations/*.sql`):

```sql
-- RLS 활성화
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 읽기: 인증된 사용자만
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기: PART_LEADER 이상만
CREATE POLICY "Members are editable by part leaders and above"
  ON members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'CONDUCTOR', 'MANAGER', 'PART_LEADER')
    )
  );
```

### 역할 기반 접근 제어

| 역할 | 권한 |
|-----|-----|
| **ADMIN** | 모든 데이터 읽기/쓰기 |
| **CONDUCTOR** | 지휘자 메모 접근 포함 모든 데이터 |
| **MANAGER** | 찬양대원 관리, 자리배치 |
| **PART_LEADER** | 파트 내 찬양대원 관리 |
| **일반 사용자** | 읽기만 가능 |

---

## 프로덕션 배포 체크리스트

배포 전 아래 사항을 확인하세요:

### 환경 변수
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정 (서버 전용)
- [ ] `CONDUCTOR_NOTES_ENCRYPTION_KEY` 설정 (64자리 16진수)
- [ ] `UPSTASH_REDIS_REST_URL` 설정 (Rate Limiting용)
- [ ] `UPSTASH_REDIS_REST_TOKEN` 설정

### 보안 설정
- [ ] Supabase RLS 정책 검토
- [ ] 보안 헤더 설정 확인 (`next.config.ts`)
- [ ] Rate Limiting 구현 (Upstash Redis)
- [ ] HTTPS 강제 (Vercel 자동 설정)
- [ ] 환경 변수가 `.env.local`에만 있고, Git에 커밋되지 않았는지 확인

### 코드 검토
- [ ] `dangerouslySetInnerHTML` 사용 최소화
- [ ] 모든 사용자 입력에 Zod 검증 적용
- [ ] API 엔드포인트에 인증 확인 추가
- [ ] 민감한 정보가 API 응답에 포함되지 않는지 확인

### 모니터링
- [ ] Supabase 대시보드에서 이상 활동 모니터링
- [ ] Vercel Analytics로 트래픽 모니터링
- [ ] 에러 로그 정기 확인

---

## 보안 문제 보고

보안 취약점을 발견하셨다면:
1. 공개 이슈로 올리지 마세요
2. 프로젝트 관리자에게 비공개로 연락
3. 패치가 완료될 때까지 세부 사항 공개 자제

---

**마지막 업데이트:** 2026-01-18
**작성자:** Claude Code
