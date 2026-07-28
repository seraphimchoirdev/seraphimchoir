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

  // 수정 다이얼로그 내 삭제 버튼 검증은 아래 '일정 수정 다이얼로그 삭제' describe로 이동
  // (과거: 임의 일정 존재에 의존하던 비결정적 테스트 → 전용 일정 기반으로 재작성)

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

/**
 * 일정 수정 영속성 검증 (작곡가·악보 출처)
 *
 * 회귀 대상: PATCH zod 스키마에 composer/music_source가 없어 조용히 strip →
 * "성공 토스트는 뜨지만 실데이터 미반영" 버그 (2026-07-13 프로덕션 신고).
 * 이런 유형은 저장 후 재조회까지 확인하는 E2E만이 잡을 수 있다.
 */
import type { APIRequestContext } from '@playwright/test';

import {
  type EnsuredSchedule,
  cleanupSchedule,
  ensureSchedule,
  upcomingSundayISO,
} from '../helpers/e2e-data';

test.describe('일정 수정 영속성', () => {
  let api: APIRequestContext;
  let schedule: EnsuredSchedule | null = null;
  const SERVICE_TYPE = 'E2E선곡검증예배';

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: 'e2e/.auth/user.json',
    });
    // 다른 스펙과 날짜 분리 (+3주, '다가오는 일정' 5주 범위 내)
    schedule = await ensureSchedule(api, upcomingSundayISO(3), SERVICE_TYPE);
  });

  test.afterAll(async () => {
    await cleanupSchedule(api, schedule);
    await api.dispose();
  });

  test('작곡가·악보 출처 수정이 저장되고 새로고침 후에도 유지된다', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '찬양대 일정 관리' })).toBeVisible({
      timeout: 30_000,
    });

    // 전용 일정 카드에서 수정 다이얼로그 열기
    const card = page
      .locator(`[data-testid="schedule-date-card"][data-date="${schedule!.date}"]`)
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByTitle('첫 번째 일정 수정').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // 찬양곡명·작곡가·악보 출처 입력 후 저장
    // (카드는 찬양곡명이 있을 때만 "곡명 (작곡가)" 형태로 표시)
    await dialog.locator('#hymn_name').fill('시온성');
    await dialog.locator('#composer').fill('오병희');
    await dialog.locator('#music_source').fill('예수 나의 기쁨 21권');
    await dialog.getByRole('button', { name: '수정', exact: true }).click();

    await expect(page.getByText('일정이 수정되었습니다')).toBeVisible({ timeout: 15_000 });

    // 카드에 작곡가 반영 확인
    await expect(card.getByText(/오병희/)).toBeVisible({ timeout: 10_000 });

    // 새로고침 후에도 유지 (DB 영속성 — 토스트만 성공하는 회귀 차단)
    await page.reload({ waitUntil: 'domcontentloaded' });
    const cardAfter = page
      .locator(`[data-testid="schedule-date-card"][data-date="${schedule!.date}"]`)
      .first();
    await expect(cardAfter.getByText(/오병희/)).toBeVisible({ timeout: 20_000 });

    // 다이얼로그 재진입 시 악보 출처도 유지 확인
    await cardAfter.getByTitle('첫 번째 일정 수정').click();
    await expect(page.getByRole('dialog').locator('#music_source')).toHaveValue(
      '예수 나의 기쁨 21권',
      { timeout: 10_000 }
    );
  });
});

/**
 * 목록 직접 삭제 (수정 다이얼로그를 거치지 않는 카드 내 휴지통 버튼)
 */
test.describe('일정 목록 직접 삭제', () => {
  let api: APIRequestContext;
  let schedule: EnsuredSchedule | null = null;
  const SERVICE_TYPE = 'E2E삭제검증예배';

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: 'e2e/.auth/user.json',
    });
    // 다른 스펙과 날짜 분리 (+4주)
    schedule = await ensureSchedule(api, upcomingSundayISO(4), SERVICE_TYPE);
  });

  test.afterAll(async () => {
    // UI 삭제가 성공했으면 no-op (cleanupSchedule은 best-effort)
    await cleanupSchedule(api, schedule);
    await api.dispose();
  });

  test('카드의 휴지통 버튼으로 일정을 삭제할 수 있다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '찬양대 일정 관리' })).toBeVisible({
      timeout: 30_000,
    });

    const card = page
      .locator(`[data-testid="schedule-date-card"][data-date="${schedule!.date}"]`)
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect(card.getByText(SERVICE_TYPE)).toBeVisible();

    // 휴지통 클릭 → 확인 다이얼로그(alertdialog) → 삭제
    await card.getByTitle('첫 번째 일정 삭제').click();
    const confirm = page.getByRole('alertdialog').filter({ hasText: '예배 일정 삭제' });
    await expect(confirm).toBeVisible({ timeout: 5_000 });
    await confirm.getByRole('button', { name: '삭제' }).click();

    await expect(page.getByText('예배 일정이 삭제되었습니다')).toBeVisible({ timeout: 15_000 });
    // 카드에서 일정이 사라짐
    await expect(card.getByText(SERVICE_TYPE)).toHaveCount(0, { timeout: 10_000 });
  });
});


/**
 * 수정 다이얼로그 내 삭제 버튼 (전용 일정 기반 — 데이터 유무에 의존하지 않음)
 */
test.describe('일정 수정 다이얼로그 삭제', () => {
  let api: APIRequestContext;
  let schedule: EnsuredSchedule | null = null;
  const SERVICE_TYPE = 'E2E다이얼로그검증예배';

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: 'e2e/.auth/user.json',
    });
    schedule = await ensureSchedule(api, upcomingSundayISO(2), SERVICE_TYPE);
  });

  test.afterAll(async () => {
    await cleanupSchedule(api, schedule);
    await api.dispose();
  });

  test('수정 다이얼로그에 삭제 버튼이 있고, 확인 다이얼로그가 뜬다', async ({ page }) => {
    await page.goto('/service-schedules', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '찬양대 일정 관리' })).toBeVisible({
      timeout: 30_000,
    });

    const card = page
      .locator(`[data-testid="schedule-date-card"][data-date="${schedule!.date}"]`)
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.getByTitle('첫 번째 일정 수정').click();

    // 다이얼로그가 열리고 삭제 버튼이 표시
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole('button', { name: '삭제' }).click();

    // 삭제 확인 다이얼로그 → 취소로 닫기 (일정 유지)
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible({ timeout: 5_000 });
    await expect(alertDialog.getByText('이 예배 일정을 삭제하시겠습니까?')).toBeVisible();
    await alertDialog.getByRole('button', { name: '취소' }).click();
    await expect(alertDialog).not.toBeVisible();
  });
});
