import { test, expect } from '../fixtures/base.fixture';

test.describe('기도 담당 관리', () => {
  test('기도 담당 관리 페이지가 정상 로드된다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/management\/prayers/);

    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('분기 선택기가 표시된다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    // 년도 콤보박스
    const yearCombo = page.getByRole('combobox').first();
    await expect(yearCombo).toBeVisible({ timeout: 15_000 });

    // 분기 콤보박스 (Q1~Q4)
    const comboboxes = page.getByRole('combobox');
    const count = await comboboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('주일 날짜 테이블이 표시된다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    // 테이블 헤더: 날짜, 기도자, 가운 파트
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole('columnheader', { name: '날짜' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '기도자' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '가운 파트' })).toBeVisible();
  });

  test('날짜 추가 버튼이 존재한다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByRole('button', { name: '날짜 추가' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('파일 가져오기 버튼이 존재한다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByRole('button', { name: '파일 가져오기' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('일괄 저장 버튼이 초기에 비활성화이다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    const saveButton = page.getByRole('button', { name: '일괄 저장' });
    await expect(saveButton).toBeVisible({ timeout: 15_000 });
    await expect(saveButton).toBeDisabled();
  });

  test('기도자 이름 입력 시 저장 버튼이 활성화된다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    const saveButton = page.getByRole('button', { name: '일괄 저장' });
    await expect(saveButton).toBeDisabled({ timeout: 15_000 });

    // 첫 번째 기도자 입력 필드에 텍스트 추가
    const firstInput = page.getByPlaceholder('김택훈/문승현').first();
    await expect(firstInput).toBeVisible({ timeout: 10_000 });
    const currentValue = await firstInput.inputValue();
    await firstInput.fill(currentValue + '(수정)');

    // 저장 버튼이 활성화되어야 함
    await expect(saveButton).toBeEnabled({ timeout: 5_000 });

    // 원래 값으로 복원 (실제 저장하지 않음)
    await firstInput.fill(currentValue);
  });

  test('기도 담당 페이지가 오버플로 없이 표시된다', async ({ page }) => {
    await page.goto('/management/prayers', { waitUntil: 'domcontentloaded' });

    // 페이지 로드 대기
    await expect(page.getByRole('heading', { name: '기도 담당 관리' })).toBeVisible({
      timeout: 30_000,
    });

    const viewport = page.viewportSize();
    const body = await page.locator('body').boundingBox();
    if (body && viewport) {
      expect(body.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });
});
