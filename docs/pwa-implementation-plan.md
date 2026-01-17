# PWA 완전 구현 및 FCM 푸시 알림 준비 계획

## 목표

1. PWA 설치 가능하도록 완전한 설정
2. FCM 푸시 알림 연동 준비 (서비스 세팅 전 코드 준비)
3. 안드로이드/iOS 플랫폼별 차이 대응
4. 사용자 친화적 설치 안내 UI 구현

---

## 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| manifest.json | 완료 | standalone, 아이콘 설정됨 |
| sw.js | 완료 | 캐싱, 푸시 기본 핸들러 |
| 메타데이터 | 완료 | layout.tsx에 설정됨 |
| 아이콘 | 완료 | 192x192, 512x512 |
| **서비스 워커 등록** | 미구현 | 필수 |
| **설치 프롬프트 (Android)** | 미구현 | beforeinstallprompt |
| **설치 안내 (iOS)** | 미구현 | 수동 안내 필요 |
| **푸시 권한 요청** | 미구현 | FCM 준비용 |

---

## 구현 계획

### Phase 1: 서비스 워커 등록

**파일**: `src/components/pwa/ServiceWorkerRegistration.tsx`

- 'use client' 컴포넌트로 서비스 워커 등록
- `navigator.serviceWorker.register('/sw.js')`
- 업데이트 감지 및 알림
- layout.tsx의 Providers에 포함

### Phase 2: PWA 설치 프롬프트 (Android/Chrome)

**파일**: `src/components/pwa/PWAInstallPrompt.tsx`

- beforeinstallprompt 이벤트 캡처
- deferredPrompt 저장
- 설치 버튼 UI (조건부 표시)
- appinstalled 이벤트로 상태 업데이트

### Phase 3: iOS 설치 안내 UI

**파일**: `src/components/pwa/IOSInstallGuide.tsx`

- iOS Safari 감지
- standalone 모드 감지 (이미 설치됨)
- 단계별 설치 가이드 UI
- 하단 시트 형태로 표시
- "다시 보지 않기" 옵션

### Phase 4: 푸시 알림 권한 요청 UI

**파일**: `src/components/pwa/PushNotificationPrompt.tsx`

- Double Permission Pattern 적용
  1. 앱 UI로 가치 설명 (먼저)
  2. 브라우저 기본 다이얼로그 (이후)
- 플랫폼별 조건부 표시
  - Android: 언제든 가능
  - iOS: 16.4+ && PWA 설치 후에만
- 권한 상태 저장 (localStorage)

### Phase 5: FCM 연동 준비 (코드만)

**파일들**:
- `src/lib/firebase.ts` - Firebase 초기화
- `src/lib/push-notifications.ts` - 푸시 관련 유틸
- `public/firebase-messaging-sw.js` - FCM 서비스 워커
- `.env.example` 업데이트 - FCM 환경변수 추가

내용:
- Firebase 설정 구조 준비
- getToken, onMessage 함수 준비
- 환경변수 템플릿 (.env.example)
- 실제 연동은 FCM 서비스 세팅 후 활성화

### Phase 6: PWA 컨텍스트 및 훅

**파일**: `src/hooks/usePWA.ts`

```typescript
// 반환값
{
  isInstalled: boolean,      // PWA로 실행 중인지
  isIOS: boolean,            // iOS 기기인지
  isAndroid: boolean,        // Android 기기인지
  canInstall: boolean,       // 설치 가능한 상태인지
  installApp: () => void,    // 설치 트리거 함수
  pushPermission: 'default' | 'granted' | 'denied',
  requestPushPermission: () => Promise<void>,
}
```

### Phase 7: 마이페이지 PWA 섹션

**파일**: `src/app/mypage/page.tsx` (수정)

- PWA 설치 상태 표시
- 설치 버튼 (미설치 시)
- 푸시 알림 설정 토글
- iOS 설치 안내 링크

---

## 수정/생성 파일 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `src/components/pwa/ServiceWorkerRegistration.tsx` | 신규 | SW 등록 |
| `src/components/pwa/PWAInstallPrompt.tsx` | 신규 | Android 설치 프롬프트 |
| `src/components/pwa/IOSInstallGuide.tsx` | 신규 | iOS 설치 안내 |
| `src/components/pwa/PushNotificationPrompt.tsx` | 신규 | 푸시 권한 요청 |
| `src/components/pwa/index.ts` | 신규 | 배럴 export |
| `src/hooks/usePWA.ts` | 신규 | PWA 상태 훅 |
| `src/lib/firebase.ts` | 신규 | Firebase 초기화 (준비) |
| `src/lib/push-notifications.ts` | 신규 | 푸시 유틸 (준비) |
| `public/firebase-messaging-sw.js` | 신규 | FCM SW (준비) |
| `src/lib/providers.tsx` | 수정 | PWA 컴포넌트 포함 |
| `src/app/mypage/page.tsx` | 수정 | PWA 설정 섹션 추가 |
| `.env.example` | 수정 | FCM 환경변수 템플릿 |
| `public/manifest.json` | 수정 | screenshots, categories 추가 |

---

## 플랫폼별 사용자 경험

### Android 사용자 플로우

```
1. 웹사이트 방문
2. 자동 설치 배너 표시 (또는 마이페이지에서 설치)
3. 1-2번 탭으로 설치 완료
4. 앱 첫 실행 시 푸시 알림 안내 표시
5. 권한 승인 -> FCM 토큰 저장
```

### iOS 사용자 플로우

```
1. Safari에서 웹사이트 방문
2. 하단 iOS 설치 안내 시트 표시
3. 공유 -> 홈 화면에 추가 -> 추가 (수동)
4. PWA에서 앱 실행
5. iOS 16.4+ 감지 시 푸시 알림 안내
6. 권한 승인 -> 푸시 구독
```

---

## 푸시 알림 권한 요청 전략

### 타이밍 조건

```typescript
const shouldShowPushPrompt =
  !localStorage.getItem('push_dismissed') &&  // 거부 안함
  Notification.permission === 'default' &&    // 아직 결정 안함
  pageViews >= 3 &&                           // 3페이지 이상 방문
  timeOnSite >= 30;                           // 30초 이상 체류
```

### 플랫폼별 조건

| 플랫폼 | 추가 조건 |
|--------|----------|
| Android | 없음 (언제든 가능) |
| iOS 16.4+ | PWA로 실행 중일 때만 |
| iOS 16.3 이하 | 미지원 (안내만) |

---

## FCM 환경변수 (준비)

```env
# .env.example에 추가
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FCM_VAPID_KEY=
```

---

## 검증 방법

### 1. PWA 설치 테스트

- Chrome DevTools > Application > Manifest 확인
- Lighthouse PWA 점수 확인
- Android: 설치 배너 표시 확인
- iOS: Safari 공유 메뉴에서 "홈 화면에 추가" 확인

### 2. 서비스 워커 테스트

- Chrome DevTools > Application > Service Workers
- 등록 상태 확인
- 오프라인 모드에서 아이콘 캐시 확인

### 3. 푸시 알림 테스트 (FCM 세팅 후)

- 권한 요청 다이얼로그 표시 확인
- FCM 토큰 발급 확인
- 테스트 푸시 전송 및 수신 확인

---

## 구현 순서

1. **Phase 1-2**: 서비스 워커 등록 + Android 설치 프롬프트
2. **Phase 3**: iOS 설치 안내 UI
3. **Phase 4**: 푸시 알림 권한 요청 UI
4. **Phase 5**: FCM 연동 코드 준비
5. **Phase 6**: usePWA 훅
6. **Phase 7**: 마이페이지 PWA 섹션
7. **검증**: 빌드 및 테스트

---

## 향후 작업 (이번 범위 외)

- FCM 서비스 세팅 후 실제 연동
- 백엔드 푸시 알림 전송 API
- 알림 구독 관리 (Supabase 테이블)
- iOS 18.4+ Declarative Web Push 대응

---

## 참고 자료

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications for PWA](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
