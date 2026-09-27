// 月檢視範圍外（locked）格子裡的會議點了不會開詳情。
// 範圍外的格子（mycal-day-cell.mycal-locked）照樣顯示會議 chip（.mycal-ev），
// 但點擊要被 mycalBindViewClicks() 擋下，不能開 mycalOpenDetail()。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab, setMycalScale } from './support/app.mjs';

test('locked 格子裡的會議點了不會開詳情彈窗', async ({ page, mock }) => {
  // 2026-08-24 是可瀏覽範圍下界（見 browse-range.spec.mjs）。月檢視切到 2026-08 時，
  // 8/1～8/23 這幾天落在範圍外，但月曆會補上個月最後幾天湊滿週一開頭，
  // 這裡直接放一筆落在「範圍外但月曆仍會畫出來」的日期：2026-08-20（週四，在 8 月份內、
  // 在可瀏覽範圍外，locked class 會蓋在整個日期格上，見 index.html mycalRenderMonth 的
  // mycalInRange(d) ? '' : ' mycal-locked'）。
  mock.seed([
    { id: 7, date: '2026-08-20', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '範圍外的舊會議', organizer: 'Ray', attendees: null },
  ]);
  await gotoApp(page);
  await setMycalMe(page, 'Ray');
  await openMycalTab(page);
  await setMycalScale(page, 'month', '2026-08-20');

  const cell = page.locator('.mycal-day-cell[data-date="2026-08-20"]');
  await expect(cell).toHaveClass(/mycal-locked/);
  const chip = cell.locator('.mycal-ev[data-id="7"]');
  await expect(chip).toBeVisible();

  await chip.click();
  await expect(page.locator('#mycalDetailModal')).toBeHidden();
});
