import { test as base, expect } from '@playwright/test';

/**
 * 뷰포트 크기 기반 디바이스 타입 fixture.
 *
 * 반응형 경계 (Tailwind CSS 기본):
 * - < 768px  : Mobile
 * - 768~1023 : Tablet
 * - ≥ 1024   : Desktop (lg: breakpoint → Navigation vs BottomNavigation)
 */
export const test = base.extend<{
  isMobileViewport: boolean;
  isDesktopViewport: boolean;
  isTabletViewport: boolean;
}>({
  isMobileViewport: async ({ page }, use) => {
    const width = page.viewportSize()?.width ?? 1280;
    await use(width < 768);
  },
  isDesktopViewport: async ({ page }, use) => {
    const width = page.viewportSize()?.width ?? 1280;
    await use(width >= 1024);
  },
  isTabletViewport: async ({ page }, use) => {
    const width = page.viewportSize()?.width ?? 1280;
    await use(width >= 768 && width < 1024);
  },
});

/**
 * iOS PWA 설치 프롬프트를 방지하는 헬퍼.
 * addInitScript로 localStorage에 dismiss 키를 설정하여
 * 페이지가 로드될 때 프롬프트가 처음부터 나타나지 않게 함.
 * 반드시 page.goto() 호출 **전**에 사용해야 함.
 */
export async function suppressPWAPrompt(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('ios_install_dismissed', Date.now().toString());
  });
}

/**
 * WebKit(iPad)에서 React controlled input에 fill() 후 값이 유실되는 문제를 방지하는 헬퍼.
 * fill() 시도 후 값이 비어있으면 click → selectAll → type 방식으로 폴백한다.
 */
export async function stableFill(
  locator: import('@playwright/test').Locator,
  value: string,
) {
  await locator.fill(value);

  // fill()이 성공했는지 확인
  const actual = await locator.inputValue();
  if (actual === value) return;

  // 폴백: clear 후 한 글자씩 입력 (WebKit controlled input 호환)
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 20 });
  await expect(locator).toHaveValue(value, { timeout: 5_000 });
}

export { expect };
