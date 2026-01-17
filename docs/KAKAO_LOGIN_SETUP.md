# 카카오 로그인 설정 가이드

이 문서는 찬양대 자리배치 시스템에 카카오 로그인을 설정하는 방법을 설명합니다.

## 목차

1. [개요](#개요)
2. [시스템 구조](#시스템-구조)
3. [카카오 디벨로퍼 설정](#카카오-디벨로퍼-설정)
4. [Supabase Dashboard 설정](#supabase-dashboard-설정)
5. [세션 지속성 설정](#세션-지속성-설정)
6. [검증 방법](#검증-방법)
7. [트러블슈팅](#트러블슈팅)

---

## 개요

카카오 로그인은 Supabase Auth의 OAuth 기능을 통해 구현됩니다. 사용자가 카카오 계정으로 로그인하면 자동으로 `user_profiles` 테이블에 프로필이 생성되고, 대원 연결 상태에 따라 적절한 페이지로 리다이렉트됩니다.

### 주요 특징

- **30일+ 세션 유지**: 브라우저 종료 후에도 로그인 상태 유지
- **자동 프로필 생성**: 카카오 로그인 시 `user_profiles` 자동 생성
- **대원 연결 플로우**: 로그인 후 대원 연결 상태에 따른 자동 라우팅

---

## 시스템 구조

### 인증 플로우

```
사용자 ─────▶ 카카오 로그인 버튼 클릭
                      │
                      ▼
              카카오 로그인 페이지
                      │
                      ▼
              Supabase Auth Callback
              (https://<project>.supabase.co/auth/v1/callback)
                      │
                      ▼
              /auth/callback (Next.js)
                      │
                      ▼
         ┌────────────┴────────────┐
         │                         │
    역할 있음                  역할 없음
         │                         │
         ▼                         ▼
    /dashboard              /member-link
```

### 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/features/auth/LoginForm.tsx` | 카카오 로그인 버튼 UI |
| `src/store/authStore.ts` | `signInWithKakao()` 메서드 |
| `src/app/auth/callback/route.ts` | OAuth 콜백 핸들러 |
| `src/lib/supabase/client.ts` | 세션 지속성 설정 |
| `src/lib/supabase/middleware.ts` | 인증 미들웨어 |

---

## 카카오 디벨로퍼 설정

### 1. 애플리케이션 생성

1. [카카오 디벨로퍼](https://developers.kakao.com) 접속
2. 로그인 후 **내 애플리케이션** 클릭
3. **애플리케이션 추가하기** 클릭
4. 앱 이름 입력 (예: `찬양대 자리배치`)
5. 사업자명 입력
6. **저장** 클릭

### 2. 플랫폼 등록

1. 생성된 앱 선택 → **앱 설정** → **플랫폼**
2. **Web 플랫폼 등록** 클릭
3. 사이트 도메인 입력:

   | 환경 | 도메인 |
   |------|--------|
   | 개발 | `http://localhost:3000` |
   | 프로덕션 | `https://yourdomain.com` |

4. **저장** 클릭

### 3. 카카오 로그인 활성화

1. **제품 설정** → **카카오 로그인**
2. 다음 설정 적용:

   | 설정 | 값 | 비고 |
   |------|-----|------|
   | 활성화 설정 | **ON** | 필수 |
   | OpenID Connect 활성화 | **ON** | **필수!** Supabase 연동에 필요 |

3. **Redirect URI** 등록:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

   > `<project-ref>`는 Supabase 프로젝트 ID입니다.
   > Supabase Dashboard → Settings → General에서 확인할 수 있습니다.

### 4. 동의 항목 설정

1. **제품 설정** → **카카오 로그인** → **동의항목**
2. 다음 항목 설정:

   | 항목 | ID | 동의 수준 | 필수 여부 |
   |------|-----|----------|----------|
   | 닉네임 | `profile_nickname` | 필수 동의 | 필수 |
   | 프로필 사진 | `profile_image` | 선택 동의 | 선택 |
   | 카카오계정(이메일) | `account_email` | 필수 동의 | **필수** |

   > **중요**: 이메일을 **필수 동의**로 설정해야 `user_profiles` 자동 생성이 가능합니다.

### 5. API 키 확인

#### REST API 키 (Client ID)

1. **앱 설정** → **앱 키**
2. **REST API 키** 복사
3. 이 키를 Supabase의 **Client ID**로 사용

#### Client Secret

1. **제품 설정** → **카카오 로그인** → **보안**
2. **Client Secret 코드 생성** 클릭
3. 생성된 코드 복사
4. 이 키를 Supabase의 **Client Secret**으로 사용

---

## Supabase Dashboard 설정

### 1. Kakao Provider 활성화

1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택 → **Authentication** → **Providers**
3. **Kakao** 찾아서 클릭
4. **Enable Kakao** 토글 ON
5. 다음 정보 입력:

   | 필드 | 값 |
   |------|-----|
   | Client ID | 카카오 REST API 키 |
   | Client Secret | 카카오 Client Secret 코드 |

6. **Save** 클릭

### 2. Redirect URL 설정

1. **Authentication** → **URL Configuration**
2. **Redirect URLs** 섹션에 다음 URL 추가:

   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

3. **Save** 클릭

### 3. 세션 설정 (선택사항)

1. **Authentication** → **Settings**
2. 권장 설정:

   | 설정 | 권장 값 | 설명 |
   |------|---------|------|
   | JWT expiry | 3600 (기본값) | Access token 만료 시간 (초) |
   | Refresh token rotation | Enabled | 보안 강화 |

---

## 세션 지속성 설정

### 클라이언트 설정

`src/lib/supabase/client.ts`에 다음 설정이 적용되어 있습니다:

```typescript
return createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,    // 토큰 자동 갱신
    persistSession: true,      // 세션 localStorage 저장
    detectSessionInUrl: true,  // URL에서 세션 감지 (OAuth 콜백용)
  },
});
```

### 설정 옵션 설명

| 옵션 | 값 | 설명 |
|------|-----|------|
| `autoRefreshToken` | `true` | Access token 만료 전 자동 갱신 |
| `persistSession` | `true` | 세션을 localStorage에 저장하여 브라우저 종료 후에도 유지 |
| `detectSessionInUrl` | `true` | OAuth 콜백 시 URL fragment에서 토큰 자동 감지 |

### 세션 지속 원리

1. **Access Token**: 1시간 후 만료 (JWT expiry 설정에 따름)
2. **Refresh Token**: 30일 후 만료 (Supabase 기본값)
3. `autoRefreshToken`이 활성화되면 access token 만료 전에 refresh token으로 새 토큰 발급
4. `persistSession`이 활성화되면 토큰을 localStorage에 저장하여 브라우저 종료 후에도 유지

---

## 검증 방법

### 1. 개발 환경 테스트

```bash
cd choir-seat-app
npm run dev
```

### 2. 테스트 시나리오

#### 기본 로그인 플로우

1. `http://localhost:3000/login` 접속
2. **카카오 로그인** 버튼 클릭
3. 카카오 로그인 페이지로 리다이렉트 확인
4. 카카오 계정으로 로그인
5. `/auth/callback` 처리 후 적절한 페이지로 이동 확인:
   - 역할이 있는 사용자 → `/dashboard`
   - 대원 연결 승인됨 → `/my-attendance`
   - 대원 연결 대기중 → `/member-link?status=pending`
   - 대원 미연결 → `/member-link`

#### 세션 지속성 테스트

1. 카카오로 로그인
2. 브라우저 완전히 종료 (모든 탭 닫기)
3. 브라우저 재실행 후 `http://localhost:3000/dashboard` 접속
4. 로그인 상태 유지 확인

#### 토큰 갱신 테스트

1. 카카오로 로그인
2. 1시간 이상 대기 (또는 개발자 도구에서 시간 조작)
3. 페이지 새로고침
4. 자동으로 새 토큰 발급되어 로그인 유지 확인

---

## 트러블슈팅

### 일반적인 오류

#### "OAuth 세션 교환 실패" 오류

- **원인**: Authorization code가 만료되었거나 잘못됨
- **해결**:
  1. 카카오 디벨로퍼에서 Redirect URI 확인
  2. Supabase에서 Redirect URL 확인
  3. 두 URL이 정확히 일치하는지 확인

#### "사용자 정보 조회 실패" 오류

- **원인**: 이메일 동의 항목이 필수로 설정되지 않음
- **해결**: 카카오 디벨로퍼 → 동의항목 → 이메일을 **필수 동의**로 변경

#### 카카오 로그인 버튼 클릭 시 아무 반응 없음

- **원인**: Supabase Kakao Provider가 활성화되지 않음
- **해결**: Supabase Dashboard → Authentication → Providers에서 Kakao 활성화

#### "invalid_client" 오류

- **원인**: Client ID 또는 Client Secret이 잘못됨
- **해결**:
  1. 카카오 디벨로퍼에서 REST API 키 재확인
  2. Client Secret 재생성
  3. Supabase에 정확히 입력

### OpenID Connect 관련 오류

카카오 로그인이 실패하고 "OIDC" 관련 오류가 발생하면:

1. 카카오 디벨로퍼 → 제품 설정 → 카카오 로그인
2. **OpenID Connect 활성화** 옵션이 **ON**인지 확인
3. OFF라면 ON으로 변경 후 저장

### 개발자 도구로 디버깅

브라우저 개발자 도구 → Network 탭에서 다음 요청 확인:

1. `/auth/v1/authorize` - OAuth 시작 요청
2. `https://kauth.kakao.com/*` - 카카오 인증 요청
3. `/auth/callback` - 콜백 처리

각 요청의 응답 상태와 에러 메시지를 확인하여 문제 파악.

---

## 환경 변수 체크리스트

`.env.local` 파일에 다음 변수가 설정되어 있는지 확인:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...

# 서버 전용 (클라이언트에 노출 금지!)
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

> **참고**: 카카오 API 키는 Supabase Dashboard에 직접 입력하므로 환경 변수에 추가할 필요 없습니다.

---

## 관련 문서

- [AUTH_API_IMPLEMENTATION.md](./AUTH_API_IMPLEMENTATION.md) - 인증 API 구현 상세
- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [카카오 로그인 공식 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
