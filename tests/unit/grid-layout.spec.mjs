// F9：mycalRenderTimeGrid 網格定位。top/height 公式（index.html:~8100）：
//   top = (s - MYCAL_DAY_START) / MYCAL_STEP * rowPx + 2
//   h   = (e - s) / MYCAL_STEP * rowPx - 4
// rowPx 讀 #tabMycal 的 --mycal-row（桌面 34px；窄螢幕媒體查詢改 40px，index.html:2249 的 768px 斷點）。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab, setMycalScale } from './support/app.mjs';

const MYCAL_DAY_START = 9 * 60;
const MYCAL_STEP = 30;

function expectedTopHeight(rowPx, startHHMM, durationMin) {
  const [h, m] = startHHMM.split(':').map(Number);
  const s = h * 60 + m;
  const top = (s - MYCAL_DAY_START) / MYCAL_STEP * rowPx + 2;
  const height = durationMin / MYCAL_STEP * rowPx - 4;
  return { top, height };
}

test.describe('mycalRenderTimeGrid 定位（13:30 開始、90 分鐘）', () => {
  const rows = [
    { id: 1, date: '2026-10-05', room: '302', start_time: '13:30:00', end_time: '15:00:00', title: '長會議', organizer: 'Ray', attendees: null },
  ];

  test('桌面寬度：rowPx=34', async ({ page, mock }) => {
    mock.seed(rows);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'day', '2026-10-05');

    const rowPx = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('tabMycal')).getPropertyValue('--mycal-row')));
    expect(rowPx).toBeCloseTo(34, 5);

    const block = page.locator('.mycal-blk[data-id="1"]');
    await expect(block).toBeVisible();
    const style = await block.getAttribute('style');
    const { top, height } = expectedTopHeight(rowPx, '13:30', 90);
    expect(style).toContain(`top:${top}px`);
    expect(style).toContain(`height:${height}px`);
  });

  test('手機寬度（375px）：rowPx=40（讀 #tabMycal 而非 :root）', async ({ page, mock }) => {
    mock.seed(rows);
    await page.setViewportSize({ width: 375, height: 800 });
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await setMycalScale(page, 'day', '2026-10-05');

    const rowPx = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('tabMycal')).getPropertyValue('--mycal-row')));
    expect(rowPx).toBeCloseTo(40, 5);

    // 手機斷點會隱藏時間網格上的方塊文字但方塊本身仍在，位置仍照公式算
    const block = page.locator('.mycal-blk[data-id="1"]');
    const style = await block.getAttribute('style');
    const { top, height } = expectedTopHeight(rowPx, '13:30', 90);
    expect(style).toContain(`top:${top}px`);
    expect(style).toContain(`height:${height}px`);
  });
});
