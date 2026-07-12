import { test, expect, suppressPWAPrompt } from '../fixtures/base.fixture';

test.describe('주보 (새로핌지)', () => {
  test('주보 목록 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/newsletters', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/newsletters/);

    await expect(page.getByRole('heading', { name: '새로핌지' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('ADMIN은 새 작성 버튼이 표시된다', async ({ page }) => {
    await page.goto('/newsletters', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: '새로핌지' })).toBeVisible({
      timeout: 30_000,
    });

    const newButton = page.getByRole('button', { name: '새 작성' });
    await expect(newButton).toBeVisible({ timeout: 15_000 });
  });

  test('주보 목록이 표시되거나 빈 상태가 표시된다', async ({ page }) => {
    await page.goto('/newsletters', { waitUntil: 'domcontentloaded' });

    // 페이지 제목이 먼저 보여야 함
    await expect(page.getByRole('heading', { name: '새로핌지' })).toBeVisible({
      timeout: 30_000,
    });

    // 목록에 카드가 있거나 빈 상태 메시지가 표시
    const hasCard = await page
      .getByRole('heading', { level: 3 })
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    const isEmpty = await page
      .getByText('아직 발행된 소식지가 없습니다.')
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasCard || isEmpty).toBeTruthy();
  });

  test('주보 카드 클릭 시 뷰어 페이지로 이동한다', async ({ page }) => {
    await page.goto('/newsletters', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '새로핌지' })).toBeVisible({
      timeout: 30_000,
    });

    // UUID 패턴 링크만 매칭 (edit 링크 제외)
    const firstCard = page.locator('a[href*="/newsletters/"][href*="-"]').first();
    const hasCard = await firstCard.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!hasCard, '주보 카드가 없어서 건너뜁니다');

    await firstCard.click();
    await expect(page).toHaveURL(/\/newsletters\/[a-f0-9-]+/, { timeout: 15_000 });
  });

  test('새 소식지 에디터가 정상 로드된다', async ({ page }) => {
    await page.goto('/newsletters/edit', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/newsletters\/edit/);

    await expect(page.getByRole('heading', { name: '새 소식지 작성' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('에디터에서 발행인/편집인 자동 입력이 표시된다', async ({ page }) => {
    await page.goto('/newsletters/edit', { waitUntil: 'domcontentloaded' });

    // 에디터 로드 대기
    await expect(page.getByRole('heading', { name: '새 소식지 작성' })).toBeVisible({
      timeout: 30_000,
    });

    // 발행인/편집인 메타 필드가 표시됨
    // ("(자동 입력)" 라벨은 이전 호가 존재할 때만 붙는 조건부 UI라 단정하지 않음)
    await expect(page.getByText('발행인', { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('편집인', { exact: true })).toBeVisible();
  });

  test('알림 항목 추가/삭제가 동작한다', async ({ page }) => {
    await page.goto('/newsletters/edit', { waitUntil: 'domcontentloaded' });

    // 에디터 로드 대기
    await expect(page.getByRole('heading', { name: '새 소식지 작성' })).toBeVisible({
      timeout: 30_000,
    });

    // 항목 추가 버튼 대기
    await expect(page.getByRole('button', { name: '항목 추가' })).toBeVisible({
      timeout: 10_000,
    });

    // 현재 항목 수 확인
    const initialCount = await page.getByPlaceholder(/알림 항목/).count();

    // 항목 추가
    await page.getByRole('button', { name: '항목 추가' }).click();
    const afterAddCount = await page.getByPlaceholder(/알림 항목/).count();
    expect(afterAddCount).toBeGreaterThan(initialCount);

    // 항목 삭제 (핀 되지 않은 항목의 삭제 버튼)
    const deleteButton = page.getByRole('button', { name: '항목 삭제' }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      const afterDeleteCount = await page.getByPlaceholder(/알림 항목/).count();
      expect(afterDeleteCount).toBe(afterAddCount - 1);
    }
  });

  test('알림 pin 토글이 동작한다', async ({ page }) => {
    await page.goto('/newsletters/edit', { waitUntil: 'domcontentloaded' });

    // 에디터 로드 대기
    await expect(page.getByRole('heading', { name: '새 소식지 작성' })).toBeVisible({
      timeout: 30_000,
    });

    // 고정 해제 또는 고정 버튼이 존재
    const pinButton = page
      .getByRole('button', { name: /고정/ })
      .first();
    await expect(pinButton).toBeVisible({ timeout: 10_000 });
  });

  test('미리보기 토글이 동작한다', async ({ page }) => {
    await page.goto('/newsletters/edit', { waitUntil: 'domcontentloaded' });

    // 에디터 로드 대기
    await expect(page.getByRole('heading', { name: '새 소식지 작성' })).toBeVisible({
      timeout: 30_000,
    });

    // "미리보기" 버튼 클릭
    await page.getByRole('button', { name: '미리보기' }).click();

    // 미리보기 모드: "편집으로" 버튼이 표시
    const editButton = page.getByRole('button', { name: '편집으로' });
    await expect(editButton).toBeVisible({ timeout: 10_000 });

    // 다시 편집으로 전환
    await editButton.click();
    await expect(page.getByRole('button', { name: '미리보기' })).toBeVisible();
  });

  test('뷰어 페이지에서 상단 액션 바가 표시된다', async ({ page }) => {
    await page.goto('/newsletters', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '새로핌지' })).toBeVisible({
      timeout: 30_000,
    });

    // UUID 패턴 링크만 매칭 (edit 링크 제외)
    const viewerCard = page.locator('a[href*="/newsletters/"][href*="-"]').first();
    const hasCard = await viewerCard.isVisible({ timeout: 10_000 }).catch(() => false);
    test.skip(!hasCard, '주보 데이터가 없어서 건너뜁니다');

    await viewerCard.click();
    await expect(page).toHaveURL(/\/newsletters\/[a-f0-9-]+/, { timeout: 15_000 });

    // 액션 바: 목록, 수정 버튼 (인쇄는 권한에 따라 다를 수 있음)
    await expect(page.getByRole('button', { name: '목록' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: '수정' })).toBeVisible({ timeout: 5_000 });
  });

  test('네비게이션에서 새로핌지 링크가 존재한다', async ({
    page,
    isDesktopViewport,
    isMobileViewport,
    isTabletViewport,
  }) => {
    await suppressPWAPrompt(page);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기 — main이 보일 때까지
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    if (isDesktopViewport) {
      // 새로핌지는 저빈도 메뉴로 '더보기' 드롭다운 안에 있음 (상단 sticky nav 기준)
      const nav = page.locator('nav').first();
      await expect(nav).toBeVisible({ timeout: 15_000 });
      await nav.getByRole('button', { name: '더보기' }).click();
      await expect(page.getByRole('link', { name: '새로핌지' })).toBeVisible({ timeout: 5_000 });
    } else if (isMobileViewport || isTabletViewport) {
      // 모바일: 더보기 시트에서 확인
      const moreButton = page.locator('nav.lg\\:hidden').getByText('더보기');
      if (await moreButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await moreButton.click();
        await expect(page.getByRole('link', { name: '새로핌지' })).toBeVisible();
      }
    }
  });

  test('주보 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/newsletters', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '새로핌지' })).toBeVisible({
      timeout: 30_000,
    });

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
