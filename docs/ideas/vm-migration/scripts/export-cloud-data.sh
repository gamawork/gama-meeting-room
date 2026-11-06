#!/usr/bin/env bash
# 從雲端 Supabase 匯出 bookings 資料與核對值（W-1106-vm-migration 驗收 4；正式切換時重用）。
# 在 VM 上執行，借用 supabase-db 容器裡的 pg_dump／psql。只讀雲端。
# 密碼由執行的人在提示時輸入，不顯示、不寫檔。
# 正式站匯出時仍可能有人預約：匯出前後各算一次核對值，兩次相同才代表這份匯出沒被中途寫入影響。
# 輸出含全部預約內容，只留在 VM（權限 700／600），不要放進 repo。
set -euo pipefail

CLOUD_HOST=aws-0-us-east-1.pooler.supabase.com
CLOUD_USER=postgres.vicvccudnqluufsgyznk
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/cloud-data-$(date +%Y%m%d-%H%M)"
mkdir -p "$OUT"; chmod 700 "$OUT"

IFS= read -rsp "雲端資料庫密碼（輸入時不會顯示；不是 Supabase 網站登入密碼）: " PGPASSWORD; echo
export PGPASSWORD
export PGSSLMODE=require
CONN=(-h "$CLOUD_HOST" -p 5432 -U "$CLOUD_USER" -d postgres)
dbx() { docker exec -i -e PGPASSWORD -e PGSSLMODE supabase-db "$@"; }

echo "抽隨機樣本…"
SAMPLE_ID=$(dbx psql "${CONN[@]}" -X -At -v ON_ERROR_STOP=1 -c "select id from public.bookings order by random() limit 1")
echo "$SAMPLE_ID" > "$OUT/sample-id.txt"

echo "匯出前核對值…"
dbx psql "${CONN[@]}" -X -At -v ON_ERROR_STOP=1 -v sample_id="$SAMPLE_ID" < "$HERE/verify-data.sql" > "$OUT/verify-before.txt"

echo "匯出 bookings 資料…"
dbx pg_dump "${CONN[@]}" --data-only --table=public.bookings < /dev/null > "$OUT/bookings-data.sql"

echo "匯出後核對值…"
dbx psql "${CONN[@]}" -X -At -v ON_ERROR_STOP=1 -v sample_id="$SAMPLE_ID" < "$HERE/verify-data.sql" > "$OUT/verify-after.txt"

unset PGPASSWORD
chmod 600 "$OUT"/*

if diff -q "$OUT/verify-before.txt" "$OUT/verify-after.txt" > /dev/null; then
  echo "匯出前後核對值相同：這份匯出可用"
else
  echo "注意：匯出期間雲端資料有變動，請重跑一次"
fi
echo "完成：$OUT"
ls -l "$OUT"
