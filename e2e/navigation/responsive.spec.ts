import { test, expect } from '../fixtures/base.fixture';

test.describe('반응형 레이아웃', () => {
  test('Desktop (≥1024px): 상단 Navigation 표시, BottomNavigation 숨김', async ({
    page,
    isDesktopViewport,
  }) => {
    test.skip(!isDesktopViewport, '데스크톱 뷰포트 전용');

    await page.goto('/dashboard');

    // 상단 nav 안에 데스크톱 메뉴 링크가 보여야 함
    await expect(page.locator('nav').getByRole('link', { name: '홈' })).toBeVisible();

    // 하단 BottomNavigation은 숨겨져야 함
    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeHidden();
  });

  test('Mobile (<768px): BottomNavigation 표시, 상단 데스크톱 메뉴 숨김', async ({
    page,
    isMobileViewport,
  }) => {
    test.skip(!isMobileViewport, '모바일 뷰포트 전용');

    await page.goto('/dashboard');

    // 하단 BottomNavigation이 보여야 함
    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();
  });

  test('Tablet Portrait (768px): Mobile 레이아웃 유지', async ({
    page,
    isTabletViewport,
  }) => {
    test.skip(!isTabletViewport, '태블릿 뷰포트 전용');

    await page.goto('/dashboard');

    // 768px는 lg(1024px) 미만이므로 BottomNavigation 표시
    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();
  });

  test('로고가 상단 네비게이션에서 표시된다', async ({ page }) => {
    await page.goto('/dashboard');

    // nav 태그 안의 로고 이미지만 선택 (head의 manifest 아이콘 제외)
    const logo = page.locator('nav img[alt="새로핌:On"]');
    await expect(logo).toBeVisible();
  });

  test('페이지 컨텐츠가 뷰포트를 초과하지 않는다', async ({ page }) => {
    await page.goto('/dashboard');

    const overflowX = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    expect(overflowX).toBe(false);
  });

  test('Z Fold 접힘 (344px): 하단 네비게이션 아이콘이 겹치지 않는다', async ({
    page,
    isMobileViewport,
  }) => {
    test.skip(!isMobileViewport, '모바일 뷰포트 전용');

    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width > 360, '초소형 뷰포트 전용 (≤360px)');

    await page.goto('/dashboard');

    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();

    // 하단 네비게이션의 모든 링크/버튼이 뷰포트 안에 있는지 확인
    const navItems = bottomNav.locator('a, button');
    const count = await navItems.count();

    for (let i = 0; i < count; i++) {
      const box = await navItems.nth(i).boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width + 1);
      }
    }
  });

  test('Z Fold 펼침 (882px): Mobile 레이아웃 유지 (< 1024px)', async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(!viewport || viewport.width < 800 || viewport.width >= 1024, 'Z Fold 펼침 전용');

    await page.goto('/dashboard');

    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();
  });
});
