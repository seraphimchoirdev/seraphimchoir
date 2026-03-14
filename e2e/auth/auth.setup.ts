import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // PWA 설치 프롬프트 방지 (iOS Safari에서 2초 후 나타나는 프롬프트)
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('ios_install_dismissed', Date.now().toString());
  });

  await page.locator('#email').fill('admin@test.com');
  await page.locator('#password').fill('admin3586');
  await page.locator('button[type="submit"]').click();

  // 로그인 성공 시 /dashboard로 리다이렉트됨
  await page.waitForURL('/dashboard', { timeout: 15_000 });
  await expect(page).toHaveURL('/dashboard');

  // 인증 쿠키를 파일로 저장
  await page.context().storageState({ path: authFile });
});
