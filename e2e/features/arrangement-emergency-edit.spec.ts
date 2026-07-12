import { test, expect } from '../fixtures/base.fixture';

/**
 * 자리배치 긴급 수정모드 (seed의 SHARED 배치표 기반)
 *
 * SHARED/CONFIRMED 배치표 진입 시 초기화 이펙트(compactAllRows,
 * shrinkRowCapacitiesToFit)가 실행되지 않아 줄 구성과 좌석 배치가
 * 그대로 보존되는지 검증한다.
 *
 * 참고: 과거 버전은 존재하지 않는 셀렉터(window.__ARRANGEMENT_STORE__,
 * data-testid="seat-cell")를 참조해 사실상 항상 통과했다. 현재는
 * SeatSlot의 실제 data-testid/data-occupied 속성으로 검증한다.
 * SHARED 배치표 생성부터의 전체 플로우는 arrangement-editor.spec.ts가 다룬다.
 */
test.describe('자리배치 긴급 수정모드 (seed 데이터)', () => {
  async function openFirstSharedArrangement(page: import('@playwright/test').Page) {
    await page.goto('/arrangements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '자리배치 관리' })).toBeVisible({
      timeout: 30_000,
    });

    const sharedBadge = page.getByText('편집완료').first();
    const hasShared = await sharedBadge.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasShared) return false;

    const sharedCard = sharedBadge.locator('xpath=ancestor::a[contains(@href, "/arrangements/")]');
    await sharedCard.click();
    await page.waitForURL(/\/arrangements\/.+/, { timeout: 15_000 });

    // 그리드 렌더링 대기
    await expect(page.locator('[data-testid="seats-grid"]:visible').first()).toBeVisible({
      timeout: 30_000,
    });
    return true;
  }

  test('SHARED 배치표 진입 시 줄 구성이 변경되지 않는다', async ({ page }) => {
    const opened = await openFirstSharedArrangement(page);
    test.skip(!opened, 'SHARED 상태 배치표가 없어 테스트를 건너뜁니다');

    // 초기화 이펙트가 모두 실행될 시간을 준 뒤 줄별 좌석 수 스냅샷
    await page.waitForTimeout(2_000);
    const rowCounts = await page
      .locator('[data-rows-container]:visible [data-row-count]')
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() ?? ''));

    await page.waitForTimeout(1_500);
    const rowCountsAfter = await page
      .locator('[data-rows-container]:visible [data-row-count]')
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() ?? ''));

    expect(rowCountsAfter).toEqual(rowCounts);
  });

  test('SHARED 배치표에서 좌석 배치가 보존된다', async ({ page }) => {
    const opened = await openFirstSharedArrangement(page);
    test.skip(!opened, 'SHARED 상태 배치표가 없어 테스트를 건너뜁니다');

    await page.waitForTimeout(2_000);

    // 배치된 좌석 수 — 실제 SeatSlot 속성 기반 (0이면 스펙이 무력화된 것이므로 실패해야 함)
    const occupied = page.locator('[data-testid="seat-slot"][data-occupied="true"]:visible');
    const seatCount = await occupied.count();
    expect(seatCount).toBeGreaterThan(0);

    // compactAllRows/shrinkRowCapacitiesToFit 미실행 → 좌석 수 유지
    await page.waitForTimeout(1_500);
    const seatCountAfter = await occupied.count();
    expect(seatCountAfter).toBe(seatCount);
  });
});
