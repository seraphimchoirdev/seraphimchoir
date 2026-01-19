# 프로덕션 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경변수 설정

#### 필수 환경변수
```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # Admin 작업용

# Upstash Redis (프로덕션 필수)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Sentry (권장)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=seraphimon
SENTRY_AUTH_TOKEN=sntrys_xxx
```

### 2. Upstash Redis 설정

#### 2.1 Upstash 계정 생성 및 데이터베이스 설정

1. [Upstash Console](https://console.upstash.com) 접속
2. 계정 생성 또는 로그인
3. "Create Database" 클릭
4. 데이터베이스 설정:
   - **Name**: `seraphimon-production`
   - **Type**: Regional (더 빠른 응답)
   - **Region**: 서울 또는 도쿄 (한국 사용자 대상)
   - **Eviction**: Enable (메모리 관리 자동화)
5. "Create" 클릭

#### 2.2 환경변수 복사

데이터베이스 생성 후 Details 페이지에서:

```bash
# REST API 섹션에서 복사
UPSTASH_REDIS_REST_URL="복사한 URL"
UPSTASH_REDIS_REST_TOKEN="복사한 토큰"
```

#### 2.3 Vercel 환경변수 설정

```bash
# Vercel CLI 사용
vercel env add UPSTASH_REDIS_REST_URL production
vercel env add UPSTASH_REDIS_REST_TOKEN production

# 또는 Vercel 대시보드에서:
# Settings → Environment Variables → Production
```

#### 2.4 연결 테스트

```bash
# 로컬에서 프로덕션 환경변수로 테스트
NODE_ENV=production npm run build

# Redis 연결 확인 스크립트 실행
npm run check:redis
```

### 3. CSP 위반 리포트 수집 (선택사항)

#### 3.1 Report URI 서비스 설정

1. [Report URI](https://report-uri.com) 가입 (무료 플랜 제공)
2. 새 프로젝트 생성
3. CSP Wizard 사용하여 리포트 엔드포인트 생성
4. 환경변수 추가:

```env
CSP_REPORT_URI=https://yoursubdomain.report-uri.com/r/d/csp/enforce
```

#### 3.2 또는 Sentry CSP 리포팅 사용

Sentry는 CSP 위반 리포트도 수집 가능:

```env
CSP_REPORT_URI=https://sentry.io/api/YOUR_PROJECT_ID/security/?sentry_key=YOUR_PUBLIC_KEY
```

### 4. 보안 감사 로깅

프로덕션 환경에서 보안 이벤트 로깅이 자동으로 활성화됩니다:

- 로그인 시도 (성공/실패)
- Rate limit 위반
- CSP 위반
- 비정상적인 API 요청

## 🚀 배포 프로세스

### Vercel 배포

```bash
# 1. 프로덕션 브랜치로 머지
git checkout main
git merge develop
git push origin main

# 2. Vercel 자동 배포 확인
# https://vercel.com/your-org/seraphimon

# 3. 배포 후 헬스체크
curl https://your-domain.vercel.app/api/health
```

### 수동 배포

```bash
# 1. 프로덕션 빌드
npm run build

# 2. 빌드 검증
npm run test:production

# 3. 배포
vercel --prod
```

## 🔍 배포 후 검증

### 1. Rate Limiting 확인

```bash
# Rate limit 테스트
for i in {1..10}; do
  curl -X POST https://your-domain/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
# 6번째 요청부터 429 응답 확인
```

### 2. CSP 확인

브라우저 개발자 도구 → Console에서 CSP 위반 확인:
- 위반이 없어야 정상
- 위반 발생 시 Report URI에 리포트 전송 확인

### 3. Sentry 에러 트래킹 확인

```javascript
// 테스트 에러 발생
Sentry.captureException(new Error("Deployment test"));
```

Sentry 대시보드에서 에러 수신 확인

## ⚠️ 트러블슈팅

### Redis 연결 실패

**증상**: "Rate Limiting 검증 실패!" 에러

**해결방법**:
1. 환경변수 확인:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. Upstash 대시보드에서 데이터베이스 상태 확인

3. 네트워크 연결 테스트:
   ```bash
   curl -X GET "$UPSTASH_REDIS_REST_URL/ping" \
     -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"
   ```

### CSP 위반

**증상**: 인라인 스크립트가 차단됨

**해결방법**:
1. 개발 환경에서 재현
2. `layout-client-scripts.tsx`에서 nonce 적용 확인
3. 필요시 CSP 정책 조정

### Sentry 미작동

**증상**: 에러가 Sentry에 전송되지 않음

**해결방법**:
1. DSN 확인
2. 프로덕션 환경 확인 (`NODE_ENV=production`)
3. Sentry 프로젝트 상태 확인

## 📊 모니터링 대시보드

### 추천 모니터링 설정

1. **Vercel Analytics**: 성능 메트릭
2. **Upstash Console**: Redis 사용량 및 Rate limit 통계
3. **Sentry Dashboard**: 에러 트렌드 및 성능
4. **Report URI**: CSP 위반 리포트

## 🔄 롤백 계획

문제 발생 시:

```bash
# 1. Vercel에서 이전 배포로 롤백
vercel rollback

# 2. 또는 Git revert
git revert HEAD
git push origin main

# 3. 환경변수 복구 (필요시)
vercel env pull
```

## 📝 체크리스트 요약

- [ ] Upstash Redis 데이터베이스 생성
- [ ] 모든 필수 환경변수 설정
- [ ] 로컬에서 프로덕션 빌드 테스트
- [ ] Vercel에 환경변수 추가
- [ ] 배포 실행
- [ ] Rate limiting 작동 확인
- [ ] CSP 정책 확인
- [ ] Sentry 연결 확인
- [ ] 모니터링 대시보드 설정

## 🆘 지원

문제 발생 시:
1. [Vercel Status](https://vercel-status.com) 확인
2. [Upstash Status](https://status.upstash.com) 확인
3. GitHub Issues에 문제 보고