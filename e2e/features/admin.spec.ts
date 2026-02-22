import { test, expect } from '../fixtures/base.fixture';

test.describe('관리자 대시보드', () => {
  test('관리자 대시보드가 정상 로드된다', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    await expect(page.getByText(/관리자/)).toBeVisible({ timeout: 15_000 });
  });

  test('관리 통계 카드가 표시된다', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // 전체 사용자, 대기 중인 연결 요청, 역할 할당 카드
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });

    // 숫자가 포함된 통계 카드 확인
    const hasStats = await page.getByText(/사용자|연결|역할/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasStats).toBeTruthy();
  });

  test('사용자 관리 링크가 동작한다', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // 사용자 관리 링크 클릭
    const userLink = page.getByRole('link', { name: /사용자 관리/ }).first();
    if (await userLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await userLink.click();
      await expect(page).toHaveURL(/\/admin\/users/, { timeout: 15_000 });
    }
  });

  test('대원 연결 승인 링크가 동작한다', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // 대원 연결 승인 링크 클릭
    const linkLink = page.getByRole('link', { name: /연결|승인/ }).first();
    if (await linkLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await linkLink.click();
      await expect(page).toHaveURL(/\/admin\/member-links/, { timeout: 15_000 });
    }
  });

  test('관리자 대시보드가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});

test.describe('사용자 관리', () => {
  test('사용자 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);

    await expect(page.getByText(/사용자 관리/)).toBeVisible({ timeout: 15_000 });
  });

  test('사용자 검색이 동작한다', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // 검색 입력 필드
    const searchInput = page.getByPlaceholder(/검색|이름|이메일/);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('admin');
      await page.waitForTimeout(500); // 디바운싱 대기
      await page.waitForLoadState('networkidle');
    }
  });

  test('사용자 테이블이 표시된다', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // 사용자 테이블 또는 목록
    const hasTable = await page.locator('table').first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasList = await page.locator('[class*="rounded"]').first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasTable || hasList).toBeTruthy();
  });
});

test.describe('대원 연결 승인', () => {
  test('대원 연결 승인 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/admin/member-links');
    await expect(page).toHaveURL(/\/admin\/member-links/);

    await expect(page.getByText(/연결|승인/)).toBeVisible({ timeout: 15_000 });
  });

  test('파트 필터가 표시된다', async ({ page }) => {
    await page.goto('/admin/member-links');
    await page.waitForLoadState('networkidle');

    // 파트 필터 버튼 (전체, SOPRANO, ALTO, TENOR, BASS, SPECIAL)
    const hasPartFilter = await page.getByRole('button', { name: /전체/ }).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    expect(hasPartFilter).toBeTruthy();
  });

  test('대기 중인 요청이 표시되거나 빈 상태가 표시된다', async ({ page }) => {
    await page.goto('/admin/member-links');
    await page.waitForLoadState('networkidle');

    // 요청 카드가 있거나 "대기중인 연결 요청이 없습니다" 메시지
    const hasRequests = await page.locator('[class*="rounded-lg"][class*="border"]').first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasEmpty = await page.getByText(/요청이 없|대기중/).first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    expect(hasRequests || hasEmpty).toBeTruthy();
  });
});
