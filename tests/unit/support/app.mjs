// 共用的頁面操作 helper：把重覆的「開頁、等載入完成、切頁籤、選我的名字、開新增彈窗」包起來，
// 讓各 spec 檔案專心寫斷言。所有函式都是直接操作真實 DOM／呼叫 index.html 裡的全域函式，
// 不重新實作任何業務邏輯。

/**
 * 開頁並等待初始的 testConnection()／loadBookings() 真的跑完。
 *
 * 審查 L 級 finding：#loadingOverlay 的 CSS 預設就是 display:none（index.html），單純
 * waitForSelector(hidden) 從一開始就滿足，等於沒等——目前沒出事只是時序巧合。
 *
 * 修正嘗試記錄：一開始改成先等 showLoading(true) 真的把它顯示過一次、再等它變回隱藏，
 * 想確認等到的是「顯示→隱藏」這個真實狀態轉換。實測整套 51/56 測試 timeout 在等
 * state:'visible'（34 次全部直接判定成 hidden，從未觀察到 visible）——假 Supabase 零延遲，
 * loadBookings() 從 showLoading(true) 到 showLoading(false) 中間沒有任何會讓瀏覽器排出一次
 * layout/paint 的機會，這個 CSS 狀態轉換在這個環境下本來就不可觀察，這條路走不通，已改回
 * 只等 hidden，但前面補一個真正可靠、不受這個限制影響的訊號：直接等 loadBookings() 真正
 * 發出的那個 GET（用 order= 參數跟 testConnection()／checkRecurringConflicts() 的 GET
 * 區分，見 data-range.spec.mjs 的同一個辨識方式）確實收到回應。
 */
export async function gotoApp(page) {
  const loadBookingsResponse = page.waitForResponse(res => {
    try {
      const u = new URL(res.url());
      return res.request().method() === 'GET' && u.pathname === '/rest/v1/bookings' && u.searchParams.has('order');
    } catch (e) {
      return false;
    }
  }, { timeout: 15_000 });

  await page.goto('/index.html');
  await loadBookingsResponse;
  await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 15_000 });

  // 守門斷言：確認 supabase-js SDK 真的載入、client 建立成功。如果 unpkg 的假回應
  // 沒接上（例如版本字串跟本機釘住的不一致），supabaseClient 會是 null，checkRecurringConflicts
  // 等函式會直接 return [] 而不丟錯，反例測試會在「SDK 沒載入」的狀態下空轉變綠。這裡先擋下來，
  // 讓問題在 gotoApp 這一步就爆出來，而不是變成後面斷言看不出原因的失敗。
  const hasClient = await page.evaluate(() => typeof supabaseClient !== 'undefined' && supabaseClient !== null);
  if (!hasClient) {
    throw new Error('gotoApp() 判定失敗：supabaseClient 是 null，Supabase SDK 可能沒有從假回應正確載入');
  }
}

/** 直接設定「我是誰」，略過選人彈窗（多數測試不是在測那個彈窗本身）。 */
export async function setMycalMe(page, name) {
  await page.evaluate((n) => {
    mycalState.me = n;
    mycalSaveName(n);
    mycalRenderMeChip();
  }, name);
}

/** 切到「我的行事曆」頁籤。呼叫前請先 setMycalMe，避免自動跳出選人彈窗擋住畫面。 */
export async function openMycalTab(page) {
  await page.click('#mycalTabMycal');
  await page.waitForSelector('#tabMycal:not([hidden])');
}

/** 切回週表頁籤。 */
export async function openTableTab(page) {
  await page.click('#mycalTabTable');
}

/** 把「我的行事曆」尺度切到 day/week/month，並可指定游標日期（'YYYY-MM-DD'）。 */
export async function setMycalScale(page, scale, dateStr) {
  await page.evaluate(({ scale, dateStr }) => mycalSetScale(scale, dateStr), { scale, dateStr });
}

/** 側欄表單：填標題（其餘欄位呼叫端自己用 page.selectOption / evaluate 設）。 */
export async function fillSidebarBasics(page, { title, room, date, startTime, endTime, organizer }) {
  if (title !== undefined) await page.fill('#meetingTitle', title);
  if (room !== undefined) await page.selectOption('#meetingRoom', room);
  if (date !== undefined) {
    await page.fill('#meetingDate', date);
    await page.evaluate(() => document.getElementById('meetingDate').dispatchEvent(new Event('change', { bubbles: true })));
  }
  if (startTime !== undefined) await page.selectOption('#startTime', startTime);
  if (endTime !== undefined) await page.selectOption('#endTime', endTime);
  if (organizer !== undefined) await page.fill('#organizer', organizer);
}

/**
 * 側欄「與會者」欄位是 selectedAttendees（全域陣列）驅動的 hidden input，
 * getAttendeesValue() 送出時會用這個陣列覆寫 #attendees，不能只 fill hidden input。
 */
export async function setSidebarAttendees(page, names) {
  await page.evaluate((names) => {
    selectedAttendees = names.slice();
    syncAttendeesField();
  }, names);
}

/** 側欄勾選週期預約並選頻率／週數。 */
export async function setSidebarRecurring(page, { type, weeks }) {
  await page.check('#recurringBooking');
  await page.waitForSelector('#recurringOptions[style*="display: block"]');
  if (type) {
    await page.selectOption('#recurringType', type);
  }
  if (weeks !== undefined) {
    await page.selectOption('#recurringWeeks', String(weeks));
  }
}

/** 點側欄「送出」按鈕（submitBooking）。 */
export async function submitSidebar(page) {
  await page.click('#submitBtn');
}

/** 開「我的行事曆」新增彈窗：直接呼叫 mycalOpenBooking，等同點一個空檔格。 */
export async function openMycalBookingPopup(page, { date, s, e, room }) {
  await page.evaluate(({ date, s, e, room }) => mycalOpenBooking({ date, s, e, room }), { date, s, e, room });
  await page.waitForSelector('#mycalBookingModal:not([hidden])');
}

/** 我的行事曆新增彈窗：填標題（其餘欄位開彈窗時已經帶入預設值）。 */
export async function fillMycalBookingTitle(page, title) {
  await page.fill('#mycalFTitle', title);
}

export async function setMycalRecurring(page, { type, weeks }) {
  await page.check('#mycalFRecurring');
  if (type) await page.selectOption('#mycalFRecurType', type);
  if (weeks !== undefined) await page.selectOption('#mycalFRecurWeeks', String(weeks));
}

export async function submitMycalBooking(page) {
  await page.click('#mycalConfirmBtn');
}
