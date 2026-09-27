// loadBookings() 查詢上下界在台北時間下不能少一天。
// 時鐘固定在 2026-09-27（台北時間）時：
//   今天所在週一 = 2026-09-21 → 前 30 天 = 2026-08-22、後 150 天 = 2027-02-18
//   MYCAL_RANGE_START = 2026-08-24 → 該月月初 = 2026-08-01（比 2026-08-22 早，取這個）
//   MYCAL_RANGE_END   = 2027-02-14 → 該月月底 = 2027-02-28（比 2027-02-18 晚，取這個）
// 所以送出的 GET 應該是 date=gte.2026-08-01&date=lte.2027-02-28。
// formatDateForDB() 用 Date.prototype.toISOString()（UTC），如果查詢範圍的 Date 物件是用
// new Date(y,m,d) 建構（本地時間午夜），在 Asia/Taipei（UTC+8）toISOString() 會把日期往前推一天
// ——這裡直接斷言攔到的 GET 的實際 query string，不是斷言 console.log 除錯訊息裡的 formatDate()
// （那個用的是本地 getFullYear/getMonth/getDate，永遠不會有時區問題，看不出這個 bug）。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp } from './support/app.mjs';

test('loadBookings() 的 GET date 篩選上下界含邊界月份整月，不因時區少一天', async ({ page, mock }) => {
  await gotoApp(page);

  // 只有 loadBookings() 的 GET 帶 order 參數（testConnection 是 select=id&limit=1，
  // checkRecurringConflicts 用 in.(...) 不用 order），用這個特徵找出它。
  const loadCall = mock.requestLog.find(e => e.method === 'GET' && e.search.includes('order='));
  expect(loadCall, JSON.stringify(mock.requestLog)).toBeTruthy();

  const params = new URLSearchParams(loadCall.search);
  const dateFilters = params.getAll('date');
  expect(dateFilters).toContain('gte.2026-08-01');
  expect(dateFilters).toContain('lte.2027-02-28');
});
