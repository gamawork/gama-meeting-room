#!/usr/bin/env bash
# 每日備份地端 bookings（W-1106-vm-migration 驗收 10）。VM 上 cron 每天 02:30 執行，輸出附加到 ~/backups/backup.log。
# 每次備份一個資料夾 ~/backups/YYYYMMDD-HHMMSS/：bookings.dump（pg_dump 自訂格式，含表結構、權限、RLS 與資料）、
#   verify.txt（備份當下的核對值）、sample-id.txt。
# 只保留最新 7 份（使用者 2026-11-09）：新備份成功並核對過才刪最舊的；備份失敗時舊的一份都不刪。
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$HOME/backups"
KEEP=7
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
TS=$(date +%Y%m%d-%H%M%S)
log() { echo "$(date '+%F %T') $*"; }
dbx() { docker exec -i "$DB_CONTAINER" "$@"; }

mkdir -p "$DIR"; chmod 700 "$DIR"
TMP="$DIR/.tmp-$TS"
trap 'rm -rf "$TMP"' EXIT
mkdir "$TMP"

SAMPLE_ID=$(dbx psql -U postgres -X -At -v ON_ERROR_STOP=1 -c "select id from public.bookings order by id limit 1")
SAMPLE_ID=${SAMPLE_ID:-00000000-0000-0000-0000-000000000000}   # 空表時給個不存在的 id
verify() { dbx psql -U postgres -X -At -v ON_ERROR_STOP=1 -v sample_id="$SAMPLE_ID" < "$HERE/verify-data.sql"; }

# 備份前後核對值相同，才代表這份備份沒被中途寫入影響；不同就重來，最多 3 次
ok=0
for try in 1 2 3; do
  verify > "$TMP/before.txt"
  dbx pg_dump -U postgres -Fc --table=public.bookings postgres < /dev/null > "$TMP/bookings.dump"
  verify > "$TMP/verify.txt"
  if diff -q "$TMP/before.txt" "$TMP/verify.txt" > /dev/null; then ok=1; break; fi
  log "第 $try 次備份期間資料有變動，重來"
  sleep 10
done
[ "$ok" = 1 ] || { log "失敗：連續 3 次備份期間資料都有變動，本次沒有備份，舊備份保留"; exit 1; }

# 備份檔要讀得出目錄（確認不是空檔或壞檔）
TOC=$(dbx pg_restore -l < "$TMP/bookings.dump") || TOC=""   # 不接管線：grep -q 提早結束在 pipefail 下會誤判
grep -q 'TABLE DATA public bookings' <<< "$TOC" \
  || { log "失敗：備份檔讀不出 bookings 資料，舊備份保留"; exit 1; }

rm "$TMP/before.txt"
echo "$SAMPLE_ID" > "$TMP/sample-id.txt"
chmod 600 "$TMP"/*
mv "$TMP" "$DIR/$TS"; trap - EXIT
COUNT=$(sed -n '/^## 總筆數/{n;p}' "$DIR/$TS/verify.txt")
log "成功：$DIR/$TS（$COUNT 筆，$(du -h "$DIR/$TS/bookings.dump" | cut -f1)）"

# 只留最新 KEEP 份（資料夾名稱即時間，排序即新舊）
mapfile -t OLD < <(find "$DIR" -mindepth 1 -maxdepth 1 -type d -name '2*' | sort | head -n -"$KEEP")
for d in "${OLD[@]}"; do rm -rf "$d"; log "刪除舊備份：$d"; done
log "目前備份份數：$(find "$DIR" -mindepth 1 -maxdepth 1 -type d -name '2*' | wc -l)"
