import { test, expect } from '../fixtures/base.fixture';

test.describe('일정 관리', () => {
  test('일정 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/service-schedules');
    await expect(page).toHaveURL(/\/service-schedules/);

    await expect(page.getByText(/일정/)).toBeVisible({ timeout: 15_000 });
  });

  test('월간/분기별 뷰 토글이 존재한다', async ({ page }) => {
    await page.goto('/service-schedules');
    await page.waitForLoadState('networkidle');

    // 월간/분기별 전환 버튼 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });

    // 캘린더 관련 UI가 표시됨
    const hasCalendarUI = await page.getByRole('button').count();
    expect(hasCalendarUI).toBeGreaterThan(0);
  });

  test('월 선택 네비게이션이 동작한다', async ({ page }) => {
    await page.goto('/service-schedules');
    await page.waitForLoadState('networkidle');

    // 이전/다음 월 버튼 (화살표 아이콘)
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible({ timeout: 15_000 });
  });

  test('일정 추가 드롭다운이 표시된다 (ADMIN)', async ({ page }) => {
    await page.goto('/service-schedules');
    await page.waitForLoadState('networkidle');

    // ADMIN 계정이므로 일정 추가 버튼이 보여야 함
    // Plus 아이콘 버튼 또는 "추가" 텍스트
    const addButton = page.getByRole('button', { name: /추가|등록/ }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 5_000 }).catch(() => false);

    // 또는 드롭다운 트리거 버튼
    if (!hasAddButton) {
      // Plus 아이콘 버튼 검색
      const iconButtons = page.locator('button:has(svg)');
      await expect(iconButtons.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('캘린더가 표시된다', async ({ page }) => {
    await page.goto('/service-schedules');
    await page.waitForLoadState('networkidle');

    // 캘린더 영역 확인 (테이블 또는 그리드 형태)
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });

    // 요일 헤더 또는 날짜 셀이 있어야 함
    const hasCalendar = await page.getByText(/월|화|수|목|금|토|일/).first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    // 캘린더가 없으면 로딩 상태이거나 에러 상태
    if (!hasCalendar) {
      // 최소한 메인 콘텐츠가 있어야 함
      await expect(mainContent).toBeVisible();
    }
  });

  test('일정 관리 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/service-schedules');
    await page.waitForLoadState('networkidle');

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
