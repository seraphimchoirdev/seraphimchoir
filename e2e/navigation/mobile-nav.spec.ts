import { test, expect } from '../fixtures/base.fixture';

test.describe('모바일 하단 네비게이션', () => {
  test('하단 네비게이션 바가 표시된다', async ({ page, isMobileViewport, isTabletViewport }) => {
    test.skip(!isMobileViewport && !isTabletViewport, '모바일/태블릿 전용 테스트');

    await page.goto('/dashboard');

    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav).toBeVisible();
  });

  test('ADMIN 역할의 메인 메뉴가 올바르게 표시된다', async ({
    page,
    isMobileViewport,
    isTabletViewport,
  }) => {
    test.skip(!isMobileViewport && !isTabletViewport, '모바일/태블릿 전용 테스트');

    await page.goto('/dashboard');

    const bottomNav = page.locator('nav.lg\\:hidden');
    await expect(bottomNav.getByText('홈')).toBeVisible();
    await expect(bottomNav.getByText('출석')).toBeVisible();
    await expect(bottomNav.getByText('자리')).toBeVisible();
    await expect(bottomNav.getByText('임원')).toBeVisible();
  });

  test('더보기 버튼으로 Sheet가 열린다', async ({
    page,
    isMobileViewport,
    isTabletViewport,
  }) => {
    test.skip(!isMobileViewport && !isTabletViewport, '모바일/태블릿 전용 테스트');

    await page.goto('/dashboard');

    const moreButton = page.locator('nav.lg\\:hidden').getByText('더보기');
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    await expect(page.getByRole('heading', { name: '더보기' })).toBeVisible();
  });

  test('더보기 Sheet에서 메뉴 항목을 클릭하면 해당 페이지로 이동', async ({
    page,
    isMobileViewport,
    isTabletViewport,
  }) => {
    test.skip(!isMobileViewport && !isTabletViewport, '모바일/태블릿 전용 테스트');

    await page.goto('/dashboard');

    await page.locator('nav.lg\\:hidden').getByText('더보기').click();

    await expect(page.getByRole('heading', { name: '더보기' })).toBeVisible();
    await page.getByRole('link', { name: '찬양대 일정' }).click();

    await expect(page).toHaveURL(/\/service-schedules/);
  });

  test('하단 네비게이션 링크 클릭 시 페이지 이동', async ({
    page,
    isMobileViewport,
    isTabletViewport,
  }) => {
    test.skip(!isMobileViewport && !isTabletViewport, '모바일/태블릿 전용 테스트');

    await page.goto('/dashboard');

    await page.locator('nav.lg\\:hidden').getByText('출석').click();
    await expect(page).toHaveURL(/\/attendances/);
  });

  test('상단 네비게이션 바에 로고가 표시된다', async ({
    page,
    isMobileViewport,
    isTabletViewport,
  }) => {
    test.skip(!isMobileViewport && !isTabletViewport, '모바일/태블릿 전용 테스트');

    await page.goto('/dashboard');

    // 상단 nav (sticky) 안의 로고
    const logo = page.locator('nav img[alt="새로핌:On"]');
    await expect(logo).toBeVisible();
  });
});
