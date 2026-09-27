// F9：「我的行事曆」桌面通知（README 第 17 條）。
// mycalBuildNotification() 是純函式（不碰 DOM、不讀 mycalState），表格測試直接呼叫它本體；
// 接線測試另外驗證 Realtime 事件真的會叫出（假的）window.Notification、tag 去重、
// 本機剛新增的 id 不通知自己、以及提醒計時器。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp, setMycalMe, openMycalTab } from './support/app.mjs';

function booking(overrides) {
  return { id: 1, date: '2026-10-05', room: '302', startTime: '10:00', endTime: '11:00', title: 'T', organizer: '', attendees: '', ...overrides };
}

test.describe('mycalBuildNotification（純函式，表格測試）', () => {
  const cases = [
    {
      name: '新增有我',
      kind: 'insert', before: null, after: booking({ organizer: 'Angus', attendees: 'Ray' }), me: 'Ray',
      expectNull: false,
    },
    {
      name: '新增沒我',
      kind: 'insert', before: null, after: booking({ organizer: 'Angus', attendees: 'Casey' }), me: 'Ray',
      expectNull: true,
    },
    {
      name: '改時間（startTime 不同，其餘不變）',
      kind: 'update',
      before: booking({ organizer: 'Ray', startTime: '10:00', endTime: '11:00' }),
      after: booking({ organizer: 'Ray', startTime: '10:30', endTime: '11:30' }),
      me: 'Ray',
      expectNull: false,
    },
    {
      name: '改日期',
      kind: 'update',
      before: booking({ organizer: 'Ray', date: '2026-10-05' }),
      after: booking({ organizer: 'Ray', date: '2026-10-06' }),
      me: 'Ray',
      expectNull: false,
    },
    {
      name: '改會議室',
      kind: 'update',
      before: booking({ organizer: 'Ray', room: '302' }),
      after: booking({ organizer: 'Ray', room: '301' }),
      me: 'Ray',
      expectNull: false,
    },
    {
      name: '只改主題（不通知）',
      kind: 'update',
      before: booking({ organizer: 'Ray', title: '舊標題' }),
      after: booking({ organizer: 'Ray', title: '新標題' }),
      me: 'Ray',
      expectNull: true,
    },
    {
      name: '我被移出與會者',
      kind: 'update',
      before: booking({ organizer: 'Angus', attendees: 'Ray, Casey' }),
      after: booking({ organizer: 'Angus', attendees: 'Casey' }),
      me: 'Ray',
      expectNull: false,
    },
    {
      name: '刪除有我',
      kind: 'delete', before: booking({ organizer: 'Ray' }), after: null, me: 'Ray',
      expectNull: false,
    },
    {
      name: '刪除沒我',
      kind: 'delete', before: booking({ organizer: 'Angus', attendees: 'Casey' }), after: null, me: 'Ray',
      expectNull: true,
    },
    {
      name: '提醒（我的會議）',
      kind: 'remind', before: null, after: booking({ organizer: 'Ray' }), me: 'Ray',
      expectNull: false,
    },
  ];

  for (const c of cases) {
    test(c.name, async ({ page, mock }) => {
      await gotoApp(page);
      const result = await page.evaluate(
        ({ kind, before, after, me }) => mycalBuildNotification(kind, before, after, me),
        { kind: c.kind, before: c.before, after: c.after, me: c.me }
      );
      if (c.expectNull) {
        expect(result).toBeNull();
      } else {
        expect(result).not.toBeNull();
        expect(typeof result.title).toBe('string');
        expect(result.title.length).toBeGreaterThan(0);
        expect(typeof result.body).toBe('string');
        expect(result.body.length).toBeGreaterThan(0);
        expect(typeof result.tag).toBe('string');
        expect(result.tag.length).toBeGreaterThan(0);
      }
    });
  }

  test('沒選名字時一律 null（每種 kind 都試）', async ({ page, mock }) => {
    await gotoApp(page);
    const kinds = [
      { kind: 'insert', before: null, after: booking({ organizer: 'Ray' }) },
      { kind: 'update', before: booking({ organizer: 'Ray' }), after: booking({ organizer: 'Ray', room: '301' }) },
      { kind: 'delete', before: booking({ organizer: 'Ray' }), after: null },
      { kind: 'remind', before: null, after: booking({ organizer: 'Ray' }) },
    ];
    for (const c of kinds) {
      const result = await page.evaluate(
        ({ kind, before, after }) => mycalBuildNotification(kind, before, after, null),
        c
      );
      expect(result, `kind=${c.kind}`).toBeNull();
    }
  });
});

/**
 * 把 window.Notification 換成假的：記錄呼叫、permission 固定 granted，並存最後一個實例到
 * window.__lastNotification，讓測試可以直接呼叫它的 onclick 模擬「使用者點了這則通知」。
 * 同時覆寫 window.focus，讓「點通知會 focus 分頁」這件事也驗證得到。要在 gotoApp() 之前呼叫。
 */
async function installFakeNotification(page) {
  await page.addInitScript(() => {
    window.__notifyCalls = [];
    window.__lastNotification = null;
    window.__focusCalled = false;
    window.focus = () => { window.__focusCalled = true; };
    class FakeNotification {
      constructor(title, options) {
        this.title = title;
        this.body = options && options.body;
        this.tag = options && options.tag;
        this.onclick = null;
        this.closed = false;
        window.__notifyCalls.push({ title, body: this.body, tag: this.tag });
        window.__lastNotification = this;
      }
      close() { this.closed = true; }
      static requestPermission() { return Promise.resolve('granted'); }
    }
    FakeNotification.permission = 'granted';
    window.Notification = FakeNotification;
  });
}

/** 走真正的按鈕點擊流程開啟通知（不是直接戳 localStorage），確認接線本身是對的。 */
async function enableNotifyViaButton(page) {
  await page.click('#mycalNotifyBtn');
  await expect.poll(() => page.evaluate(() => mycalLoadNotifyPref())).toBe('on');
  // 開啟當下會先跳一則「通知已開啟」確認；驗到它之後清掉，後面的斷言只算事件本身的通知
  await expect.poll(() => page.evaluate(() => window.__notifyCalls.map(c => c.tag))).toEqual(['mycal-notify-test']);
  await page.evaluate(() => { window.__notifyCalls = []; window.__lastNotification = null; });
}

test.describe('接線：Realtime 事件 → 桌面通知', () => {
  test('別人新增有我的會議：通知建立一次；同一筆再送一次不重複；本機剛新增的 id 不通知自己', async ({ page, mock }) => {
    await installFakeNotification(page);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await mock.realtime.waitUntilReady();
    await enableNotifyViaButton(page);

    const record = { id: 501, date: '2026-10-07', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '別人新增的會議', organizer: 'Angus', attendees: 'Ray' };

    // 第一次：應該通知一次
    await mock.realtime.sendChange({ type: 'INSERT', record });
    await expect.poll(() => page.evaluate(() => window.__notifyCalls.length)).toBe(1);
    const first = await page.evaluate(() => window.__notifyCalls[0]);
    expect(first.tag).toContain('501');

    // 同一筆再送一次（模擬多分頁／重新整理時的重複廣播）：不該重複通知
    // （既有的 INSERT 去重邏輯：bookings.some(b => b.id === newBooking.id) 會直接 return，
    // 通知呼叫點在去重之後，兩者是同一條防線）。WebSocket 訊息依序處理，不用猜時間：
    // 緊接著送一筆「本機剛新增」的事件，等它的效果（bookings 出現那筆）出現時，
    // 前面的重複廣播必定已經處理完畢，最後一次斷言 notifyCalls 長度就能同時驗兩件事。
    await mock.realtime.sendChange({ type: 'INSERT', record });

    // 本機剛新增的 id（尚未存在於 bookings，跟上面的去重是不同機制）：標記後同一 id 的 Realtime
    // 回音進來，資料仍要更新畫面，但不能跳通知提醒自己
    await page.evaluate(() => mycalMarkLocalEdit(9001));
    await mock.realtime.sendChange({
      type: 'INSERT',
      record: { id: 9001, date: '2026-10-08', room: '302', start_time: '09:00:00', end_time: '09:30:00', title: '我自己剛新增的', organizer: 'Ray', attendees: null },
    });
    await expect.poll(() => page.evaluate(() => bookings.some(b => b.id === 9001))).toBe(true);
    // 到這裡重複廣播、本機自己新增的事件都已經處理完，通知次數仍應維持第一次那一次
    expect(await page.evaluate(() => window.__notifyCalls.length)).toBe(1);
  });

  test('點通知：focus、切到我的行事曆、開啟詳情，並關閉通知', async ({ page, mock }) => {
    mock.seed([
      { id: 42, date: '2026-10-07', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '要看詳情的會議', organizer: 'Angus', attendees: 'Ray' },
    ]);
    await installFakeNotification(page);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await mock.realtime.waitUntilReady();
    await enableNotifyViaButton(page);
    await page.click('#mycalTabTable'); // 先切回週表，才驗證得出「點通知會切回我的行事曆」

    await mock.realtime.sendChange({
      type: 'UPDATE',
      record: { id: 42, date: '2026-10-07', room: '301', start_time: '10:00:00', end_time: '10:30:00', title: '要看詳情的會議', organizer: 'Angus', attendees: 'Ray' },
      old_record: { id: 42 }, // 真實 UPDATE payload 一定帶 old_record（至少有 id），少了它 supabase-js 不會觸發這則事件
    });
    await expect.poll(() => page.evaluate(() => window.__notifyCalls.length)).toBe(1);

    await page.evaluate(() => window.__lastNotification.onclick());

    await expect(page.locator('#tabMycal')).not.toBeHidden();
    await expect(page.locator('#mycalDetailModal')).toBeVisible();
    const openId = await page.evaluate(() => mycalDetailOpenId);
    expect(String(openId)).toBe('42');
    await expect(page.evaluate(() => window.__focusCalled)).resolves.toBe(true);
    await expect(page.evaluate(() => window.__lastNotification.closed)).resolves.toBe(true);
  });

  test('點通知（已被刪除的那筆）：只切頁籤，不開詳情', async ({ page, mock }) => {
    mock.seed([
      { id: 43, date: '2026-10-07', room: '302', start_time: '11:00:00', end_time: '11:30:00', title: '會被刪掉的會議', organizer: 'Ray', attendees: null },
    ]);
    await installFakeNotification(page);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await mock.realtime.waitUntilReady();
    await enableNotifyViaButton(page);
    await page.click('#mycalTabTable');

    await mock.realtime.sendChange({ type: 'DELETE', old_record: { id: 43 } });
    await expect.poll(() => page.evaluate(() => window.__notifyCalls.length)).toBe(1);

    await page.evaluate(() => window.__lastNotification.onclick());

    await expect(page.locator('#tabMycal')).not.toBeHidden();
    await expect(page.locator('#mycalDetailModal')).toBeHidden();
  });
});

test.describe('接線：提醒（開始前 10 分鐘內）', () => {
  test('快轉到會議前 10 分鐘內跳一次；再快轉 30 秒不重複', async ({ page, mock }) => {
    mock.seed([
      { id: 7, date: '2026-09-27', room: '302', start_time: '10:05:00', end_time: '10:35:00', title: '快開始的會議', organizer: 'Ray', attendees: null },
    ]);
    await installFakeNotification(page);
    await gotoApp(page); // 固定時鐘：2026-09-27 10:00 Asia/Taipei（見 mock-supabase.mjs FIXED_NOW_UTC）
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await mock.realtime.waitUntilReady();
    await enableNotifyViaButton(page);

    // 固定時鐘是台北 10:00（見 FIXED_NOW_UTC），會議 10:05 開始，距開始 5 分鐘，落在 (0,10 分鐘] 窗口內
    await page.evaluate(() => mycalCheckReminders());
    await expect.poll(() => page.evaluate(() => window.__notifyCalls.length)).toBe(1);
    const call = await page.evaluate(() => window.__notifyCalls[0]);
    expect(call.tag).toContain('7');

    // 再快轉 30 秒（10:00:30），同一場會議還沒開始、還在窗口內：已提醒過，不該重複跳
    await page.clock.setFixedTime(new Date('2026-09-27T02:00:30.000Z'));
    await page.evaluate(() => mycalCheckReminders());
    expect(await page.evaluate(() => window.__notifyCalls.length)).toBe(1);
  });

  test('距開始超過 10 分鐘不提醒；已開始（負值）也不提醒', async ({ page, mock }) => {
    mock.seed([
      { id: 8, date: '2026-09-27', room: '302', start_time: '10:20:00', end_time: '10:50:00', title: '還早的會議', organizer: 'Ray', attendees: null },
      { id: 9, date: '2026-09-27', room: '302', start_time: '09:00:00', end_time: '09:30:00', title: '已經開始的會議', organizer: 'Ray', attendees: null },
    ]);
    await installFakeNotification(page);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await mock.realtime.waitUntilReady();
    await enableNotifyViaButton(page);

    await page.evaluate(() => mycalCheckReminders());
    await expect(page.evaluate(() => window.__notifyCalls.length)).resolves.toBe(0);
  });
});
