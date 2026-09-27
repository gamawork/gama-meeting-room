// 驗證「頁面載入之後、還在跑的期間」對 Supabase REST 的呼叫不依賴
// 真實網路——這裡驗的範圍只有 REST，不含 SDK（unpkg）跟假日資料（jsdelivr）。
//
// 原本的測試名稱寫「SDK／假日資料／REST 都不是連外網才成功」，範圍寫大了。離線是在
// gotoApp() 載入完成**之後**才切的（見下面「做法記錄」），SDK 跟假日資料都是在載入過程中
// （離線切換之前）就已經透過 mock 拿到，這條測試切換離線的當下完全不會再去載入它們一次，
// 所以證明不了「SDK／假日資料沒連外網」——那兩者真正的證據在別處：unpkg 的版本字串比對
// （mock-supabase.mjs 的 SUPABASE_JS_PATH_RE 那段）、jsdelivr 的 fixture 回應，加上其他 host
// 一律 abort 的 catch-all 機制（TESTING.md「防線與已知缺口」一節）。這裡老實只驗證 REST。
//
// 做法記錄：一開始想在 gotoApp() 之前就 context.setOffline(true) 再整頁載入，結果
// page.goto('http://localhost:4321/...') 直接 net::ERR_INTERNET_DISCONNECTED——Playwright
// 的離線模擬是整個網路層級關掉，連 loopback／本機 http-server 都會被擋，不是只擋外部網路。
// 這支測試需要的本機頁面本來就得靠本機 http-server 送達，所以改成：先在正常網路狀態下把
// 頁面載入完成，載入完成後才 context.setOffline(true)，接著再手動觸發一次會打 Supabase REST
// 的函式呼叫，確認離線之後這個呼叫還是正常拿得到假回應——如果它其實依賴真實網路，離線後
// 這裡就會直接失敗。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp } from './support/app.mjs';

test('頁面載入完成後才離線，再打一次 Supabase REST 依然正常（只證明 REST 呼叫不依賴真實網路）', async ({ page, context, mock }) => {
  await gotoApp(page); // 此時 supabase-js（unpkg）、假日 JSON（jsdelivr）都已經走 mock 載入完成

  await context.setOffline(true);

  // 離線之後再手動呼叫一次 checkRecurringConflicts()（會對 Supabase REST 發 GET），
  // 確認回應正常、不是丟連線錯誤——證明這個呼叫本來就沒有真的碰外部網路，
  // 只是被 page.route 攔截並本地回應。
  const conflicts = await page.evaluate(
    ({ dates, room, s, e }) => checkRecurringConflicts(dates, room, s, e),
    { dates: ['2026-10-07'], room: '302', s: '10:00', e: '10:30' }
  );
  expect(Array.isArray(conflicts)).toBe(true);

  const conflictGet = mock.requestLog.find(e => e.method === 'GET' && e.search.includes('in.'));
  expect(conflictGet, JSON.stringify(mock.requestLog)).toBeTruthy();

  expect(mock.violations).toEqual([]);
});
