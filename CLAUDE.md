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

## 發生亂碼時的處理

- 不要直接在壞掉的檔案上繼續修字串。
- 先用 git 版本還原乾淨內容，再重新套用必要修改。
- 還原後先確認中文可正常顯示，再繼續改功能。
