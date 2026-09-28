# 介紹短片

用 [onetake](https://github.com/feitangyuan/onetake) skill 製作（2026-09-27），1080p30 草稿。片中人名、會議主題取自正式資料庫的真實預約（登入者為 Ryan，2026-09-28 更新）；會議室維持片中版面，「Johnny Office」「Jackal Office」改成 Studio、Lounge。

| 影片 | 內容 | 原始檔 |
|---|---|---|
| `my-calendar-20s.mp4` | My Calendar：月／週／日切換、週檢視 Mine ↔ All、點空檔預約，拉回月再切 All | `src/my-calendar/` |
| `notifications-20s.mp4` | 桌面通知：新增、改時間、開會前提醒、取消 | `src/notifications/` |

## 原始檔

每個資料夾都是一支完整的片：

- `comp.html`：整支片，畫面由時間 `t` 決定
- `motion.js`：onetake 的動作庫
- `look.js`、`look.json`：配色與字型
- `score.py`：合成音效
- `beat-sheet.md`：分鏡表

預覽：用瀏覽器開 `comp.html?play`；要停在某個時間點看，用 `comp.html?t=6.4&hud`。

## 重新渲染

需要先把 onetake 裝在 `~/.claude/skills/onetake`，並準備 ffmpeg。在該片的資料夾裡執行：

```bash
export PYTHONUTF8=1
python3 score.py                                  # → events.json、sfx.wav
python3 ~/.claude/skills/onetake/scripts/render.py comp.html --out draft.mp4 --sfx sfx.wav --gap 8
python3 ~/.claude/skills/onetake/scripts/render.py comp.html --out film.mp4 --sfx sfx.wav --gap 8 --final   # 4K60 定稿
```

`--gap 8` 是為了讓快速移動的鏡頭拖影平順。草稿實際用的參數：My Calendar 另加 `--samples-max 48`，通知片另加 `--samples-min 8`。
產出的 `events.json`、`sfx.wav`、mp4 不要 commit 進 `src/`。
