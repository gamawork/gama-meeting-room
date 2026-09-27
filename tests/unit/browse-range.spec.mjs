// F9：可瀏覽範圍邊界。WEEK_RANGE_BACK=4／WEEK_RANGE_FORWARD=20，時鐘固定在 2026-09-27
// （台北時間，星期日），本週一是 2026-09-21。
//   MYCAL_RANGE_START = 本週一 -4 週 = 2026-08-24（週一）
//   MYCAL_RANGE_END   = 本週一 +20 週 +6 天 = 2027-02-14（週日）
// 側欄 changeWeek() 用「跟今天所在週差幾週」判斷（-4～+20 週）；
// 「我的行事曆」用 mycalInRange()／mycalStepped() 判斷（同一組 WEEK_RANGE 常數推出來的日期範圍）。
// 這裡兩邊都測，確認邊界一致（README 第 12 條、CLAUDE.md「可瀏覽範圍」）。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab, setMycalScale } from './support/app.mjs';

const RANGE_START = '2026-08-24'; // 週一
const RANGE_END = '2027-02-14'; // 週日
const ONE_DAY_BEFORE_START = '2026-08-23';
const ONE_DAY_AFTER_END = '2027-02-15';
const WEEK_MINUS4_MONDAY = '2026-08-24';
const WEEK_PLUS20_MONDAY = '2027-02-08';

test.describe('mycalInRange（我的行事曆可瀏覽範圍，純函式）', () => {
  test('−4 週那天（範圍下界）在範圍內', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(d => mycalInRange(mycalParseDate(d)), RANGE_START);
    expect(r).toBe(true);
  });
  test('−4 週再前一天不在範圍內', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(d => mycalInRange(mycalParseDate(d)), ONE_DAY_BEFORE_START);
    expect(r).toBe(false);
  });
  test('+20 週那週的週日（範圍上界）在範圍內', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(d => mycalInRange(mycalParseDate(d)), RANGE_END);
    expect(r).toBe(true);
  });
  test('+20 週再後一天不在範圍內', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(d => mycalInRange(mycalParseDate(d)), ONE_DAY_AFTER_END);
    expect(r).toBe(false);
  });
});

test.describe('changeWeek()／週表 ◀ ▶（側欄）', () => {
  test('往前最多到 −4 週，第 5 次點擊不再前進', async ({ page, mock }) => {
    await gotoApp(page);
    await page.evaluate(() => { for (let i = 0; i < 4; i++) changeWeek(-1); });
    const atBoundary = await page.evaluate(() => formatDate(currentWeekStart));
    expect(atBoundary).toBe(WEEK_MINUS4_MONDAY);

    // 真的點一次 UI 上的 ◀，確認邊界擋得住（不是只有直接呼叫函式才擋得住）
    await page.locator('#tabTable button[onclick="changeWeek(-1)"]').click();
    const afterOneMoreClick = await page.evaluate(() => formatDate(currentWeekStart));
    expect(afterOneMoreClick).toBe(WEEK_MINUS4_MONDAY);
  });

  test('往後最多到 +20 週，第 21 次點擊不再前進', async ({ page, mock }) => {
    await gotoApp(page);
    await page.evaluate(() => { for (let i = 0; i < 20; i++) changeWeek(1); });
    const atBoundary = await page.evaluate(() => formatDate(currentWeekStart));
    expect(atBoundary).toBe(WEEK_PLUS20_MONDAY);

    await page.locator('#tabTable button[onclick="changeWeek(1)"]').click();
    const afterOneMoreClick = await page.evaluate(() => formatDate(currentWeekStart));
    expect(afterOneMoreClick).toBe(WEEK_PLUS20_MONDAY);
  });
});

test.describe('我的行事曆日檢視 ‹ › 邊界（跟 changeWeek 一致）', () => {
  test('游標在下界前一天：‹ 可以走到下界，走到下界後 ‹ 變 disabled 且點了不會再前進', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'day', '2026-08-25'); // 下界後一天

    await page.click('#mycalPrevBtn');
    let cursor = await page.evaluate(() => formatDate(mycalState.cursor));
    expect(cursor).toBe(RANGE_START);
    await expect(page.locator('#mycalPrevBtn')).toBeDisabled();

    // disabled 狀態下再點一次也不該變動（瀏覽器本來就不會觸發 disabled 按鈕的 click，這裡直接呼叫 mycalMove 驗證函式本身的邊界）
    await page.evaluate(() => mycalMove(-1));
    cursor = await page.evaluate(() => formatDate(mycalState.cursor));
    expect(cursor).toBe(RANGE_START);
  });

  test('游標在上界前一天：› 可以走到上界，走到上界後 › 變 disabled 且不會再前進', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'day', '2027-02-13'); // 上界前一天

    await page.click('#mycalNextBtn');
    let cursor = await page.evaluate(() => formatDate(mycalState.cursor));
    expect(cursor).toBe(RANGE_END);
    await expect(page.locator('#mycalNextBtn')).toBeDisabled();

    await page.evaluate(() => mycalMove(1));
    cursor = await page.evaluate(() => formatDate(mycalState.cursor));
    expect(cursor).toBe(RANGE_END);
  });
});

test.describe('我的行事曆週檢視 ‹ › 邊界', () => {
  test('週檢視游標在 −4 週：‹ disabled，不會再往前', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'week', WEEK_MINUS4_MONDAY);
    await expect(page.locator('#mycalPrevBtn')).toBeDisabled();
    await page.evaluate(() => mycalMove(-1));
    const cursor = await page.evaluate(() => formatDate(mycalMondayOf(mycalState.cursor)));
    expect(cursor).toBe(WEEK_MINUS4_MONDAY);
  });

  test('週檢視游標在 +20 週：› disabled，不會再往後', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'week', WEEK_PLUS20_MONDAY);
    await expect(page.locator('#mycalNextBtn')).toBeDisabled();
    await page.evaluate(() => mycalMove(1));
    const cursor = await page.evaluate(() => formatDate(mycalMondayOf(mycalState.cursor)));
    expect(cursor).toBe(WEEK_PLUS20_MONDAY);
  });
});
