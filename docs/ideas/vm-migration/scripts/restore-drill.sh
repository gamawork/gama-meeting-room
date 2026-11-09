#!/usr/bin/env bash
# 還原演練（W-1106-vm-migration 驗收 10）：把一份備份還原到暫存資料庫 restore_drill，
# 跟備份當下的核對值比對，並確認防撞約束與 RLS 政策都有回來；最後刪掉暫存資料庫。
# 不碰正式的 postgres 資料庫。
# 用法：bash restore-drill.sh [備份資料夾]（不給就用最新一份）
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
B="${1:-$(find "$HOME/backups" -mindepth 1 -maxdepth 1 -type d -name '2*' | sort | tail -1)}"
[ -f "$B/bookings.dump" ] || { echo "停止：$B 裡沒有 bookings.dump"; exit 1; }
DRILL=restore_drill
dbx() { docker exec -i supabase-db "$@"; }

echo "還原演練用備份：$B"
dbx psql -U postgres -X -q -v ON_ERROR_STOP=1 -c "drop database if exists $DRILL" -c "create database $DRILL"
trap 'dbx psql -U postgres -X -q -c "drop database if exists $DRILL"; echo "暫存資料庫已刪除"' EXIT

# 防撞約束要用 btree_gist；位置照正式庫放 public
dbx psql -U postgres -d "$DRILL" -X -q -v ON_ERROR_STOP=1 -c "create extension btree_gist schema public"
dbx pg_restore -U postgres -d "$DRILL" --exit-on-error < "$B/bookings.dump"

dbx psql -U postgres -d "$DRILL" -X -At -v ON_ERROR_STOP=1 -v sample_id="$(cat "$B/sample-id.txt")" \
  < "$HERE/verify-data.sql" > "/tmp/restore-drill-verify.txt"

echo "比對 備份當下 vs 還原後："
if diff "$B/verify.txt" /tmp/restore-drill-verify.txt; then echo "資料一致"; else echo "資料不一致（見上方 diff）"; exit 1; fi
rm -f /tmp/restore-drill-verify.txt

echo "還原後的約束與政策："
dbx psql -U postgres -d "$DRILL" -X -At -v ON_ERROR_STOP=1 -c "
  select 'bookings_no_overlap 約束：' || count(*) from pg_constraint where conname = 'bookings_no_overlap';
  select 'RLS 啟用：' || relrowsecurity from pg_class where oid = 'public.bookings'::regclass;
  select 'RLS 政策數：' || count(*) from pg_policies where schemaname = 'public' and tablename = 'bookings';
  select 'anon 權限：' || string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'bookings' and grantee = 'anon';"
