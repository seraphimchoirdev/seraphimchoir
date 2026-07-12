# 전체 코드 리뷰 + 성능 최적화 계획 (2026-07-12)

> 3영역(백엔드/DB, 프론트엔드, 아키텍처/캐싱) 병렬 리뷰 + Vercel Speed Insights 실측 기반.
> ✅ = 이번에 실행, 📋 = 백로그(사유 명시)

## Speed Insights 실측 (7일, Production)

| 지표 | Desktop | Mobile | 판정 |
|---|---|---|---|
| RES | 85 | **52** | 개선 필요 |
| **TTFB** | **2.45s** | **4.93s** | **Poor — 최대 병목** |
| FCP / LCP | 2.96s / 3.26s | 5.72s / 5.8s | TTFB에 종속 |
| INP / FID | 104ms / 14ms | 112ms / 32ms | 양호 |
| CLS | 0.07 | 0.18 | 모바일 개선 필요 |

문제 라우트: 모바일 `/dashboard` 52점(방문 최다), `/service-schedules` 71, `/login` 65, `/arrangements/[id]` 58.
**결론: 클라이언트 인터랙션은 문제없고, 서버 응답(TTFB)이 지배적 병목.** Hobby 플랜 콜드스타트 + 미들웨어/SSR 쿼리 경로가 원인 후보.

## A. 보안 (성능보다 우선 — 전부 ✅ 즉시 수정)

| # | 심각도 | 위치 | 내용 |
|---|---|---|---|
| A1 | HIGH | `api/import-ml-data/route.ts` | **무인증 + admin client** — 누구나 schedules/attendances/arrangements/seats 쓰기 가능. `filename` path traversal(`../`)도 가능 → 인증+ADMIN 체크, filename basename 검증 |
| A2 | HIGH | `api/ml/learn-part-placement/route.ts` | 무인증 + admin client → 인증+ADMIN/CONDUCTOR 체크 |
| A3 | HIGH | `api/community/posts/[id]/route.ts:146` | IDOR — `is_deleted:true`면 admin client로 전환해 RLS 우회, 소유권 체크 없음 → 작성자/운영진 검증 추가 |
| A4 | HIGH | `api/community/albums/[id]/route.ts:108` | A3과 동일 패턴 (앨범) |
| A5 | HIGH | `api/files/delete/route.ts:51` | public 버킷 삭제에 권한 체크 전무 (주석은 "MANAGER 이상 또는 업로더"라고 주장) → 운영진 또는 업로더 검증 |
| A6 | HIGH | `api/dashboard/stats/route.ts` | 유일하게 인증 없는 dashboard 라우트 (admin client 직행) → getUser 가드 추가 |
| A7 | MED | `api/community/albums/quick-upload/route.ts:80` | 월간 자동앨범 find-or-create 레이스 → ✅ 부분 유니크 인덱스(`uq_photo_albums_auto_monthly`) + 23505 충돌 시 재조회 폴백 (2차 세션) |

## B. 성능 (TTFB/CLS 타깃)

| # | 구분 | 내용 | 처리 |
|---|---|---|---|
| B1 | 서버 | CSP 헤더를 미들웨어에서 매 요청 생성하지만 nonce는 실제로 미사용(`'unsafe-inline'` 하드코딩) — 순수 낭비 → `next.config.ts` headers()로 정적 이동 | ✅ |
| B2 | 클라 | `SplashScreen` hydration mismatch — sessionStorage를 렌더 중 직접 읽음. 재방문마다 서버/클라 마크업 불일치 → React 전체 리하이드레이션 비용 + CLS 기여 | ✅ |
| B3 | 클라 | React Compiler가 `annotation` 모드 — `'use memo'` 붙은 MemberTable 1개만 최적화되고 나머지 전부 미적용 (CLAUDE.md의 "자동 최적화" 전제와 불일치) → `infer` 모드 전환 + 빌드/스모크 검증 | ✅ |
| B4 | 클라 | `sw.js` 캐시명 수동 버전(`v1`) — 배포해도 정적 자산 캐시가 안 갈림 → 빌드 ID 연동 | ✅ |
| B5 | 서버 | `assertEnvironmentValid()` 미호출 — 설정 오류가 런타임 요청에서 터짐 → `instrumentation.ts`에서 부팅 시 검증 | ✅ |
| B6 | 클라 | `useAttendances.ts` 로컬 STALE_TIME 중복 → 공용 상수로 통일 | ✅ |
| B7 | 서버 | 대시보드 로직 이중화 — `dashboard-data.ts`(SSR)와 `/api/dashboard/*` 4개 라우트가 동일 쿼리를 각자 구현. 회귀 위험(실제로 마감 폴백 버그 때 두 곳 고침) → API 라우트가 lib 함수를 호출하도록 위임 | ✅ |
| B8 | 서버 | 60s 폴링마다 카드별 getUser+profile 중복 조회 (탭당 분당 2-4회) → ✅ `lib/profile-cache.ts` TTL 60s 인메모리 캐시 + 역할/연동 변경 라우트에서 무효화 (2차 세션. getUser는 유일한 인증 지점이라 유지) |
| B9 | 서버 | `unstable_cache` 미사용 — 다음 주일 일정/마감 등 전 사용자 공유 데이터를 매 요청 조회 → ✅ `lib/dashboard-shared-cache.ts` — 일정·마감·배치표를 revalidate 60s + `dashboard-shared` 태그로 캐싱, 일정/배치표 변경 라우트 7곳에서 태그 무효화 (2차 세션. 투표 마감은 클라이언트 직접 쓰기라 태그가 닿지 않음 → 60s 안전망이 커버) |
| B10 | 클라 | `arrangements/[id]/page.tsx` 1,639줄 단일 클라이언트 컴포넌트 → 📋 단계별 컴포넌트 분리 (대규모 리팩터링, 별도 세션 권장). 단기로는 B3(infer)이 완화 |
| B11 | 클라 | 배치 편집 화면에서 `useMembers` 3중 구독 → 📋 B10과 함께 처리 |
| B12 | 인프라 | Hobby 플랜 콜드스타트가 TTFB에 기여 — 코드로 해결 불가. 📋 트래픽 증가 시 Pro 검토. Sentry tracesSampleRate 확인은 ✅ 범위에서 점검 |

## C. 실행 결과 (2026-07-12 완료)

1. ✅ **보안 6건** — `fix(security)` 커밋: 무인증 401(curl 3종 + traversal payload), MEMBER 세션 IDOR 403 검증 완료
2. ✅ **성능/품질 6건** — `perf` 커밋: 프로덕션 빌드 통과(infer 모드), CSP 테스트 13건 통과, 재방문 hydration 무오류, sw 버전 스탬핑 Vercel 시뮬레이션 확인. Sentry sampleRate는 0.1로 적정(수정 불요)
3. ✅ **대시보드 위임** — `refactor(dashboard)` 커밋: 4개 라우트 -459줄, admin 세션으로 4개 응답 정상 확인, 전체 테스트 710건 통과 (기존 실패 1건도 수정)
4. 📋 **백로그**: A7(앨범 레이스), B8(profile 폴링 캐시), B9(unstable_cache), B10/B11(배치 편집 페이지 분리) — 효과 대비 리스크가 커서 별도 세션에서 설계 필요

## E. 2차 세션 실행 결과 (2026-07-12 오후)

1. ✅ **A7** — 마이그레이션 `20260712090000_add_auto_album_unique_index.sql`: 기존 중복 정리(사진 이관 + photo_count 재계산 + soft-delete) 후 부분 유니크 인덱스 생성. 로컬 Supabase에서 중복 재현 → 병합 → 23505 차단까지 검증. quick-upload 라우트는 충돌 시 기존 앨범 재조회 폴백.
2. ✅ **B8** — `lib/profile-cache.ts`(TTL 60s, 유닛 테스트 5건): 대시보드 라우트 3곳 + SSR 페이지에 적용, `auth/roles`·`member-link` 변경 3곳에서 무효화. 스모크: `/dashboard` SSR 재방문 0.30s → 0.09s.
3. ✅ **B9** — `lib/dashboard-shared-cache.ts`: 일정·투표마감·배치표를 `unstable_cache`(Vercel Data Cache — 인스턴스 간 공유)로 캐싱. Next 16의 `revalidateTag(tag, 'max')` 시그니처 사용, 무효화 실패는 요청을 실패시키지 않도록 흡수(60s 안전망). service-schedules 4곳·arrangements 3곳·import-ml-data에서 태그 무효화.
4. 검증: 전체 테스트 715건 통과, 프로덕션 빌드 통과, 대시보드 API 4종 + SSR 스모크 200 확인.
5. ✅ ~~잔여 백로그: B10/B11~~ → 3차 세션에서 완료 (아래 F 참고)

**배포 후 확인**: Speed Insights에서 TTFB/RES 추이 재관찰 (CSP 정적화·infer 모드 효과 측정). TTFB의 나머지 몫은 Hobby 콜드스타트 영향이 커서 코드만으로 한계가 있음.

## F. 3차 세션 실행 결과 — B10/B11 + E2E 강화 (2026-07-12)

1. ✅ **B11** — `hooks/useArrangementMembers.ts`: page/MemberSidebar/SeatsGrid의 useMembers 6개 구독을 페이지 1곳으로 통합, 하위에는 props(멤버 목록·heightMap) 전달.
2. ✅ **B10** — 2단계 분리로 `arrangements/[id]/page.tsx` **1,638줄 → 936줄**:
   - B10-1: WorkflowStepContent(Expanded)·WorkflowFloatingStepContent(플로팅 바)·OffsetPresetButtons 컴포넌트 추출, getActivePresetId 순수 함수화
   - B10-2: ID 변경 감지·DB 초기 로드·AI 추천 분배 3개 효과를 `hooks/useArrangementInitialization.ts`로 이동
   - 잔여(모바일 바텀시트·메모 에디터 분리)는 효과 대비 리스크로 백로그 유지
3. ✅ **E2E 강화** (사용자 요청: 핵심 페이지 빡센 검증):
   - 신규 `arrangement-editor.spec`: 생성→워크플로우→click-to-place 배치/제거→저장→새로고침 복원→SHARED 전환→긴급 수정 보존 전체 여정 + 모바일 스모크
   - `attendance.spec` 보강: 토글→저장→새로고침 유지→원상복구 (실제 mutation 검증)
   - 무력화돼 있던 `arrangement-emergency-edit.spec`(존재하지 않는 셀렉터로 항상 통과) 실셀렉터 기반 재작성, 컴포넌트에 data-testid 부여
   - 내비 라벨 개편 미반영 등 기존 스펙 부패 6건 수리
4. 🐛 **E2E가 발견한 잠재 크래시 (수정 완료)**: 등단 인원이 추천 상한(120석) 초과 시 새 배치표 편집 페이지가 setGridLayout 무한 루프(React #185)로 전면 크래시. 실운영은 아직 120명 이하라 미발현이었으나 게스트 포함 시 재현 가능했음 → 수렴 조건을 추천 결과 기준으로 수정 + 회귀 테스트 2건.
5. 🔧 **CSP 개선**: Supabase origin을 env에서 도출(커스텀 도메인 대비), 로컬 http Supabase 시 upgrade-insecure-requests 제외(WebKit E2E 차단 해소).
6. 검증: jest **718건** 통과, 프로덕션 빌드 통과, E2E desktop-chrome **117/117**, mobile-ios(편집·출석) **12/12**.

## D. 리뷰에서 문제없음으로 확인된 것

- attendances/arrangements/notifications/prayers 등 대부분 라우트의 인증·권한·클라이언트 사용 일관성
- seats/bulk의 트랜잭션 RPC, 독립 쿼리 Promise.all 병렬화
- 대시보드 SSR prefetch + HydrationBoundary 구조, 역할별 조건 prefetch
- next.config의 optimizePackageImports, 번들 분석기, canvas류 서버 전용 의존성
- ~100명 규모에서 리스트 가상화 불필요 판단
