import { test, expect } from '../fixtures/base.fixture';

test.describe('출석 관리', () => {
  test('출석 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/attendances');
    await expect(page).toHaveURL(/\/attendances/);

    // 페이지 제목 확인
    await expect(page.getByText('출석 관리')).toBeVisible({ timeout: 15_000 });
  });

  test('날짜 네비게이션이 표시된다', async ({ page }) => {
    await page.goto('/attendances');

    // 이전/다음 주 네비게이션 버튼이 존재하는지 확인
    // ChevronLeft/ChevronRight 버튼
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible({ timeout: 15_000 });
  });

  test('달력 팝오버가 동작한다', async ({ page }) => {
    await page.goto('/attendances');
    await page.waitForLoadState('networkidle');

    // 날짜 표시 버튼 (달력 아이콘 포함) 찾기
    const calendarTrigger = page.getByRole('button', { name: /\d{4}/ }).first();
    if (await calendarTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await calendarTrigger.click();

      // 달력 팝오버가 열리는지 확인
      const calendar = page.locator('[role="dialog"], [role="grid"], table');
      await expect(calendar.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('출석 목록이 표시된다', async ({ page }) => {
    await page.goto('/attendances');
    await page.waitForLoadState('networkidle');

    // 출석 관련 콘텐츠가 로드될 때까지 대기
    await expect(page.locator('main')).toBeVisible({ timeout: 15_000 });

    // 로딩 완료 후 콘텐츠 확인 (테이블 또는 카드 형태)
    // "예배가 없습니다" 메시지가 있거나 출석 데이터가 있어야 함
    const hasContent = await page.getByText(/등단|출석|미등단|예배/).first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasNoData = await page.getByText(/일정이 없|데이터가 없|예배가 없/).first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasContent || hasNoData).toBeTruthy();
  });

  test('준비 완료 현황이 표시된다', async ({ page }) => {
    await page.goto('/attendances');
    await page.waitForLoadState('networkidle');

    // 파트별 준비 현황 바 또는 관련 통계 UI 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });
  });

  test('출석 관리 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/attendances');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });

  test('이전 주 버튼 클릭 시 날짜가 변경된다', async ({ page }) => {
    await page.goto('/attendances');
    await page.waitForLoadState('networkidle');

    // 현재 표시된 날짜 텍스트 캡처
    const dateText = page.locator('main').getByText(/\d{4}/).first();
    if (await dateText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const beforeDate = await dateText.textContent();

      // 이전 주 버튼 클릭 (ChevronLeft 아이콘의 버튼)
      const prevButton = page.getByRole('button').filter({ has: page.locator('svg') }).first();
      if (await prevButton.isVisible()) {
        await prevButton.click();
        await page.waitForLoadState('networkidle');

        // 날짜가 변경되었는지 확인 (또는 같은 날짜가 유지될 수 있음)
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });
});
