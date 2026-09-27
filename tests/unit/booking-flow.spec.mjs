// F9：共用送出路徑接線測試。日曆彈窗（mycalSubmitBooking）與側欄（submitBooking）
// 都走 checkAndSaveBookings() → saveBooking()，時段防撞三層全在，這裡驗證接線本身是對的：
// 送出的內容正確、衝突檢查真的有先跑、409/23P01 會被接住、雙擊只送一次。
import { test, expect, SLOT_CONFLICT_CODES } from './support/mock-supabase.mjs';
import {
  gotoApp, setMycalMe, openMycalTab, openMycalBookingPopup, fillMycalBookingTitle,
  setMycalRecurring, submitMycalBooking, fillSidebarBasics, setSidebarRecurring, submitSidebar,
} from './support/app.mjs';

test.describe('(a) 日曆彈窗：空檔點開 → 填主題 → 送出', () => {
  test('POST body 正確，且送出前有先發衝突檢查的 GET', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, 'Design Review');
    mock.allowInserts();

    const before = mock.requestLog.length;
    await submitMycalBooking(page);
    await expect(page.locator('#mycalBookingModal')).toBeHidden();

    const newEntries = mock.requestLog.slice(before);
    const postIdx = newEntries.findIndex(e => e.method === 'POST');
    const conflictGetIdx = newEntries.findIndex(e => e.method === 'GET' && e.search.includes('in.'));
    expect(postIdx, JSON.stringify(newEntries)).toBeGreaterThan(-1);
    expect(conflictGetIdx, JSON.stringify(newEntries)).toBeGreaterThan(-1);
    expect(conflictGetIdx).toBeLessThan(postIdx);

    expect(mock.insertCalls).toHaveLength(1);
    const body = mock.insertCalls[0][0];
    expect(body).toMatchObject({
      date: '2026-10-07', room: '302', start_time: '10:00', end_time: '10:30',
      title: 'Design Review', organizer: 'Ray', attendees: null,
    });
  });
});

test.describe('(b) 日曆彈窗：週期預約', () => {
  test('送出筆數與日期等於 generateRecurringDates() 的結果', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, '週會');
    await setMycalRecurring(page, { type: 'weekly', weeks: 3 });
    mock.allowInserts();

    const expectedDates = await page.evaluate(() => generateRecurringDates('2026-10-07', 'weekly', 3));
    expect(expectedDates).toEqual(['2026-10-07', '2026-10-14', '2026-10-21']);

    await submitMycalBooking(page);
    await expect(page.locator('#mycalBookingModal')).toBeHidden();

    expect(mock.insertCalls).toHaveLength(3);
    expect(mock.insertCalls.map(c => c[0].date)).toEqual(expectedDates);
    for (const call of mock.insertCalls) {
      expect(call[0]).toMatchObject({ room: '302', start_time: '10:00', end_time: '10:30', title: '週會', organizer: 'Ray' });
    }
  });
});

test.describe('(c) 日曆彈窗：假回應 409/23P01', () => {
  test('錯誤訊息出現在日曆彈窗內，彈窗不關', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, 'Design Review');
    mock.allowInserts(() => ({ conflict: SLOT_CONFLICT_CODES[0] }));

    await submitMycalBooking(page);

    // 彈窗維持開啟、輸入保留
    await expect(page.locator('#mycalBookingModal')).toBeVisible();
    await expect(page.locator('#mycalFTitle')).toHaveValue('Design Review');
    // 錯誤顯示在彈窗自己的提示行，不是被彈窗蓋住看不到的 #bookingModal
    await expect(page.locator('#mycalFreeHint')).toHaveClass(/mycal-bad/);
    // t('error.slotTaken') 內含 <br><br>，textContent 不會保留標籤，比對前先剝掉
    const expectedMsg = await page.evaluate(() => t('error.slotTaken').replace(/<[^>]+>/g, ''));
    await expect(page.locator('#mycalFreeHint')).toContainText(expectedMsg);
    const topModalDisplay = await page.locator('#bookingModal').evaluate(el => getComputedStyle(el).display);
    expect(topModalDisplay).toBe('none');
  });
});

test.describe('(d) 側欄：送出同樣走到同一支 POST', () => {
  test('POST body 正確', async ({ page, mock }) => {
    await gotoApp(page);
    await fillSidebarBasics(page, {
      title: '側欄會議', room: '302', date: '2026-10-08', startTime: '14:00', endTime: '14:30', organizer: 'Ray',
    });
    mock.allowInserts();
    await submitSidebar(page);
    await expect(page.locator('#bookingModal')).toBeVisible();

    expect(mock.insertCalls).toHaveLength(1);
    expect(mock.insertCalls[0][0]).toMatchObject({
      date: '2026-10-08', room: '302', start_time: '14:00', end_time: '14:30',
      title: '側欄會議', organizer: 'Ray',
    });
  });
});

test.describe('(e) 雙擊送出只發出一次 POST（重入鎖 isSubmitting）', () => {
  // 用真的滑鼠連點兩下測不出這顆鎖：submitBooking()/mycalSubmitBooking() 一開頭就同步
  // isSubmitting=true 並 showLoading(true) 把送出鈕 disabled，兩者幾乎同時生效，Playwright
  // 帶 actionability 檢查的 page.click() 對 disabled 按鈕連點兩次，第二次只會等按鈕重新啟用
  // （已經送出完成之後）才真的點下去，測不到「衝突檢查到寫入之間的空窗」這個重入鎖真正要擋的情境。
  // 直接呼叫兩次全域函式，繞過 DOM disabled 檢查，才是在測 isSubmitting 這顆鎖本身。
  test('側欄：submitBooking() 疊呼叫兩次', async ({ page, mock }) => {
    mock.setLatency(250); // 撐開衝突檢查到寫入之間的空窗
    await gotoApp(page);
    await fillSidebarBasics(page, {
      title: '雙擊測試', room: '302', date: '2026-10-09', startTime: '09:00', endTime: '09:30', organizer: 'Ray',
    });
    mock.allowInserts();

    await page.evaluate(() => { submitBooking(); submitBooking(); });
    await expect(page.locator('#bookingModal')).toBeVisible({ timeout: 10_000 });
    expect(mock.insertCalls).toHaveLength(1);
  });

  test('日曆彈窗：mycalSubmitBooking() 疊呼叫兩次', async ({ page, mock }) => {
    mock.setLatency(250);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await openMycalBookingPopup(page, { date: '2026-10-10', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, '雙擊測試');
    mock.allowInserts();

    await page.evaluate(() => {
      const fakeEvent = { preventDefault() {} };
      mycalSubmitBooking(fakeEvent);
      mycalSubmitBooking(fakeEvent);
    });
    await expect(page.locator('#mycalBookingModal')).toBeHidden({ timeout: 10_000 });
    expect(mock.insertCalls).toHaveLength(1);
  });
});

test.describe('日曆彈窗週期預約部分失敗（第 2 筆假回 23P01）', () => {
  test('彈窗關閉、最上層改用列出失敗日期的 modal（跟側欄部分失敗同一種呈現），不出現「已新增 N 筆」的 toast', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, '週會-部分失敗');
    await setMycalRecurring(page, { type: 'weekly', weeks: 2 });

    let callCount = 0;
    mock.allowInserts(() => {
      callCount++;
      if (callCount === 2) return { conflict: SLOT_CONFLICT_CODES[0] };
      return undefined;
    });

    await submitMycalBooking(page);
    await expect(page.locator('#mycalBookingModal')).toBeHidden();

    expect(mock.insertCalls).toHaveLength(2);
    // 第一筆成功、確實寫進資料庫
    expect(mock.table.rows.some(r => r.date === '2026-10-07')).toBe(true);
    expect(mock.table.rows.some(r => r.date === '2026-10-14')).toBe(false);

    // 最上層是列出失敗日期的 modal，不是「已新增 N 筆」的 toast
    await expect(page.locator('#bookingModal')).toBeVisible();
    const modalMessage = await page.locator('#modalMessage').innerHTML();
    expect(modalMessage).toContain('2026-10-14');

    const toastHidden = await page.locator('#mycalToast').isHidden();
    expect(toastHidden).toBe(true);
  });

  test('第一次就失敗、成功的在下個月：畫面跟著第一筆成功的紀錄走，黃色落格看得到', async ({ page, mock }) => {
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await page.evaluate(() => mycalSetScale('month', '2026-10-28'));
    await openMycalBookingPopup(page, { date: '2026-10-28', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, '週會-首次失敗');
    await setMycalRecurring(page, { type: 'weekly', weeks: 2 });

    let callCount = 0;
    mock.allowInserts(() => {
      callCount++;
      if (callCount === 1) return { conflict: SLOT_CONFLICT_CODES[0] };
      return undefined;
    });

    await submitMycalBooking(page);
    await expect(page.locator('#mycalBookingModal')).toBeHidden();
    expect(mock.table.rows.some(r => r.date === '2026-11-04')).toBe(true);

    // 月檢視要翻到 11 月，11/4 那筆以黃色落格出現
    const cursor = await page.evaluate(() => mycalState.cursor.getMonth() + 1);
    expect(cursor).toBe(11);
    // 限定在 11/4 那一格斷言，不要對整頁 .mycal-new 計數（審查 L 級 finding：原本沒限定
    // 格子，月檢視如果別的格子也意外套上 mycal-new，這條測試看不出來）。
    await expect(page.locator('.mycal-day-cell[data-date="2026-11-04"] .mycal-new')).toHaveCount(1);
  });
});

test.describe('第 1 層防撞：假表裡先放一筆衝突的預約，POST 不該發生', () => {
  // 原本共用送出路徑的第 1 層防撞閘門（checkAndSaveBookings 裡呼叫
  // checkRecurringConflicts 的那段）完全沒被測到——拔掉判斷（M11）或只檢查第一個日期（M12），
  // 49 條既有測試照樣全綠。這裡補三條，各自對應日曆彈窗單次、日曆彈窗週期（撞在非第一次）、
  // 側欄單次三種路徑。

  test('(a) 日曆彈窗單次預約撞到既有會議：送出鈕被本地即時檢查擋下（disabled），insertCalls 為 0', async ({ page, mock }) => {
    mock.seed([
      { id: 100, date: '2026-10-07', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '既有會議', organizer: 'Someone', attendees: null },
    ]);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    // 跟既有會議完全相同的時段／房間；mycalOpenBooking() 開窗時的 mycalValidate() 就會用本地
    // 已載入的 bookings 擋下（mycalIsFree），把送出鈕直接 disable——連點都點不下去。
    // 這條測的是「本地即時檢查」這一層本身（CLAUDE.md 定義的時段防撞第 1 層是
    // checkRecurringConflicts，不是這裡；伺服器端那道檢查由 (b)(c) 負責，見下方註解與
    // review-unit-tests-r2.md R2-5：這裡不點送出、insertCalls 為 0 是同義反覆，不代表任何一層
    // 伺服器端檢查失效都會被這條抓到）。
    await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, '撞期會議');
    // 不呼叫 mock.allowInserts()：這條本來就不該有任何 POST，任何一筆 POST 都直接變成
    // violation，由 page fixture 的 teardown 判定失敗（R2-2）。

    // 不呼叫 submitMycalBooking()：送出鈕就是被本地即時檢查 disable，click() 只會一路等到
    // timeout（實測過），這裡直接斷言按鈕狀態跟提示文字才是這一層真正要驗的行為。
    await expect(page.locator('#mycalConfirmBtn')).toBeDisabled();
    await expect(page.locator('#mycalBookingModal')).toBeVisible();
    await expect(page.locator('#mycalFreeHint')).toHaveClass(/mycal-bad/);
    const expectedHint = await page.evaluate(() => t('mycal.booking.hintTaken', { room: tRoom('302') }));
    await expect(page.locator('#mycalFreeHint')).toHaveText(expectedHint);
    expect(mock.insertCalls).toHaveLength(0);
  });

  test('(b) 日曆彈窗週期預約：只有第 2 次撞到既有會議，整批不該有任何 POST（抓 M12：只檢查第一個日期）', async ({ page, mock }) => {
    // 衝突刻意放在第 2 次（10/14），第 1 次（10/07）本地沒有衝突，所以 mycalValidate() 會放行、
    // 真的送到 mycalSubmitBooking → checkAndSaveBookings → checkRecurringConflicts(['2026-10-07','2026-10-14'],...)。
    // M12（只拿 datesToBook.slice(0,1) 做檢查）會漏掉 10/14 這筆，讓兩次都寫進去。
    mock.seed([
      { id: 101, date: '2026-10-14', room: '302', start_time: '10:00:00', end_time: '10:30:00', title: '既有會議', organizer: 'Someone', attendees: null },
    ]);
    await gotoApp(page);
    await setMycalMe(page, 'Ray');
    await openMycalTab(page);
    await openMycalBookingPopup(page, { date: '2026-10-07', s: 600, e: 630, room: '302' });
    await fillMycalBookingTitle(page, '週期撞期');
    await setMycalRecurring(page, { type: 'weekly', weeks: 2 });
    // R2-2：不呼叫 mock.allowInserts()。這條期望「完全沒有 POST」，任何一筆 POST 都會因為
    // insertHandler 是 null 而被 mock 直接記成 violation 並 abort，由 page fixture 的
    // teardown 判定失敗——不必再靠讀取 insertCalls 的時機來判斷有沒有寫入。

    await submitMycalBooking(page);

    // R2-2（原本的踩坑）：先前在這裡用「等 UI 訊號 settle 再讀 insertCalls」，但 #bookingModal
    // 可見／#mycalFreeHint 變 mycal-bad 這兩個訊號在「衝突提示剛顯示」的當下就已經成立，
    // 不代表 checkAndSaveBookings() 的整個 for 迴圈（含所有 POST）都跑完了——對抗式再審用
    // mock.setLatency(1500) 撐開送出流程後，M15（拿掉 index.html 的 conflict return null，
    // 也就是「顯示衝突訊息但照樣寫入」）在這個寫法下會全綠（假陰性）。
    // 真正代表流程結束的訊號是 isSubmitting 變回 false（submitBooking()/mycalSubmitBooking()
    // 用同一顆全域重入鎖，finally 區塊才會把它設回 false），等到這裡才讀取／斷言後續狀態，
    // 不管零延遲還是加了延遲都一樣可靠。
    await page.waitForFunction(() => isSubmitting === false);

    await expect(page.locator('#mycalBookingModal')).toBeVisible();
    await expect(page.locator('#mycalFreeHint')).toHaveClass(/mycal-bad/);
    await expect(page.locator('#mycalFreeHint')).toContainText('2026-10-14');
    expect(mock.insertCalls).toHaveLength(0);
  });

  test('(c) 側欄送出撞到既有會議：不該有任何 POST（側欄沒有本地即時檢查，直接驗證 checkAndSaveBookings 本身）', async ({ page, mock }) => {
    // 側欄的 validateBookingForm() 只檢查必填欄位，沒有 mycalValidate() 那種本地 mycalIsFree
    // 預檢，所以這條會真的走到 checkAndSaveBookings → checkRecurringConflicts 的伺服器端檢查，
    // 直接驗證 M11（忽略衝突結果照樣寫入）、M15（顯示衝突訊息但照樣寫入）會不會讓這裡變紅。
    mock.seed([
      { id: 102, date: '2026-10-11', room: '302', start_time: '14:00:00', end_time: '14:30:00', title: '既有會議', organizer: 'Someone', attendees: null },
    ]);
    await gotoApp(page);
    await fillSidebarBasics(page, {
      title: '側欄撞期', room: '302', date: '2026-10-11', startTime: '14:00', endTime: '14:30', organizer: 'Ray',
    });
    // R2-2：同 (b)，不呼叫 mock.allowInserts()，任何 POST 都直接是 violation。
    await submitSidebar(page);

    // 同 (b)：等 isSubmitting 變回 false，代表 checkAndSaveBookings() 整段（含所有可能的
    // POST）真的跑完了，不是只等某個 UI 訊號提前出現。
    await page.waitForFunction(() => isSubmitting === false);

    await expect(page.locator('#bookingModal')).toBeVisible();
    const modalMessage = await page.locator('#modalMessage').innerHTML();
    expect(modalMessage).toContain('2026-10-11');
    expect(mock.insertCalls).toHaveLength(0);
  });
});
