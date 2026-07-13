import { test, expect } from './fixtures/base.fixture';

test.describe('Smoke Tests', () => {
  test('인증된 사용자가 대시보드를 볼 수 있다', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('시작 가이드는 로그인 없이 볼 수 있다', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByRole('heading', { name: /시작 가이드/ })).toBeVisible({
      timeout: 15_000,
    });
    // 6단계 안내와 플랫폼 탭 존재
    await expect(page.getByText('앱에 접속하기')).toBeVisible();
    await expect(page.getByRole('button', { name: /아이폰/ })).toBeVisible();
    await expect(page.getByText('출석 투표 해보기')).toBeVisible();

    await context.close();
  });

  test('로그인 화면의 시작 가이드 배너는 다시 보지 않기로 닫을 수 있다', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    await page.goto('/login');
    // 첫 방문: 배너 표시
    const banner = page.getByTestId('onboarding-banner');
    await expect(banner).toBeVisible({ timeout: 15_000 });

    // 다시 보지 않기 → 배너 사라짐
    await banner.getByRole('button', { name: '다시 보지 않기' }).click();
    await expect(banner).toBeHidden();

    // 새로고침 후에도 다시 뜨지 않음 (localStorage 저장)
    await page.reload();
    await expect(page.locator('#email')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('onboarding-banner')).toHaveCount(0);

    await context.close();
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
