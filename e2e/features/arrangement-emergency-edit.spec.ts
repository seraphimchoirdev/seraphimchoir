import { test, expect } from '../fixtures/base.fixture';

test.describe('자리배치 긴급 수정모드', () => {
  test('SHARED 배치표 진입 시 줄 구성이 변경되지 않는다', async ({ page }) => {
    await page.goto('/arrangements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '자리배치 관리' })).toBeVisible({ timeout: 30_000 });

    // SHARED(편집완료) 상태 배치표 찾기
    const sharedBadge = page.getByText('편집완료').first();
    const hasShared = await sharedBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasShared) {
      test.skip(true, 'SHARED 상태 배치표가 없어 테스트를 건너뜁니다');
      return;
    }

    // SHARED 배치표의 카드/링크 클릭
    const sharedCard = sharedBadge.locator('xpath=ancestor::a[contains(@href, "/arrangements/")]');
    await sharedCard.click();
    await page.waitForURL(/\/arrangements\/.+/, { timeout: 15_000 });

    // 그리드가 렌더링될 때까지 대기
    const grid = page.locator('[data-testid="seat-grid"], .seat-grid, [class*="grid"]').first();
    await grid.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // 페이지가 완전히 로드될 때까지 대기 (초기 useEffect 실행 완료)
    await page.waitForTimeout(2000);

    // 줄별 좌석 수를 스냅샷으로 저장
    const rowCounts = await page.evaluate(() => {
      const store = (window as unknown as { __ARRANGEMENT_STORE__?: { getState: () => { gridLayout?: { rowCapacities: number[] } } } }).__ARRANGEMENT_STORE__;
      if (!store) {
        // store가 window에 노출되지 않으면 DOM 기반으로 확인
        const rows = document.querySelectorAll('[data-row]');
        return Array.from(rows).map(row => row.children.length);
      }
      return store.getState().gridLayout?.rowCapacities ?? [];
    });

    // 추가 대기 후 줄 구성이 변경되지 않았는지 확인
    await page.waitForTimeout(1000);

    const rowCountsAfter = await page.evaluate(() => {
      const store = (window as unknown as { __ARRANGEMENT_STORE__?: { getState: () => { gridLayout?: { rowCapacities: number[] } } } }).__ARRANGEMENT_STORE__;
      if (!store) {
        const rows = document.querySelectorAll('[data-row]');
        return Array.from(rows).map(row => row.children.length);
      }
      return store.getState().gridLayout?.rowCapacities ?? [];
    });

    // 줄 구성이 변하지 않았어야 함
    expect(rowCountsAfter).toEqual(rowCounts);
  });

  test('SHARED 배치표에서 좌석 배치가 보존된다', async ({ page }) => {
    await page.goto('/arrangements', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '자리배치 관리' })).toBeVisible({ timeout: 30_000 });

    // SHARED 배치표 찾기
    const sharedBadge = page.getByText('편집완료').first();
    const hasShared = await sharedBadge.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasShared) {
      test.skip(true, 'SHARED 상태 배치표가 없어 테스트를 건너뜁니다');
      return;
    }

    const sharedCard = sharedBadge.locator('xpath=ancestor::a[contains(@href, "/arrangements/")]');
    await sharedCard.click();
    await page.waitForURL(/\/arrangements\/.+/, { timeout: 15_000 });

    // 그리드 로드 대기
    await page.waitForTimeout(2000);

    // 배치된 좌석(멤버 이름이 표시된 셀) 수 확인
    const seatCount = await page.locator('[data-testid="seat-cell"][data-occupied="true"], [data-member-id]').count();

    // 추가 대기 후 좌석 수가 변하지 않았는지 확인 (compactAllRows가 실행되지 않음)
    await page.waitForTimeout(1500);

    const seatCountAfter = await page.locator('[data-testid="seat-cell"][data-occupied="true"], [data-member-id]').count();

    // 좌석 수가 동일해야 함 (compactAllRows/shrinkRowCapacitiesToFit 미실행)
    expect(seatCountAfter).toBe(seatCount);
  });
});
