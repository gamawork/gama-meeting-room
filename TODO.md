# TODO — Gama Meeting Room

## 下一步入口：我的行事曆收尾（分支 main｜2026-10-11）

**狀態**：進行中（功能已實作並 push，剩階段 2 第 3、4 步與延後的 M／L；2026-10-11 對齊 TODO 時實跑發現 1 個新問題，使用者裁定列 W-1011-calmenu-clip、這輪不修）
**目標**：「我的行事曆」頁籤收尾：詳情彈窗「加入行事曆」選單裁切問題已列 W-1011-calmenu-clip（這輪不修），依使用者排序處理延後的 M／L 與月檢視排序
**已完成**：4774435 頁籤＋月／週／日檢視＋單元測試框架 `npm run test:unit`；26a71a5 桌面通知；ee3ae22 日檢視切換時工具列不移位；3d669e0 我的行事曆顯示節日（遠端 10-07，W-1007-mycal-holiday 已封存；2026-10-11 本機分支 rebase 到其上）；2026-10-11 併入遠端節日功能（3d669e0）後重跑 `npm run test:unit` 79 passed（併入前 74；`mycal-holiday.spec.mjs` 加 5 條）
**審查輪數**：已跑 3 輪（R1、R2、R2 修正的風險類再審）；單元測試第二輪修正的最後一輪再審使用者 2026-09-27 裁定跳過；未修 M／L 見「未修的 M／L 清單」
**下一步**：W-0928-month-mine-first；W-1011-calmenu-clip 排程由使用者定；階段 2 第 3、4 步等「待決」
**裁定**：使用者 2026-09-27 的裁定寫在 W-0927-my-calendar 與「未修的 M／L 清單」末段（尚無獨立決策紀錄檔，歸檔 W-0927-my-calendar 前先建，見 SPEC.md）
**關鍵位置**：`index.html:8530`（`mycalMonthDayItems`）、`index.html:8550`（`slice(0, 4)`）、`index.html:8768`（`mycalBindDetailActions`，選單在 `#mycalDetailCalMenu`）；行號 2026-10-11 併入遠端節日功能（3d669e0）後依函式名重新定位
**已排除**：單元測試框架不用再建（W-0925-unit-test-framework 已完成、封存於 `archive/TODO-封存.md`）

## 待決

- W-0927-my-calendar｜階段 2 第 3 步「眼睛看過」要使用者確認；第 4 步延後的 M／L（見「未修的 M／L 清單」）等使用者排順序｜
- W-0927-my-calendar｜R3-2 共用的 showModal 不走 pushState（部分失敗視窗不能用返回鍵關），要不要補｜
- W-0927-my-calendar｜F7 舊資料主辦人 `HH`、`景涵` 不在名單內，資料清理由使用者決定｜

## 進行中工作項

### W-1011-calmenu-clip：「我的行事曆」詳情彈窗「加入行事曆」選單被卡片裁切（2026-10-11 發現；使用者裁定列工作項、這輪不修）

- 現象：詳情彈窗按「加入行事曆」開出的選單 `#mycalDetailCalMenu`，計算位置 left:-145px，左半被彈窗卡片裁掉。
  1280×720 時選項中心點命中的是遮罩 `#mycalDetailModal`（點不到選項）；375 寬時選項 x＝-110，整個落在畫面外。
- 重現：開「我的行事曆」頁籤 → 點任一會議開詳情彈窗 → 點「加入行事曆」，視窗設 1280×720 與 375 寬各試一次。
  截圖 `C:\Users\n9191\.claude\scratchpad\p2-gmr-detail-calmenu.png`。相關程式：`index.html:8768`（`mycalBindDetailActions`，行號 2026-10-11 併入節日功能後重新定位）。
- 2026-10-11 併入遠端節日功能（3d669e0）後重新確認（Playwright 臨時腳本＋假 Supabase，腳本在 repo 外、已刪）：**仍重現，沒有變輕**。
  - 1280×720：選單 `left:-145.16px`，選單 x＝292.8–468.0；卡片 `.mycal-dialog.mycal-sm`（`overflow:auto`）x＝406–866，選單左側約 113px 在卡片外被裁；
    兩個選項（Google／Apple）中心點 `elementFromPoint` 都命中 `#mycalDetailModal` 遮罩。截圖 `C:\Users\n9191\.claude\scratchpad\gmr-calmenu-after-rebase-20261011-172227-1280.png`。
  - 375 寬：選單 x＝-111.2–64.0（視窗 0–375），兩個選項 x＝-110.2、寬 173；卡片 x＝16–351，選單只有約 48px 落在卡片內。截圖 `C:\Users\n9191\.claude\scratchpad\gmr-calmenu-after-rebase-20261011-172227-375.png`。
- 驗收條件：
  - [ ] 1280×720：詳情彈窗的「加入行事曆」選單每個選項都點得到（點選項中心不會命中遮罩）
  - [ ] 375 寬：選單整個在畫面內，每個選項都點得到
  - [ ] 補一條實跑或單元測試守住兩種視窗尺寸（斷言選項中心點命中選項本身）
  - [ ] 完成後回頭把 W-0927-my-calendar「詳情彈窗帶入週表四個操作」那條打勾

### W-0928-month-mine-first：「我的行事曆」月檢視選 All 時自己的會議排前面（使用者 2026-09-28 決定，待安排修改）

- [ ] 「我的行事曆」月檢視選 All 時，每格改成自己的會議排前面、別人的排後面（同組內照時間）；現在只照時間排，
      每格只顯示 4 筆（`mycalMonthDayItems`、`index.html:8530`；`slice(0, 4)` 在 `index.html:8550`），自己的會議會被收進「+N more」。
      介紹短片 `docs/videos/src/my-calendar/comp.html` 的 `cmpMine` 已先這樣排（使用者 2026-09-28 決定，待安排修改）
      — 2026-10-11 核對仍未做：`mycalMonthDayItems` 的 all 分支只照 `mycalBookingsOnDate` 的時間排序（`index.html:8530-8534`）；行號已更新為併入節日功能後的現值

### W-0927-my-calendar：功能：「我的行事曆」頁籤（2026-09-27 規劃，新功能）

UI 參考 [docs/ideas/scale-zoom-views/](docs/ideas/scale-zoom-views/README.md) 的短片畫面。
規格見 [docs/ideas/my-calendar/README.md](docs/ideas/my-calendar/README.md)（SPEC.md 索引列出）。

已拍板（使用者 2026-09-27）：
- 「我的會議」＝ `organizer` 是我，或 `attendees` 含我；比對吃 `MEMBER_ALIASES` 別名。
- 日檢視＝會議室 × 半小時網格（照圖 03），我的會議亮色、別人的淡顯，空檔可點來新增。
- 先做可點樣稿（獨立 HTML＋假資料，不動 `index.html`），確認後再實作。

驗收條件（2026-10-11 對齊：功能 2026-09-27 已隨 4774435 上線，下列勾選依 2026-10-11 實跑；
「臨時實跑」＝在 `tests/unit` 的假 Supabase 環境寫一次性腳本實操頁面，跑完已刪除、不進版控，輸出摘要記在各條）：
- [x] 新頁籤可切換「週表（現行）／我的行事曆」，現行週表行為不變
      — 證據：臨時實跑：點頁籤後 `#tabMycal` 顯示、`#tabTable` 隱藏，切回後週表恢復；`index.html:8080`（`mycalBindTabs`）
- [x] 名字可從 `attendeeGroups` 名單下拉選（可搜尋），選定後存 localStorage，重開頁面自動帶入、可更換
      — 證據：臨時實跑：第一次切頁籤自動跳選名字、搜尋 Ray 出現選項、選定後 `mycalLoadName()`＝Ray、reload 後直接帶入不再跳窗、點名字膠囊可再開選人窗；`index.html:7983-7991`
- [x] 月檢視（圖 01/02）：每格列「時間＋主題」、超過收成 `+N more`、依會議室上色，只顯示我的會議
      — 證據：臨時實跑：同一天我的 5 場，格內 4 個 `.mycal-ev`＋`+1 more`，色彩來自 `--mycal-bar/soft/text` 變數；`tests/unit/mine-filter.spec.mjs:12`（只顯示我的）
- [x] 週檢視：7 天 × 半小時網格，只顯示我的會議
      — 證據：臨時實跑：7 個欄頭、每欄 18 格（09:00–18:00）；`tests/unit/mine-filter.spec.mjs:52`
- [x] 日檢視（圖 03）：6 間會議室 × 09:00–17:30 半小時，我的亮、別人淡；空檔可點
      — 證據：臨時實跑：6 欄（302、301、茶水間、囧尼辦公室、街口辦公室、會客區）、18 格（最後一格 17:30 開始）、別人的方塊帶 `mycal-other`、點空檔開表單
- [x] 點空檔跳出預填表單（圖 04）：日期／時間／會議室帶入、主辦人帶入我的名字；送出走既有 `submitBooking()`，時段防撞三層全在（不另開寫入路徑）
      — 證據：臨時實跑：日期、會議室、主辦人帶入，右上提示「… is free · 30 min」，撞到別人時「301 is already booked for this time」且送出鈕 disabled；
      `tests/unit/booking-flow.spec.mjs:11`（POST body）、`:111`／`:124`（雙擊只送一次）、`:211`／`:239`／`:274`（第 1 層擋下不送 POST）通過；
      注意：日曆彈窗走的是與 `submitBooking()` 共用的 `checkAndSaveBookings()`（`index.html:6903`、`:8970`），不是直接呼叫 `submitBooking()`，意旨（不另開寫入路徑）成立，字面與條文不同
- [x] 送出後新預約出現在當前檢視（圖 05 強調色落格）
      — 證據：`tests/unit/booking-flow.spec.mjs:176`（成功的在下個月也看得到）斷言 `.mycal-new` 落在該格（`:201`）；只驗 class，色彩未目視
- [x] 可瀏覽範圍照週表 `changeWeek` 上限（今天所在週 −4／+20 週），邊界停用 ‹ ›；範圍在已載入區間內，不另補抓（README 第 12 條）
      — 證據：`tests/unit/browse-range.spec.mjs:19-113`（10 條，含 `changeWeek` 與月／週／日邊界）通過
- [x] 週／日檢視點膠囊可跳轉：週→週清單、日→小月曆（使用者回饋 2026-09-27，README 第 11 條）
      — 證據：臨時實跑：週檢視膠囊開出 25 週清單、目前這週反白 1 個；日檢視膠囊開出 35 格小月曆；Esc、點外面、返回鍵都能關且不離開頁面
- [x] 日曆彈窗支援週期性預約，與側欄共用選項、日期產生與防撞（使用者要求 2026-09-27，README 第 13 條）
      — 證據：`tests/unit/booking-flow.spec.mjs:40`（筆數與日期＝`generateRecurringDates()`）、`:144`（部分失敗）、`:239`（只有第 2 次撞到整批不寫）通過
- [x] 月／週檢視「只看我的／全部」切換（使用者要求 2026-09-27，README 第 15 條）
      — 證據：`tests/unit/mine-filter.spec.mjs:12`／`:32`／`:52`／`:68` 通過（月、週各驗 mine／all 與計數文字）
- [ ] 詳情彈窗帶入週表四個操作：加入行事曆、複製、編輯（切回週表）、刪除（使用者要求 2026-09-27，README 第 16 條）
      — 2026-10-11 臨時實跑：編輯（切回週表、`isEditMode`＝true、標題帶入）、刪除（原確認視窗 `#bookingModal` 出現）、複製（標題與會議室帶入、日期不帶）都通過；
      **加入行事曆不通過**：選單 `#mycalDetailCalMenu` 計算位置 left:-145px，被彈窗卡片裁掉左半（1280×720 時選項中心點命中的是遮罩 `#mycalDetailModal`，Playwright 點不到；
      375 寬時選項 x＝-110，落在畫面外）。截圖 `C:\Users\n9191\.claude\scratchpad\p2-gmr-detail-calmenu.png`。修好前不打勾（使用者 2026-10-11 裁定列 W-1011-calmenu-clip，這輪不修）
- [x] F3 可瀏覽範圍邊界的月份計數與格子要跟 DB 一致（載入範圍涵蓋邊界月份整月）
      — 證據：`tests/unit/data-range.spec.mjs:14` 通過（GET 帶 `gte.2026-08-01`／`lte.2027-02-28`）；`index.html:4770-4778`
- [x] F4 日曆彈窗日期限制在可瀏覽範圍（min／max＋送出前檢查）
      — 證據：`index.html:8799-8800`（min／max）、`:8845`（提示）、`:8951`（送出前檢查）；臨時實跑：min／max＝2026-08-24..2027-02-14，輸入範圍外日期出現「Please choose a date within the visible range」且送出鈕 disabled
- [x] F5 Realtime 事件（別人新增／刪改）也重繪「我的行事曆」，彈窗開著時重算空檔提示
      — 證據：`tests/unit/realtime.spec.mjs:7`（新增彈窗開著收到 INSERT）、`:36`（詳情開著被 DELETE）通過；`index.html:4720-4738`、`:9023`（`mycalOnDataChanged`）
- [x] F9 測試：`tests/unit/` 用 Playwright 載入 index.html、攔截全部 Supabase 請求（不碰正式資料庫），
      表格測試 `checkRecurringConflicts`（基準＝現行輸出）、週期日期產生、我的會議篩選、可瀏覽範圍邊界、網格定位；
      接線測試：日曆彈窗送出經共用函式送出的 insert 內容；拔接線要會紅（變異驗證）
      — 證據：`npm run test:unit` 79 passed（2026-10-11 併入節日功能後重跑；併入前為 74，差的 5 條是 `mycal-holiday.spec.mjs`）：`logic.spec.mjs:47`（防撞）、`:81`／`:91`／`:99`（週期日期）、`:113-149`（我的會議）、`browse-range.spec.mjs`、`grid-layout.spec.mjs:24`／`:42`、`booking-flow.spec.mjs`；
      變異驗證（2026-10-11）：暫時把 `checkRecurringConflicts` 改成 `return [];` 並關掉 `mycalSubmitBooking` 的 `isSubmitting` 重入鎖，`logic`＋`booking-flow` 36 條中 11 條轉紅，用 `git checkout index.html` 還原（與備份 `cmp` 相同）
- [x] 中英 i18n、手機版（日網格 6 欄的排法）、關閉路徑（Esc／點外面／返回鍵）
      — 證據：臨時實跑：`setLang('zh')` 後月檢視標題 `10/2026`→`2026 年 10 月`、`+1 more`→`+1 場`；375 寬月檢視會議鈕隱藏、改顯示小點（`.mycal-dots` flex），日檢視 `scrollWidth` 904 > `clientWidth` 313 可左右滑；
      關閉路徑驗過：選人窗 Esc、膠囊面板 Esc／點外面／返回鍵、詳情與新增彈窗的 Esc／返回鍵（新增彈窗未驗點外面、返回鍵，共用 `mycalOpenModal`／`mycalBindOverlayClose`，`index.html:8042`、`:8071`）

階段 2 退出條件：
- [x] 0 方向：僅 §6「方向未定」時做可點樣稿並附「做完長這樣才算對」描述（§6）、使用者明確確認；有設計稿／既有畫面／規格範例就 N/A 附來源
  — 樣稿 `docs/ideas/my-calendar/mockup.html`，「做完長這樣才算對」10 條見同目錄 README.md，併入本功能驗收條件；
  使用者確認 2026-09-27：「很完美，基本上要一模一樣」→ 正式版畫面與互動照樣稿一比一。
- [x] 0b 規格：大改版照 §6 先派 opus 審規格（不論第 0 步是否 N/A）；非大改版標 N/A — N/A：新增頁籤，非大改版
- [x] 1 範例表：有核心邏輯（R8）才做；使用者給「輸入 → 預期數字」，覆蓋要求與定稿前的 opus 審表照 R8，寫成先紅的測試 — N/A：無新核心邏輯，防撞沿用既有三層
- [x] 2 走通：一條畫面 → 邏輯 → 存檔的最簡路徑用真實操作走過一次，畫面上的數字來自核心邏輯（PWA：pwa-starter Phase 0 過了才做）
  — 證據：`tests/unit/booking-flow.spec.mjs:11`（空檔點開 → 填主題 → 送出 → POST 內容正確）2026-10-11 通過；功能 2026-09-27 已 push（4774435）
- [ ] 3 逐條：核心邏輯先紅後綠，其他層照 R8 時機；眼睛看過、commit；每個功能項完成即照 §6 審查與「分風險收工」收工輪；PWA 每個階段收尾跑 pwa-starter §3-5
  — 2026-10-11 對齊：審查 3 輪已跑（見「未修的 M／L 清單」），commit 已有；缺「使用者眼睛看過」確認（見「待決」）；驗收第 12 條未過
- [ ] 4 交付：延後的 M 列給使用者排序

備註：0b 預計 N/A（新增頁籤，非大改版）；1 預計 N/A（無新核心邏輯，防撞沿用既有三層），「是不是我的會議」比對函式歸 R8 多分支純函式層、跟實作一起寫表格測試；第 4 步「從空檔新增」會寫入預約，屬風險類。

## 構想（未決）

- 從月到半小時的縮放檢視（月總覽、日網格、從空檔帶入表單）：[docs/ideas/scale-zoom-views/](docs/ideas/scale-zoom-views/README.md)（2026-09-27，來自介紹短片）

## 未修的 M／L 清單

「我的行事曆顯示節日」第 1 輪驗收（2026-10-07；無 H、無風險類 finding；24 組版面矩陣無整頁溢出或日期／節日／會議點重疊）：

- [ ] M：320px 寬（根字級 100%／200%）月檢視的 12/25「🎄聖誕節」近似單字直排，標籤約 57px 高、日期格約 107px；375px 也換行。定位 `index.html:2143-46,2363-67,8552`；[320px／200% 證物](C:/Users/ryanchen.GAMA/.codex/visualizations/2026/10/07/01a115ac-862b-7a80-8802-0a2a8cef28b6/mycal-holiday-320-200.png)。
- [ ] L：跨年政府節日測試 `tests/unit/mycal-holiday.spec.mjs:36` 使用 `toContainText('元旦')`，斷言較弱；後續可改為精確核對完整標籤。

（驗證節奏試行，CLAUDE.md「驗證節奏：分風險收工」延後的非風險類 M 級 finding 記在這裡）

2026-10-11 核對（順著程式碼）：下列 F7、R2-8、R3-2、月檢視事件鈕 Enter 四項仍存在——F7 是資料問題；R2-8 因 `updateRecurringPeriodOptions()` 每次重建選項都把預設設回 12（`index.html:4920` 起）；
R3-2 因 `pushState` 只出現在 `mycalOpenModal()`（`index.html:8045`），`showModal()`（`index.html:7595`）沒有；月檢視 Enter 因 keydown 只看 `.mycal-day-cell`（`index.html:8691`）。其餘 L 級未逐項核對。

「我的行事曆」第 1 輪審查（2026-09-27，報告 scratchpad `review-my-calendar-r1.md`，行號以該輪快照為準）：

- [ ] F7 舊資料主辦人有 `HH`、`景涵` 等不在名單內的值，這些會議不會出現在任何人的日曆（資料清理由使用者決定）

「我的行事曆」第 2 輪審查（2026-09-27，報告 scratchpad `review-my-calendar-r2.md`）：

- [ ] R2-8 彈窗（側欄與日曆都一樣，既有問題）開著時切語言，已選的週期持續期間被重設回預設值（例：52 → 12）
- [ ] L 級（不擋收工，記錄備查）：Realtime 事件會蓋掉日曆彈窗已顯示的錯誤提示；鍵盤操作可把選名字彈窗疊開兩次

「我的行事曆」R2 修正的風險類再審（2026-09-27，報告 scratchpad `review-my-calendar-r3-risk.md`，無風險類、無 H）：

- [ ] R3-2 共用的 showModal（側欄既有行為）不走 pushState，部分失敗視窗不能用返回鍵／Esc 關，返回鍵會離開頁面；要不要補由使用者決定
- [ ] 月檢視非 locked 格子裡的會議按鈕按 Enter 會被格子的 keydown 帶去日檢視，打不開詳情（本功能既有，無障礙）
- [ ] L 級：部分失敗時黃色落格在 modal 遮罩後播完；部分失敗 modal 比側欄少「頻率／期間」兩行；performDelete 裡重繪若丟例外會誤報刪除失敗；本機刪除後 Realtime 再重繪一次（動畫重播）
- （R3-1 游標停在失敗日期、看不到黃色落格：主對話已修，補測試 `tests/unit/booking-flow.spec.mjs`「第一次就失敗」，拔掉修正會紅）
- 單元測試第二輪修正（死代理防線、掃描改遞迴、防撞測試等待送出完成）的最後一輪風險類再審：使用者 2026-09-27 裁定跳過（「這只是個簡單的程式，不要搞這麼複雜」），未經再審；`npm run test:unit` 57 passed（2026-10-11 實跑為 74 passed：之後加了桌面通知測試 26a71a5；併入節日功能後為 79 passed）

使用者 2026-09-27 裁定本功能內處理、不延後（移到功能驗收條件）：F3 邊界月份少算、F4 日期無 min／max、F5 Realtime 不重繪日曆、F9 缺測試。
