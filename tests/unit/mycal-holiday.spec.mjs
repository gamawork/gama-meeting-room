import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab, setMycalScale } from './support/app.mjs';

test('月、週、日顯示同一節日，切換中英文與 Mine／All 不會藏起節日', async ({ page, mock }) => {
  await gotoApp(page);
  await page.evaluate(() => setLang('zh'));
  await setMycalMe(page, 'Ryan');
  await openMycalTab(page);

  await setMycalScale(page, 'month', '2026-12-25');
  const monthCell = page.locator('.mycal-day-cell[data-date="2026-12-25"]');
  await expect(monthCell.locator('.mycal-holiday')).toHaveText('🎄聖誕節');
  await page.evaluate(() => mycalSetFilter('all'));
  await expect(monthCell.locator('.mycal-holiday')).toHaveText('🎄聖誕節');

  await setMycalScale(page, 'week', '2026-12-25');
  await expect(page.locator('.mycal-tg-head[data-date="2026-12-25"] .mycal-holiday')).toHaveText('🎄聖誕節');

  await setMycalScale(page, 'day', '2026-12-25');
  await expect(page.locator('#mycalViewTitle .mycal-holiday')).toHaveText('🎄聖誕節');
  await page.evaluate(() => setLang('en'));
  await expect(page.locator('#mycalViewTitle .mycal-holiday')).toHaveText('🎄Christmas');
  await setMycalScale(page, 'month', '2026-12-25');
  await expect(monthCell.locator('.mycal-holiday')).toHaveText('🎄Christmas');
});

test('跨年週檢視會要求新年度節日資料，保留會議顯示', async ({ page, mock }) => {
  mock.seed([{ id: 9001, date: '2027-01-01', start_time: '10:00', end_time: '11:00', room: '302', title: '跨年會議', organizer: 'Ryan' }]);
  await page.route('https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/2027.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ date: '20270101', description: '開國紀念日', isHoliday: true }]) }));
  await gotoApp(page);
  await page.evaluate(() => setLang('zh'));
  await setMycalMe(page, 'Ryan');
  await openMycalTab(page);
  await setMycalScale(page, 'week', '2026-12-31');
  await expect.poll(() => page.evaluate(() => holidayYearsLoaded[2027])).toBe('done');
  await expect(page.locator('.mycal-tg-head[data-date="2027-01-01"] .mycal-holiday')).toContainText('元旦');
  await expect(page.locator('.mycal-blk').filter({ hasText: '跨年會議' })).toBeVisible();
});

test('已停用的自訂節日不再出現在週表與我的行事曆', async ({ page, mock }) => {
  await gotoApp(page);
  const customHoliday = await page.evaluate(() => getCustomHoliday('2026-12-02'));
  expect(customHoliday).toBeNull();
  await page.evaluate(() => {
    currentWeekStart = new Date(2026, 10, 30);
    updateSchedule();
  });
  await expect(page.locator('#scheduleBody .holiday-badge')).toHaveCount(0);
  await setMycalMe(page, 'Ryan');
  await openMycalTab(page);
  await setMycalScale(page, 'month', '2026-12-02');
  await expect(page.locator('.mycal-day-cell[data-date="2026-12-02"] .mycal-holiday')).toHaveCount(0);
});

test('光復節與國慶日共用相同的國旗圖示', async ({ page }) => {
  await gotoApp(page);
  const icons = await page.evaluate(() => [holidayEmojiFor('國慶日'), holidayEmojiFor('臺灣光復暨金門古寧頭大捷紀念日')]);
  expect(icons[1]).toBe(icons[0]);
  expect(icons[0]).toContain('<svg');
});

test('節日 CDN 失敗時，會議仍顯示且可開啟詳情', async ({ page, mock }) => {
  mock.seed([{ id: 9002, date: '2027-01-01', start_time: '10:00', end_time: '11:00', room: '302', title: '仍可開啟的會議', organizer: 'Ryan' }]);
  await gotoApp(page);
  await page.route('https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/2027.json', route => route.abort());
  await setMycalMe(page, 'Ryan');
  await openMycalTab(page);
  await setMycalScale(page, 'day', '2027-01-01');
  await expect.poll(() => page.evaluate(() => holidayYearsLoaded[2027])).toBe('error');
  await page.locator('.mycal-blk').filter({ hasText: '仍可開啟的會議' }).click();
  await expect(page.locator('#mycalDetailModal')).toBeVisible();
});
