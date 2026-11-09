# TODO — Gama Meeting Room

## 下一步入口：我的行事曆收尾（分支 main｜2026-10-11）

**狀態**：進行中（功能已實作並 push，剩階段 2 第 3、4 步與延後的 M／L；2026-10-11 發現的「加入行事曆」選單裁切與月檢視排序，使用者 2026-10-19 確認不修，已封存）
**目標**：「我的行事曆」頁籤收尾：依使用者排序處理延後的 M／L
**已完成**：4774435 頁籤＋月／週／日檢視＋單元測試框架 `npm run test:unit`；26a71a5 桌面通知；ee3ae22 日檢視切換時工具列不移位；3d669e0 我的行事曆顯示節日（遠端 10-07，W-1007-mycal-holiday 已封存；2026-10-11 本機分支 rebase 到其上）；2026-10-11 併入遠端節日功能（3d669e0）後重跑 `npm run test:unit` 79 passed（併入前 74；`mycal-holiday.spec.mjs` 加 5 條）
**審查輪數**：已跑 3 輪（R1、R2、R2 修正的風險類再審）；單元測試第二輪修正的最後一輪再審使用者 2026-09-27 裁定跳過；未修 M／L 見「未修的 M／L 清單」
**下一步**：階段 2 第 3、4 步等「待決」（W-0928-month-mine-first、W-1011-calmenu-clip 已於 2026-10-19 裁定不做、封存於 archive/TODO-封存.md）
**裁定**：使用者 2026-09-27 的裁定寫在 W-0927-my-calendar 與「未修的 M／L 清單」末段；2026-10-19 的「meeting-room UI 不做」＝決策紀錄.md D-1（歸檔 W-0927-my-calendar 時把 09-27 裁定也搬進去）
**關鍵位置**：`index.html:8530`（`mycalMonthDayItems`）、`index.html:8550`（`slice(0, 4)`）、`index.html:8768`（`mycalBindDetailActions`，選單在 `#mycalDetailCalMenu`）；行號 2026-10-11 併入遠端節日功能（3d669e0）後依函式名重新定位
**已排除**：單元測試框架不用再建（W-0925-unit-test-framework 已完成、封存於 `archive/TODO-封存.md`）

## 下一步入口：搬內部 VM＋自架 Supabase（分支 main｜2026-11-09）
**狀態**：進行中（ssh 2026-11-09 已恢復）；第 5 條待 IT：內部網域與 HTTPS 憑證
**目標**：系統與資料庫搬到內部 VM，並行試跑後切換，不掉資料、不重複預約
**已完成**：VM 唯讀盤點；實測公開金鑰可讀、寫、改、刪 `bookings`；裁定 D-4；Docker＋精簡版自架 Supabase 跑起來（驗收 1、2）；雲端結構匯出並在地端重建、逐項比對一致（驗收 3）；試搬資料 1761 筆、核對值一致（驗收 4）；測試站 `http://10.10.2.96/` 上線、瀏覽器驗收通過（驗收 6）
**審查輪數**：不適用（尚未改程式碼）
**下一步**：W-1106-vm-migration 驗收第 7 條只剩桌面通知（等第 5 條 HTTPS，IT）與真手機連公司 Wi-Fi（使用者）；不卡 IT 的下一條是第 8 條（VM 部署方式）。備份（第 10 條）已上線，接手先看 VM `~/backups/backup.log` 有沒有 11-10 02:30 的「成功」。改 `index.html` 後要重跑 `bash docs/ideas/vm-migration/scripts/deploy-site.sh` 測試站才會更新。地端 `bookings` 現在是 2026-11-09 08:59 的雲端快照（1761 筆），試跑期間寫入的測試資料不會回雲端；正式切換（第 9 條）前要先清空地端再跑 `import-local-data.sh`（腳本只接受空表）
**裁定**：D-3、D-4；記憶體不足先照用、精簡服務（使用者 2026-11-06，寫在 README「VM 現況」）
**關鍵位置**：`docs/ideas/vm-migration/README.md`「VM 現況」（含連 VM 會被擋的注意事項）「資料庫存取現況」；`docs/ideas/vm-migration/scripts/`；`index.html:3528-3529`（Supabase 網址與金鑰）
**已排除**：先做方案 1（只搬網站）：一樣要先解決 HTTPS，省不到工（D-4）

## 待決

- W-1106-vm-migration｜IT 給內部網域與 HTTPS 憑證；要不要加存取控制（內網任何人可讀寫刪預約）；VM 上 `~/migration/` 三個密碼打錯留下的空資料夾（`cloud-20261106-1743`、`cloud-data-20261109-0857`、`cloud-data-20261109-0858`，裡面 0 個檔）要不要刪；VM ssh 11/6 晚上被拒的原因要不要找 IT 查（11/9 已恢復）；跟 IT 要一個公司內的存放位置（另一台機器或 NAS），每日備份再複製一份過去（目前只在 VM 本機）；n8n（雲端 Zeabur `ryanchen.zeabur.app`）有 2 支 active workflow 直接讀雲端 `bookings`（`zJ1bKTt83XOfo8ZR` 會前 Telegram 提醒、`97VhYXZVdVaZvNgv` 平日 08:30 日待辦），Zeabur 連不到內網 `10.10.2.96`——正式切換前要選：IT 開對外入口（要先有 HTTPS）、n8n 搬進內網、或這兩支改由 VM 自己發提醒；未解決前切換會讓提醒讀到停更的雲端舊資料（2026-11-09 唯讀盤點）｜2026-11-09
- W-0927-my-calendar｜階段 2 第 3 步「眼睛看過」要使用者確認；第 4 步延後的 M／L 排順序（含 R3-2 共用 showModal 不走 pushState 要不要補、F7 舊資料主辦人 `HH`、`景涵` 清理，皆見「未修的 M／L 清單」；另含已封存 W-1007-mycal-holiday 的 320px 聖誕節直排（M）、跨年斷言弱（L），見同清單開頭）｜

## 進行中工作項

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
      375 寬時選項 x＝-110，落在畫面外）。截圖 `C:\Users\n9191\.claude\scratchpad\p2-gmr-detail-calmenu.png`。修好前不打勾（使用者 2026-10-11 裁定列 W-1011-calmenu-clip，這輪不修；2026-10-19 使用者確認不修、W-1011-calmenu-clip 已封存，決策紀錄 D-1，本條因此維持未勾）
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

### W-1106-vm-migration：系統搬到內部 VM＋自架 Supabase（2026-11-06 開工，L2）

規劃與現況：[docs/ideas/vm-migration/README.md](docs/ideas/vm-migration/README.md)；裁定：決策紀錄 D-3、D-4。等級：推薦 L2→核准 L2（使用者 2026-11-06）。
做法：VM（`10.10.2.96`）上架自架 Supabase＋網站，用測試網址並行試跑，舊站照常服務；通過後才停寫、搬最後一份資料、切換。

- [x] 1 VM 裝好 Docker，`gama` 可不經 sudo 執行 `docker`（要 sudo 的步驟由使用者執行）——2026-11-06 使用者安裝；實跑 `id -nG` 含 docker、`docker run hello-world` 成功、Docker 29.9.3／Compose v5.7.0、`systemctl is-enabled docker`＝enabled
- [x] 2 自架 Supabase 跑起來（精簡服務，保留 db／auth／rest／realtime／kong／studio／meta），重開機後自動起來；閒置記憶體用量記下來——2026-11-06 主對話 SSH 核對：`docker compose ps` 7 個服務 healthy（閘道是新版預設 Envoy 不是 Kong，功能相同）、7 個容器 restart policy 皆 `unless-stopped`、`.env` 權限 600；本機打 `:8000/` 無帳密 401、`/auth/v1/health` 無金鑰 401。`down`→`up` 模擬重啟後仍 healthy（subagent 實跑）；真的重開 VM 要 sudo，未測。記憶體：容器合計約 630 MiB，整機已用 1.3 GiB、可用 2.5 GiB；Postgres 17.6
- [x] 3 資料庫結構從雲端匯出重建：`bookings`（含 `attendees`）、GRANT、RLS 政策、`btree_gist`＋`bookings_no_overlap`、`supabase_realtime` publication；與雲端逐項比對一致——2026-11-06：VM 上用 db 容器的 `pg_dump`／`psql` 連雲端 Session pooler 唯讀匯出（`docs/ideas/vm-migration/scripts/export-cloud-schema.sh`，密碼由使用者在終端機輸入），照 dump 改寫 `scripts/rebuild-schema.sql` 在地端單一 transaction 套用成功；兩邊跑同一份 `scripts/inventory.sql` 後 diff，`bookings` 的欄位、約束、索引、觸發器、複寫識別、權限、RLS 與 4 條政策、`btree_gist`（在 public）、publication 成員全部相同，public 預設權限另查也相同。diff 只剩三處無關差異：版本 17.4／17.6、地端多 `pg_net`（自架預設）、雲端多 `supabase_realtime_messages_publication`（Realtime Broadcast 內部用；前端只用 `postgres_changes`，`index.html:4705`）。地端防撞實測（transaction 內、已 rollback、剩 0 筆）：重疊時段回 `23P01 bookings_no_overlap`，背靠背與不同會議室同時段可寫入。證據：`docs/ideas/vm-migration/evidence/2026-11-06-schema/`（雲端 dump、雲端與地端盤點）
- [x] 4 試搬資料：雲端匯出→地端匯入，總筆數一致，頭、尾、隨機各抽 1 筆內容一致——2026-11-09：先用 `scripts/dryrun-import.sh` 在地端假資料乾跑（3 筆含中文、逗號、引號、空與會者；匯入後「一致」；表非空再匯入、匯出前後核對值不同兩種情況都被拒；清回 0 筆）。再由使用者在終端機輸入密碼跑 `export-cloud-data.sh`（只讀雲端），匯出前後核對值相同；VM 上 `import-local-data.sh ~/migration/cloud-data-20261109-0859` 印「一致」。`verify-before／after／local.txt` 三檔 md5 皆 `8e5cb32a…`：總筆數 1761、日期範圍 2025-08-20 ~ 2028-08-17、全表雜湊 `e97dacae71f022385d97c8b9f166302b`，頭、尾、隨機 3 列全文相同。匯出檔含預約內容，只留在 VM（權限 700／600），不進 repo
- [ ] 5 內部網域與 HTTPS 憑證到位（IT），公司電腦與手機都信任
- [x] 6 網站放 VM、指向地端 Supabase，測試網址可用；`npm test` 全過（mock 從 `index.html` 抽網址）——2026-11-09：測試網址 `http://10.10.2.96/`（VM 上 nginx 容器 `gama-site`，port 80，`unless-stopped`）。repo 的 `index.html` 不改、仍指雲端；`scripts/deploy-site.sh` 部署 HEAD 時才把 `SUPABASE_URL`／`SUPABASE_ANON_KEY` 換成地端（金鑰從 VM `.env` 讀），分頁標題與頁首加「【VM 測試站】」，任一替換沒剛好命中就停。opus 驗收 agent 用 Playwright 實測（DOM＋DB 級）：console 0 error；Supabase 請求 14 個全打 `10.10.2.96:8000`、supabase.co 0 個；Realtime 收到 INSERT／UPDATE／DELETE；週表 11/09–11/15 共 9 列＝DB 9 筆；UI 新增、改標題、刪除後 DB 一致；UI 重疊預約被擋；繞過前端 POST 重疊回 HTTP 400／23P01、背靠背 201；收尾 DB 1761 筆、全表雜湊與第 4 條相同、測試資料殘留 0。標題第一次驗沒過（`index.html:3457` 載入後用 i18n 蓋掉 `<title>`），改 deploy 腳本一併替換 `index.html:2806,3114` 的 `app.title` 後重驗，中英的分頁標題與 h1 都含字樣。`npm test` 91 passed。發現一個既有 M（23P01 提示被蓋掉），列進「未修的 M／L 清單」。未驗（屬第 5、7 條）：桌面通知（http 非安全連線，預期不能用）、雙分頁同時送出、Supabase 停掉時的錯誤、手機寬度
- [ ] 7 測試網址上跑完 README「切換後驗收清單」全部條目（含雙分頁防撞、Realtime、桌面通知、Supabase 停掉時顯示錯誤）——2026-11-09 進度：不需 HTTPS 的 8 項由 opus 驗收 agent（Playwright）實測全 PASS：雙分頁同時送出 ×3 每次 DB 只 1 筆（2 次由資料庫 23P01 擋、1 次前端擋）；Realtime 跨分頁新增／修改／刪除自動更新；斷線（`page.route` 擋 `:8000`，載入時與載入後）與真的 `docker stop supabase-rest`（503）都顯示錯誤、沒寫入、沒假裝成功，`start` 後 healthy、資料正常；一鍵複製（http 走 `execCommand` 備援）內容正確；節日月檢視正常、擋 jsdelivr 後會議仍可見可點開；中英切換後可新增；375×812 無整頁溢出、可新增刪除；示範影片 2 支與介紹頁都 200、影片實際播放。收尾 DB 1761 筆、雜湊不變、殘留 0。**剩**：桌面通知（等第 5 條 HTTPS）、真手機連公司 Wi-Fi（要使用者用手機開 `http://10.10.2.96/`）。另未測週期預約、從我的行事曆彈窗新增。新發現 2 條列進「未修的 M／L 清單」。同日改由 VM 提供 supabase-js（使用者裁定，見 README 測試站段）後重驗：unpkg 請求 0、擋掉 unpkg 仍可新增刪除、Realtime 收到事件、REST 計數 1761、殘留 0
- [ ] 8 VM 部署方式落地（取代 push main 自動部署），實跑一次部署
- [ ] 9 正式切換：舊站停寫→最後一次匯出匯入→筆數核對→開新站→舊網址轉址；雲端保留當備援
- [x] 10 備份：每天自動匯出＋實際還原演練一次——2026-11-09：VM `gama` 的 crontab 每天 02:30 跑 `~/ops/backup-db.sh`（repo `scripts/backup-db.sh`），備份到 VM `~/backups/YYYYMMDD-HHMMSS/`（pg_dump 自訂格式含結構、權限、RLS 與資料，約 80 KB），紀錄寫 `~/backups/backup.log`。只留最新 7 份（使用者 2026-11-09），新備份成功並核對過才刪最舊的。實測：連跑 9 次剩 7 份、刪掉最舊 2 份；故意讓備份失敗（容器名錯）時 7 份一份都沒少、沒殘留暫存資料夾；用排程同樣的精簡環境（`env -i`，PATH 只有 `/usr/bin:/bin`）跑一次成功。還原演練 `scripts/restore-drill.sh`：還原到暫存資料庫 `restore_drill`，與備份當下核對值「資料一致」（1761 筆、全表雜湊 `e97dacae…` 同第 4 條），`bookings_no_overlap` 約束 1、RLS 啟用、政策 4 條、anon 權限都在，演練完暫存庫已刪。備份只在 VM 本機：VM 整台壞掉會一起沒有，之後 IT 給公司內存放位置再加一份複製（見待決）。第一次真正由排程觸發是 2026-11-10 02:30，下次接手看一眼 `backup.log`
- [ ] 11 正本同步：`CLAUDE.md`（部署、Supabase 段）、`SPEC.md`、`docs/使用情境.md`

## 構想（未決）

- 系統搬到內部 VM 架設，Supabase 一起地端化：已開工作項 W-1106-vm-migration（見上方「進行中工作項」；決策紀錄 D-3、D-4）
- 從月到半小時的縮放檢視（月總覽、日網格、從空檔帶入表單）：[docs/ideas/scale-zoom-views/](docs/ideas/scale-zoom-views/README.md)（2026-09-27，來自介紹短片）
- 預約時寄 Outlook 會議邀請給與會者（暱稱對信箱、後端代寄、修改／取消同步；已定採系統信箱代寄，先搬內部 VM 再做、後端放 VM，見決策紀錄 D-2）：[docs/ideas/email-invite/](docs/ideas/email-invite/README.md)（2026-11-02，來自同事建議）

## 未修的 M／L 清單

W-1106-vm-migration 驗收 6 的瀏覽器驗收（2026-11-09）發現的既有問題（正式站同一份程式碼，非遷移造成）：

- [ ] M（既有，命中 L2 觸發 `saveBooking()`／`submitBooking()`）：側欄送出時若前端衝突檢查放行、被資料庫約束擋下（兩人同時送出的空窗），`index.html:4861` 先顯示 `error.slotTaken`「時段剛被預約」，回到呼叫端後 `index.html:7124` 立刻用 `error.allFailed`「請檢查網路或稍後再試」蓋掉，誤導使用者去查網路。資料沒寫入、沒假裝成功。重現：頁面裡把 `checkRecurringConflicts` 換成回傳空陣列後送出重疊預約（驗收 agent 腳本 `%TEMP%\w1106-verify\verify2.mjs`）。2026-11-09 驗收 7 的雙分頁同時送出 3 次裡重現 2 次，正式切換後最可能被同事回報。
- [ ] M（遷移相關）：地端 `supabase-rest` 停掉時，自架閘道（Envoy）約 5 秒才回 503；這 5 秒週表整週顯示空白列、沒有載入中提示，同事可能以為本週沒預約。5 秒後會跳「Connection Test Failed」，不會假裝成功。證物 `%TEMP%\w1106-verify\v7-C2b-reload-2s.png`、`v7-C2b-reload-5s.png`。
- [x] L（既有）：連不上資料庫時的錯誤文字太技術（列出「Table 'bookings' does not exist / RLS policy misconfigured / check your Supabase setup」給一般同事看）。——2026-11-09 L1 小修（使用者要求）：`index.html:2883,2963,3191,3271` 的 `modal.connFailed`／`error.dbConnect` 改成「連不到預約系統／目前讀不到預約資料，暫時無法查看或預約會議室。請稍後重新整理頁面再試；若一直出現，請聯絡 IT 或系統管理員。」，技術資訊縮成一行小字；`npm test` 91 passed。送出時連不上的「Conflict check failed: TypeError…」在 `checkRecurringConflicts()`（L2 觸發）裡，沒改。

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
