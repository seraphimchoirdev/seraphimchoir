import { test, expect } from '../fixtures/base.fixture';

test.describe('데스크톱 네비게이션', () => {
  test('상단 네비게이션 바가 표시된다', async ({ page, isDesktopViewport }) => {
    test.skip(!isDesktopViewport, '데스크톱 전용 테스트');

    await page.goto('/dashboard');

    const homeLink = page.locator('nav').getByRole('link', { name: '홈' });
    await expect(homeLink).toBeVisible();
  });

  test('네비게이션 링크들이 올바르게 표시된다 (ADMIN)', async ({
    page,
    isDesktopViewport,
  }) => {
    test.skip(!isDesktopViewport, '데스크톱 전용 테스트');

    await page.goto('/dashboard');

    // 1차 메뉴 (핵심 메뉴만 노출)
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: '홈' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '커뮤니티' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '출석 관리' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '찬양대 일정' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '자리배치' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '임원 포털' })).toBeVisible();

    // 저빈도 메뉴는 '더보기' 드롭다운 안에 (새로핌지, 관리자) — 항목은 link로 렌더링됨
    await nav.getByRole('button', { name: '더보기' }).click();
    await expect(page.getByRole('link', { name: '새로핌지' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: '관리자', exact: true })).toBeVisible();
  });

  test('현재 페이지에 해당하는 링크가 활성 상태이다', async ({
    page,
    isDesktopViewport,
  }) => {
    test.skip(!isDesktopViewport, '데스크톱 전용 테스트');

    await page.goto('/dashboard');

    const homeLink = page.locator('nav').getByRole('link', { name: '홈' });
    await expect(homeLink).toBeVisible();
  });

  test('네비게이션 링크 클릭 시 올바른 페이지로 이동', async ({
    page,
    isDesktopViewport,
  }) => {
    test.skip(!isDesktopViewport, '데스크톱 전용 테스트');

    await page.goto('/dashboard');

    await page.locator('nav').getByRole('link', { name: '출석 관리' }).click();
    await expect(page).toHaveURL(/\/attendances/);
  });

  test('사용자 프로필 드롭다운이 동작한다', async ({ page, isDesktopViewport }) => {
    test.skip(!isDesktopViewport, '데스크톱 전용 테스트');

    await page.goto('/dashboard');

    // useMounted 후 프로필 버튼이 나타남 — "관리자" 텍스트의 버튼
    const profileTrigger = page.getByRole('button', { name: /관리자/ }).first();
    await expect(profileTrigger).toBeVisible({ timeout: 15_000 });
    await profileTrigger.click();

    // Radix DropdownMenu는 role="menu"가 아닌 일반 div로 렌더링됨
    // "마이페이지" 링크와 "로그아웃" 텍스트가 보여야 함
    await expect(page.getByRole('link', { name: '마이페이지' }).last()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('로그아웃').first()).toBeVisible();
  });

  test('로그아웃 다이얼로그가 표시된다', async ({ page, isDesktopViewport }) => {
    test.skip(!isDesktopViewport, '데스크톱 전용 테스트');

    await page.goto('/dashboard');

    const profileTrigger = page.getByRole('button', { name: /관리자/ }).first();
    await expect(profileTrigger).toBeVisible({ timeout: 15_000 });
    await profileTrigger.click();

    // 드롭다운에서 "로그아웃" 텍스트 클릭
    await page.getByText('로그아웃').first().click();

    // 로그아웃 확인 다이얼로그
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('정말 로그아웃 하시겠습니까?')).toBeVisible();
    await expect(dialog.getByRole('button', { name: '취소' })).toBeVisible();
  });
});
