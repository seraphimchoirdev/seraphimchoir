import { test, expect } from '../fixtures/base.fixture';

test.describe('통계', () => {
  test('/statistics에서 /management/statistics로 리다이렉트된다', async ({ page }) => {
    await page.goto('/statistics');

    // 리다이렉트 확인
    await expect(page).toHaveURL(/\/management\/statistics/, { timeout: 15_000 });
  });

  test('통계 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/management/statistics');
    await expect(page).toHaveURL(/\/management\/statistics/);

    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  });

  test('통계 콘텐츠가 표시된다', async ({ page }) => {
    await page.goto('/management/statistics');
    await page.waitForLoadState('networkidle');

    // 통계 관련 콘텐츠 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });

    // 출석률, 그래프, 또는 데이터 관련 요소
    const hasStats = await page.getByText(/출석|통계|%/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasStats).toBeTruthy();
  });

  test('통계 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/management/statistics');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
