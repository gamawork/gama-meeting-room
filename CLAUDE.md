# Gama Meeting Room 專案注意事項

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

## 發生亂碼時的處理

- 不要直接在壞掉的檔案上繼續修字串。
- 先用 git 版本還原乾淨內容，再重新套用必要修改。
- 還原後先確認中文可正常顯示，再繼續改功能。

## 驗證節奏：分風險收工（試行 2026-09）

> **逐字複本**：本段的正本在 `~/.claude/playbooks/project-claude-template.md` 第七節，各專案 CLAUDE.md
> 逐字複製、不改寫；要改條文先改正本，再 `grep -rl "驗證節奏：分風險收工"` 找出所有複本一起同步。
> 全域 `rules/model-dispatch.md` §6 以「標題含『驗證節奏：分風險收工』」認這段，改標題時保留這幾個字。
> **重寫、重建或整份刪除專案 CLAUDE.md 時，本段必須保留**；改完照 `~/.claude/playbooks/maintenance.md` §5「逐字複本」那條檢查（標題 grep 為 1＋與正本逐字比對），不必跑 §5 其他項。
> （2026-09-25 Accounting：908c836「打掉重來」刪掉專案 CLAUDE.md 重寫，本段遺失，之後兩天照全域最嚴格版本跑，登入頁審 4 輪、更新橫幅審 5 輪；使用者裁定。）
> **本段是試行門檻的唯一定義處**；專案差異（追蹤檔在哪、腳本目錄）寫在緊接的「本專案對照」小節，不改本段。
> 適用於任何階段的專案（原型、開發中、已上線都算；方向未定的樣稿除外，照 §6），因為放寬的只有「不傷錢、不傷資料」的問題。

- **風險分級以 finding 為單位，不以專案為單位**。每條 finding 先判是不是**風險類**：
  金額算錯或顯示錯、已存資料遺失或毀損、安全漏洞、不可逆操作／刪資料／對外發布出錯——
  不分 H／M 都算。**拿不準就當風險類**；不准為了收工把風險類說成一般類。
- **核心邏輯**（算錢、狀態機）照 R8「寫程式之前」：開工前先列不變式（建議 3–5 條）並寫測試。不延後。
- **程式碼的審查→修正→再審迴圈**（model-dispatch §6「修正後再審」那條）：
  - **風險類**：當場修，修正照 §6 再審，直到最後一輪沒有風險類 finding。**不受輪數上限、不延後**；
    金額相關的 opus 第二意見照 §6「高風險判斷」另開，不算在下面的 2 輪裡。
  - **功能項**＝§6 判為「新功能」或「大改版」的一件工作：追蹤檔（以「本專案對照」寫的為準）有功能項
    清單就照清單，沒有就以使用者的一次請求為一件。§6 判為**小修**的請求不是功能項：照 §6 不開審查，
    也不跑下面的收工輪。§6 判為方向未定的樣稿也不是功能項：不審查、不跑收工輪、不列不變式。
  - **其他 H**（非風險類但會產生錯誤結果）：當場修。每個功能項最多 2 輪審查，修正批不重新計數。
    第 2 輪仍有 H：照樣修，但不自動開第 3 輪；回報列出這些 H、修法，並標「未經再審」，由使用者決定要不要再審。
  - **其他 M**：不修，記進追蹤檔的「延後的 M」清單；功能項可以打勾，但回報要寫出本批延後了幾條 M
    與清單目前總條數。使用者要求時、或上線／交付前（push 即部署的專案：每個功能項收尾回報時）列給使用者排優先序。
  - 為風險類另開的再審輪不計入 2 輪；那一輪順帶找到的非風險類 finding 照一般類處理（H 當場修但不因此再開輪、
    M 延後）。
  - H 修到一半的殘留仍是 H；功能項的審查輪（不含修正批的再審，那個範圍照 §6 只看該批 diff）裡，
    本功能範圍內的既有問題不因「不在本次 diff」就排除（範圍外的照手術刀原則只回報，不擋收工）。L 不擋收工（照 §6）。
  - 不適用（照全域規則）：不可逆操作／刪資料／對外發布的第二意見、掃描類覆核、制度檔一致性檢查。
- **瀏覽器驗證**：修正 agent 只驗自己修的那條，不巡全畫面。每個有 UI 改動的功能項收尾時，派一個 `opus`
  agent（驗收類，照 model-dispatch §3）做一次全畫面巡檢（這就是「收工輪」），prompt 帶
  `playbooks/browser-verify.md` 守則，關閉路徑（Esc、點外面、返回鍵）與斷點切換照守則的方法驗。
  收工輪不計入上面的 2 輪：它找到的風險類照「風險類」處理；其他 H 照修、修正 agent 只驗該條，
  不再開審查輪，回報列出並標「未經再審」；其他 M 延後。PWA 專案：pwa-starter §3-5 的階段總驗收
  照舊跑；某次功能項收尾剛好也是階段收尾時，兩者合併成一次；§3-1 的完成度分級與本段分級兩種都做，互不取代。
  （重複行為檢查的腳本化是全域規則，在 browser-verify 守則，不是本段限定。）
- **收工量測**：每個功能項收尾跑
  `python "$HOME/.claude/scripts/scan_verify_cost.py" <本專案目錄關鍵字> --since 2026-09-24`，
  只比**佔比**（瀏覽器 %、fix 類 token %、long_ctx）；本專案的試行前基準用同一支腳本加
  `--until 2026-09-23` 量，同一把尺比，不要拿人工數字、也不要拿別處抄來的數字比。審查輪數腳本算不出來，
  從審查紀錄人工數。日期以 UTC 切，前後一天的邊界 session 會落錯邊，看趨勢不看小數點。
  **跨專案參考**（Accounting 原型，試行前）：5 輪覆核、主對話約 8.8 小時、撞到一次額度上限；佔比一律用
  `scan_verify_cost.py Accounting --until 2026-09-23` 當場重現，不抄數字。

#### 本專案對照（驗證節奏與今天的測試規則落在哪）

- 審查規模看改動型態（小修不開審查、新功能完成後審、大改版先審規格、金額加第二意見）：全域 model-dispatch §6。
- 追蹤檔與「延後的 M」清單：`TODO.md` 的「延後的 M」段；接手先讀 `TODO.md` 的「下一步入口」。
- 風險類在本專案具體指：`bookings` 預約資料（時段防撞三層失效造成重複預約）、Supabase 資料遺失或毀損。
- 瀏覽器重複檢查登記簿：`tests/checks.md`（還沒建時照 browser-verify 守則由主對話建）；腳本目錄：`tests/scripts/`。
- 量測關鍵字：`scan_verify_cost.py gama-meeting-room`。
