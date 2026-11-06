-- bookings 資料核對值（W-1106-vm-migration 驗收 4；正式切換時重用）
-- 雲端與地端各跑一次，輸出用 diff 比對。唯讀。
-- 執行時要給隨機樣本 id：psql -v sample_id=<uuid> ...
-- 時區與日期格式寫死，避免兩邊 session 設定不同造成文字不一致。
set default_transaction_read_only = on;
set timezone = 'UTC';
set datestyle = 'ISO, MDY';

\echo '## 總筆數'
select count(*) from public.bookings;

\echo '## 日期範圍'
select coalesce(min(date)::text, '') || ' ~ ' || coalesce(max(date)::text, '') from public.bookings;

\echo '## 全表雜湊（依 id 排序、每列文字串起來的 md5）'
select md5(coalesce(string_agg(b::text, E'\n' order by b.id), '')) from public.bookings b;

\echo '## 頭：最早建立的一筆'
select b::text from public.bookings b order by b.created_at nulls first, b.id limit 1;

\echo '## 尾：最晚建立的一筆'
select b::text from public.bookings b order by b.created_at desc nulls last, b.id desc limit 1;

\echo '## 隨機樣本'
select b::text from public.bookings b where b.id = :'sample_id';
