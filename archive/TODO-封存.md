# TODO 封存

> 驗收全勾的工作項整段搬到這裡，新的在上，標搬移日期。規則見全域 `rules/judgment.md` R7。

## W-1007-mycal-holiday：功能：我的行事曆顯示節日（2026-10-07 建立；2026-10-11 搬移封存）

舊制時期的功能項（原在 TODO.md「待辦」，遠端 3d669e0 加入，當時沒有編號；編號依建立日補上）。無量測行（verify-level 之前）。
下列證據行號是 2026-10-07 當時的快照，2026-10-11 重新定位後的現值見本項末段。

情境卡已移至 [docs/使用情境.md](docs/使用情境.md)「已完成功能」（使用者確認 2026-10-07；完成 2026-10-07）。

驗收條件：
- [x] 月日期格、週欄頭、日標題都用既有節日來源與中英名稱顯示，且不受 Mine／All 篩選影響。證據：`index.html:8484,8552,8646,8656`；`tests/unit/mycal-holiday.spec.mjs:4`。
- [x] 跨年份載入目前檢視需要的年度；CDN 非同步失敗時，既有會議仍顯示且可操作。證據：`index.html:8488,8525`；`tests/unit/mycal-holiday.spec.mjs:27,59`。
- [x] 已停用的自訂節日不再出現在節日、今日面板、倒數與中英文顯示名稱。證據：`index.html:5178,5275,5324`；`tests/unit/mycal-holiday.spec.mjs:40`。
- [x] 安全單元測試先紅後綠並完成變異驗證；只跑 `test:unit` 或更小範圍。證據：原碼 4 紅、修改後 4 綠；暫拔月節日接線測試紅，還原後 `npm run test:unit -- --reporter=line` 78 passed。
- [x] `docs/使用情境.md` 與 `CLAUDE.md` 的專案摘要、正本位置同步，逐項 read-back 核對。證據：`docs/使用情境.md:3`、`CLAUDE.md:3,10`。

階段 2 退出條件：
- [x] 0 方向：N/A；既有月／週／日畫面及節日標籤是基準，使用者已確認放置位置（2026-10-07）。
- [x] 0a 情境：`docs/使用情境.md` 的功能情境卡與 5 行已由使用者確認（2026-10-07）。
- [x] 0b 規格：N/A；沿用既有節日資料與三種檢視，不增新規則。
- [x] 1 範例表：N/A；不新增算錢或預約規則。
- [x] 2 走通：月／週／日顯示節日並保留預約操作。證據：`tests/unit/mycal-holiday.spec.mjs:4,27,59`，隔離式瀏覽器實跑通過。
- [x] 3 逐條：測試先紅後綠、read-back、第 1 輪驗收無 H／風險類 finding；`npm run test:unit -- --reporter=line` 78 passed；本功能納入本次 commit。
- [x] 4 交付：未修的 M／L 已列於下方清單（2026-10-07），交由主對話排序與回報。

搬移前三項檢查（judgment R7）：(1) 例表：N/A，不新增算錢或預約規則（見上方階段 2 第 1 步）；(2) 系統行為（月／週／日顯示節日）的正本是 `docs/使用情境.md`「已完成功能」，SPEC.md 索引已補列該檔；(3) 沒有涉及的裁定。未修的 M／L 兩項仍留在 `TODO.md`「未修的 M／L 清單」。

## W-0925-unit-test-framework：建立單元測試框架，為 checkRecurringConflicts 寫表格測試（2026-09-25 建立；2026-10-11 搬移封存）

舊制時期的待辦（原在 TODO.md「待辦」第一條，當時沒有編號；編號依建立日補上），無量測行（verify-level 之前）。

- [x] 建立單元測試框架，為 `checkRecurringConflicts`（`index.html:5591`；2026-10-11 該函式在 `index.html:6487`）寫表格測試（R8；2026-09-25）
  — 證據（2026-10-11）：
  - 框架：`playwright.unit.config.js`、`package.json` 的 `test:unit`、`tests/unit/support/mock-supabase.mjs`（攔截全部 Supabase 請求，不碰正式資料庫），隨 4774435 加入；
  - 表格測試：`tests/unit/logic.spec.mjs:11-51`（`checkRecurringConflicts` 10 組：背靠背正反、完全包含、部分重疊前／後、不同會議室、週期只有一天撞到、跨午、完全相同、新的包住既有）；
    基準取現行輸出（`logic.spec.mjs:4-6` 檔頭說明）；
  - 實跑：`npm run test:unit` 74 passed（約 1.5 分），其中 `logic.spec.mjs` 的 `checkRecurringConflicts` 10 組全綠；
  - 拔掉會紅：暫時把 `checkRecurringConflicts` 改成 `return [];`（同時關掉 `mycalSubmitBooking` 的 `isSubmitting` 重入鎖）後，`logic`＋`booking-flow` 36 條中 11 條轉紅（`logic.spec.mjs` 7 條、`booking-flow.spec.mjs` 4 條），已 `git checkout index.html` 還原。

搬移前三項檢查（judgment R7）：(1) 例表：測試表即例表，在 `tests/unit/logic.spec.mjs`，基準取現行輸出（非使用者給的範例表），SPEC.md 索引已列；(2) 沒有改系統行為；(3) 沒有涉及的裁定。
