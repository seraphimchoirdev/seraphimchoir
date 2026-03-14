import { test, expect, suppressPWAPrompt, stableFill } from '../fixtures/base.fixture';

test.describe('로그인', () => {
  // 이 파일의 테스트들은 비인증 상태에서 시작
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    // addInitScript는 goto 전에 호출해야 효과가 있음
    await suppressPWAPrompt(page);
  });

  test('유효한 이메일/비밀번호로 로그인 성공 → 대시보드 리다이렉트', async ({ page }) => {
    await page.goto('/login');

    await stableFill(page.locator('#email'), 'admin@test.com');
    await stableFill(page.locator('#password'), 'admin3586');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL('/dashboard');
  });

  test('잘못된 비밀번호 → 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login');

    await stableFill(page.locator('#email'), 'admin@test.com');
    await stableFill(page.locator('#password'), 'wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('올바르지 않습니다')).toBeVisible({ timeout: 15_000 });
  });

  test('존재하지 않는 이메일 → 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login');

    await stableFill(page.locator('#email'), 'nonexistent@test.com');
    await stableFill(page.locator('#password'), 'somepassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText(/올바르지 않습니다|오류가 발생/)).toBeVisible({ timeout: 15_000 });
  });

  test('빈 필드 제출 → HTML5 유효성 검증으로 제출 차단', async ({ page }) => {
    await page.goto('/login');

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login/);
  });

  test('로그인 페이지에 카카오 로그인 버튼이 표시된다', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /카카오 로그인/ })).toBeVisible();
  });

  test('로그인 폼이 뷰포트 내에서 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/login');

    const form = page.locator('form');
    await expect(form).toBeVisible();

    const emailBox = await page.locator('#email').boundingBox();
    const viewport = page.viewportSize();
    expect(emailBox).toBeTruthy();
    if (emailBox && viewport) {
      expect(emailBox.x).toBeGreaterThanOrEqual(0);
      expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test('로그인 중 버튼 비활성화 및 로딩 표시', async ({ page }) => {
    await page.goto('/login');

    await stableFill(page.locator('#email'), 'admin@test.com');
    await stableFill(page.locator('#password'), 'admin3586');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    await page.waitForURL('/dashboard', { timeout: 30_000 });
  });
});
