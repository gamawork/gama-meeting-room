// F9：「只看我的／全部」切換。fixture 放一筆我的會議、一筆別人的會議，
// 驗月、週檢視的顯示筆數與計數文字（index.html mycalRenderMonth/mycalRenderWeek + mycalMonthDayItems）。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab, setMycalScale } from './support/app.mjs';

const rows = [
  { id: 1, date: '2026-10-07', room: '302', start_time: '10:00:00', end_time: '11:00:00', title: '我的會議', organizer: 'Ray', attendees: null },
  { id: 2, date: '2026-10-07', room: '301', start_time: '13:00:00', end_time: '14:00:00', title: '別人的會議', organizer: 'Angus', attendees: null },
];

test.describe('月檢視', () => {
  test('filter=mine（預設）：格子只顯示我的那筆，計數文字仍是 1/2', async ({ page, mock }) => {
    mock.seed(rows);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'month', '2026-10-07');

    const filter = await page.evaluate(() => mycalState.filter);
    expect(filter).toBe('mine');

    const cell = page.locator('.mycal-day-cell[data-date="2026-10-07"]');
    await expect(cell.locator('.mycal-ev')).toHaveCount(1);
    await expect(cell.locator('.mycal-ev[data-id="1"]')).toHaveCount(1);
    await expect(cell.locator('.mycal-ev[data-id="2"]')).toHaveCount(0);

    const countText = await page.locator('#mycalViewCount').textContent();
    const expected = await page.evaluate(() => t('mycal.count.dayMix', { mine: 1, all: 2 }));
    expect(countText).toBe(expected);
  });

  test('filter=all：格子顯示兩筆，我的跟別人的都在，計數文字不變', async ({ page, mock }) => {
    mock.seed(rows);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'month', '2026-10-07');
    await page.evaluate(() => mycalSetFilter('all'));

    const cell = page.locator('.mycal-day-cell[data-date="2026-10-07"]');
    await expect(cell.locator('.mycal-ev')).toHaveCount(2);
    await expect(cell.locator('.mycal-ev[data-id="1"]:not(.mycal-other)')).toHaveCount(1);
    await expect(cell.locator('.mycal-ev.mycal-other[data-id="2"]')).toHaveCount(1);

    const countText = await page.locator('#mycalViewCount').textContent();
    const expected = await page.evaluate(() => t('mycal.count.dayMix', { mine: 1, all: 2 }));
    expect(countText).toBe(expected);
  });
});

test.describe('週檢視', () => {
  test('filter=mine（預設）：該天欄位只有我的方塊', async ({ page, mock }) => {
    mock.seed(rows);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'week', '2026-10-07');

    const blocks = page.locator('.mycal-blk');
    await expect(blocks).toHaveCount(1);
    await expect(page.locator('.mycal-blk[data-id="1"]')).toHaveCount(1);

    const countText = await page.locator('#mycalViewCount').textContent();
    const expected = await page.evaluate(() => t('mycal.count.dayMix', { mine: 1, all: 2 }));
    expect(countText).toBe(expected);
  });

  test('filter=all：該天欄位兩個方塊都在，別人的標 mycal-other', async ({ page, mock }) => {
    mock.seed(rows);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'week', '2026-10-07');
    await page.evaluate(() => mycalSetFilter('all'));

    await expect(page.locator('.mycal-blk')).toHaveCount(2);
    await expect(page.locator('.mycal-blk[data-id="2"].mycal-other')).toHaveCount(1);
    await expect(page.locator('.mycal-blk[data-id="1"]:not(.mycal-other)')).toHaveCount(1);
  });
});
