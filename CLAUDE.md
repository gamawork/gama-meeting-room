# Gama Meeting Room 專案注意事項

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

通則（一句話判準、分層時機、縮範圍跑、變異驗證、假回應常數）在全域 `rules/judgment.md` R8，這裡只填本專案的層對照。

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

### 驗證節奏：自動最多 2 輪（2026-10-03）

> **逐字複本**：本段的正本在 `~/.claude/playbooks/project-claude-template.md` 第七節，各專案 CLAUDE.md
> 逐字複製、不改寫；要改條文先改正本，再 `grep -rl "驗證節奏：自動最多 2 輪"` 找出所有複本一起同步。
> **重寫、重建或整份刪除專案 CLAUDE.md 時，本段必須保留**；改完照 `~/.claude/playbooks/maintenance.md` §5「逐字複本」那條檢查。
> 專案差異寫在緊接的「本專案對照」小節，不改本段。

- 流程照全域 `rules/model-dispatch.md` §6「程式碼審查（自動最多 2 輪）」；**功能項**＝delegation-templates §6 判為
  新功能或大改版的一件工作（追蹤檔有清單照清單，否則一次請求一件；小修、方向未定的樣稿不算）。

#### 本專案對照（驗證節奏與今天的測試規則落在哪）

- 風險類在本專案指（model-dispatch §6 風險類的具體化，不另立一套）：`bookings` 預約資料（時段防撞三層失效造成重複預約）、Supabase 資料遺失或毀損。
- 追蹤檔與未修的 M／L 清單：`TODO.md` 的「延後的 M」段；接手先讀 `TODO.md` 的「下一步入口」。
- 瀏覽器重複檢查登記簿：`tests/checks.md`（還沒建時照 browser-verify 守則由主對話建）；腳本目錄：`tests/scripts/`；驗證 harness：未建。

## 開工閘門：使用情境

> **逐字複本**：本段正本在 `~/.claude/playbooks/project-claude-template.md`「開工閘門：使用情境」節，各專案 CLAUDE.md
> 逐字複製、不改寫；要改條文先改正本，再 `grep -rl "開工閘門：使用情境"` 找出所有複本一起同步。
> 專案差異寫在本檔「專案 5 行摘要」與 `docs/使用情境.md`，不改本段。
> **重寫、重建或整份刪除專案 CLAUDE.md 時，本段必須保留**（同「驗證節奏」段的護欄）。
> （2026-10-02 qa-test-center：P1-A 驗收與審查 44 項有 59% 是平常不會遇到的邊角情境；使用者裁定。）

**專案層**：`docs/使用情境.md` 的「專案層使用情境」（10 欄，照範本第一節）與本檔「專案 5 行摘要」都要有「使用者確認 YYYY-MM-DD」。
缺檔、缺摘要或缺確認行時，下一個功能項開工前先由 Claude 起草給使用者確認、補進正本位置表，才開工。

**功能層**：每個功能項（定義照「驗證節奏」段；沒有該段時以使用者的一次新功能請求為一件；小修、方向未定的樣稿除外）
在寫驗收條件、0b 規格審查、派實作／審查／修正／驗收 agent 之前（開工前的唯讀盤點不受限）：
1. Claude 在追蹤檔該功能項下起草情境卡：主要流程 3–5 條，加上與專案 5 行摘要不同的行
   （標「＋」加嚴、「－」放寬；沒有差異寫「沿用專案摘要」）；第 3、5 行一律只挑本功能相關的寫出，不算差異。要做方向樣稿的，樣稿在本步之前做，確認過的「做完長這樣」併入主要流程。
2. 把主要流程與合併後的本功能 5 行一起貼給使用者，問「此功能照這個邏輯實作嗎？」；⚠ 條目（5 行格式第 4 行）另列一段逐條問，
   不併進這一問。確認後卡尾記「使用者確認 YYYY-MM-DD」。**沒有這行就不寫驗收條件、不派上述 agent。**
3. 確認後：驗收條件從使用者確認過的每條行為展開（主要流程、必驗、外部出狀況要的行為）。
   使用情境只用明寫的內容改變驗證範圍，沒寫到的照原規則；各驗證維度怎麼縮，只定義在 `~/.claude/playbooks/browser-verify.md`
   守則「驗證範圍」條。每個派工 prompt（規格審查、審表、實作、審查、修正、驗收）寫明功能項名稱並照抄該功能確認過的主要流程與 5 行（含 ⚠）；
   平行的功能項各帶各的，不混用。
4. 規格審查、審表、程式碼審查與驗收碰到「不驗」：不開 finding、不寫測試、不進驗收條件，只列一行「已知不處理」（審查寫在回報末尾）。
   不重判使用者確認過的不驗：必查清單（delegation-templates §6）項落在不驗也不報，其他擴大驗證範圍的通則同理。
   例外：後果是第 2 行列出的或拿不準的、卻沒有 ⚠ 明說的，照常回報並標「不驗漏標 ⚠」。
   5 行沒涵蓋、又看不出落在必驗或不驗的邊界情境，列「待歸類」一行、不列待決；這些情境的 finding 照原規則回報。使用者在 5 行之外另有指示時照指示。
5. 實作中發現新情境：主對話先停下問一行、改卡再續；subagent 不能停下問，在回報列一行，由主對話整理後一次問使用者。
6. 功能項打勾時：情境卡連同主要流程與 5 行移到 `docs/使用情境.md` 的「## 已完成功能」段（沒有就建）、記完成日期；
   本功能改變了專案層 10 欄任一欄時，同時更新 10 欄與專案 5 行摘要並請使用者確認。

**5 行格式**（每行只寫具名的事，不寫「常見」「盡量」「重要的」這類詞）：
1 對象與防護：誰用、幾人、在哪用（裝置）；要防誰（不用防／同事誤用與越權／公網任何人）
2 風險類＝：哪些後果算風險類（用後果寫，不用領域寫；與本檔「本專案對照」的風險類定義一致、以那裡為準，不另立一套）
3 必驗：具名列出（專案摘要列全部已確認的必驗；功能卡只挑與本功能相關的）
4 不驗：具名的情境；後果屬第 2 行風險類、或拿不準的，不併在整卡確認裡，在本行內另列一段標 ⚠ 逐條列出，使用者明說才算
  （記「使用者明說 YYYY-MM-DD」），沒明說的不算不驗
5 外部出狀況：每個外部系統一句「要的行為」（專案摘要列全部；功能卡只挑與本功能相關的）
