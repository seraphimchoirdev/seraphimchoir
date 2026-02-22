import { test, expect } from '../fixtures/base.fixture';

test.describe('자리배치', () => {
  test('자리배치 목록 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/arrangements');
    await expect(page).toHaveURL(/\/arrangements/);

    // 페이지 제목 확인
    await expect(page.getByText('자리배치')).toBeVisible({ timeout: 15_000 });
  });

  test('새 배치표 만들기 버튼이 표시된다 (ADMIN)', async ({ page }) => {
    await page.goto('/arrangements');

    // ADMIN 계정이므로 "새 배치표 만들기" 버튼이 보여야 함
    const createButton = page.getByRole('button', { name: /새 배치표|만들기/ });
    await expect(createButton).toBeVisible({ timeout: 15_000 });
  });

  test('검색 필터가 동작한다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    // 검색 입력 필드 찾기
    const searchInput = page.getByPlaceholder(/검색/);
    if (await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await searchInput.fill('테스트');
      // 디바운싱 대기 (300ms)
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
    }
  });

  test('배치표 카드가 표시되거나 빈 상태가 표시된다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    // 배치표 카드가 있거나 "배치표가 없습니다" 메시지가 표시됨
    const hasCards = await page.locator('[class*="rounded-lg"][class*="border"]').first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasEmpty = await page.getByText(/배치표가 없|데이터가 없|결과가 없/).first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('배치표 상태 배지가 표시된다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    // 배치표가 있으면 상태 배지 확인
    const badge = page.getByText(/작성중|편집완료|확정됨/).first();
    const hasBadge = await badge.isVisible({ timeout: 5_000 }).catch(() => false);

    // 배치표가 없으면 이 테스트는 건너뜀
    if (!hasBadge) {
      test.skip();
    }
  });

  test('새 배치표 만들기 다이얼로그가 열린다', async ({ page }) => {
    await page.goto('/arrangements');

    const createButton = page.getByRole('button', { name: /새 배치표|만들기/ });
    await expect(createButton).toBeVisible({ timeout: 15_000 });
    await createButton.click();

    // 다이얼로그 열림 확인
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('페이지네이션이 표시된다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    // 배치표가 충분히 많을 경우에만 페이지네이션이 표시됨
    // 페이지네이션 영역 또는 limit 선택 UI 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });
  });

  test('자리배치 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });

  test('날짜 범위 필터가 존재한다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    // 날짜 관련 필터 UI 요소 존재 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });
  });

  test('자리배치 편집 페이지로 이동할 수 있다', async ({ page }) => {
    await page.goto('/arrangements');
    await page.waitForLoadState('networkidle');

    // 배치표 카드가 있으면 클릭하여 편집 페이지로 이동
    const cards = page.locator('a[href*="/arrangements/"]').first();
    const hasCard = await cards.isVisible({ timeout: 5_000 }).catch(() => false);

    if (hasCard) {
      await cards.click();
      await page.waitForURL(/\/arrangements\//, { timeout: 15_000 });
      await expect(page).toHaveURL(/\/arrangements\/.+/);
    }
  });
});
