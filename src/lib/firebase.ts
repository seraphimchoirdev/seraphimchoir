/**
 * Firebase 초기화 및 설정
 *
 * 이 파일은 FCM(Firebase Cloud Messaging) 연동을 위한 준비 코드입니다.
 * 실제 사용을 위해서는:
 * 1. Firebase 콘솔에서 프로젝트 생성
 * 2. 웹 앱 등록 및 설정값 획득
 * 3. .env에 환경변수 설정
 * 4. 아래 주석 해제
 */

// import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
// import { getMessaging, Messaging } from 'firebase/messaging';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}

// Firebase 설정 (환경변수에서 로드)
export const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// VAPID Key (웹 푸시용 공개키)
export const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';

// Firebase 설정이 유효한지 확인
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    vapidKey
  );
}

// Firebase 앱 인스턴스 (싱글톤)
// let app: FirebaseApp | null = null;
// let messaging: Messaging | null = null;

/**
 * Firebase 앱 초기화
 * FCM 서비스 세팅 후 주석 해제하여 사용
 */
// export function initializeFirebase(): FirebaseApp | null {
//   if (!isFirebaseConfigured()) {
//     console.warn('[Firebase] 환경변수가 설정되지 않았습니다.');
//     return null;
//   }

//   if (typeof window === 'undefined') {
//     return null;
//   }

//   if (!app) {
//     const apps = getApps();
//     app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
//   }

//   return app;
// }

/**
 * Firebase Messaging 인스턴스 가져오기
 * FCM 서비스 세팅 후 주석 해제하여 사용
 */
// export function getFirebaseMessaging(): Messaging | null {
//   if (typeof window === 'undefined') {
//     return null;
//   }

//   const firebaseApp = initializeFirebase();
//   if (!firebaseApp) {
//     return null;
//   }

//   if (!messaging) {
//     try {
//       messaging = getMessaging(firebaseApp);
//     } catch (error) {
//       console.error('[Firebase] Messaging 초기화 실패:', error);
//       return null;
//     }
//   }

//   return messaging;
// }

// 임시 export (타입 에러 방지)
export function initializeFirebase() {
  console.log('[Firebase] FCM 연동이 아직 설정되지 않았습니다.');
  return null;
}

export function getFirebaseMessaging() {
  console.log('[Firebase] FCM 연동이 아직 설정되지 않았습니다.');
  return null;
}
