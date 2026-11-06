#!/usr/bin/env bash
# 把 export-cloud-data.sh 的輸出匯入地端自架 Supabase，並算地端核對值跟雲端比對（W-1106-vm-migration 驗收 4）。
# 用法：bash import-local-data.sh <cloud-data-資料夾>
# 只在地端 bookings 是空的時候匯入；單一 transaction，失敗就整批 rollback。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$1" && pwd)"
SAMPLE_ID="$(cat "$SRC/sample-id.txt")"
dbx() { docker exec -i supabase-db "$@"; }

if ! diff -q "$SRC/verify-before.txt" "$SRC/verify-after.txt" > /dev/null; then
  echo "停止：這份匯出前後核對值不同（匯出期間雲端有變動），請重新匯出"; exit 1
fi

N=$(dbx psql -U postgres -X -At -c "select count(*) from public.bookings")
if [ "$N" != "0" ]; then
  echo "停止：地端 bookings 已有 $N 筆，這支腳本只匯入空表"; exit 1
fi

echo "匯入地端…"
dbx psql -U postgres -X -q -1 -v ON_ERROR_STOP=1 < "$SRC/bookings-data.sql"

echo "地端核對值…"
dbx psql -U postgres -X -At -v ON_ERROR_STOP=1 -v sample_id="$SAMPLE_ID" < "$HERE/verify-data.sql" > "$SRC/verify-local.txt"
chmod 600 "$SRC/verify-local.txt"

echo "比對 雲端（匯出後） vs 地端："
if diff "$SRC/verify-after.txt" "$SRC/verify-local.txt"; then
  echo "一致"
else
  echo "不一致（見上方 diff）"; exit 1
fi
