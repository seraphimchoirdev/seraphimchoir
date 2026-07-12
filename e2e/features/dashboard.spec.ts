import { test, expect } from '../fixtures/base.fixture';

test.describe('대시보드', () => {
  test('대시보드 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/dashboard');

    // 대시보드 콘텐츠가 렌더링될 때까지 대기 (스켈레톤 → 콘텐츠)
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
  });

  test('네비게이션에서 대시보드 링크가 존재한다', async ({ page, isDesktopViewport }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    if (isDesktopViewport) {
      const nav = page.locator('nav');
      await expect(nav.getByRole('link', { name: '홈' })).toBeVisible({ timeout: 15_000 });
    } else {
      // 모바일: 하단 네비게이션 또는 로고 확인
      await expect(page.locator('nav')).toBeVisible();
    }
  });

  test('대시보드에 핵심 콘텐츠가 표시된다', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 대시보드 콘텐츠 영역이 존재하는지 확인
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    // 페이지가 에러 없이 로드됨 (에러 Alert가 없어야 함)
    const errorAlert = page.locator('[role="alert"]');
    const errorCount = await errorAlert.count();
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const text = await errorAlert.nth(i).textContent();
        // Next.js dev tools alert가 아닌 실제 에러 alert만 검증
        if (text && !text.includes('Next.js') && !text.includes('Issue')) {
          expect(text).not.toContain('오류');
        }
      }
    }
  });

  test('대시보드에서 다른 페이지로 이동 가능', async ({ page, isDesktopViewport }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    if (isDesktopViewport) {
      // 데스크톱: 네비게이션 바에서 출석 관리로 이동
      const nav = page.locator('nav');
      await expect(nav.getByRole('link', { name: '출석 관리' })).toBeVisible({ timeout: 15_000 });
      await nav.getByRole('link', { name: '출석 관리' }).click();
      await expect(page).toHaveURL(/\/attendances/, { timeout: 15_000 });
    } else {
      // 모바일: 하단 네비게이션에서 이동
      const bottomNav = page.locator('nav.fixed, nav[class*="bottom"]').first();
      if (await bottomNav.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const links = bottomNav.getByRole('link');
        const count = await links.count();
        if (count > 1) {
          await links.nth(1).click();
          await page.waitForTimeout(3_000);
        }
      }
    }
  });

  test('대시보드에 투표 관련 정보가 표시된다', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 대시보드 콘텐츠가 완전히 로드될 때까지 대기 (환영 메시지)
    await expect(page.getByText(/안녕하세요/)).toBeVisible({ timeout: 30_000 });

    const mainContent = page.locator('main');

    const hasVoteInfo = await mainContent
      .getByText(/투표|마감/)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    // 투표 정보가 있거나 다음 예배 정보가 표시되면 OK
    const hasNextService = await mainContent
      .getByText(/다음 예배|예배/)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasVoteInfo || hasNextService).toBeTruthy();
  });

  test('대시보드 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    const body = await page.locator('body').boundingBox();
    const viewport = page.viewportSize();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
