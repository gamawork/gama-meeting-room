#!/usr/bin/env node
// 手動清理腳本 — 掃除所有殘留的測試資料。
// 用途：測試 runner crash、CI 中斷、或不放心時手動跑一次。
// 執行：npm run test:cleanup

import { supabase, TEST_TAG, TEST_TITLE_PREFIX } from '../helpers/supabase.mjs';

async function main() {
  console.log('[orphan-cleanup] starting...');

  // 1. 先查目前有哪些
  const { data: preview, error: pErr } = await supabase
    .from('bookings')
    .select('id, date, room, start_time, end_time, title, organizer')
    .or(`organizer.eq.${TEST_TAG},title.like.${TEST_TITLE_PREFIX}%`);
  if (pErr) {
    console.error('[orphan-cleanup] preview failed:', pErr.message);
    process.exit(1);
  }
  if (!preview || preview.length === 0) {
    console.log('[orphan-cleanup] no orphans found ✓');
    return;
  }

  console.log(`[orphan-cleanup] found ${preview.length} orphan record(s):`);
  preview.forEach(row => {
    console.log(`  - id=${row.id} | ${row.date} ${row.start_time}-${row.end_time} | room=${row.room} | organizer=${row.organizer} | title=${row.title}`);
  });

  // 2. 雙條件刪除
  const { data: byTag, error: tagErr } = await supabase
    .from('bookings').delete().eq('organizer', TEST_TAG).select('id');
  if (tagErr) {
    console.error('[orphan-cleanup] tag delete failed:', tagErr.message);
    process.exit(2);
  }
  const { data: byTitle, error: titleErr } = await supabase
    .from('bookings').delete().like('title', `${TEST_TITLE_PREFIX}%`).select('id');
  if (titleErr) {
    console.error('[orphan-cleanup] title delete failed:', titleErr.message);
    process.exit(3);
  }

  console.log(`[orphan-cleanup] deleted ${(byTag?.length ?? 0)} by tag, ${(byTitle?.length ?? 0)} by title prefix ✓`);
}

main().catch(err => {
  console.error('[orphan-cleanup] unexpected error:', err);
  process.exit(99);
});
