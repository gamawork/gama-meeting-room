// i18n / 雙語模式 Playwright 測試
// 規則：所有寫入 DB 的測試一律帶 TEST_TAG (organizer) + TEST_TITLE_PREFIX (title 前綴)，
//       並在 afterEach / afterAll 透過 fullCleanup() 完整清除（三層保險）。

import { test, expect } from '@playwright/test';
import {
  attachInsertRecorder,
  fullCleanup,
  sweepByMarkers,
  makeTestTitle,
  pickSafeFutureDate,
} from './helpers/cleanup.mjs';
import { TEST_TAG } from './helpers/supabase.mjs';
import { setupCleanPage, switchLang } from './helpers/page-setup.mjs';

// 每個 test file 跑前先掃一次殘留（防止上次 crash 留下的資料）
test.beforeAll(async () => {
  const r = await sweepByMarkers();
  if (r.byTag + r.byTitle > 0) {
    console.log(`[pre-sweep] removed ${r.byTag} by tag + ${r.byTitle} by title prefix`);
  }
});

test.afterAll(async () => {
  const r = await sweepByMarkers();
  if (r.byTag + r.byTitle > 0) {
    console.log(`[post-sweep] removed ${r.byTag} by tag + ${r.byTitle} by title prefix`);
  }
});

// 每個測試的記錄集
let createdIds;

test.beforeEach(async ({ page }) => {
  createdIds = new Set();
  await attachInsertRecorder(page, createdIds);
  await setupCleanPage(page, { lang: 'en' });
});

test.afterEach(async () => {
  const result = await fullCleanup(createdIds);
  if (result.deletedById + result.deletedByTag + result.deletedByTitle > 0) {
    console.log('[cleanup]', result);
  }
});

// -----------------------------------------------------------------------------
// 測試 1：預設英文 + 切換中文 + 持久化
// -----------------------------------------------------------------------------
test('預設英文，切換中文後 localStorage 保留', async ({ page }) => {
  await expect(page).toHaveTitle('Gama Meeting Room Booking System');
  await expect(page.locator('h1')).toHaveText('Gama Meeting Room Booking System');
  await expect(page.locator('th').nth(0)).toHaveText('Date');

  await page.locator('#langSwitch').click();
  await expect(page.locator('h1')).toHaveText('Gama 會議室預約系統');
  await expect(page.locator('th').nth(0)).toHaveText('日期');

  await page.reload();
  await page.waitForSelector('#loadingOverlay', { state: 'hidden' }).catch(() => {});
  await expect(page.locator('h1')).toHaveText('Gama 會議室預約系統');
  expect(await page.evaluate(() => localStorage.getItem('gama_lang'))).toBe('zh');
});

// -----------------------------------------------------------------------------
// 測試 2：表單欄位翻譯
// -----------------------------------------------------------------------------
test('表單 label / placeholder 在兩種語言下正確翻譯', async ({ page }) => {
  // English
  const en = {
    '[data-i18n="form.subject"]':       'Subject',
    '[data-i18n="form.location"]':      'Location',
    '[data-i18n="form.startTime"]':     'Start Time',
    '[data-i18n="form.endTime"]':       'End Time',
    '[data-i18n="form.organizer"]':     'Organizer',
    '[data-i18n="form.attendees"]':     'Attendees (optional)',
    '#submitBtn':                       'Confirm Booking',
    '.booking-form h3':                 'New Booking',
  };
  for (const [sel, txt] of Object.entries(en)) {
    await expect(page.locator(sel)).toHaveText(txt);
  }
  await expect(page.locator('#meetingTitle')).toHaveAttribute('placeholder', 'Enter meeting subject');
  await expect(page.locator('#organizer')).toHaveAttribute('placeholder', 'Click or search organizer');
  await expect(page.locator('#attendeesSearch')).toHaveAttribute('placeholder', 'Click or search attendees');
  await expect(page.locator('#dateDisplay')).toHaveText('Click to select a date');

  // 中文
  await switchLang(page, 'zh');
  const zh = {
    '[data-i18n="form.subject"]':       '會議主題',
    '[data-i18n="form.location"]':      '會議地點',
    '[data-i18n="form.startTime"]':     '開始時間',
    '[data-i18n="form.endTime"]':       '結束時間',
    '[data-i18n="form.organizer"]':     '登記者',
    '[data-i18n="form.attendees"]':     '與會者（選填）',
    '#submitBtn':                       '確認預約',
    '.booking-form h3':                 '新增預約',
  };
  for (const [sel, txt] of Object.entries(zh)) {
    await expect(page.locator(sel)).toHaveText(txt);
  }
  await expect(page.locator('#meetingTitle')).toHaveAttribute('placeholder', '請輸入會議主題');
});

// -----------------------------------------------------------------------------
// 測試 3：會議室選項
// -----------------------------------------------------------------------------
test('會議室下拉顯示 301 / 302 與其他英文名稱', async ({ page }) => {
  const options = page.locator('#meetingRoom option');
  await expect(options.nth(1)).toHaveText('302');
  await expect(options.nth(1)).toHaveAttribute('value', '302');
  await expect(options.nth(2)).toHaveText('301');
  await expect(options.nth(2)).toHaveAttribute('value', '301');
  await expect(options.nth(3)).toHaveText('Pantry');
  await expect(options.nth(4)).toHaveText('Johnny Office');
  await expect(options.nth(5)).toHaveText('Jackal Office');
  await expect(options.nth(6)).toHaveText('Reception Area');

  await switchLang(page, 'zh');
  await expect(options.nth(3)).toHaveText('茶水間');
  await expect(options.nth(4)).toHaveText('囧尼辦公室');
  await expect(options.nth(5)).toHaveText('街口辦公室');
});

// -----------------------------------------------------------------------------
// 測試 4：日期格式分流
// -----------------------------------------------------------------------------
test('日期格式：英文 Tue, May 12, 2026 / 中文 2026年5月12日 (週二)', async ({ page }) => {
  await page.evaluate(() => {
    const inp = document.getElementById('meetingDate');
    inp.value = '2026-05-12';
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#dateDisplay')).toHaveText('Tue, May 12, 2026');

  await switchLang(page, 'zh');
  await expect(page.locator('#dateDisplay')).toHaveText('2026年5月12日 (週二)');
});

// -----------------------------------------------------------------------------
// 測試 5：星期欄位顯示縮寫
// -----------------------------------------------------------------------------
test('表格星期欄位英文 Sun-Sat / 中文 週日-週六', async ({ page }) => {
  const dayCells = page.locator('td.day-cell');
  const count = await dayCells.count();
  test.skip(count === 0, '表格無 day cell（可能尚未載入）');
  for (let i = 0; i < count; i++) {
    await expect(dayCells.nth(i)).toHaveText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
  }

  await switchLang(page, 'zh');
  for (let i = 0; i < count; i++) {
    await expect(dayCells.nth(i)).toHaveText(/^週[日一二三四五六]$/);
  }
});

// -----------------------------------------------------------------------------
// 測試 6：空 row 提示
// -----------------------------------------------------------------------------
test('空白日 row 顯示 Click here to set this date', async ({ page }) => {
  const emptyCell = page.locator('td.empty-cell').first();
  const hasEmpty = (await emptyCell.count()) > 0;
  test.skip(!hasEmpty, '本週所有日子都有預約，無空 row 可測');
  await expect(emptyCell).toContainText('Click here to set this date');

  await switchLang(page, 'zh');
  await expect(emptyCell).toContainText('點選此處 帶入預約日期');
});

// -----------------------------------------------------------------------------
// 測試 7：必填驗證錯誤 Modal
// -----------------------------------------------------------------------------
test('空白送出顯示 Booking Failed', async ({ page }) => {
  await page.locator('#submitBtn').click();
  await expect(page.locator('#bookingModal')).toBeVisible();
  await expect(page.locator('#bookingModal h3')).toHaveText('Booking Failed');
  await expect(page.locator('#modalMessage')).toContainText(
    'Please complete the required fields highlighted in red.'
  );
});

// -----------------------------------------------------------------------------
// 測試 8：端到端成功預約（會寫入 DB → afterEach 會清掉）
// -----------------------------------------------------------------------------
test('預約成功 modal 顯示英文細節（會寫入並清理 DB）', async ({ page }) => {
  const safeDate = await pickSafeFutureDate('302', '14:00', '14:30');
  const title = makeTestTitle('success-en');

  await page.locator('#meetingTitle').fill(title);
  await page.locator('#meetingRoom').selectOption('302');
  await page.evaluate((d) => {
    const inp = document.getElementById('meetingDate');
    inp.value = d;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }, safeDate);
  await page.locator('#startTime').selectOption('14:00');
  await page.locator('#endTime').selectOption('14:30');
  await page.locator('#organizer').fill(TEST_TAG);

  await page.locator('#submitBtn').click();
  await expect(page.locator('#bookingModal h3')).toHaveText('Meeting Details', { timeout: 15_000 });
  const body = page.locator('#modalMessage');
  await expect(body).toContainText('Subject:');
  await expect(body).toContainText('Location:');
  await expect(body).toContainText('Organizer:');
  await expect(body).toContainText(title);
  await expect(body).toContainText(TEST_TAG);

  // 驗證 recorder 真的有抓到 id
  expect(createdIds.size).toBeGreaterThan(0);
});

// -----------------------------------------------------------------------------
// 測試 9：人名不翻譯
// -----------------------------------------------------------------------------
test('與會者 / 登記者名單原文保留', async ({ page }) => {
  await page.locator('#organizer').click();
  const items = page.locator('#organizerDropdown [data-organizer-option]');
  await expect(items.filter({ hasText: '囧尼' })).toHaveCount(1);
  await expect(items.filter({ hasText: 'Vicky' })).toHaveCount(1);
  await expect(items.filter({ hasText: '姿驊' })).toHaveCount(1);

  // 切到中文也是一樣
  await switchLang(page, 'zh');
  await page.locator('#organizer').click();
  await expect(items.filter({ hasText: '囧尼' })).toHaveCount(1);
  await expect(items.filter({ hasText: 'Vicky' })).toHaveCount(1);
});

// -----------------------------------------------------------------------------
// 測試 10：Back to This Week 按鈕寬度
// -----------------------------------------------------------------------------
test('Back to This Week min-width 132px', async ({ page }) => {
  const btn = page.locator('#todayBtn');
  const minWidth = await btn.evaluate((el) => getComputedStyle(el).minWidth);
  expect(minWidth).toBe('132px');
  const box = await btn.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(132);
});

// -----------------------------------------------------------------------------
// 測試 11：行事曆下拉選單
// -----------------------------------------------------------------------------
test('行事曆下拉英文 / 中文翻譯', async ({ page }) => {
  const trigger = page.locator('.calendar-btn-dropdown').first();
  if ((await trigger.count()) === 0) test.skip(true, '本週無預約可測行事曆按鈕');
  await trigger.click();
  const menu = page.locator('.calendar-menu').first();
  await expect(menu).toContainText('Google Calendar');
  await expect(menu).toContainText('Apple & Outlook Calendar');

  // 收掉再切語言
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await switchLang(page, 'zh');
  await page.locator('.calendar-btn-dropdown').first().click();
  const menu2 = page.locator('.calendar-menu').first();
  await expect(menu2).toContainText('Google 日曆');
  await expect(menu2).toContainText('Apple & Outlook 日曆');
});

// -----------------------------------------------------------------------------
// 測試 12：操作按鈕 aria-label
// -----------------------------------------------------------------------------
test('表格操作按鈕 aria-label / title 英文', async ({ page }) => {
  const copy = page.locator('button.copy-btn').first();
  if ((await copy.count()) === 0) test.skip(true, '本週無預約可測操作按鈕');
  await expect(copy).toHaveAttribute('aria-label', 'Copy');
  await expect(copy).toHaveAttribute('title', 'Copy');
  await expect(page.locator('button.edit-btn').first()).toHaveAttribute('aria-label', 'Edit');
  await expect(page.locator('button.delete-btn').first()).toHaveAttribute('aria-label', 'Delete');
  await expect(page.locator('button.calendar-btn-dropdown').first()).toHaveAttribute('aria-label', 'Calendar');

  await switchLang(page, 'zh');
  await expect(page.locator('button.copy-btn').first()).toHaveAttribute('aria-label', '複製');
  await expect(page.locator('button.delete-btn').first()).toHaveAttribute('aria-label', '刪除');
});
