# 測試指南 — Playwright i18n 雙語模式

> 本檔原本只有下面這份會寫入正式 Supabase 的 i18n 測試。「我的行事曆」加入後第一輪審查發現
> 完全沒有測試守住新接線（F9），這裡另外補了 `tests/unit/`，見文末「單元測試（tests/unit/）」。

## 一次安裝

```bash
npm install
npx playwright install chromium
```

## 跑測試

```bash
# headless（預設）
npm test

# 看畫面
npm run test:headed

# UI mode（互動式）
npm run test:ui

# 單獨跑某一個測試
npx playwright test -g "預設英文"
```

Playwright 會自動：
1. 啟動 `http-server` 在 `http://localhost:4321`
2. 跑 chromium browser
3. 失敗時保留 trace / screenshot / video（在 `test-results/`）
4. 產生 HTML 報告（`playwright-report/`）

## 資料庫安全（重要）

所有寫入 DB 的測試遵守以下協議：

| 標記 | 值 | 用途 |
|---|---|---|
| `organizer` | `__playwright_test__` | Layer 2 清理依據 |
| `title` 前綴 | `__pwtest__` | Layer 3 清理依據 |
| INSERT 回應 id | 即時記錄到 set | Layer 1 精準清理 |

### 三層清理機制

```
測試結束 (afterEach)
  ├─ Layer 1：依 createdIds 精準刪除（recorder 抓到的 id）
  ├─ Layer 2：依 organizer = __playwright_test__ sweep
  └─ Layer 3：依 title LIKE __pwtest__% sweep

整個 spec 跑完 (afterAll)
  └─ 再 sweep 一次（Layer 2 + 3）

整個 spec 跑前 (beforeAll)
  └─ 先 sweep 一次（清掉上次 crash 殘留的）
```

### 手動清理（保險用）

如果 Playwright crash、CI 中斷、或就是不放心，跑：

```bash
npm run test:cleanup
```

腳本會：
1. 列出所有符合測試標記的殘留 record
2. 確認後刪除（依 organizer + title 前綴雙條件）

### 萬一連手動清理也失敗

直接在 Supabase Console 跑 SQL：

```sql
-- 預覽
select id, date, room, start_time, end_time, title, organizer
from public.bookings
where organizer = '__playwright_test__'
   or title like '__pwtest__%';

-- 刪除（確認預覽結果後執行）
delete from public.bookings
where organizer = '__playwright_test__'
   or title like '__pwtest__%';
```

## 測試案例清單（12 項）

| # | 名稱 | 寫入 DB？ |
|---|---|:---:|
| 1 | 預設英文，切換中文後 localStorage 保留 | ❌ |
| 2 | 表單 label / placeholder 翻譯 | ❌ |
| 3 | 會議室下拉 301/302 + 其他 | ❌ |
| 4 | 日期格式分流 (Tue, May 12, 2026 / 2026年5月12日) | ❌ |
| 5 | 表格星期欄縮寫 | ❌ |
| 6 | 空白日 row 提示 | ❌ |
| 7 | 必填驗證錯誤 modal | ❌ |
| 8 | **端到端成功預約** | ✅ |
| 9 | 與會者 / 登記者名單原文保留 | ❌ |
| 10 | Back to This Week min-width 132px | ❌ |
| 11 | 行事曆下拉翻譯 | ❌ |
| 12 | 操作按鈕 aria-label | ❌ |

只有測試 8 會寫入 DB，其他都是讀取或 UI 互動。

## 設定

`playwright.config.js`：
- `workers: 1` + `fullyParallel: false`：寫入測試序列跑，避免清理時序混亂
- `retries: 0`：失敗不重試，避免重複寫入
- baseURL `http://localhost:4321`

## 測試失敗排查

1. **`pickSafeFutureDate` throw 找不到無衝突日期**
   - 表示未來 90-180 天全滿，極不可能但可放寬範圍或換 room

2. **`expect(createdIds.size).toBeGreaterThan(0)` 失敗**
   - INSERT 攔截 recorder 沒抓到，可能 Supabase 回應 schema 變了，去看 `attachInsertRecorder` parse 邏輯

3. **`afterEach` cleanup 拋錯**
   - 看 console，`[CLEANUP layer1 fail by id]` 或 `[CLEANUP layer2/3 errors]` 會印出細節
   - 跑 `npm run test:cleanup` 手動補刀

4. **Loading overlay 永遠卡住**
   - Supabase 連不上（網路 / RLS / token 過期）
   - 先用瀏覽器手動開 `http://localhost:4321/index.html` 確認頁面正常

## 單元測試（`tests/unit/`）

跟上面整份 i18n 測試完全分開、不共用任何 helper：

```bash
npm run test:unit
```

### 防線與已知缺口（不會碰正式資料庫、不連真實網路、任何時區任何機器結果都一樣）

上面的 i18n 測試會對正式 Supabase 寫入真實預約（見「資料庫安全」一節），所以一直沒有可以在
commit 前隨手跑的測試。`tests/unit/` 改用 `tests/unit/support/mock-supabase.mjs` 提供的假
Supabase，`page.goto` 之前就把路由攔好。2026-09-27 對抗式審查（`review-unit-tests.md`）後
做了一輪修正，同一天又有第二輪再審（`review-unit-tests-r2.md`，對第一輪的修正結果挑錯）。
下面照實列出現在有哪幾道防線、各自防什麼、還留了哪些缺口——**不是「繞不過去」**，第二輪
審查就是專門在挑第一輪自稱「繞不過去」的地方，並且真的找到了四種繞法（見下方「防線 1」），
所以這裡改成誠實描述範圍，不誇大。

- **設定跟 i18n 完全分開**：`npm run test:unit` 走 `playwright.unit.config.js`（`testDir:
  './tests/unit'`），不是主要的 `playwright.config.js`（那份給 `tests/i18n.spec.mjs` 用，
  會寫入正式 Supabase）。`playwright.config.js` 另外加了 `testIgnore: '**/unit/**'`
  （R2-4），確保 `npm test`（不帶參數）只跑 i18n，不會把 `tests/unit` 一起跑進去——這點很
  重要：主設定沒有 `globalSetup`、也沒有 `use.timezoneId`，如果 `tests/unit` 混進主設定跑，
  下面幾道防線裡跟「設定層級」有關的那幾條完全不生效。

#### 防線 1：靜態掃描 import 來源（`global-setup.mjs`），防「新 spec 忘記接線」

`playwright.unit.config.js` 的 `globalSetup`（`tests/unit/support/global-setup.mjs`）在整個
測試流程開跑前，遞迴掃描 `tests/unit` 底下所有看起來像測試檔的檔案（`.spec.`／`.test.` 開頭、
常見 JS/TS 副檔名結尾，跟 `support/` 目錄本身排除在外），去掉註解後比對：
- 禁止任何一種 `import ... from '@playwright/test'`（named／default／namespace 都算）。
- 要求要有 `import { test... } from '<相對路徑>/support/mock-supabase.mjs'`（依巢狀深度算
  相對路徑）。
不符合就整批測試直接失敗、印出違規檔名。

**這道防線第一版就被再審（R2-1）找到能繞過的四種寫法**，都已經修：放在子目錄（原本
`readdirSync` 不遞迴）、換副檔名成 `.test.mjs`（原本只認 `.spec.mjs`，這裡跟 unit config 的
`testMatch: '**/*.spec.mjs'` 一起收緊）、把假 import 寫在註解裡（現在會先去掉註解）、把 mock
的 import 路徑寫進字串常數當誘餌（現在的比對式要求 `import` 在行首，賦值給變數的字串常數不會
被誤認成真的 import）。四種寫法都已經在 scratchpad 用臨時 spec 驗證過會被擋下（見下方變異表）。

**已知還沒補的洞（誠實列出，不是這道防線的目標範圍）**：
- 直接 `import { chromium } from 'playwright'`（不是 `'@playwright/test'`）自己開一個瀏覽器，
  這道掃描只認 `'@playwright/test'` 這個字面字串，換成別的套件名字就跳過。
- 動態 `import()`（`await import('@playwright/test')`）不含 `from` 關鍵字，目前的比對式抓不到。
這兩者都需要真的走到「自己開瀏覽器」這種比較刻意的寫法，不是隨手就會踩到的坑，但確實還沒堵。

#### 防線 2：`use.proxy` 死代理，防「有請求沒被 page-level route 接住」

`playwright.unit.config.js` 的 `use.proxy` 指向 `http://127.0.0.1:9`（discard port，沒有
東西在聽），只有 `localhost`／`127.0.0.1` 走 `bypass` 不經過代理。這是**跟防線 1 完全獨立、
不靠掃描 import 的第二層**：

- `mock-supabase.mjs` 的 `page.route('**/*', ...)`／`page.routeWebSocket(() => true, ...)`
  是掛在**被覆寫過的 page fixture** 上的，只保護那一個 page。`context.newPage()` 開的新分頁、
  `page.on('popup')` 開出來的分頁，都不會自動套用同一組 route——這是 R2-1 實測出的真實缺口
  （對外部網址做 `ERR_NAME_NOT_RESOLVED`，代表真的做了 DNS）。加上 `use.proxy` 之後，這些
  沒被 route 接住的請求全部改連死代理，實測變成 `ERR_PROXY_CONNECTION_FAILED`，連不出去
  （驗證方式見下方變異表）。
- 被 `page.route`／`page.routeWebSocket` `fulfill`／`abort` 掉的請求**不會**受代理設定影響，
  因為 Playwright 在瀏覽器實際發送請求之前就攔截、直接回應或中止了；已經實測過現有 57 條
  在套用這個代理設定後照樣全綠，代理只影響「沒被攔截接住」的請求。
- `request` fixture（`APIRequestContext`）也會吃這個代理設定（已實測：對外部網址得到
  `ECONNREFUSED 127.0.0.1:9`，代表確實走了代理而不是真的連出去），所以不需要另外覆寫
  `request` fixture。

**已知還沒補的洞**：自己 `chromium.launch()` 開的瀏覽器不會套用這份 `use` 設定（除非手動傳
`proxy` 選項），這條防線只保護 Playwright test runner 自己管理的 context／page／request。

#### 防線 3：`globalThis.fetch` 包一層（Node 端），防「測試檔自己的 Node 程式碼直接打外部」

前兩道防線都是瀏覽器層或 Playwright test-runner 層，管不到「測試檔的 async function 裡自己
呼叫 `fetch(...)`」這種 Node process 內的網路請求。`mock-supabase.mjs` 的 `nodeFetchGuard`
是一個 `auto: true` fixture，每個測試都自動套用：包一層 `globalThis.fetch`，非
`localhost`／`127.0.0.1`／`::1` 的請求直接 throw，不會真的發出去。

**這是故意做成「防呆」而不是「封死」的**，缺口刻意不補：
- 只包了 `fetch`。改用 Node 內建的 `http`／`https` 模組，或 `axios`／`undici` 這類不是透過
  `fetch` 實作的 HTTP client，不會被這層攔到。
- 只在測試執行期間生效（`use()` 呼叫之間），`globalSetup`／模組 import 階段的頂層程式碼不
  受影響。
- 只包 Node process 的全域 `fetch`，跟瀏覽器裡 `page.evaluate(() => fetch(...))` 完全是
  兩個不同的 `fetch`，瀏覽器那個由防線 1／2 保護。

#### 防線 4：REST／Realtime 的 fail-closed 路由分派（原本的核心防線，仍然有效）

`mock-supabase.mjs` 的 `page.route('**/*', ...)` 與 `page.routeWebSocket(() => true, ...)`
各自只有一個 handler，用 `URL.hostname` 嚴格比對（不是 `includes`，`evil-supabase.co`、
`x.supabase.co.attacker`、userinfo 把戲都會被正確判斷成別的 hostname 而擋下）：

- `localhost`／`127.0.0.1`（本機 http-server）：`route.continue()` 放行。
- Supabase host（從 `index.html` 原始碼抽出來的 `SUPABASE_URL` 取 hostname 比對，不比對
  完整 URL 字串前綴——`SUPABASE_URL` 帶不帶結尾 `/`、換 custom domain 都不影響判斷）：只有
  `GET /rest/v1/bookings`（走記憶體裡的假資料表）跟測試明確呼叫過 `mock.allowInserts(...)`
  之後的 `POST /rest/v1/bookings` 會被放行，其餘路徑／方法一律 `route.abort()` 並記錄違規；
  Supabase host 上其他子網域（functions、storage）跟 `/rest/v1/bookings` 以外的路徑一律
  abort。WebSocket 只接進一個最小的假 Phoenix channel 伺服器（`phx_join` → `phx_reply: ok`，
  接住之後連線維持開著，測試需要時呼叫 `mock.realtime.sendChange({ type, record, old_record })`
  模擬一筆 INSERT/UPDATE/DELETE 廣播——這個協定格式是實際跑一次 index.html、攔截 client
  送出的 frame 逐步比對出來的，不是憑印象猜的，細節看 `createRealtimeServer()` 上面的註解）。
- unpkg（supabase-js SDK）：直接用 `node_modules/@supabase/supabase-js/dist/umd/supabase.js`
  （`package.json` 釘死 exact 版本 `2.39.0`，跟 `index.html` 的 `<script src>` 版本字串
  比對，兩邊不一致直接 fail-closed，不會假裝載入成功）回應，不必真的連 unpkg。
- jsdelivr（假日 JSON）：回一個空陣列 fixture（格式照 `loadHolidayCalendar()` 的讀取程式，
  已實測載入後 `holidayData` 是空物件——真實 TaiwanCalendar 一年有 300+ 筆，證明真的是走
  fixture、不是連上真網路）。目前沒有任何斷言依賴實際節日內容；要測特定節日再擴充這個
  fixture。
- 其餘任何 host：`route.abort()` 並記違規、WebSocket 直接關閉。
- 測試結束時只要有一筆未預期的請求／連線，那個測試就判定失敗（看 `page` fixture 的實作）。
  PATCH/DELETE 目前整套都用不到，一律視為未預期。
- `tests/unit/support/app.mjs` 的 `gotoApp()` 有一條守門斷言：`supabaseClient` 必須不是
  `null`，SDK 沒真的載入時會在這一步直接爆出來，不會讓後面的斷言在「SDK 沒載入」的狀態下
  空轉變綠。
- `tests/unit/network-independence.spec.mjs` 驗證的範圍只有 REST：頁面正常載入完成之後才
  `context.setOffline(true)` 掐斷真實網路，再打一次會呼叫 Supabase REST 的函式，確認照樣
  正常。**這條證明不了 SDK／假日資料沒連外網**（它們是載入過程中、離線切換之前就已經透過
  mock 拿到的，見 R2-6）——那兩者的證據是上面 unpkg 版本比對／jsdelivr fixture 那兩點。

#### 時區：任何機器都一樣（用瀏覽器自己回報的時區驗證，不是 `TZ` 環境變數）

`page.clock.setFixedTime(...)` 把時鐘固定在 2026-09-27 10:00 Asia/Taipei。時區設在
`playwright.unit.config.js` 的 `use.timezoneId`，對 `testDir` 底下每一個 spec 檔都生效——
舊版放在 `mock-supabase.mjs` 裡的 `test.use({ timezoneId })` 只有第一個 import 到該模組的
spec 檔會套到（ESM 模組只執行一次 top-level code），其餘 7 個檔其實吃的是機器時區，這台機器
剛好是 Asia/Taipei 才沒出事。

**R2-3 發現原本的驗證方式無效**：修正報告當時寫「用 `TZ=UTC` 跑全套 56 passed，證明時區設定
生效」，但 Windows 上的 `TZ` 環境變數改變不了 Chromium 的實際時區——實測 `TZ=UTC`、
`TZ=America/Los_Angeles` 兩種情況下，瀏覽器 `Intl.DateTimeFormat().resolvedOptions().timeZone`
回報的都還是 `Asia/Taipei`，改變的只有 Node 那一端。所以「全套在 `TZ=UTC` 下通過」證明不了
`use.timezoneId` 有沒有生效，就算以後有人把它拿掉，這台機器上照樣會通過（因為機器本身就是
Asia/Taipei），變成誤以為防護還在。

已改成兩個正確的驗證方式：
1. **`tests/unit/timezone-guard.spec.mjs`**：直接斷言瀏覽器的
   `Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Taipei'`，不透過任何會被
   系統環境變數影響的間接訊號。已實測：正常設定下綠；把 config 的 `timezoneId` 改成
   `'UTC'`（config 變體，不是 `TZ` 環境變數）之後這條會紅——這才是真的會生效的驗證方法，
   哪天有人動了 `timezoneId` 這條會立刻抓到。
2. 要驗證某條測試是否真的依賴時區（例如 F-6 的 M2 變異），做一份 `timezoneId: 'UTC'` 的
   config 變體重跑，預期綠（證明這條測試在 UTC 下不會抓到那個變異，因為 bug 本身只在
   UTC+8 這種正時差的時區才會讓 `toISOString()` 把日期往前推一天）；用正式的
   `playwright.unit.config.js`（Asia/Taipei）跑，預期紅。細節見下方變異表的 M2 那一列。

所以整套 `tests/unit/` 不管跑幾次、什麼時候跑、在哪台機器（哪個時區）跑，結果都一樣；不連
真實網路的部分照上面「防線 1–4」列出的範圍，不誇大成「完全不可能」。

### 涵蓋範圍

- 核心邏輯（表格測試，基準取現行輸出）：`checkRecurringConflicts`、`generateRecurringDates`、
  `mycalIsMine`（`tests/unit/logic.spec.mjs`）。
- 可瀏覽範圍邊界（−4／+20 週，側欄 `changeWeek()` 跟我的行事曆 `‹ ›` 一致）：
  `tests/unit/browse-range.spec.mjs`。
- 網格定位（桌面／手機 rowPx）：`tests/unit/grid-layout.spec.mjs`。
- 只看我的／全部切換：`tests/unit/mine-filter.spec.mjs`。
- 共用送出路徑接線（日曆彈窗＋側欄都走 `checkAndSaveBookings()`／`saveBooking()`）、
  週期預約部分失敗、409/23P01、雙擊重入鎖：`tests/unit/booking-flow.spec.mjs`。
- Realtime 背景更新（新增彈窗開著時／詳情彈窗那筆被刪）：`tests/unit/realtime.spec.mjs`。
- `loadBookings()` 查詢日期上下界（時區邊界）：`tests/unit/data-range.spec.mjs`。
- 月檢視 locked 格子不可點開詳情：`tests/unit/locked-cell.spec.mjs`。
- 共用送出路徑的第 1 層防撞閘門（`checkAndSaveBookings()` 裡的 `checkRecurringConflicts`
  真的會擋住寫入，不只是「有發出檢查請求」）：`tests/unit/booking-flow.spec.mjs` 的
  `(F-1)` 區塊。
- Supabase REST 呼叫不依賴真實網路（頁面載入完成後才離線，範圍見上面防線 4）：
  `tests/unit/network-independence.spec.mjs`。
- 瀏覽器時區真的是 Asia/Taipei（不靠 `TZ` 環境變數這種間接訊號）：
  `tests/unit/timezone-guard.spec.mjs`。

### 新增測試時的規矩

1. 不准把函式從 `index.html` 抽出來變成獨立檔案——用 Playwright 載入整份頁面，在頁面裡呼叫
   真正的函式（`page.evaluate`），CLAUDE.md「修改策略」一節已經講過原因。
2. 任何新的 REST 端點／方法要先在 `mock-supabase.mjs` 的路由分派裡明確處理，不要放寬
   fail-closed 的預設值；不確定 PostgREST 查詢參數怎麼解析，就讓它丟例外變成測試失敗，
   不要猜著忽略。
3. 新增的 spec 檔一定要 `import { test, expect } from './support/mock-supabase.mjs'`
   （依實際巢狀深度調整相對路徑），不能用任何形式（named／default／namespace）直接
   `import ... from '@playwright/test'`——`tests/unit/support/global-setup.mjs` 會在整個
   測試流程開跑前靜態擋下這種寫法（見上面「防線 1」），忘記加會讓 `npm run test:unit`
   直接整批失敗並印出哪個檔案有問題。這道掃描不是唯一防線，`playwright.unit.config.js` 的
   `use.proxy` 是第二層（見「防線 2」），但兩者都不是完全封死，已知缺口見上面說明，寫新
   spec 還是要照這條規矩寫，不要指望防線會自動兜底。
4. 期望「完全不該有任何寫入」的測試（例如撞期應該擋下），**不要呼叫 `mock.allowInserts()`**，
   讓任何一筆 POST 都直接變成 violation、由 `page` fixture 的 teardown 判定失敗，不要用讀取
   `mock.insertCalls`／`mock.requestLog` 的時機來判斷有沒有寫入。送出後如果需要等流程真的
   結束才能斷言後續狀態，等 `page.waitForFunction(() => isSubmitting === false)`
   （`submitBooking()`／`mycalSubmitBooking()` 共用同一顆全域重入鎖，`finally` 才會設回
   `false`），不要只等某個 UI 訊號（例如彈窗可見、提示文字變色）就當作流程結束——那些訊號在
   `checkAndSaveBookings()` 的 for 迴圈跑到一半（例如衝突提示剛顯示，後面還有多筆 POST 要送）
   時就可能已經成立。2026-09-27 對抗式再審（R2-2）就是這樣抓到的：舊版寫法在
   `mock.setLatency(1500)` 撐開送出流程後，M15（顯示衝突訊息但沒有真的擋下寫入）會全綠，
   因為當時等的 UI 訊號比整段流程結束早成立太多。

### 已驗證的變異／繞過方式（2026-09-27 審查修正 + 對抗式再審，之後要重跑同一套就照這張表）

在 scratchpad 的 repo 複本上改壞（junction `node_modules`、改 `playwright.unit.config.js`
的 port 避免跟正式 dev server 衝突），**不改 repo 檔案**，逐一確認會紅、還原後全綠。

#### 邏輯變異

| 編號 | 改壞方式 | 位置 | 會紅的測試 | 驗證方式 |
|---|---|---|---|---|
| M4 | `isSlotConflictError` 的 `'23P01'` 打錯字成 `'23P02'` | index.html `isSlotConflictError()` | booking-flow.spec.mjs `(c) 日曆彈窗：假回應 409/23P01` | 直接跑，紅（訊息變成通用 saveFail 而不是 slotTaken） |
| M10 | monthly fallback 從 `targetDay - 7` 改成 `lastDayOfMonth` | index.html `calculateRelativeWeeklyDate()` | logic.spec.mjs `monthly 月底邊界：5/30 出發...` | 直接跑，紅（6/27 變成 6/30） |
| M11 | `checkAndSaveBookings` 的 `conflicts.length > 0` 改成 `> 99` | index.html `checkAndSaveBookings()` | booking-flow.spec.mjs F-1 `(b)`、`(c)` | 直接跑，兩條都紅（零延遲與 `mock.setLatency(1500)` 都試過） |
| M12 | 只拿 `datesToBook.slice(0, 1)` 做衝突檢查 | index.html `checkAndSaveBookings()` | booking-flow.spec.mjs F-1 `(b)` | 直接跑，紅；`(c)` 因為只有單一日期不受影響，維持綠（設計如此） |
| M13 | `timeOverlap` 只把左邊改成 `s1 <= e2` | index.html `timeOverlap()` | logic.spec.mjs `背靠背反方向不算衝突...` | 直接跑，紅 |
| M15（R2-2 新增） | 拿掉衝突分支最後的 `return null`（顯示衝突訊息但照樣往下寫入） | index.html `checkAndSaveBookings()` | booking-flow.spec.mjs F-1 `(b)`、`(c)` | 零延遲：兩條都紅（違規訊息是「測試沒呼叫 mock.allowInserts()」）。加 `mock.setLatency(1500)` 後**一樣兩條都紅**——這正是 R2-2 要修正的：舊版寫法（等 UI 訊號 settle 就讀 insertCalls，且會呼叫 `mock.allowInserts()`）在加了延遲後會全綠，改成不呼叫 `allowInserts()` + 等 `isSubmitting===false` 之後才不受延遲影響 |
| M2 | `loadBookings()` 的查詢改回 `formatDateForDB()`（`toISOString()`） | index.html `loadBookings()` | data-range.spec.mjs | 用正式的 `playwright.unit.config.js`（`timezoneId: 'Asia/Taipei'`）跑，紅；換成 `timezoneId: 'UTC'` 的 config 變體重跑，綠（bug 只在 UTC+8 這種正時差的時區才會讓 `toISOString()` 把日期往前推一天，UTC 下沒有這個位移，本來就測不到——這是「這條測試的敏感範圍」，不是防護失效。R2-3：**不要用 `TZ=UTC` 環境變數驗證**，Windows 上它改變不了 Chromium 的時區，探針顯示 `TZ=UTC`／`TZ=America/Los_Angeles` 下瀏覽器回報的都還是 `Asia/Taipei`） |

#### 安全網繞過方式（R2-1）

| # | 繞過寫法 | 修正前 | 修正後 |
|---|---|---|---|
| 1 | spec 放在子目錄 `tests/unit/sub/x.spec.mjs`，直接 `import { test } from '@playwright/test'` | `global-setup.mjs` 的 `readdirSync` 不遞迴，放行，`BYPASS_RAN` 印出來 | 遞迴掃描後擋下（`Error: tests/unit 安全網守門檢查失敗...`），已在 scratchpad 臨時建檔實測，驗完刪除 |
| 2 | 換副檔名 `tests/unit/x.test.mjs` | 只認 `.spec.mjs`，放行 | global-setup 掃描範圍放寬到 `.spec.`／`.test.` 開頭的常見副檔名，且 `playwright.unit.config.js` 的 `testMatch: '**/*.spec.mjs'` 讓 Playwright 本身根本不會執行 `.test.mjs`（`--list` 確認過：新增 `.test.mjs` 後 total 還是不變）——雙重擋下 |
| 3 | `import pwt from '@playwright/test'`（default import），真正的 mock import 寫在註解裡 | 兩條 regex 都不排除註解，放行 | 先去掉註解，比對式改成不管哪種 import 語法只要來源是 `@playwright/test` 就擋 |
| 4 | `import * as pw from '@playwright/test'`（namespace import），mock 的 import 路徑寫進字串常數當誘餌 | 同上，放行 | 比對式要求 `import` 在行首，賦值給變數的字串常數不會被誤認成真的 import 語句 |
| 5（推論後實測） | `context.newPage()` 開的新分頁沒有 page-level route，對外部網址發真實請求 | 得到 `ERR_NAME_NOT_RESOLVED`，真的做了 DNS | 加上 `use.proxy` 後得到 `ERR_PROXY_CONNECTION_FAILED`，連不出去 |
| 6（推論後實測） | `request` fixture（`APIRequestContext`）直接呼叫外部網址 | 未測過是否吃 `use.proxy` | 實測會走 `use.proxy`，得到 `ECONNREFUSED 127.0.0.1:9`，不需要另外覆寫 fixture |
| 7（R2-1(d) 新增防線） | 測試檔的 Node async function 直接 `fetch('http://example.com/')` | 沒有這層防線，會真的發出去 | `nodeFetchGuard` auto fixture 包一層 `globalThis.fetch`，非 localhost 直接 throw，已用臨時 spec 驗證 `rejects.toThrow(/nodeFetchGuard/)` |

上面 1–4、7 都在 scratchpad 用臨時 spec 實測過（`zzz-*.spec.mjs`，驗完即刪除，不留在
`tests/unit/`）；5、6 是 R2-1 報告列出的推論，這次也在 scratchpad 補了實測。

#### 其他

| 項目 | 驗證方式 | 結果 |
|---|---|---|
| jsdelivr 攔截 | 臨時診斷 spec 讀 `Object.keys(holidayData).length` | `0`（真實 TaiwanCalendar 一年有 300+ 筆），確認走 fixture 不是連上真網路 |
| `timezone-guard.spec.mjs` 本身有效 | 正式 config 跑一次（綠），改成 `timezoneId: 'UTC'` 的 config 變體再跑一次（紅） | 兩次結果符合預期，證明這條測試會在 `timezoneId` 被改掉時抓到 |

沒有另外驗證的既有變異（審查報告已確認會紅，本輪沒有再碰的程式碼路徑）：M1a／M1b（`isSubmitting`
重入鎖）、M3（`timeOverlap` 兩邊都改 `<=`）、M5（拿掉 `.eq('room', room)`）、M6（不呼叫
`checkRecurringConflicts`）、M14（拿掉月檢視 locked 防護）——這些都不是本輪要修的 finding，
邏輯沒有變更。
