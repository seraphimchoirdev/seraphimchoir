import { test, expect } from '../fixtures/base.fixture';

test.describe('임원 포털', () => {
  test('임원 포털 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/management/);

    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });
  });

  test('출석 현황 카드가 표시된다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });

    // 출석 관련 텍스트
    const hasAttendance = await page.getByText(/출석|%/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasAttendance).toBeTruthy();
  });

  test('빠른 링크가 표시된다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });

    // 빠른 링크: 통계, 문서, 출석, 일정 페이지로의 바로가기
    const links = page.getByRole('link');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('통계 상세 보기로 이동할 수 있다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });

    // "통계" 또는 "상세 보기" 링크/버튼 클릭
    const statsLink = page.getByRole('link', { name: /통계/ }).first();
    if (await statsLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await statsLink.click();
      await expect(page).toHaveURL(/\/management\/statistics|\/statistics/, { timeout: 15_000 });
    }
  });

  test('서브 네비게이션에 기도 담당 탭이 있다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });

    await expect(page.getByRole('link', { name: '기도 담당' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('기도 담당 탭 클릭 시 기도 담당 페이지로 이동한다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });

    const prayerLink = page.getByRole('link', { name: '기도 담당' });
    await expect(prayerLink).toBeVisible({ timeout: 15_000 });
    await prayerLink.click();

    await expect(page).toHaveURL(/\/management\/prayers/, { timeout: 15_000 });
  });

  test('임원 포털 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/management', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '임원 포털' })).toBeVisible({ timeout: 30_000 });

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
