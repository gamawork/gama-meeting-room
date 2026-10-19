# SPEC — Gama Meeting Room（索引）

> 本專案規格正本的索引：列出各子檔管什麼。規格內容留在各子檔，這裡不複述。
> 改了「系統做什麼」的改動，對應的子檔要在同一個 commit 更新（全域 `rules/judgment.md` R2 第 5 項；修 bug、重構、純樣式、產生物不算）。
> 進度、驗收清單、交接在 `TODO.md`，不在這裡。

| 子檔 | 管什麼 | 狀態 |
|---|---|---|
| `CLAUDE.md`「Supabase」「Realtime」「時段防撞（三層）」節 | 資料庫欄位（`bookings.attendees`）、`supabase_realtime` publication 前提、防撞三層合約與建立 SQL（`bookings_no_overlap`） | 現行，已套用到正式資料庫（見各節日期） |
| `CLAUDE.md`「部署」節 | GitHub Pages／Cloudflare 介紹頁的部署方式，以及系統依賴介紹頁影片與網址的合約（四個 `data-video`、`.help-launch-link`） | 現行 |
| `docs/使用情境.md` | 專案層使用情境（對象、環境、錯了的代價、全站必驗）與已完成功能的情境卡（目前有「我的行事曆顯示節日」：月／週／日顯示節日、不受只看我的／全部影響、CDN 失敗不影響會議） | 使用者確認 2026-10-07，現行 |
| `docs/ideas/my-calendar/README.md` | 「我的行事曆」頁籤規格：「做完長這樣才算對」17 條（含使用者 2026-09-27 追加的第 11、13–17 條）、正式版與樣稿差異；樣稿 `mockup.html` | 方向使用者 2026-09-27 確認，正式版已上線（4774435、26a71a5）；檔頭「狀態」行仍寫「樣稿，待使用者確認方向」，尚未同步 |
| `docs/ideas/scale-zoom-views/README.md` | 月→日縮放檢視的構想與 5 張畫面（來自介紹短片，不是規格） | 構想，未決定要做；「我的行事曆」已實作其中一部分 |
| `tests/unit/logic.spec.mjs` | 例表：`checkRecurringConflicts`（防撞第 1 層，半開區間）、`generateRecurringDates`、`mycalIsMine` 的輸入 → 預期值 | 預期值取自現行輸出，不是使用者給的範例表；未標「已核准」 |
| `TESTING.md` | 測試怎麼跑、資料庫安全、單元測試防線與已驗證的變異（測試文件，不是產品規格） | 現行 |
| `docs/videos/README.md` | 介紹短片原始檔與重新渲染方式（製作文件，不是產品規格） | 現行 |
| `決策紀錄.md` | 使用者裁定與取消項索引（D-1：2026-10-19 meeting-room UI 不做＝W-1011-calmenu-clip、W-0928-month-mine-first 不修） | 現行；使用者 2026-09-27 的裁定仍寫在 `TODO.md` 的 W-0927-my-calendar 與「未修的 M／L 清單」末段，歸檔 W-0927-my-calendar 時搬入 |

文件互相矛盾時，實際程式碼最高（judgment R9）。
