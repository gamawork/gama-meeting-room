# 測試指南 — Playwright i18n 雙語模式

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
