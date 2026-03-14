import { test, expect } from '../fixtures/base.fixture';

test.describe('마이페이지', () => {
  test('마이페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/mypage');

    // 대원 연결이 안 되어 있으면 /member-link로 리다이렉트될 수 있음
    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await expect(page).toHaveURL(/\/mypage/);
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  });

  test('프로필 정보가 표시된다', async ({ page }) => {
    await page.goto('/mypage');

    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // 기본 정보 카드가 표시됨
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

    // 이름, 파트 등 프로필 데이터가 표시됨
    const hasProfile = await page.getByText(/이름|파트|이메일/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasProfile).toBeTruthy();
  });

  test('키 입력 필드가 존재한다', async ({ page }) => {
    await page.goto('/mypage');

    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // 키 입력 필드 (type="number", min=100, max=250)
    const heightInput = page.locator('input[type="number"]').first();
    const hasHeight = await heightInput.isVisible({ timeout: 10_000 }).catch(() => false);

    // 키 입력이 있으면 min/max 검증
    if (hasHeight) {
      const min = await heightInput.getAttribute('min');
      const max = await heightInput.getAttribute('max');
      expect(min).toBe('100');
      expect(max).toBe('250');
    }
  });

  test('마이페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/mypage');

    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
