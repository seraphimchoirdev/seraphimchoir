import { test, expect } from './fixtures/base.fixture';

test.describe('Smoke Tests', () => {
  test('인증된 사용자가 대시보드를 볼 수 있다', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('미인증 사용자는 로그인 페이지로 리다이렉트된다', async ({ browser }) => {
    // storageState를 빈 객체로 명시해야 프로젝트 기본 storageState가 상속되지 않음
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });

  test('로그인 페이지가 정상 로드된다', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto('/login');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await context.close();
  });
});
