import type { APIRequestContext, Page } from '@playwright/test';

import { test, expect } from '../fixtures/base.fixture';
import {
  type EnsuredSchedule,
  cleanupArrangement,
  cleanupSchedule,
  ensureSchedule,
  upcomingSundayISO,
} from '../helpers/e2e-data';

/**
 * 자리배치 편집 페이지 핵심 플로우 E2E
 *
 * 배치표 생성 → 워크플로우 진행 → click-to-place 배치 → 제거 → 저장 →
 * 새로고침 후 유지 → 편집 완료(SHARED) → 긴급 수정 모드 진입까지
 * 실제 사용자 여정을 단정적으로 검증한다.
 *
 * - 전용 예배 일정(E2E편집예배, 다다음 주일)을 사용해 다른 스펙과 데이터 간섭 없음
 * - react-dnd 드래그는 E2E에서 불안정하므로 click-to-place 경로로 검증
 */

const SERVICE_TYPE = 'E2E편집예배';
const ARRANGEMENT_TITLE = 'E2E 편집 검증 배치표';

// 데스크톱/모바일 그리드가 DOM에 동시에 존재하므로 항상 :visible로 스코프
const visibleSeat = (page: Page, extra = '') =>
  page.locator(`[data-testid="seat-slot"]${extra}:visible`);
const visibleSection = (page: Page, extra = '') =>
  page.locator(`[data-testid="workflow-section"]${extra}:visible`);

/** 현재 단계가 targetStep에 도달할 때까지 '이 단계 완료'를 눌러 위자드를 진행 */
async function advanceToStep(page: Page, targetStep: number) {
  for (let i = 0; i < 10; i++) {
    const current = visibleSection(page, '[data-current="true"]').first();
    await expect(current).toBeVisible({ timeout: 15_000 });
    const step = Number(await current.getAttribute('data-step'));
    if (step >= targetStep) return;

    await current.getByRole('button', { name: '이 단계 완료' }).click();
    // 다음 단계 섹션이 current가 될 때까지 대기
    await expect(visibleSection(page, `[data-step="${step + 1}"][data-current="true"]`)).toBeVisible({
      timeout: 10_000,
    });
  }
  throw new Error(`워크플로우 ${targetStep}단계 도달 실패`);
}

test.describe('자리배치 편집 핵심 플로우 (데스크톱)', () => {
  test.describe.configure({ mode: 'serial' });

  let api: APIRequestContext;
  let schedule: EnsuredSchedule | null = null;
  let arrangementId: string | null = null;
  let placedMemberId: string | null = null;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: 'e2e/.auth/user.json',
    });
    // 다다음 주일 — 출석 스펙(다가오는 주일)과 날짜를 분리해 간섭 방지
    schedule = await ensureSchedule(api, upcomingSundayISO(1), SERVICE_TYPE);
  });

  test.afterAll(async () => {
    await cleanupArrangement(api, arrangementId);
    await cleanupSchedule(api, schedule);
    await api.dispose();
  });

  test('배치표를 생성하고 편집 페이지로 진입한다', async ({ page, isMobileViewport }) => {
    test.skip(isMobileViewport, '데스크톱 3패널 레이아웃 전용 플로우');

    await page.goto('/arrangements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '자리배치 관리' })).toBeVisible({
      timeout: 30_000,
    });

    // 생성 다이얼로그 열기
    await page.getByRole('button', { name: /새 배치표/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // 예배 일정 선택 (전용 E2E 일정)
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: new RegExp(SERVICE_TYPE) }).click();

    // 제목 입력 후 생성
    const titleInput = dialog.locator('#title');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(ARRANGEMENT_TITLE);
    await dialog.getByRole('button', { name: '생성하기' }).click();

    // 편집 페이지로 이동 확인 + ID 캡처
    await page.waitForURL(/\/arrangements\/[0-9a-f-]{36}/, { timeout: 20_000 });
    arrangementId = page.url().match(/\/arrangements\/([0-9a-f-]{36})/)?.[1] ?? null;
    expect(arrangementId).toBeTruthy();
  });

  test('새 배치표에 AI 추천 줄 구성이 자동 적용되고 그리드가 렌더링된다', async ({
    page,
    isMobileViewport,
  }) => {
    test.skip(isMobileViewport, '데스크톱 전용');
    test.skip(!arrangementId, '선행 테스트에서 배치표 생성 실패');

    await page.goto(`/arrangements/${arrangementId}`, { waitUntil: 'domcontentloaded' });

    // 워크플로우 패널 1단계가 현재 단계
    await expect(visibleSection(page, '[data-step="1"][data-current="true"]')).toBeVisible({
      timeout: 30_000,
    });

    // AI 추천 분배가 등단 인원 기반으로 좌석을 생성 (~100명 규모 seed 기준)
    await expect
      .poll(async () => visibleSeat(page).count(), { timeout: 20_000 })
      .toBeGreaterThan(50);
  });

  test('click-to-place로 대원을 배치하고 더블클릭으로 제거한다', async ({
    page,
    isMobileViewport,
  }) => {
    test.skip(isMobileViewport, '데스크톱 전용');
    test.skip(!arrangementId, '선행 테스트에서 배치표 생성 실패');

    test.setTimeout(120_000);

    await page.goto(`/arrangements/${arrangementId}`, { waitUntil: 'domcontentloaded' });
    await expect(visibleSection(page, '[data-current="true"]').first()).toBeVisible({
      timeout: 30_000,
    });

    // AI 추천 분배 적용 + GridSettingsPanel 디바운스(400ms) 안정화 대기
    // (적용 직후 즉시 단계를 완료하면 디바운스 타이머와 경합해 워크플로우가 되돌아감)
    await expect
      .poll(async () => visibleSeat(page).count(), { timeout: 20_000 })
      .toBeGreaterThan(50);
    await page.waitForTimeout(1_500);

    // 1~3단계 완료 → 4단계(수동 배치 조정) 진입
    await advanceToStep(page, 4);

    // 대원 사이드바 표시 + 미배치 대원 선택
    const memberButton = page
      .locator('[data-testid="sidebar-member"][data-placed="false"]:visible')
      .first();
    await expect(memberButton).toBeVisible({ timeout: 15_000 });
    placedMemberId = await memberButton.getAttribute('data-member-id');
    expect(placedMemberId).toBeTruthy();
    await memberButton.click();

    // 빈 좌석 클릭 → 배치 확인
    await visibleSeat(page, '[data-occupied="false"]').first().click();
    const placedSeat = visibleSeat(page, `[data-member-id="${placedMemberId}"]`).first();
    await expect(placedSeat).toBeVisible({ timeout: 10_000 });

    // 사이드바에서 해당 대원이 사라짐 (hidePlaced)
    await expect(
      page.locator(`[data-testid="sidebar-member"][data-member-id="${placedMemberId}"]`)
    ).toHaveCount(0, { timeout: 10_000 });

    // 더블클릭으로 제거 → 좌석 비워지고 사이드바에 복귀
    await placedSeat.dblclick();
    await expect(
      visibleSeat(page, `[data-member-id="${placedMemberId}"]`)
    ).toHaveCount(0, { timeout: 10_000 });
    await expect(
      page
        .locator(`[data-testid="sidebar-member"][data-member-id="${placedMemberId}"]`)
        .first()
    ).toBeVisible({ timeout: 10_000 });

    // 다시 배치 (저장/유지 검증용)
    await page
      .locator(`[data-testid="sidebar-member"][data-member-id="${placedMemberId}"]:visible`)
      .first()
      .click();
    await visibleSeat(page, '[data-occupied="false"]').first().click();
    await expect(
      visibleSeat(page, `[data-member-id="${placedMemberId}"]`).first()
    ).toBeVisible({ timeout: 10_000 });

    // 헤더 저장 → 성공 토스트
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await expect(page.getByText('저장되었습니다')).toBeVisible({ timeout: 15_000 });
  });

  test('새로고침 후에도 배치가 DB에서 복원된다', async ({ page, isMobileViewport }) => {
    test.skip(isMobileViewport, '데스크톱 전용');
    test.skip(!arrangementId || !placedMemberId, '선행 테스트 실패');

    await page.goto(`/arrangements/${arrangementId}`, { waitUntil: 'domcontentloaded' });

    // 임시저장 복원 다이얼로그가 뜨면 서버 데이터 기준으로 확인
    const restoreDialog = page.getByRole('dialog').filter({ hasText: '이전 작업 복원' });
    if (await restoreDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const useDb = restoreDialog.getByRole('button', { name: '서버 데이터 사용' });
      if (await useDb.isVisible().catch(() => false)) {
        await useDb.click();
      } else {
        await restoreDialog.getByRole('button', { name: '이어서 작업' }).click();
      }
    }

    // 저장했던 대원이 좌석에 복원되어 있어야 함
    await expect(
      visibleSeat(page, `[data-member-id="${placedMemberId}"]`).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test('편집 완료(SHARED) 후 긴급 수정 모드에서 배치가 보존된다', async ({
    page,
    isMobileViewport,
  }) => {
    test.skip(isMobileViewport, '데스크톱 전용');
    test.skip(!arrangementId || !placedMemberId, '선행 테스트 실패');

    test.setTimeout(120_000);

    await page.goto(`/arrangements/${arrangementId}`, { waitUntil: 'domcontentloaded' });

    const restoreDialog = page.getByRole('dialog').filter({ hasText: '이전 작업 복원' });
    if (await restoreDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const useDb = restoreDialog.getByRole('button', { name: '서버 데이터 사용' });
      if (await useDb.isVisible().catch(() => false)) {
        await useDb.click();
      } else {
        await restoreDialog.getByRole('button', { name: '이어서 작업' }).click();
      }
    }

    await expect(
      visibleSeat(page, `[data-member-id="${placedMemberId}"]`).first()
    ).toBeVisible({ timeout: 30_000 });

    // 편집 완료 → 확인 다이얼로그 → SHARED 전환
    await page.getByRole('button', { name: '편집 완료' }).click();
    // ConfirmDialog는 AlertDialog 기반 → role="alertdialog"
    const confirm = page
      .getByRole('alertdialog')
      .filter({ hasText: '배치표 편집을 완료하시겠습니까' });
    await expect(confirm).toBeVisible({ timeout: 5_000 });
    await confirm.getByRole('button', { name: '편집 완료' }).click();

    // SHARED 상태 UI: 긴급 수정 가능 표시 + 긴급 수정 패널
    await expect(page.getByText('긴급 수정 가능')).toBeVisible({ timeout: 20_000 });

    // 긴급 수정 모드에서 기존 배치·줄 구성이 그대로 보존되는지 확인
    const occupiedBefore = await visibleSeat(page, '[data-occupied="true"]').count();
    expect(occupiedBefore).toBeGreaterThan(0);
    await expect(
      visibleSeat(page, `[data-member-id="${placedMemberId}"]`).first()
    ).toBeVisible();

    // 초기화 이펙트(compactAllRows 등)가 SHARED에서 실행되지 않는지 — 잠시 후에도 동일
    await page.waitForTimeout(2_000);
    const occupiedAfter = await visibleSeat(page, '[data-occupied="true"]').count();
    expect(occupiedAfter).toBe(occupiedBefore);
  });
});

test.describe('자리배치 편집 (모바일 스모크)', () => {
  let api: APIRequestContext;
  let schedule: EnsuredSchedule | null = null;
  let arrangementId: string | null = null;

  test.beforeAll(async ({ playwright }) => {
    api = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: 'e2e/.auth/user.json',
    });
    // 데스크톱 플로우와 별도의 배치표 사용 (3주 뒤 주일)
    schedule = await ensureSchedule(api, upcomingSundayISO(2), 'E2E모바일예배');
    const res = await api.post('/api/arrangements', {
      data: {
        title: 'E2E 모바일 스모크 배치표',
        date: schedule.date,
        service_schedule_id: schedule.id,
      },
    });
    if (res.ok()) {
      arrangementId = (await res.json()).id;
    }
  });

  test.afterAll(async () => {
    await cleanupArrangement(api, arrangementId);
    await cleanupSchedule(api, schedule);
    await api.dispose();
  });

  test('모바일에서 편집 페이지가 로드되고 바텀시트가 열린다', async ({
    page,
    isMobileViewport,
  }) => {
    test.skip(!isMobileViewport, '모바일 전용 스모크');
    test.skip(!arrangementId, '배치표 생성 실패');

    await page.goto(`/arrangements/${arrangementId}`, { waitUntil: 'domcontentloaded' });

    // 모바일 그리드 렌더링
    await expect(page.locator('[data-testid="seats-grid"]:visible').first()).toBeVisible({
      timeout: 30_000,
    });

    // 그리드 설정 플로팅 버튼 → 바텀시트 열기
    await page.locator('[data-testid="mobile-settings-button"]:visible').click();

    // 바텀시트 헤더(워크플로우) 표시
    await expect(page.getByRole('heading', { name: /워크플로우|긴급 수정/ })).toBeVisible({
      timeout: 10_000,
    });

    // 닫기 버튼으로 바텀시트 닫기
    await page.getByRole('button', { name: '닫기' }).click();
    await expect(page.getByRole('heading', { name: /워크플로우|긴급 수정/ })).toBeHidden({
      timeout: 10_000,
    });
  });
});
