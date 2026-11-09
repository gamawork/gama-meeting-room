# 構想：會議室系統搬到內部 VM（含 Supabase 地端化）

狀態：已開工作項 W-1106-vm-migration（`TODO.md`），2026-11-06 拿到 VM；最初 2026-11-02 規劃。來源：同事建議（方便管理、可建 VM 還原點、開發平台盡量內網收斂）；
使用者 2026-11-02 裁定：Supabase 一起搬到地端，走下方方案 2（決策紀錄 D-3）。
搬完才做「預約時寄 Outlook 會議邀請」（[../email-invite/](../email-invite/README.md)，決策紀錄 D-2），寄信後端會放在這台 VM 上。

## 現況（2026-11-02 實查）

| 東西 | 現在在哪 | 搬 VM 會怎樣 |
|---|---|---|
| 網站（根目錄 `index.html`，單檔） | GitHub Pages，push main 自動部署 | 放 VM 的網頁伺服器 |
| 預約資料（`bookings`）與即時同步 | Supabase 雲端（`vicvccudnqluufsgyznk.supabase.co`），前端用 `supabase-js` 直接讀寫、訂閱 Realtime | 地端化：VM 上自架 Supabase，資料搬過去 |
| `supabase-js` 函式庫 | `unpkg.com` CDN（`index.html` 的 `<script src>`，固定 2.39.0） | VM 能上外網就不用動；要完全內網就改成放在 VM |
| 台灣節日資料 | `cdn.jsdelivr.net`（`ruyut/TaiwanCalendar`），失敗時不阻擋預約（專案規格） | 同上 |
| 介紹頁 `launch/` 與「看 20 秒示範」影片 | Cloudflare Worker，`index.html` 有 5 處寫死它的網址 | 可先留在 Cloudflare 不動 |
| 使用者自己的設定（語言、「我是誰」、篩選、通知開關、提醒） | 瀏覽器 localStorage，跟網址綁在一起 | **換網址後每個人要重設一次**，通知權限也要重新允許 |

## VM 現況（2026-11-06 實查，唯讀）

| 項目 | 結果 |
|---|---|
| 位址／帳號 | `10.10.2.96`，主機名 `reserve`，帳號 `gama`（密碼在本機 `SSH.ENV.txt`，已 gitignore）；Claude 用專用金鑰 `~/.ssh/id_ed25519_gama_vm` 登入 |
| 系統 | Ubuntu 24.04.5 LTS（kernel 6.8） |
| 規格 | 2 核、3.8 GB 記憶體、95 GB 硬碟（已用 8%） |
| 權限 | `gama` 在 sudo 群組，但 sudo 要密碼；Claude 不代輸密碼，要 sudo 的步驟由使用者執行 |
| 已裝 | git 2.43；**沒有 Docker** |
| 對外連線 | unpkg、jsdelivr、GitHub、Docker Hub、雲端 Supabase 都通 |
| 目前開的服務 | 只有 SSH（22） |

- 規格低於 Supabase 官方自架最低需求（4 GB RAM、2 核、40 GB；建議 8 GB、4 核，[官方文件](https://supabase.com/docs/guides/self-hosting/docker) 2026-11-06 查）。
  使用者 2026-11-06：先照現有規格用。做法：關掉用不到的服務（Storage、imgproxy、Edge Functions、analytics／logflare、vector），保留 db、auth、rest（PostgREST）、realtime、kong、studio（管理後台）、meta；試跑時觀察記憶體，不夠再找 IT 加。

### 自架 Supabase 安裝紀錄（2026-11-06）

- 位置：VM `~/supabase-project`（官方 `self-hosted/v0.8.4`，版本寫在 `.supabase-version`，可用官方 `update.sh` 升級）；原始 compose 備份 `docker-compose.yml.orig`；密鑰在 `.env`（權限 600，全部用官方腳本新產生，只在 VM 上）。
- 對外入口：`http://10.10.2.96:8000`（API 閘道；`/` 是管理後台，要帳密）。還沒有 HTTPS 與網域。
- 留下的服務：db（PostgreSQL 17.6）、auth、rest、realtime、meta、studio、API 閘道（新版預設 Envoy，不是 Kong）。拿掉 storage、imgproxy、functions、supavisor（pooler）；analytics、vector 新版已移到另一個 compose 檔，本來就不啟動。
- 拿掉 pooler 後，**資料庫沒有對外 port**，只能在 VM 內 `docker exec supabase-db psql -U postgres`。搬資料時從 VM 內匯入，或屆時再開 port。
- 閒置記憶體：容器合計約 630 MiB，整機可用約 2.5 GiB。
- 已知：管理後台密碼在架設時曾出現在工具輸出，已當場換新（舊密碼實測 401）。
- 2026-11-06 14:47–15:02 本機連 VM 的所有 port 都被拒絕，VM 本身沒重開、容器也沒中斷；推測是公司網路設備擋了短時間內大量連線，未證實。之後對 VM 的大量測試要放慢。
  2026-11-06 約 17:4x 第二次：幾分鐘內 5～6 條 ssh／scp 後 22 port 被拒，約 3 分鐘恢復。之後每一步只開一條 ssh，檔案從同一條連線的 stdin 傳。
  2026-11-06 約 20:3x 第三次：之前兩個多小時沒連過，第一條 ssh 就被拒，等到 20:45 以後仍未恢復（使用者喊停，沒繼續等）。「連太多次才被擋」的推測不成立，原因未知（公司網路設備或 VM 本身），要請 IT 一起看。
  2026-11-09 08:56 再連已恢復，VM 期間沒重開（uptime 2 天 19 小時）；原因仍未知。
- 資料已試搬（2026-11-09，驗收 4）：地端 `bookings` 是 11-09 08:59 的雲端快照 1761 筆，與雲端核對值一致。做法：`scripts/dryrun-import.sh`（假資料乾跑）→ `export-cloud-data.sh` → `import-local-data.sh`；匯出檔只在 VM `~/migration/cloud-data-*`。
- 每日備份（2026-11-09，驗收 10）：`gama` 的 crontab 每天 02:30 跑 `~/ops/backup-db.sh`，備份到 `~/backups/YYYYMMDD-HHMMSS/`，只留最新 7 份（新的成功才刪最舊的），紀錄在 `~/backups/backup.log`。還原：`bash ~/ops/restore-drill.sh [備份資料夾]` 只還原到暫存資料庫做比對；真的要還原正式資料時，用同一份 `bookings.dump` 先清空 `bookings` 再 `pg_restore --data-only`，動手前先問使用者。備份只在 VM 本機，之後加一份複製到 IT 給的位置。
- 測試站（2026-11-09，驗收 6）：`http://10.10.2.96/`，VM 上 nginx 容器 `gama-site`（port 80），檔案在 `~/site`（上一版 `~/site-prev`）。部署：本機 repo 根目錄跑 `bash docs/ideas/vm-migration/scripts/deploy-site.sh`，只上傳已 commit 的 `index.html`、`gama.ico`，在 VM 上把資料庫網址與金鑰換成地端、標題加「【VM 測試站】」。repo 的 `index.html` 仍指雲端。
  - 已知限制：走 http 不是安全連線，瀏覽器不開放桌面通知，要等 HTTPS（驗收 5）。supabase-js 仍從 unpkg.com、節日資料從 cdn.jsdelivr.net 載入，使用者電腦連不到外網時 supabase-js 載不到、整個系統打不開（節日有降級，supabase-js 沒有）。使用者 2026-11-09：公司網路連得到外網，但仍傾向把 supabase-js 放 VM。做法：`deploy-site.sh` 部署時下載固定的 2.39.0 版、核對 sha256 後放 VM `~/site/vendor/`，頁面改從 VM 載入；repo 的 `index.html` 與測試不變（仍是 unpkg 網址，正式站照舊）。換版本時要同步改腳本裡的 `SDK_*`。節日資料仍從 jsdelivr 載入（失敗有降級）。
- 部署方式（使用者 2026-11-09：push 後手動部署，取代 push main 自動上 GitHub Pages）：
  1. commit → `git push` main → 在 repo 根目錄跑 `bash docs/ideas/vm-migration/scripts/deploy-site.sh`（正式切換前；切換後加 `--prod`，不顯示「【VM 測試站】」）。腳本會檢查 HEAD 等於 origin/main，沒 push 就停。
  2. 看輸出的版本第一行等於剛 push 的 commit，第二行是模式（test／prod）。
  3. 部署後有問題要退回上一版：在 VM 上 `mv ~/site ~/site-bad && mv ~/site-prev ~/site && docker restart gama-site`（只能退一版）。
  4. 正式切換前 push main 仍會同時更新 GitHub Pages 正式站（照舊）。
- 結構已重建（2026-11-06，驗收 3）：`bookings` 與雲端逐項一致，做法與證據見 `scripts/`（`export-cloud-schema.sh`、`rebuild-schema.sql`、`inventory.sql`）與 `evidence/2026-11-06-schema/`。雲端是 PostgreSQL 17.4，`btree_gist` 裝在 public。

## 資料庫存取現況（2026-11-06 實測，雲端 Supabase）

前端沒有登入，`index.html` 裡寫著 Supabase 網址與公開金鑰（`anon`），任何打得開網頁的人都拿得到。實測只用這把公開金鑰：

| 動作 | 結果 | 證據 |
|---|---|---|
| 讀全部預約 | **可以**：總筆數 1760、未來 7 天 11 筆，欄位含標題、主辦人、與會者 | REST `GET /bookings` 回 200／206 與 `Content-Range` |
| 新增 | **可以** | 前端本身就用這把金鑰 `.insert(...)`（`index.html:4841`），正式站新增正常 |
| 修改、刪除 | **可以** | 前端用同一把金鑰 `.update`／`.delete`（`index.html:5897,6694`）；實測用不會命中任何資料的條件送 PATCH／DELETE，回 200 而非權限錯誤，前後筆數都是 1760（沒動到資料） |

- 意思是：知道網址的人都能用程式讀到所有人的會議，也能改或刪別人的預約。使用者自己抓資料做開會提醒，靠的就是這一點。
- 搬進內網後，公司外的人連不到，但**公司內網任何人仍然一樣能讀寫**。要擋就得加登入或後端權限，這已超出 D-3 範圍，列在下方「未決」。
- 搬遷後網址與金鑰都會換，使用者自己的開會提醒程式也要跟著改。

## 三件一定要先講清楚的事

1. **要 HTTPS**：桌面通知（`Notification`）和一鍵複製（`navigator.clipboard`）只能在 HTTPS 下用；Supabase 的 API 與 Realtime 也要走 HTTPS，否則瀏覽器會擋（HTTPS 網頁不能連 HTTP 的 API）。
   要有內部網域名稱（例：`meeting.gama.local`、`supabase.gama.local`），加上公司電腦與手機都信任的憑證（通常是 AD 的內部 CA，由 IT 處理）。
2. **手機在外面會連不到**：GitHub Pages 是公開網站，現在同事在外面用手機也能預約；搬進內網後，只有公司網路或 VPN 才連得到。使用者 2026-11-02：不在本專案範圍，不處理。
3. **資料搬遷不能掉資料、不能雙寫**：切換當下要先停止舊站寫入，再匯出、匯入、核對筆數，才開新站；否則會有預約只寫進舊庫。這屬於專案的 L2 風險（資料遺失／毀損、重複預約）。

## 搬遷範圍

| 方案 | 做什麼 | 程式要改多少 | 維運負擔 | 評估 |
|---|---|---|---|---|
| 1. 只搬網站 | 網站放 VM，資料庫留 Supabase 雲端 | 幾乎不用改 | 低 | 不符合「地端化」；只適合當過渡 |
| **2. 網站＋自架 Supabase（地端化主線）** | VM 上用 Docker 跑官方自架版 Supabase，把資料搬過去 | 前端只改 Supabase 網址與金鑰 | 中高：多個容器、要自己升級、備份、監控 | 資料全在內網，VM 還原點能保護資料 |
| 3. 網站＋自寫後端與資料庫 | 不用 Supabase，改成自己的 API＋Postgres | 大改：讀寫、即時同步、錯誤處理都要重做 | 中 | 不建議，工作量和風險最大 |

可以一次做到方案 2；想降低風險也可以先做方案 1 試跑網站部署，再接著搬資料庫。

## 方案 2 步驟草案

1. **跟 IT 要資源**（見下方「待 IT 確認」）。
2. **VM 上架自架 Supabase**（Docker），設好管理後台密碼、JWT 密鑰、新的 `anon`／`service_role` 金鑰。
3. **重建資料庫結構**：以雲端現有結構為準匯出（不是憑 `CLAUDE.md` 手抄），至少要涵蓋：
   - `bookings` 表（含 `attendees` 欄）、權限（GRANT）與 RLS 政策
   - `btree_gist` 擴充與 `bookings_no_overlap` 防撞約束（防撞第 3 層）
   - `bookings` 加進 `supabase_realtime` publication（否則週表不會自動更新、桌面通知不觸發）
4. **試搬資料**：雲端匯出一份，匯入地端，核對總筆數與抽樣幾筆（頭、尾、隨機）。
5. **前端指向地端**：`index.html` 的 Supabase 網址與金鑰改成地端的；網站放 VM 的網頁伺服器，先用測試網址試跑。
   單元測試的假 Supabase 會從 `index.html` 抽網址（`tests/unit/support/mock-supabase.mjs`），改完要跑一次 `npm test` 確認沒壞。
6. **部署方式**：取代「push main 自動部署」，例：VM 上放 git clone，用部署腳本 `git pull`（VM 要能連 GitHub）。
7. **正式切換**（選一個沒人開會的時段）：
   - 舊站改成唯讀或掛「維護中」，停止寫入
   - 雲端做最後一次匯出 → 匯入地端 → 核對筆數
   - 開放新站；舊網址轉到新網址（`launch/index.html` 已有同樣的轉址做法）
   - 雲端 Supabase 保留一段時間當備援，確定沒問題再停用
8. **備份**：VM 還原點加上每天自動匯出資料庫，並實際做一次還原演練。
9. **文件同步**：`CLAUDE.md`（部署段、Supabase 段的「Claude 無法直接下 DDL」可能要改）、`SPEC.md`、`docs/使用情境.md`。

## 切換後驗收清單（草案）

- 筆數核對：地端與雲端最後一次匯出的總筆數一致，抽樣 3 筆內容一致。
- 新增、修改、刪除預約正常；同時段重複預約會被擋（含兩個分頁同時送出，驗防撞第 3 層真的有建起來）。
- 兩個分頁開著，一邊預約，另一邊週表自動更新（Realtime）。
- 「我的行事曆」桌面通知能開啟、能收到（驗證 HTTPS 有效）。
- 地端 Supabase 停掉時，前端顯示錯誤、不假裝預約成功（專案規格）。
- 一鍵複製可用；節日正常顯示，擋掉節日來源時會議仍可見可操作。
- 中英文切換；手機在公司 Wi-Fi 下可用。
- 「看 20 秒示範」影片與介紹頁連結仍可開。

## 待 IT 確認（使用者 2026-11-02 回覆）

1. VM：**IT 會給**；規格、管理、還原點由 IT 處理，本專案不管。→ 2026-11-06 已拿到，見上方「VM 現況」。
2. 內部網域名稱與 HTTPS 憑證：**到時候再問**（網站與 Supabase 各一個或共用；公司電腦與手機都要信任）。
3. VM 連外網（unpkg、jsdelivr、GitHub）：**應該可以，先不管**；實際拿到 VM 時順手確認，不行的話函式庫與節日資料改放 VM、部署改從內部 git 拉。
4. 公司外（手機 4G）能不能用：**不在本專案範圍**，不處理。
5. 公司信箱：**自架 Exchange**。寄信走 VM → 內網 SMTP relay 或系統寄件帳號；Microsoft Graph（寄法 C）不適用。寄件帳號到做寄信時再跟 IT 要。

## 未決（要使用者決定）

- ~~Supabase 是否確定地端化~~ → 確定地端化，走方案 2（使用者 2026-11-02，D-3）。
- ~~一次做到方案 2，還是先方案 1~~ → 直接方案 2，先並行試跑再切換（使用者 2026-11-06，D-4）。
- ~~驗證等級~~ → L2（使用者 2026-11-06 核准，D-4）。
- VM 記憶體不足官方最低需求：~~要不要找 IT 加~~ → 先照用、精簡服務（使用者 2026-11-06）。
- 要不要加存取控制（登入或後端權限），讓內網的人不能任意讀、改、刪別人的預約：不在 D-3 範圍，未決。
- 內部網域名稱與 HTTPS 憑證：要開始問 IT（卡住「網站與 Supabase 用什麼網址」）。
