#!/usr/bin/env bash
# 從雲端 Supabase 匯出 public schema 結構與盤點（W-1106-vm-migration 驗收 3）。
# 在 VM 上執行，借用 supabase-db 容器裡的 pg_dump／psql（PostgreSQL 17.6）。
# 只讀雲端：pg_dump --schema-only 與系統目錄查詢，不寫入任何東西。
# 密碼由執行的人在提示時輸入，不顯示、不寫檔；用環境變數名稱傳進容器，不出現在指令參數裡。
set -euo pipefail

CLOUD_HOST=aws-0-us-east-1.pooler.supabase.com
CLOUD_USER=postgres.vicvccudnqluufsgyznk
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/cloud-$(date +%Y%m%d-%H%M)"
mkdir -p "$OUT"

IFS= read -rsp "雲端資料庫密碼（輸入時不會顯示；不是 Supabase 網站登入密碼）: " PGPASSWORD; echo
export PGPASSWORD
export PGSSLMODE=require
CONN=(-h "$CLOUD_HOST" -p 5432 -U "$CLOUD_USER" -d postgres)

echo "匯出 public schema 結構…"
docker exec -e PGPASSWORD -e PGSSLMODE supabase-db \
  pg_dump "${CONN[@]}" --schema-only --schema=public > "$OUT/schema-public.sql"

echo "盤點系統目錄…"
docker exec -i -e PGPASSWORD -e PGSSLMODE supabase-db \
  psql "${CONN[@]}" -X -At -v ON_ERROR_STOP=1 < "$HERE/inventory.sql" > "$OUT/inventory.txt"

unset PGPASSWORD
echo "完成：$OUT"
ls -l "$OUT"
