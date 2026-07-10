# 푸시 알림 시스템 — 배포 체크리스트

> 1차 구현(2026-07-11) 완료 후 프로덕션 배포 전 수동 작업 목록.
> 구현 내역: 웹푸시(VAPID) 구독/발송 인프라, 인앱 알림함(벨), 투표 독려 크론,
> 배치표 공유/확정/좌석변동 알림. 상세 설계는 코드 주석 및 핸드오프 문서 참고.

## 1. Vercel 환경변수 등록 (필수)

Vercel 대시보드 → Settings → Environment Variables:

| 변수 | 값 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 로컬 `.env.local`에 발급해 둔 값 | 클라이언트 노출 OK |
| `VAPID_PRIVATE_KEY` | 로컬 `.env.local`에 발급해 둔 값 | **서버 전용, 노출 금지** |
| `VAPID_SUBJECT` | `mailto:romingoon@gmail.com` | 푸시 서비스 사업자에게 전달되는 연락처 |
| `CRON_SECRET` | 로컬 `.env.local` 값 또는 새 랜덤 문자열 | 크론 라우트 인증용 |

- 키 재발급이 필요하면: `npx web-push generate-vapid-keys`
- **주의**: VAPID 키를 나중에 바꾸면 기존 브라우저 구독이 전부 무효화됨(410으로 자동 정리되지만 재구독 필요). 한 번 정한 키는 유지할 것.

## 2. 프로덕션 마이그레이션 (필수)

```bash
npx supabase db push   # 20260711090000_add_push_notifications.sql 적용
```

적용 후 Supabase Studio에서 `push_subscriptions`, `notifications` 테이블과 RLS 활성화 확인.

## 3. 크론(투표 독려 자동 발송) — Supabase pg_cron 채택 (필수: Vault 시크릿 등록)

**채택된 방식**: `20260711120000_add_vote_reminder_cron.sql` 마이그레이션이
pg_cron 잡 2건(금 11:00 UTC = 금 20:00 KST, 토 01:00 UTC = 토 10:00 KST)을 등록한다.
잡은 `public.invoke_vote_reminder()` 함수를 호출하고, 이 함수가 **Supabase Vault**에서
URL과 시크릿을 읽어 앱의 `/api/cron/vote-reminder`를 HTTP 호출한다.
Vault 시크릿이 없으면 아무것도 하지 않으므로(no-op), **시크릿 등록 전까지는 발송되지 않는다.**

> Vercel Cron은 사용하지 않는다 (`vercel.json`에서 제거됨 — 중복 발송 방지).

### 배포 시 해야 할 일 (프로덕션 1회)

`npx supabase db push` 후, Supabase Studio SQL Editor에서 Vault 시크릿 2개 등록:

```sql
SELECT vault.create_secret('https://<프로덕션 도메인>/api/cron/vote-reminder', 'vote_reminder_url');
SELECT vault.create_secret('<CRON_SECRET 값>', 'vote_reminder_cron_secret');
```

(대시보드 Project Settings → Vault에서 UI로 등록해도 됨. 이름이 정확히
`vote_reminder_url`, `vote_reminder_cron_secret`이어야 한다.)

### 확인/운영

```sql
-- 등록된 잡 확인
SELECT jobname, schedule, active FROM cron.job;

-- 최근 실행 이력 (성공/실패)
SELECT jobname, status, return_message, start_time
FROM cron.job_run_details d JOIN cron.job j ON j.jobid = d.jobid
ORDER BY start_time DESC LIMIT 10;

-- 즉시 수동 실행 (테스트)
SELECT public.invoke_vote_reminder();

-- HTTP 응답 확인 (pg_net 비동기 응답 로그)
SELECT * FROM net._http_response ORDER BY created DESC LIMIT 5;
```

### 참고: 다른 무료 대안 (미채택)

- **Vercel Hobby Cron**: 주 1회짜리 2건이라 개수/빈도 제한은 통과하지만 실행 시각이 최대 1시간 지연될 수 있음.
- **Upstash QStash**: 무료 티어에 크론 포함, 재시도/서명 검증 지원.
- **GitHub Actions schedule**: 피크 시간대 지연이 잦아 시각 민감 알림에는 비권장.

## 4. 배포 후 스모크 테스트

1. 프로덕션 접속(HTTPS) → 로그인 → 알림 권한 허용 → Supabase에서 `push_subscriptions` row 생성 확인
2. `curl -H "Authorization: Bearer $CRON_SECRET" https://<도메인>/api/cron/vote-reminder`
   - 마감 전(금~토 15:00 이전): `success: true` + 미투표자 수
   - 마감 후: `skipped: true, reason: 'deadline_passed'`
   - 무인증: 401
3. 실제 기기에서 OS 푸시 수신 확인 (백그라운드/포그라운드)
   - **iOS는 홈 화면에 PWA 설치 + iOS 16.4 이상**에서만 수신 가능 (앱 내 안내 UI 있음)
4. 배치표 하나를 DRAFT→편집완료(SHARED) 전환 → 좌석 연결 대원들에게 알림 도착 확인
5. 헤더 벨 뱃지/목록/읽음 처리 동작 확인

## 5. 기타

- 로컬 DB에는 검증용 테스트 알림과 1/18 배치표 상태 변경(SHARED)이 남아 있음 — `npx supabase db reset`으로 초기화 가능
- 오래된 알림 정리: `SELECT cleanup_old_notifications();` (읽은 지 90일 경과분 삭제, 자동화는 2차에서 pg_cron으로)
- 2차 범위(미구현): 공지 알림, 커뮤니티 상호작용 알림, 사용자별 수신 설정(notification_preferences), 재배치 알림 디바운스
