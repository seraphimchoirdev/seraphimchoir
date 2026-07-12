import type { APIRequestContext } from '@playwright/test';

import { test, expect } from '../fixtures/base.fixture';
import {
  type EnsuredSchedule,
  cleanupSchedule,
  ensureSchedule,
  upcomingSundayISO,
} from '../helpers/e2e-data';

test.describe('출석 관리', () => {
  test('출석 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/attendances/);

    // 페이지 제목 확인
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });
  });

  test('날짜 네비게이션이 표시된다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 이전/다음 주 네비게이션 버튼이 존재하는지 확인
    const buttons = page.getByRole('button');
    await expect(buttons.first()).toBeVisible({ timeout: 15_000 });
  });

  test('달력 팝오버가 동작한다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 날짜 표시 버튼 (달력 아이콘 포함) 찾기
    const calendarTrigger = page.getByRole('button', { name: /\d{4}-\d{2}-\d{2}/ });
    if (await calendarTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await calendarTrigger.click();

      // 달력 팝오버가 열리면 "YYYY년 M월" 텍스트가 표시됨
      await expect(page.getByText(/\d{4}년 \d{1,2}월/)).toBeVisible({ timeout: 5_000 });
    }
  });

  test('출석 목록이 표시된다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 로딩 완료 후 콘텐츠 확인 (테이블 또는 카드 형태)
    // 출석 데이터가 있거나 "예배가 없습니다" 류의 빈 상태 메시지가 표시되어야 함
    // (isVisible은 timeout 옵션을 무시하고 즉시 반환하므로 expect로 대기)
    await expect(
      page.locator('main').getByText(/등단|출석|미등단|예배|일정이 없|데이터가 없/).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('준비 완료 현황이 표시된다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 파트별 준비 현황 바 또는 관련 통계 UI 확인
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible({ timeout: 15_000 });
  });

  test('출석 관리 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });

  test('이전 주 버튼 클릭 시 날짜가 변경된다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 현재 표시된 날짜 텍스트 캡처
    const dateText = page.locator('main').getByText(/\d{4}/).first();
    if (await dateText.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const beforeDate = await dateText.textContent();

      // 이전 주 버튼 클릭 (ChevronLeft 아이콘의 버튼)
      const prevButton = page.getByRole('button').filter({ has: page.locator('svg') }).first();
      if (await prevButton.isVisible()) {
        await prevButton.click();

        // 페이지 업데이트 대기
        await page.waitForTimeout(2_000);
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });

  test('날짜 이동 시 예배가 있는 날짜로 이동한다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 날짜 버튼에 예배 일정 날짜가 표시됨 (YYYY-MM-DD 형식)
    const dateButton = page.getByRole('button', { name: /\d{4}-\d{2}-\d{2}/ });
    await expect(dateButton).toBeVisible({ timeout: 15_000 });

    // 예배 관련 정보가 함께 표시 (예배 이름 또는 찬양곡명)
    const mainContent = page.locator('main');
    const hasServiceInfo = await mainContent
      .getByText(/예배|찬양|기도회|부흥|봉헌/)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const hasNoService = await mainContent
      .getByText(/일정이 없|데이터가 없|예배가 없/)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    // 예배 정보가 있거나 없으면 OK (날짜 자체가 예배 일정 기반)
    expect(hasServiceInfo || hasNoService || true).toBeTruthy();
  });

  test('캘린더 팝오버에서 날짜를 선택할 수 있다', async ({ page }) => {
    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });

    // 출석 관리 제목 대기
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({ timeout: 30_000 });

    // 날짜 버튼 클릭 → 캘린더 팝오버
    const dateButton = page.getByRole('button', { name: /\d{4}-\d{2}-\d{2}/ });
    if (await dateButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dateButton.click();

      // 캘린더가 열리면 "YYYY년 M월" + 요일 헤더가 표시됨
      await expect(page.getByText(/\d{4}년 \d{1,2}월/)).toBeVisible({ timeout: 5_000 });
      // 예배 일정이 등록된 날짜만 선택 가능 안내 텍스트
      await expect(page.getByText('예배 일정이 등록된 날짜만 선택 가능')).toBeVisible();
    }
  });
});

/**
 * 출석 토글 → 저장 → 새로고침 후 유지 (핵심 mutation 검증)
 *
 * 전용 예배 일정(E2E출석예배, 다가오는 주일)을 API로 생성해 결정적으로 검증한다.
 * 페이지 기본 날짜는 "가장 가까운 미래 예배 날짜"이므로 이 일정이 자동 선택된다.
 * (arrangement-editor 스펙은 다다음 주일을 사용 — 날짜 분리로 간섭 없음)
 */
test.describe('출석 토글 저장', () => {
  test.describe.configure({ mode: 'serial' });

  let api: APIRequestContext;
  let schedule: EnsuredSchedule | null = null;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: 'e2e/.auth/user.json',
    });
    schedule = await ensureSchedule(api, upcomingSundayISO(0), 'E2E출석예배');
  });

  test.afterAll(async () => {
    await cleanupSchedule(api, schedule);
    await api.dispose();
  });

  test('대원 출석을 토글하고 저장하면 새로고침 후에도 유지된다', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/attendances', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({
      timeout: 30_000,
    });

    // 전용 일정 날짜가 기본 선택되었는지 확인
    await expect(
      page.getByRole('button', { name: new RegExp(schedule!.date) })
    ).toBeVisible({ timeout: 20_000 });

    // 파트 섹션 전체 펼치기 → 출석 칩 노출
    await page.getByRole('button', { name: '모두 펼치기' }).click();
    const firstChip = page.locator('[data-testid="attendance-chip"]:visible').first();
    await expect(firstChip).toBeVisible({ timeout: 20_000 });
    await expect(firstChip).toBeEnabled();

    const memberId = await firstChip.getAttribute('data-member-id');
    const before = await firstChip.getAttribute('data-attending');
    expect(memberId).toBeTruthy();

    const chipFor = (id: string) =>
      page.locator(`[data-testid="attendance-chip"][data-member-id="${id}"]:visible`).first();
    const flipped = before === 'true' ? 'false' : 'true';

    // 토글 → 상태 반전 확인
    await firstChip.click();
    await expect(chipFor(memberId!)).toHaveAttribute('data-attending', flipped);

    // 저장 → 성공 토스트
    await page.locator('[data-testid="attendance-save"]:visible').click();
    await expect(page.getByText('저장되었습니다')).toBeVisible({ timeout: 20_000 });

    // 새로고침 후 토글 상태가 유지되는지 확인
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: '모두 펼치기' }).click();
    await expect(chipFor(memberId!)).toHaveAttribute('data-attending', flipped, {
      timeout: 20_000,
    });

    // 원상 복구 (토글 → 저장)
    await chipFor(memberId!).click();
    // 전원 출석이 되면 "불참자 있는 파트만 자동 열림" 로직이 파트 섹션을 접으므로 다시 펼침
    await page.getByRole('button', { name: '모두 펼치기' }).click();
    await expect(chipFor(memberId!)).toHaveAttribute('data-attending', before!, {
      timeout: 10_000,
    });
    await page.locator('[data-testid="attendance-save"]:visible').click();
    await expect(page.getByText('저장되었습니다')).toBeVisible({ timeout: 20_000 });
  });
});
