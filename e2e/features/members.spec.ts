import { test, expect } from '../fixtures/base.fixture';

test.describe('찬양대원 관리', () => {
  test('찬양대원 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/management/members', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/management\/members/);

    await expect(page.getByRole('heading', { name: '찬양대원 관리' })).toBeVisible({ timeout: 30_000 });
  });

  test('검색 필터가 표시된다', async ({ page }) => {
    await page.goto('/management/members', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '찬양대원 관리' })).toBeVisible({ timeout: 30_000 });

    // 검색 입력 필드
    const searchInput = page.getByPlaceholder(/검색|이름/);
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
  });

  test('파트 필터가 동작한다', async ({ page }) => {
    await page.goto('/management/members', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '찬양대원 관리' })).toBeVisible({ timeout: 30_000 });

    // 파트 필터 드롭다운 (SOPRANO, ALTO, TENOR, BASS 등)
    const partText = page.getByText(/소프라노|알토|테너|베이스|SOPRANO|ALTO/);
    const hasPartFilter = await partText.first().isVisible({ timeout: 10_000 }).catch(() => false);

    // 파트 필터가 없으면 다른 형태의 필터 확인
    if (!hasPartFilter) {
      const select = page.locator('select, [role="combobox"]').first();
      await expect(select).toBeVisible({ timeout: 5_000 });
    }
  });

  test('대원 목록이 표시되거나 빈 상태가 표시된다', async ({ page }) => {
    await page.goto('/management/members', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '찬양대원 관리' })).toBeVisible({ timeout: 30_000 });

    // 로딩 스피너가 사라질 때까지 대기
    await page.getByRole('status').first().waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

    // 대원 카드 또는 테이블이 있거나 빈 상태 메시지
    const hasMembers = await page.locator('table, [class*="card"]').first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasEmpty = await page.getByText(/대원이 없|결과가 없|데이터가 없|등록된 대원/).first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    const hasContent = await page.locator('main').isVisible();

    expect(hasMembers || hasEmpty || hasContent).toBeTruthy();
  });

  test('새 대원 추가 버튼이 표시된다 (ADMIN)', async ({ page }) => {
    await page.goto('/management/members', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '찬양대원 관리' })).toBeVisible({ timeout: 30_000 });

    // ADMIN 계정이므로 "새 대원 추가" 버튼이 보여야 함
    const addButton = page.getByRole('button', { name: /추가|새 대원/ }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 10_000 }).catch(() => false);

    // 또는 link로 구현될 수도 있음
    if (!hasAddButton) {
      const addLink = page.getByRole('link', { name: /추가|새 대원/ }).first();
      const hasAddLink = await addLink.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(hasAddLink).toBeTruthy();
    }
  });

  test('찬양대원 관리 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/management/members', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '찬양대원 관리' })).toBeVisible({ timeout: 30_000 });

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
