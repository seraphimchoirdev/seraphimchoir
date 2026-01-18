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
| **Input Validation** | ✅ 완료 | Zod 스키마 검증 |
| **Row Level Security** | ✅ 완료 | Supabase RLS 정책 |
| **Rate Limiting** | ⚠️ 권장 | 프로덕션 환경에서 Vercel/Upstash 사용 권장 |

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

### ⚠️ 프로덕션 환경 필수

프로덕션 환경에서는 **Vercel + Upstash Redis**를 사용한 Rate Limiting이 필요합니다.

### 설치 및 설정

1. **Upstash Redis 생성**
   ```bash
   # Upstash 대시보드에서 Redis 데이터베이스 생성
   # https://upstash.com/
   ```

2. **패키지 설치**
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

3. **환경 변수 설정** (`.env.local`)
   ```bash
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXX...
   ```

4. **Rate Limiter 생성** (`src/lib/security/rate-limiter.ts`)
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   export const authRateLimiter = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(5, '1 m'), // 5회/분
     analytics: true,
   });

   export const apiRateLimiter = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(100, '1 m'), // 100회/분
     analytics: true,
   });
   ```

5. **API Route에 적용**
   ```typescript
   import { authRateLimiter } from '@/lib/security/rate-limiter';

   export async function POST(request: Request) {
     const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
     const { success } = await authRateLimiter.limit(ip);

     if (!success) {
       return NextResponse.json(
         { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
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
