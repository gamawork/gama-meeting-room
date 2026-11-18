"""會議提醒 → Telegram（Ryan）。

復刻 n8n workflow `zJ1bKTt83XOfo8ZR`（2026-11-18 隨正式切換停用）：
讀 VM 正式站 `bookings`，主持人或出席者含 "ryan" 的會議，開會前 10 分鐘推 `@Gama_PM_Bot`。
由本機 Windows 工作排程器「GamaMeetingReminderTG」每小時 20、50 分呼叫（wscript 跑 ~/.gama-meeting-reminder/run-hidden.vbs，以隱藏視窗啟動 pythonw）
（只能跑在公司內網，網域外部解析不到）。

時間窗跟 n8n 一樣是「開始時間距排程時刻 5～20 分鐘」，但以「最近一個 :20／:50 時刻」為基準，
不是以實際執行時間為基準：排程晚幾分鐘啟動時，用實際時間算會漏掉 :30／:00 的會議。
已經開始的會議不推（app 關著、補跑時才不會推過期提醒）。

用法：python meeting-reminder-tg.py [--dry-run] [--now 2026-11-18T13:20] [--log 檔案]
憑證：~/.claude/secrets/gama_meeting_vm_anon_key.txt、~/.claude/secrets/telegram.md（Gama_PM_Bot 那行）。
"""
import argparse
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

API = "https://meeting.gamasys.com.tw/rest/v1/bookings"
CHAT_ID = "916446324"
TPE = timezone(timedelta(hours=8))
SECRETS = os.path.expanduser("~/.claude/secrets")


def read_key():
    with open(os.path.join(SECRETS, "gama_meeting_vm_anon_key.txt"), encoding="utf-8") as f:
        return f.read().strip()


def read_tg_token():
    with open(os.path.join(SECRETS, "telegram.md"), encoding="utf-8") as f:
        for line in f:
            if "Gama_PM_Bot" in line:
                m = re.search(r"\d{6,}:[A-Za-z0-9_-]{20,}", line)
                if m:
                    return m.group(0)
    raise SystemExit("找不到 Gama_PM_Bot token")


def slot_of(now):
    """往回取最近一個 :20 或 :50 的時刻。"""
    base = now.replace(second=0, microsecond=0)
    if now.minute >= 50:
        return base.replace(minute=50)
    if now.minute >= 20:
        return base.replace(minute=20)
    return (base - timedelta(hours=1)).replace(minute=50)


def fetch(today, tomorrow, key):
    q = urllib.parse.urlencode({
        "select": "*",
        "date": f"in.({today},{tomorrow})",
        "order": "date.asc,start_time.asc",
    }, safe="(),*")
    req = urllib.request.Request(f"{API}?{q}", headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def build(rows, now):
    slot = slot_of(now)
    out = []
    for b in rows:
        hay = f"{b.get('organizer') or ''} {b.get('attendees') or ''}".lower()
        if "ryan" not in hay:
            continue
        start = datetime.fromisoformat(f"{b['date']}T{b['start_time']}").replace(tzinfo=TPE)
        diff_slot = (start - slot).total_seconds() / 60
        if diff_slot < 5 or diff_slot >= 20:
            continue
        mins_left = round((start - now).total_seconds() / 60)
        if mins_left <= 0:
            continue
        e = lambda v: html.escape(str(v)) if v else "-"
        hhmm = lambda t: (t or "")[:5]
        lines = [
            f"⏰ <b>會議提醒</b>（{mins_left} 分鐘後開始）",
            "",
            "📌 " + (html.escape(b["title"]) if b.get("title") else "(未命名)"),
            f"🕐 {hhmm(b.get('start_time'))}–{hhmm(b.get('end_time'))}",
            "📍 " + e(b.get("room")),
            "👤 主持人：" + e(b.get("organizer")),
        ]
        if b.get("attendees"):
            lines.append("👥 出席者：" + html.escape(b["attendees"]))
        out.append("\n".join(lines))
    return slot, out


def send(token, text):
    data = json.dumps({"chat_id": CHAT_ID, "text": text, "parse_mode": "HTML"}).encode("utf-8")
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=data,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        if not json.load(r).get("ok"):
            raise RuntimeError("Telegram 回 ok=false")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只印出、不推 TG")
    ap.add_argument("--now", help="模擬現在時間（台北，例 2026-11-18T13:20）")
    ap.add_argument("--log", help="輸出（含錯誤）附加寫到這個檔；pythonw 無視窗執行時用")
    a = ap.parse_args()
    if a.log:
        sys.stdout = sys.stderr = open(a.log, "a", encoding="utf-8")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
    now = datetime.fromisoformat(a.now).replace(tzinfo=TPE) if a.now else datetime.now(TPE)
    today = now.date().isoformat()
    tomorrow = (now.date() + timedelta(days=1)).isoformat()
    rows = fetch(today, tomorrow, read_key())
    slot, msgs = build(rows, now)
    print(f"now={now:%Y-%m-%d %H:%M} slot={slot:%H:%M} 讀到 {len(rows)} 筆，要推 {len(msgs)} 則")
    token = None if a.dry_run else read_tg_token()
    for m in msgs:
        print("---\n" + m)
        if token:
            send(token, m)
    print("RESULT: " + ("dry-run" if a.dry_run else f"sent {len(msgs)}"))


if __name__ == "__main__":
    main()
