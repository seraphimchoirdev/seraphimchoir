/**
 * 클라이언트 사이드 스크립트 with CSP nonce 지원
 *
 * 프로덕션 환경에서 안전한 인라인 스크립트 실행을 위한 컴포넌트
 */

import { getNonceProps } from '@/lib/security/csp-nonce';

/**
 * 테마 초기화 스크립트 (다크모드 깜빡임 방지)
 */
export async function ThemeInitScript() {
  const nonceProps = await getNonceProps();

  return (
    <script
      {...nonceProps}
      dangerouslySetInnerHTML={{
        __html: `
          // 테마 초기화 (FOUC 방지)
          try {
            const theme = localStorage.getItem('theme') || 'light';
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            }
          } catch (e) {}
        `,
      }}
    />
  );
}

/**
 * 분석 스크립트 (Google Analytics 등)
 */
export async function AnalyticsScript() {
  // 프로덕션에서만 활성화
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  const nonceProps = await getNonceProps();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) {
    return null;
  }

  return (
    <>
      <script
        {...nonceProps}
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <script
        {...nonceProps}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

/**
 * PWA 설치 프롬프트 스크립트
 */
export async function PWAInstallScript() {
  const nonceProps = await getNonceProps();

  return (
    <script
      {...nonceProps}
      dangerouslySetInnerHTML={{
        __html: `
          // PWA 설치 프롬프트 캡처
          let deferredPrompt;
          window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            // 설치 버튼 표시 로직
            const installButton = document.getElementById('pwa-install-button');
            if (installButton) {
              installButton.style.display = 'block';
              installButton.addEventListener('click', () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then((choiceResult) => {
                    deferredPrompt = null;
                  });
                }
              });
            }
          });
        `,
      }}
    />
  );
}