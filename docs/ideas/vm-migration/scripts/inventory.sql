-- 資料庫結構盤點（W-1106-vm-migration 驗收 3）
-- 雲端與地端各跑一次，輸出用 diff 比對。只查系統目錄，不改任何東西。
-- 權限欄位去掉授權者（/後面），因為雲端與地端的授權角色名稱可能不同。
set default_transaction_read_only = on;

\echo '## 伺服器版本（僅供參考，雲端與地端可不同）'
select current_setting('server_version');

\echo '## public 內的關聯（種類｜名稱）'
select c.relkind::text || ' | ' || c.relname
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p','v','m','S','f')
order by 1;

\echo '## bookings 欄位（名稱｜型別｜可空｜預設｜identity）'
select a.attname || ' | ' || format_type(a.atttypid, a.atttypmod)
       || ' | ' || case when a.attnotnull then 'not null' else 'null' end
       || ' | ' || coalesce(pg_get_expr(d.adbin, d.adrelid), '')
       || ' | ' || case a.attidentity when 'a' then 'always' when 'd' then 'by default' else '' end
from pg_attribute a
left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
where a.attrelid = 'public.bookings'::regclass and a.attnum > 0 and not a.attisdropped
order by a.attnum;

\echo '## bookings 約束（名稱｜定義）'
select conname || ' | ' || pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.bookings'::regclass
order by 1;

\echo '## bookings 索引'
select indexname || ' | ' || indexdef
from pg_indexes where schemaname = 'public' and tablename = 'bookings'
order by 1;

\echo '## bookings 觸發器'
select tgname || ' | ' || pg_get_triggerdef(oid)
from pg_trigger where tgrelid = 'public.bookings'::regclass and not tgisinternal
order by 1;

\echo '## bookings 複寫識別（d=預設主鍵 f=FULL）'
select relreplident::text from pg_class where oid = 'public.bookings'::regclass;

\echo '## public 物件權限（名稱｜角色=權限）'
select c.relname || ' | ' || coalesce(
         array_to_string(array(
           select regexp_replace(x::text, '/.*$', '') from unnest(c.relacl) x order by 1), ', '),
         '(未設定，用預設)')
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p','v','m','S','f')
order by 1;

\echo '## public 欄位層級權限'
select c.relname || '.' || a.attname || ' | ' || array_to_string(array(
         select regexp_replace(x::text, '/.*$', '') from unnest(a.attacl) x order by 1), ', ')
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and a.attacl is not null
order by 1;

\echo '## schema public 權限'
select array_to_string(array(
         select regexp_replace(x::text, '/.*$', '') from unnest(nspacl) x order by 1), ', ')
from pg_namespace where nspname = 'public';

\echo '## RLS 開關（表｜啟用｜強制）'
select c.relname || ' | ' || c.relrowsecurity || ' | ' || c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r','p')
order by 1;

\echo '## RLS 政策（表｜名稱｜permissive｜角色｜動作｜USING｜WITH CHECK）'
select tablename || ' | ' || policyname || ' | ' || permissive || ' | '
       || array_to_string(roles, ',') || ' | ' || cmd || ' | '
       || coalesce(qual, '') || ' | ' || coalesce(with_check, '')
from pg_policies where schemaname = 'public'
order by 1;

\echo '## 擴充套件（名稱｜所在 schema；雲端與地端預設裝的不同，只比對本專案用到的）'
select extname || ' | ' || extnamespace::regnamespace from pg_extension order by 1;

\echo '## publication（名稱｜全部表｜insert update delete truncate）'
select pubname || ' | ' || puballtables || ' | '
       || pubinsert || ' ' || pubupdate || ' ' || pubdelete || ' ' || pubtruncate
from pg_publication order by 1;

\echo '## publication 內的資料表'
select pubname || ' | ' || schemaname || '.' || tablename
from pg_publication_tables order by 1;

\echo '## public 自訂函式（不含擴充套件的）'
select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
order by 1;

\echo '## public 自訂型別（enum、domain、composite；不含擴充套件與表的列型別）'
select t.typname || ' | ' || t.typtype::text
from pg_type t
where t.typnamespace = 'public'::regnamespace and t.typtype in ('e','d','c')
  and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
  and not exists (select 1 from pg_class c where c.reltype = t.oid)
order by 1;
