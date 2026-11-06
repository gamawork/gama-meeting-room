-- 在地端自架 Supabase 重建 bookings 結構（W-1106-vm-migration 驗收 3）
-- 來源：2026-11-06 雲端 pg_dump --schema-only --schema=public 與 inventory.sql 盤點。
-- 執行：docker exec -i supabase-db psql -U postgres -X -v ON_ERROR_STOP=1 < rebuild-schema.sql
-- 整份包在一個 transaction，任何一步失敗就全部 rollback。只用在全新、還沒有 bookings 的地端資料庫。
--
-- 跟原始 dump 的差別：
-- - 不含 CREATE SCHEMA public（地端已存在）。
-- - 不含 ALTER DEFAULT PRIVILEGES：地端自架 Supabase 本來就有同樣的預設權限，postgres 角色也改不了 supabase_admin 的。
-- - 補上 dump 沒帶到的 btree_gist（雲端裝在 public schema）與 supabase_realtime publication。

begin;

-- 時段防撞第 3 層要用（room 的 = 比較放進 GiST 索引）；位置照雲端放 public
create extension if not exists btree_gist schema public;

create table public.bookings (
    id uuid default gen_random_uuid() not null,
    date date not null,
    room text not null,
    start_time time without time zone not null,
    end_time time without time zone not null,
    title text not null,
    organizer text not null,
    created_at timestamp with time zone default now(),
    attendees text
);
alter table public.bookings owner to postgres;
comment on column public.bookings.attendees is '與會者，選填，多位可用逗號分隔';

alter table only public.bookings
    add constraint bookings_no_overlap exclude using gist (
        room with =,
        tsrange((date + start_time), (date + end_time)) with &&
    );
alter table only public.bookings
    add constraint bookings_pkey primary key (id);

create index idx_bookings_date on public.bookings using btree (date);
create index idx_bookings_room_date on public.bookings using btree (room, date);

-- RLS：照雲端現況，四條全放行（內網任何人可讀寫刪，存取控制列在 README「未決」）
create policy "Allow delete access" on public.bookings for delete using (true);
create policy "Allow insert access" on public.bookings for insert with check (true);
create policy "Allow read access" on public.bookings for select using (true);
create policy "Allow update access" on public.bookings for update using (true);
alter table public.bookings enable row level security;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on table public.bookings to anon, authenticated, service_role;

-- Realtime：沒加進 publication，前端訂閱會 joined 但收不到事件（見 CLAUDE.md「Realtime」）
alter publication supabase_realtime add table public.bookings;

commit;
