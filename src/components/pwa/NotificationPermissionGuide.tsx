'use client';

import { BellOff, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { usePWA } from '@/hooks/usePWA';

interface NotificationPermissionGuideProps {
  open: boolean;
  onClose: () => void;
  /** iOS 미설치 상태에서 "설치 방법 보기" 클릭 시 (마이페이지 iOS 설치 가이드 열기) */
  onOpenInstallGuide?: () => void;
}

interface GuideStep {
  title: string;
  description: string;
}

/**
 * 알림 차단(denied) 상태 복구 방법 안내 바텀시트
 *
 * 브라우저는 사용자가 알림을 '차단'하면 권한 재요청 프롬프트를 무시하므로,
 * 플랫폼별 설정 화면에서 직접 허용하는 경로를 단계별로 안내한다.
 * 허용 후 탭에 복귀하면 usePWA의 visibilitychange 감지로 상태가 자동 갱신된다.
 */
export default function NotificationPermissionGuide({
  open,
  onClose,
  onOpenInstallGuide,
}: NotificationPermissionGuideProps) {
  const { isIOS, isAndroid, isStandalone } = usePWA();

  if (!open) return null;

  // 플랫폼별 안내 단계
  let steps: GuideStep[];
  let subtitle: string;

  if (isIOS && !isStandalone) {
    // iOS Safari(미설치): 푸시 자체가 홈 화면 앱에서만 동작
    steps = [];
    subtitle = '먼저 홈 화면에 앱을 설치해주세요';
  } else if (isIOS) {
    // iOS PWA(홈 화면 앱): iPhone 설정 앱에서 허용
    subtitle = 'iPhone 설정에서 다시 허용할 수 있어요';
    steps = [
      { title: 'iPhone "설정" 앱을 여세요', description: '홈 화면의 톱니바퀴 아이콘' },
      {
        title: '"알림"으로 이동 후 앱 목록에서 "새로핌:On"을 선택하세요',
        description: '설정 → 알림 → 새로핌:On',
      },
      { title: '"알림 허용"을 켜세요', description: '잠금 화면·배너 표시도 함께 켜는 것을 권장해요' },
      { title: '앱으로 돌아오세요', description: '돌아오면 알림 상태가 자동으로 갱신됩니다' },
    ];
  } else if (isAndroid) {
    subtitle = isStandalone
      ? '휴대폰 설정에서 다시 허용할 수 있어요'
      : 'Chrome 사이트 설정에서 다시 허용할 수 있어요';
    steps = isStandalone
      ? [
          { title: '휴대폰 "설정" 앱을 여세요', description: '설정 → 애플리케이션(앱)' },
          { title: '앱 목록에서 "새로핌:On"을 선택하세요', description: '검색을 사용하면 빨라요' },
          { title: '"알림"을 눌러 허용으로 바꾸세요', description: '알림 허용 스위치 켜기' },
          { title: '앱으로 돌아오세요', description: '돌아오면 알림 상태가 자동으로 갱신됩니다' },
        ]
      : [
          {
            title: '주소창 왼쪽의 자물쇠(사이트 설정) 아이콘을 탭하세요',
            description: '⋮ 메뉴 → 설정 → 사이트 설정 → 알림 경로도 가능해요',
          },
          { title: '"권한" 또는 "알림" 항목을 여세요', description: '차단됨으로 표시되어 있어요' },
          { title: '"허용"으로 바꾸세요', description: '' },
          { title: '이 페이지로 돌아오세요', description: '돌아오면 알림 상태가 자동으로 갱신됩니다' },
        ];
  } else {
    // 데스크톱 브라우저 (Chrome/Edge/Whale 등)
    subtitle = '브라우저 사이트 설정에서 다시 허용할 수 있어요';
    steps = [
      {
        title: '주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 클릭하세요',
        description: '사이트 정보 창이 열립니다',
      },
      { title: '"알림" 항목을 찾아 "허용"으로 바꾸세요', description: '목록에 없으면 "사이트 설정"으로 들어가세요' },
      { title: '이 페이지를 새로고침하세요', description: '새로고침 후 알림 상태가 갱신됩니다' },
    ];
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/50 duration-300">
      <div className="animate-in slide-in-from-bottom w-full max-w-lg rounded-t-2xl bg-[var(--color-background-secondary)] shadow-2xl duration-300">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <BellOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)]">
                알림 다시 허용하기
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">{subtitle}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            ✕
          </Button>
        </div>

        {/* 본문 */}
        <div className="space-y-4 p-4">
          {steps.length === 0 ? (
            // iOS 미설치: 설치가 선행 조건
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-secondary)]">
                iOS에서는 홈 화면에 설치된 앱에서만 푸시 알림을 받을 수 있어요. 먼저 앱을
                설치한 뒤, 앱을 열어 알림을 허용해주세요.
              </p>
              {onOpenInstallGuide && (
                <Button
                  onClick={() => {
                    onClose();
                    onOpenInstallGuide();
                  }}
                  className="w-full"
                >
                  설치 방법 보기
                </Button>
              )}
            </div>
          ) : (
            steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-[var(--color-text-primary)]">{step.title}</p>
                  {step.description && (
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}

          {steps.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-[var(--color-background-tertiary)] p-3">
              <RefreshCw className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" />
              <p className="text-xs text-[var(--color-text-secondary)]">
                허용한 뒤 상태가 바뀌지 않으면 이 페이지를 새로고침해주세요.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="border-t border-[var(--color-border)] p-4">
          <Button onClick={onClose} className="w-full" variant="outline">
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
