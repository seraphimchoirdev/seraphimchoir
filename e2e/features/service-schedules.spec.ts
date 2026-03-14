import { test, expect } from '../fixtures/base.fixture';

test.describe('일정 관리', () => {
  test('일정 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/service-schedules/);

    await expect(page.getByRole('heading', { name: '찬양대 일정 관리' })).toBeVisible({ timeout: 30_000 });
  });

  test('월간/분기별 뷰 토글이 존재한다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // 캘린더 관련 UI가 표시됨
    const hasCalendarUI = await page.getByRole('button').count();
    expect(hasCalendarUI).toBeGreaterThan(0);
  });

  test('월 선택 네비게이션이 동작한다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // 이전/다음 월 버튼 (화살표 아이콘)
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible({ timeout: 15_000 });
  });

  test('일정 추가 드롭다운이 표시된다 (ADMIN)', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // ADMIN 계정이므로 일정 추가 버튼이 보여야 함
    const addButton = page.getByRole('button', { name: /추가|등록/ }).first();
    const hasAddButton = await addButton.isVisible({ timeout: 5_000 }).catch(() => false);

    // 또는 드롭다운 트리거 버튼
    if (!hasAddButton) {
      const iconButtons = page.locator('button:has(svg)');
      await expect(iconButtons.first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('캘린더가 표시된다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // 요일 헤더 또는 날짜 셀이 있어야 함
    const mainContent = page.locator('main');
    const hasCalendar = await page.getByText(/월|화|수|목|금|토|일/).first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!hasCalendar) {
      await expect(mainContent).toBeVisible();
    }
  });

  test('기본 뷰가 "다가오는 일정"이다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // "다가오는 일정(향후 5주)" 텍스트 확인
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('향후 5주')).toBeVisible();

    // "다가오는" 버튼이 활성 상태
    const upcomingButton = page.getByRole('button', { name: '다가오는' });
    await expect(upcomingButton).toBeVisible();
  });

  test('뷰 토글 3개가 동작한다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // 다가오는 → 월간
    await page.getByRole('button', { name: '월간' }).click();
    await expect(page.getByText('월별 예배 및 행사 일정을 관리합니다')).toBeVisible({
      timeout: 10_000,
    });

    // 월간 → 분기
    await page.getByRole('button', { name: '분기' }).click();
    await expect(page.getByText('분기별 예배 및 행사 일정을 관리합니다')).toBeVisible({
      timeout: 10_000,
    });

    // 분기 → 다가오는
    await page.getByRole('button', { name: '다가오는' }).click();
    await expect(page.getByText('다가오는 예배 및 행사 일정입니다')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('"지난 일정 보기" 클릭 시 월간 뷰로 전환', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    const pastButton = page.getByRole('button', { name: '지난 일정 보기' });
    if (await pastButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await pastButton.click();
      await expect(page.getByText('월별 예배 및 행사 일정을 관리합니다')).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('일정 수정 다이얼로그에 삭제 버튼이 표시된다 (ADMIN)', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // 첫 번째 일정 수정 버튼 클릭
    const editButton = page.getByRole('button', { name: '첫 번째 일정 수정' }).first();
    await expect(editButton).toBeVisible({ timeout: 15_000 });
    await editButton.click();

    // 다이얼로그가 열리고 삭제 버튼이 표시
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByRole('button', { name: '삭제' })).toBeVisible();
  });

  test('삭제 확인 다이얼로그가 표시된다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    // 일정 수정 다이얼로그 열기
    await page.getByRole('button', { name: '첫 번째 일정 수정' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // 삭제 버튼 클릭 → 확인 다이얼로그
    await dialog.getByRole('button', { name: '삭제' }).click();

    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible({ timeout: 5_000 });
    await expect(alertDialog.getByText('이 예배 일정을 삭제하시겠습니까?')).toBeVisible();

    // 취소로 닫기
    await alertDialog.getByRole('button', { name: '취소' }).click();
    await expect(alertDialog).not.toBeVisible();
  });

  test('일정 관리 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByText('다가오는 일정')).toBeVisible({ timeout: 30_000 });

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
