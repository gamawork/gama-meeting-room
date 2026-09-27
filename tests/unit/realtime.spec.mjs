// mycalOnDataChanged() —— Realtime 的 INSERT／DELETE 假事件進來時的行為
// （index.html 的 setupRealtimeSubscription() 收到事件 → 更新全域 bookings → mycalOnDataChanged()）。
// 假 Realtime 伺服器見 tests/unit/support/mock-supabase.mjs 的 createRealtimeServer()。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab, openMycalBookingPopup, fillMycalBookingTitle } from './support/app.mjs';

test('新增彈窗開著時收到 INSERT：背後資料更新（房間變「已被預約」），彈窗與輸入保留', async ({ page, mock }) => {
  await gotoApp(page);
  await setMycalMe(page, 'Ray');
  await openMycalTab(page);
  await mock.realtime.waitUntilReady();

  await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
  await fillMycalBookingTitle(page, '草稿中的標題');

  // 送出前，302 這個時段還是空的
  const freeBefore = await page.evaluate(() => mycalIsFree('2026-10-07', '302', 600, 630));
  expect(freeBefore).toBe(true);

  // 模擬別人這時候搶先訂走同一個時段
  await mock.realtime.sendChange({
    type: 'INSERT',
    record: { id: 999, date: '2026-10-07', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '別人搶先訂', organizer: 'Angus', attendees: null },
  });
  await expect.poll(() => page.evaluate(() => mycalIsFree('2026-10-07', '302', 600, 630))).toBe(false);

  // 彈窗還開著、輸入還在
  await expect(page.locator('#mycalBookingModal')).toBeVisible();
  await expect(page.locator('#mycalFTitle')).toHaveValue('草稿中的標題');
  // 房間下拉重新算過：已選的 302 現在要標「已被預約」
  const roomOptionText = await page.locator('#mycalFRoom option[value="302"]').textContent();
  const takenSuffix = await page.evaluate(() => t('mycal.booking.roomTaken'));
  expect(roomOptionText).toContain(takenSuffix);
});

test('詳情彈窗開著、那筆被 DELETE 事件刪掉：詳情關閉並跳 toast', async ({ page, mock }) => {
  mock.seed([
    { id: 42, date: '2026-10-07', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '要被刪的會議', organizer: 'Ray', attendees: null },
  ]);
  await gotoApp(page);
  await setMycalMe(page, 'Ray');
  await openMycalTab(page);
  await mock.realtime.waitUntilReady();

  await page.evaluate(() => mycalOpenDetail(42));
  await expect(page.locator('#mycalDetailModal')).toBeVisible();

  await mock.realtime.sendChange({ type: 'DELETE', old_record: { id: 42 } });

  await expect(page.locator('#mycalDetailModal')).toBeHidden();
  await expect(page.locator('#mycalToast')).toBeVisible();
  const expectedToast = await page.evaluate(() => t('mycal.toast.deletedElsewhere'));
  await expect(page.locator('#mycalToast')).toHaveText(expectedToast);
});
