import { test, expect } from '../fixtures/base.fixture';

test.describe('내 출석 투표', () => {
  test('내 출석 투표 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/my-attendance');

    // 대원 연결이 안 되어 있으면 /member-link로 리다이렉트될 수 있음
    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await expect(page).toHaveURL(/\/my-attendance/);
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });
  });

  test('다가오는 예배 목록이 표시되거나 빈 상태가 표시된다', async ({ page }) => {
    await page.goto('/my-attendance');

    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // 예배 카드가 있거나 "예정된 예배가 없습니다" 메시지
    const hasServices = await page.getByText(/예배|출석/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasEmpty = await page.getByText(/예정된|예배가 없|일정이 없/).first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasServices || hasEmpty).toBeTruthy();
  });

  test('투표 버튼이 표시된다', async ({ page }) => {
    await page.goto('/my-attendance');

    const url = page.url();
    if (url.includes('/member-link')) {
      test.skip();
      return;
    }

    await page.waitForLoadState('networkidle');

    // 등단 가능/불가 투표 버튼 또는 연습 참석 버튼
    const hasVoteButtons = await page.getByRole('button', { name: /가능|불가|참석|불참/ }).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // 예배가 없으면 투표 버튼도 없음
    if (!hasVoteButtons) {
      const hasEmpty = await page.getByText(/예정된|예배가 없/).first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);
      expect(hasEmpty).toBeTruthy();
    }
  });

  test('내 출석 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/my-attendance');

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
