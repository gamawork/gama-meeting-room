#!/usr/bin/env bash
# 用假資料乾跑 import-local-data.sh（W-1106-vm-migration 驗收 4 的前置）。只碰地端，不連雲端。
# 流程：地端塞 3 筆標記資料 → 照 export-cloud-data.sh 的格式從地端匯出 → 清空 → import-local-data.sh 應印「一致」
#       → 防呆 1：表非空時再匯入應拒絕 → 防呆 2：匯出前後核對值不同應拒絕 → 清回 0 筆。
# 假資料標題一律以 DRYRUN-W1106 開頭，結束（含失敗）時一律刪掉。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/dryrun-$(date +%Y%m%d-%H%M%S)"
TAG="DRYRUN-W1106"
dbx() { docker exec -i supabase-db "$@"; }
q() { dbx psql -U postgres -X -At -v ON_ERROR_STOP=1 -c "$1"; }

cleanup() {
  q "delete from public.bookings where title like '$TAG%'" > /dev/null
  echo "清理後地端筆數：$(q 'select count(*) from public.bookings')"
}

N=$(q "select count(*) from public.bookings")
if [ "$N" != "0" ]; then echo "停止：地端 bookings 已有 $N 筆，乾跑只在空表上做"; exit 1; fi
trap cleanup EXIT

echo "塞 3 筆假資料…"
q "insert into public.bookings (date, room, start_time, end_time, title, organizer, created_at, attendees) values
  ('2026-01-05', 'A', '09:00', '10:00', '$TAG 第一筆', '測試者', '2026-01-01 08:00:00+08', null),
  ('2026-06-15', 'B', '13:30', '14:00', '$TAG 第二筆，含逗號', '測試者', '2026-01-02 08:00:00+08', '甲, 乙'),
  ('2026-12-31', 'A', '17:00', '18:00', '$TAG 第三筆 ''引號''', '測試者', '2026-01-03 08:00:00+08', '丙')" > /dev/null

mkdir -p "$OUT"; chmod 700 "$OUT"
SAMPLE_ID=$(q "select id from public.bookings order by random() limit 1")
echo "$SAMPLE_ID" > "$OUT/sample-id.txt"
dbx psql -U postgres -X -At -v ON_ERROR_STOP=1 -v sample_id="$SAMPLE_ID" < "$HERE/verify-data.sql" > "$OUT/verify-before.txt"
dbx pg_dump -U postgres --data-only --table=public.bookings < /dev/null > "$OUT/bookings-data.sql"
dbx psql -U postgres -X -At -v ON_ERROR_STOP=1 -v sample_id="$SAMPLE_ID" < "$HERE/verify-data.sql" > "$OUT/verify-after.txt"
chmod 600 "$OUT"/*
echo "--- 匯出的核對值："; cat "$OUT/verify-after.txt"; echo "---"

q "delete from public.bookings where title like '$TAG%'" > /dev/null
echo "清空後筆數：$(q 'select count(*) from public.bookings')"

echo "=== 主流程：import-local-data.sh"
bash "$HERE/import-local-data.sh" "$OUT"

echo "=== 防呆 1：表非空時再匯入（應拒絕）"
if bash "$HERE/import-local-data.sh" "$OUT"; then echo "防呆 1 失敗：竟然匯入了"; exit 1; else echo "防呆 1 通過"; fi

echo "=== 防呆 2：匯出前後核對值不同（應拒絕）"
BAD="$OUT-tampered"; cp -r "$OUT" "$BAD"; echo "x" >> "$BAD/verify-after.txt"
q "delete from public.bookings where title like '$TAG%'" > /dev/null
if bash "$HERE/import-local-data.sh" "$BAD"; then echo "防呆 2 失敗：竟然匯入了"; exit 1; else echo "防呆 2 通過"; fi
echo "防呆 2 後筆數（應為 0）：$(q 'select count(*) from public.bookings')"

echo "乾跑全部通過：$OUT"
