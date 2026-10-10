# Gama Meeting Room 專案注意事項

## 專案 5 行摘要（使用者確認 2026-10-07）

1 對象與防護：既有公司同事在桌機／手機瀏覽器使用；沿用現有存取控制。
2 風險類＝：不得造成重複預約或 Supabase bookings 資料遺失／毀損。
3 必驗：預約時段防撞與資料顯示；「我的行事曆」月／週／日節日顯示、跨年份、中英文切換、已停用的自訂節日不再出現、節日 CDN 失敗時會議仍可見可操作。
4 不驗：無使用者指定的不驗項。
5 外部出狀況：節日 CDN 失敗時不阻擋預約與會議顯示；Supabase 無法連線時顯示錯誤，不假裝預約成功。

## 正本位置

| 要查什麼 | 去哪 |
|---|---|
| 專案層使用情境與已完成功能 | `docs/使用情境.md` |
| 進度與驗收條件 | `TODO.md` |
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

### Realtime（即時同步與桌面通知的前提）

`bookings` 必須在 `supabase_realtime` publication 裡，否則前端訂閱會顯示 joined 卻收不到任何事件：
週表不會自動更新、「我的行事曆」桌面通知的新增／更改／取消都不會觸發（只有開會前 10 分鐘提醒不受影響）。
2026-09-27 前一直沒開，使用者於當天在 SQL Editor 套用：

```sql
alter publication supabase_realtime add table public.bookings;
```

- UPDATE／DELETE 的 payload.old 預設只有 id（沒設 REPLICA IDENTITY FULL），前端改前資料一律從本機 `bookings` 陣列取。
- 這個專案的 Supabase 不在本機 CLI 登入的個人帳號底下，Claude 無法直接下 DDL；資料庫設定一律由使用者在後台執行。

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

## 部署（push 到 main 會同時觸發兩邊）

| 內容 | 主機與網址 | 怎麼部署 |
|---|---|---|
| 會議室系統（根目錄 `index.html`） | GitHub Pages：`https://gamawork.github.io/gama-meeting-room/` | push 到 main |
| 新功能介紹頁（`launch/`） | Cloudflare Worker `gama-meeting-room-launch`（帳號 Gamawork2025）：`https://gama-meeting-room-launch.gamawork2025.workers.dev/` | push 到 main；Workers Builds 連 GitHub，照根目錄 `wrangler.jsonc` 只部署 `launch/` |

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

## 發生亂碼時的處理

- 不要直接在壞掉的檔案上繼續修字串。
- 先用 git 版本還原乾淨內容，再重新套用必要修改。
- 還原後先確認中文可正常顯示，再繼續改功能。

## 測試時機（R8 層對照）

通則（一句話判準、分層時機、縮範圍跑、變異驗證、假回應常數）見全域 `~/.claude/rules/verify-level.md`（測試寫法細則在 judgment R8），這裡只填本專案的層對照。

| 本專案路徑 | 對應 R8 的層 | 什麼時候寫 |
|---|---|---|
| `checkRecurringConflicts(...)`（`index.html:5591`，時段防撞第 1 層） | 核心邏輯（R8：業務規則，防重複預約） | 寫程式之前（R8）；目前無單元測試框架，待建立（見 `TODO.md` 待辦） |
| `tests/i18n.spec.mjs`（`npm test` 走 Playwright） | **E2E**（不是核心邏輯層測試） | 只守 3–5 條關鍵使用者旅程，不拿來覆蓋狀態組合（狀態組合歸核心邏輯層） |
| `index.html` 其餘畫面渲染（週表、modal、表單） | 畫面 | 穩定後只補兩類（顯示對的數字、關閉路徑） |

- 驗證 UI：`preview_start`（見 `.claude/launch.json`）；不用 Bash 起 server。
- commit 前不跑 `npm test`：它會執行 `tests/i18n.spec.mjs`，對正式 Supabase 送出真實預約（見「Supabase」節，已套用到正式資料庫）。只在動到 i18n 或預約流程、且經使用者確認後手動跑，跑完務必確認清理（afterEach）成功，殘留假預約會被 `bookings_no_overlap` 擋住真實時段。
- 全跑：目前沒有可安全自動跑的測試。
- 本專案的「單一定義處」（假回應要從這裡推導）：目前無假回應常數；核心邏輯尚未拆出獨立單元測試前不適用。
- 函式內嵌在 7000+ 行的 `index.html` 裡，要為 `checkRecurringConflicts` 這類函式寫單元測試前得先抽出來，
  這會跟本檔「修改策略：不要一次重整整份 index.html」有張力，抽取時只動需要的函式、不整檔重排。

### 本專案約定

- 追蹤檔與未修的 M／L 清單：`TODO.md` 的「未修的 M／L 清單」段。
- 接手先讀：`TODO.md` 的「下一步入口」。
- 追蹤檔打勾的 commit：無專案專屬規定（附證據照全域硬規則 4）。
- 驗證腳本目錄：`tests/scripts/`；驗證 harness：未建。
- 瀏覽器重複檢查登記簿：`tests/checks.md`（還沒建時照 browser-verify 守則由主對話建）。
- 單元測試框架待建時的待辦寫法：上方層對照表對 `checkRecurringConflicts` 記「待建立」，待辦見 `TODO.md`
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
必驗（規格）：（待補；使用者確認後填）
外部出狀況要的行為：（待補；使用者確認後填）
誰用、錯了的代價：多人（跨分頁、跨使用者）預約同一批會議室的系統（根目錄 `index.html`，GitHub Pages），預約存在 Supabase `bookings`。錯了的代價：時段防撞三層失效造成重複預約；Supabase 預約資料遺失或毀損；`npm test` 會對正式 Supabase 送出真實預約，殘留假預約會被 `bookings_no_overlap` 擋住真實時段；改資料庫 DDL 由使用者在後台執行（Claude 無法直接下 DDL）；push main 會同時觸發 GitHub Pages 與 Cloudflare Worker 部署
```
