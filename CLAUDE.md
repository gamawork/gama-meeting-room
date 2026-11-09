# Gama Meeting Room 專案注意事項

## 專案 5 行摘要（使用者確認 2026-10-07）

（2026-10-11 併入驗證等級機制：第 2 行「風險類」是舊制名稱，現行對應見下方「驗證等級」的 L2 觸發；第 3、5 行已同步進該段的「必驗」「外部出狀況要的行為」。）

1 對象與防護：既有公司同事在桌機／手機瀏覽器使用；沿用現有存取控制。
2 風險類＝：不得造成重複預約或 Supabase bookings 資料遺失／毀損。
3 必驗：預約時段防撞與資料顯示；「我的行事曆」月／週／日節日顯示、跨年份、中英文切換、已停用的自訂節日不再出現、節日 CDN 失敗時會議仍可見可操作。
4 不驗：無使用者指定的不驗項。
5 外部出狀況：節日 CDN 失敗時不阻擋預約與會議顯示；Supabase 無法連線時顯示錯誤，不假裝預約成功。

## 正本位置

| 要查什麼 | 去哪 |
|---|---|
| 完整規格 | `SPEC.md`（索引，指到各子檔：`docs/ideas/my-calendar/README.md`、本檔的 Supabase／防撞／部署節等） |
| 進度、驗收清單、交接、待決 | `TODO.md`；完成的工作項在 `archive/TODO-封存.md` |
| 為什麼這樣設計、已結案的裁定 | 尚無獨立決策紀錄檔（見 `SPEC.md`；使用者 2026-09-27 的裁定目前寫在 `TODO.md`） |
| 改行為時要同步更新的正本 | `SPEC.md` 或其子檔（同一 commit 內，見全域 `rules/judgment.md` R2 第 5 項） |
| 專案層使用情境與已完成功能 | `docs/使用情境.md` |
| 「我的行事曆」規格與互動基準 | `docs/ideas/my-calendar/README.md` |
| 系統程式與節日資料流 | `index.html` |

## 回覆語言

回覆使用者一律用台灣繁體中文，包含說明、回報、提問與選項。即使前一則訊息、工具輸出或文件是英文，也不要切換成英文。
（2026-09-28：同一個 session 裡三次改用英文回覆，使用者要求寫進本檔。）

## 檔案編碼

`index.html` 單檔、大量中文。只用 Edit 做局部修改；禁 PowerShell `Set-Content`／`Out-File`／`>` 整檔重寫
（編碼守則見全域 `rules/judgment.md` R5「改文字檔的底線（Windows）」）。

## 修改策略

- 優先做最小範圍修改，不要一次重整整份 `index.html`。
- 變更 UI 或文案時，先找共用函式或共用區塊，避免同一份內容在多處重複組字串。
- 操作按鈕若改成 SVG icon，事件處理要避免直接依賴 `event.target`，應改抓最近的 `button`，例如 `event.target?.closest?.('button')`。

## 資料欄位同步

- 前端若新增欄位，例如 `attendees`，要同步檢查以下位置：
- 表單輸入欄位
- 週表顯示欄位
- 詳情 / 成功 modal 內容
- 複製與分享內容
- `saveBooking(...)` 寫入
- `formatBookingFromDB(...)` 讀取格式化
- `updateSingleBooking(...)` / `updateSeriesBookings(...)` / 部分更新流程

## Supabase

- 若前端已使用 `attendees`，資料庫也必須存在 `bookings.attendees` 欄位，否則新增或更新時會失敗。
- 目前對應 SQL：

```sql
alter table public.bookings
add column if not exists attendees text;
```

### 新建資料表要另下 GRANT（2026-10-30 起）

Supabase 通知（使用者 2026-10-27 轉貼）：2026-10-30 起，既有專案在 `public` 新建的表不再自動開放給 Data API，
要明確 `GRANT`，否則 supabase-js 會回 `permission denied`。既有的表保留原權限、不受影響。

- 2026-10-27 實查：前端只用 `bookings` 一張表（`index.html` 的 `.from('bookings')`），repo 內沒有建表 SQL 或 migration，目前不受影響。
- 之後要新增表時，建表與 GRANT 寫在同一段 SQL，由使用者在 SQL Editor 執行。
  前端用的是公開金鑰（`anon` 角色）直接讀寫，所以前端要寫入的表，`anon` 也要給寫入權限，不能只照信裡範例給 `select`：

```sql
grant select, insert, update, delete on public.新表名 to anon;          -- 前端只讀的表只給 select
grant select, insert, update, delete on public.新表名 to authenticated;
grant select, insert, update, delete on public.新表名 to service_role;
```

### Realtime（即時同步與桌面通知的前提）

`bookings` 必須在 `supabase_realtime` publication 裡，否則前端訂閱會顯示 joined 卻收不到任何事件：
週表不會自動更新、「我的行事曆」桌面通知的新增／更改／取消都不會觸發（只有開會前 10 分鐘提醒不受影響）。
2026-09-27 前一直沒開，使用者於當天在 SQL Editor 套用：

```sql
alter publication supabase_realtime add table public.bookings;
```

- UPDATE／DELETE 的 payload.old 預設只有 id（沒設 REPLICA IDENTITY FULL），前端改前資料一律從本機 `bookings` 陣列取。
- 這個專案的 Supabase 不在本機 CLI 登入的個人帳號底下，Claude 無法直接下 DDL；資料庫設定一律由使用者在後台執行。

### 地端自架 Supabase 與每日備份（VM，2026-11-09 起試跑；W-1106-vm-migration）

正式切換（W-1106 第 9 條）前，正式資料仍在上面的雲端 Supabase；VM 上的是試跑用的地端版。安裝紀錄、試搬資料與連線注意事項見 `docs/ideas/vm-migration/README.md`「VM 現況」。

- 位置：VM `10.10.2.96`（帳號 `gama`）的 `~/supabase-project`（官方自架 Docker 版，精簡服務）；API 入口 `http://10.10.2.96:8000`（網頁不直連它，改走網站同網址的 `/rest/v1`、`/realtime/v1`，由 nginx 轉過去，見下方「VM 部署」）；密鑰在 VM 的 `.env`，不進 repo。
- 資料庫沒有對外 port，只能在 VM 內 `docker exec supabase-db psql -U postgres` 連。
- **每日備份**：`gama` 的 crontab 每天 02:30 跑 `~/ops/backup-db.sh`，備份到 VM `~/backups/YYYYMMDD-HHMMSS/`（`bookings.dump`，pg_dump 自訂格式，含結構、權限、RLS 與資料）；紀錄寫 `~/backups/backup.log`。
  只留最新 7 份（使用者 2026-11-09），新備份成功並核對過才刪最舊的，備份失敗時舊的一份都不刪。
- **還原演練**：`bash ~/ops/restore-drill.sh [備份資料夾]`（不給就用最新一份），只還原到暫存資料庫 `restore_drill` 比對核對值、防撞約束與 RLS，做完刪掉暫存庫，不碰正式資料。
- **真的要還原正式資料**：用同一份 `bookings.dump` 先清空 `bookings` 再 `pg_restore --data-only`——會覆蓋現有預約，動手前先問使用者。
- VM `~/ops/` 放的是 repo `docs/ideas/vm-migration/scripts/` 的複本（`backup-db.sh`、`restore-drill.sh` 與它們讀的 `verify-data.sql`）；改了 repo 版要另外複製到 VM，排程才會用到新版。
- 已知缺口：備份只在 VM 本機，VM 整台壞掉會一起沒有；IT 給公司內存放位置後再加一份複製（見 `TODO.md`「待決」）。

### 時段防撞（三層，缺一層就會再出現重複預約）

1. 前端送出前的 `checkRecurringConflicts(...)` 衝突檢查。
2. `submitBooking(...)` 開頭的 `isSubmitting` 重入鎖，擋同一分頁雙擊。
   衝突檢查到寫入之間有一次 DB 來回的空窗，沒有這道鎖，雙擊會寫入兩筆相同預約。
3. 資料庫 `bookings_no_overlap` EXCLUDE 約束，擋跨分頁／跨使用者的競態。

第 3 層的建立 SQL（2026-08-12 已套用到正式資料庫）：

```sql
create extension if not exists btree_gist;

alter table public.bookings
add constraint bookings_no_overlap
exclude using gist (
    room with =,
    tsrange((date + start_time)::timestamp, (date + end_time)::timestamp) with &&
);
```

- `btree_gist` 是為了讓 `room with =` 這種純量比較能跟時間範圍放進同一個 GiST 索引。
- `tsrange` 預設為半開區間 `[)`，所以 `10:00-11:00` 與 `11:00-12:00` 這種背靠背預約不會被誤擋。
- 建立或修改這道約束前，全表必須沒有重疊資料，否則 `alter table` 會失敗。
- 約束擋下時 PostgREST 回 SQLSTATE `23P01`，前端由 `isSlotConflictError(...)` 接住，
  改顯示 `error.slotTaken` 的中文衝突提示，不讓 Postgres 原始英文訊息外洩到畫面。
  該函式同時接 `23505`（UNIQUE）；若日後改用別種約束，記得同步這個判斷。

## Git 帳號

Git 身分：工作帳號 `gamawork`，見 `~/.claude/environments/GitHub.md`（L18-24）。
remote 走 SSH host 別名 `SSH-gamawork`（`git remote -v` 2026-09-07 實查）。

## 部署（push 到 main 會同時觸發兩邊；VM 要另外手動部署）

| 內容 | 主機與網址 | 怎麼部署 |
|---|---|---|
| 會議室系統（根目錄 `index.html`） | GitHub Pages：`https://gamawork.github.io/gama-meeting-room/` | push 到 main |
| 新功能介紹頁（`launch/`） | Cloudflare Worker `gama-meeting-room-launch`（帳號 Gamawork2025）：`https://gama-meeting-room-launch.gamawork2025.workers.dev/` | push 到 main；Workers Builds 連 GitHub，照根目錄 `wrangler.jsonc` 只部署 `launch/` |
| 會議室系統 VM 版（同一份 `index.html`） | 內部 VM：`http://meeting.gamasys.com.tw/`（IT 給的內部網域，2026-11-09；只有公司內網解析得到，前面沒有 CDN）或 `http://10.10.2.96/`（nginx 容器 `gama-site`）。目前是測試站，正式切換（W-1106 第 9 條）後取代 GitHub Pages | **不會自動部署**：push 後手動跑部署腳本（見下方「VM 部署」） |

- `wrangler.jsonc` 的 `assets.directory` 必須指向 `./launch`：少了它，Workers Builds 會把整個 repo（含 `node_modules`）當網站上傳，
  因單檔超過 25MB 而失敗（2026-09-28 實際發生）。`name` 必須跟 Cloudflare 上的 Worker 名稱一致。
- 同一份 `launch/` 也會被 GitHub Pages 發布，`launch/index.html` 開頭的 JS 會把 github.io 來的訪客轉到 Cloudflare。
  原因：這個網路連 GitHub Pages 很慢，1.4MB 影片實測約 29 秒，Cloudflare 約 1.4 秒（2026-09-28）。
- 介紹頁的影片是 `launch/media/*-1080.mp4`，不是 `docs/videos` 原檔（原檔 7.7MB，只當重壓的來源）。原檔換新時要重壓一份：
  `ffmpeg -i 原檔.mp4 -c:v libx264 -preset veryslow -tune animation -crf 30 -pix_fmt yuv420p -c:a aac -b:a 64k -movflags +faststart 輸出.mp4`
- **系統依賴介紹頁**：`index.html` 右上角 i 鈕的「看 20 秒示範」（中英各兩顆 `help-video-btn`）的 `data-video`
  直接連到 Cloudflare 上的 `launch/media/*-1080.mp4`（2026-09-28 起，為了避開 GitHub Pages 下載慢）。
  刪掉或改名 `launch/media` 的影片、改 Worker 名稱或網址前，先改這四個 `data-video`，不然系統裡的示範會壞掉。
  同一個彈窗標題旁的「連結／Link」（`.help-launch-link`）也寫死介紹頁網址，改網址時一併改。

### VM 部署（使用者 2026-11-09：push 後手動部署）

1. commit → `git push` main → 在本機 repo 根目錄用 Git Bash 跑 `bash docs/ideas/vm-migration/scripts/deploy-site.sh`。
   正式切換前是測試站模式（標題加「【VM 測試站】」）；切換後加 `--prod`（不加字樣，切換時才第一次實跑）。
   HEAD 不等於 origin/main 時腳本會停（「先 push 再部署」），VM 不會跑到 GitHub 上沒有的程式碼。
2. 看輸出的版本：第一行要等於剛 push 的 commit，第二行是模式（test／prod）。VM 上存在 `~/site/version.txt`。
3. 有問題要退回上一版（只能退一版）：VM 上 `mv ~/site ~/site-bad && mv ~/site-prev ~/site && docker restart gama-site`。

- 腳本只上傳已 commit 的 `index.html`、`gama.ico`；到 VM 上才把 Supabase 網址換成 `window.location.origin`、金鑰換成地端（金鑰從 VM 的 `~/supabase-project/.env` 讀）。
- 網頁與 API 同網址（使用者 2026-11-09）：nginx 設定正本是 `docs/ideas/vm-migration/scripts/nginx-site.conf`，部署時放 VM `~/site-conf/default.conf`，把 `/rest/v1`、`/realtime/v1`（WebSocket）轉給 port 8000，其他給靜態網頁；用 IP 或網域打開都能用，之後開 HTTPS 只要一張憑證、不會被瀏覽器擋 http API。每次部署都重建 `gama-site` 容器（設定檔先用暫存容器 `nginx -t` 檢查，沒過就停）。8000 直連仍保留。
  **repo 的 `index.html` 一律指雲端，不要為了 VM 改它**：正式切換前 push main 就是更新 GitHub Pages 正式站。
- supabase-js 由 VM 提供：腳本從 unpkg 下載固定版本、核對 sha256 後放 `~/site/vendor/`。換 `index.html` 的 supabase-js 版本時，要同步改腳本裡的 `SDK_*`（沒改腳本會停下）。節日資料仍從 jsdelivr 載入（失敗有降級）。
- 連 VM：帳號 `gama`、金鑰 `~/.ssh/id_ed25519_gama_vm`。一次只開一條 ssh；22 port 偶爾被拒約 1 分鐘、原因未知（見 `docs/ideas/vm-migration/README.md`「VM 現況」）。
- 已知限制：VM 目前走 http，瀏覽器不開放桌面通知，要等 IT 開 HTTPS（W-1106 第 5 條；內部網域 2026-11-09 已給）。IT 之後若在前面加 CDN，要重測 WebSocket 能不能通過。

## 發生亂碼時的處理

- 不要直接在壞掉的檔案上繼續修字串。
- 先用 git 版本還原乾淨內容，再重新套用必要修改。
- 還原後先確認中文可正常顯示，再繼續改功能。

## 測試時機（R8 層對照）

通則（一句話判準、分層時機、縮範圍跑、變異驗證、假回應常數）見全域 `~/.claude/rules/verify-level.md`（測試寫法細則在 judgment R8），這裡只填本專案的層對照。

| 本專案路徑 | 對應 R8 的層 | 什麼時候寫 |
|---|---|---|
| `checkRecurringConflicts(...)`（`index.html`，時段防撞第 1 層） | 核心邏輯（R8：業務規則，防重複預約） | 寫程式之前（R8）；單元測試框架已建立：`tests/unit/logic.spec.mjs`、`npm run test:unit`（工作項 W-0925-unit-test-framework 已封存於 `archive/TODO-封存.md`） |
| `tests/unit/i18n.spec.mjs`（`npm test` 走 Playwright，假 Supabase） | **E2E**（不是核心邏輯層測試） | 只守 3–5 條關鍵使用者旅程，不拿來覆蓋狀態組合（狀態組合歸核心邏輯層） |
| `index.html` 其餘畫面渲染（週表、modal、表單） | 畫面 | 穩定後只補兩類（顯示對的數字、關閉路徑） |

- 驗證 UI：`preview_start`（見 `.claude/launch.json`）；不用 Bash 起 server。
- 全跑：`npm test`（與 `npm run test:unit` 同義，都走 `playwright.unit.config.js`）可安全自動跑、commit 前也可跑——全部走假 Supabase，不碰正式資料庫、不需清理（2026-10-17 i18n 12 條搬進 `tests/unit/i18n.spec.mjs` 後實跑 91 條全過；之前 unit 79 條，2026-10-11 併入節日功能），入口 `tests/unit/logic.spec.mjs`。專案內已沒有任何會連正式 Supabase 的測試。
- 本專案的「單一定義處」（假回應要從這裡推導）：`tests/unit/support/mock-supabase.mjs`（`SUPABASE_URL` 從 `index.html` 抽出、`SLOT_CONFLICT_CODES`、`FIXED_NOW_UTC`），新測試的假回應常數從這裡匯入，不手抄。
- 函式內嵌在 7000+ 行的 `index.html` 裡，單元測試不必先抽出函式：用 `page.evaluate` 直接呼叫 `index.html` 的全域函式本體（例：`checkRecurringConflicts`，見 `tests/unit/logic.spec.mjs`）。

### 本專案約定

- 追蹤檔與未修的 M／L 清單：`TODO.md` 的「未修的 M／L 清單」段；完成的工作項封存在 `archive/TODO-封存.md`。
- 接手先讀：`TODO.md` 的「下一步入口」與「待決」（SessionStart hook 開場會注入；沒注入就先讀）。工作項編號、待決段、封存規則照全域 `rules/judgment.md` R7。
- 追蹤檔打勾的 commit：無專案專屬規定（附證據照全域硬規則 4）。
- 驗證腳本目錄：`tests/scripts/`；驗證 harness：未建。
- 瀏覽器重複檢查登記簿：`tests/checks.md`（已建，2026-10-07 起登錄節日顯示 4 項，腳本欄都是「待腳本化」）。
- 單元測試框架待建時的待辦寫法：上方層對照表對 `checkRecurringConflicts` 記「待建立」，待辦見 `TODO.md`（已完成並封存於 `archive/TODO-封存.md`：W-0925-unit-test-framework）
  （建立單元測試框架，為 `checkRecurringConflicts` 寫表格測試）；現況：`tests/unit/` 與 `npm run test:unit`
  （不碰正式資料庫）已存在，見 `TODO.md` 的「下一步入口」。
- 量測或工具的已知陷阱：（尚無）

## 驗證等級

> 正本 `~/.claude/rules/verify-level.md`；段名不可改（維護協議用 `grep -c "^## 驗證等級"` 檢查）。

```
預設：L1
升 L2 的觸發（只准路徑 glob 或函式名，供 commit 前比對）：checkRecurringConflicts()、checkSeriesEditConflicts()、submitBooking()、saveBooking()、updateSingleBooking()、updateSeriesBookings()、updatePartialSeriesBookings()、performDelete()、isSlotConflictError()
降級慣例（使用者 YYYY-MM-DD）：（尚無）
不驗（使用者明說 YYYY-MM-DD）：（尚無）；審查與驗收不報，回報末尾列「已知不處理」
必驗（規格）：預約時段防撞與資料顯示；「我的行事曆」月／週／日節日顯示、跨年份、中英文切換、已停用的自訂節日不再出現、節日 CDN 失敗時會議仍可見可操作（使用者確認 2026-10-07，即上方 5 行摘要第 3 行；本次改到的才驗，不是每次全驗）
外部出狀況要的行為：節日 CDN 失敗時不阻擋預約與會議顯示；Supabase 無法連線時顯示錯誤，不假裝預約成功（使用者確認 2026-10-07，即上方 5 行摘要第 5 行）
誰用、錯了的代價：多人（跨分頁、跨使用者）預約同一批會議室的系統（根目錄 `index.html`，GitHub Pages），預約存在 Supabase `bookings`。錯了的代價：時段防撞三層失效造成重複預約；Supabase 預約資料遺失或毀損；改資料庫 DDL 由使用者在後台執行（Claude 無法直接下 DDL）；push main 會同時觸發 GitHub Pages 與 Cloudflare Worker 部署
```
