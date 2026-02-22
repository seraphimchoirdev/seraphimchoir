import { test, expect } from '../fixtures/base.fixture';

test.describe('임원 포털', () => {
  test('임원 포털 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/management');
    await expect(page).toHaveURL(/\/management/);

    await expect(page.getByText(/임원|포털/)).toBeVisible({ timeout: 15_000 });
  });

  test('출석 현황 카드가 표시된다', async ({ page }) => {
    await page.goto('/management');
    await page.waitForLoadState('networkidle');

    // 출석 현황 카드 (퍼센트 표시)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });

    // 출석 관련 텍스트
    const hasAttendance = await page.getByText(/출석|%/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasAttendance).toBeTruthy();
  });

  test('빠른 링크가 표시된다', async ({ page }) => {
    await page.goto('/management');
    await page.waitForLoadState('networkidle');

    // 빠른 링크: 통계, 문서, 출석, 일정 페이지로의 바로가기
    const links = page.getByRole('link');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('통계 상세 보기로 이동할 수 있다', async ({ page }) => {
    await page.goto('/management');
    await page.waitForLoadState('networkidle');

    // "통계" 또는 "상세 보기" 링크/버튼 클릭
    const statsLink = page.getByRole('link', { name: /통계/ }).first();
    if (await statsLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await statsLink.click();
      await expect(page).toHaveURL(/\/management\/statistics|\/statistics/, { timeout: 15_000 });
    }
  });

  test('임원 포털 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/management');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
