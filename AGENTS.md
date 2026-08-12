# Gama Meeting Room 專案注意事項

## 檔案編碼

- `index.html` 為單檔大型頁面，且包含大量繁體中文內容。
- 修改 `index.html` 時，避免使用會整份重寫檔案內容的方式，特別是 PowerShell 的 `Set-Content`、`Out-File`、`>` 重新導出。
- 原因：這類做法容易在編碼轉換時把中文內容寫壞，造成亂碼。
- 優先使用局部編輯方式，例如 `apply_patch`。
- 如果真的需要整檔處理，先確認原始編碼，再以完全相同編碼寫回。

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

- Git user.name：`gamawork`
- Git user.email：`gamawork2025@gmail.com`
- Remote：`https://github.com/gamawork/gama-meeting-room.git`
- 個人帳號 `ryanchen945` 無 push 權限，操作前確認身分：

```bash
git config user.name "gamawork"
git config user.email "gamawork2025@gmail.com"
```

- 若遇到 403，清除 Windows 憑證管理員中 `github.com` 的記錄後重新登入。

## 發生亂碼時的處理

- 不要直接在壞掉的檔案上繼續修字串。
- 先用 git 版本還原乾淨內容，再重新套用必要修改。
- 還原後先確認中文可正常顯示，再繼續改功能。
