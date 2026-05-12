// 三層清理機制
//   Layer 1: id 紀錄（精準刪除這次測試 INSERT 的 record）
//   Layer 2: tag sweep by organizer (補刪所有遺漏)
//   Layer 3: title prefix sweep（雙保險，攔截非 organizer 寫入的測試 row）

import { supabase, TEST_TAG, TEST_TITLE_PREFIX } from './supabase.mjs';

/**
 * 在 Playwright page 上掛 route 攔截，記錄所有 bookings POST 寫入的 id 到 createdIds set。
 * 注意：只 record，不阻擋寫入，讓真實 DB 流程跑完。
 */
export function attachInsertRecorder(page, createdIds) {
  return page.route('**/rest/v1/bookings*', async (route) => {
    const req = route.request();
    if (req.method() !== 'POST') {
      return route.continue();
    }
    const response = await route.fetch();
    let bodyText = '';
    try {
      bodyText = await response.text();
      const rows = JSON.parse(bodyText);
      if (Array.isArray(rows)) {
        rows.forEach(row => {
          if (row && row.id != null) createdIds.add(row.id);
        });
      }
    } catch (e) {
      console.warn('[recorder] parse INSERT response failed:', e.message);
    }
    return route.fulfill({
      status: response.status(),
      headers: response.headers(),
      body: bodyText,
    });
  });
}

/**
 * Layer 1：依 id 精準刪除。
 * 若刪除失敗會 throw（讓測試 runner 知道 cleanup 沒成功）。
 */
export async function cleanupByIds(ids) {
  if (!ids || ids.size === 0) return { deleted: 0, ids: [] };
  const idArr = [...ids];
  const { error, data } = await supabase
    .from('bookings')
    .delete()
    .in('id', idArr)
    .select('id');
  if (error) {
    console.error('[CLEANUP layer1 fail by id]', error.message, 'leftover ids:', idArr);
    throw new Error(`Cleanup by id failed: ${error.message}`);
  }
  return { deleted: data?.length ?? 0, ids: idArr };
}

/**
 * Layer 2：依 TEST_TAG (organizer) sweep。
 * Layer 3：依 TEST_TITLE_PREFIX (title 前綴) sweep。
 * 一律執行（即使 Layer 1 已清乾淨也跑一次，防止上次測試殘留或 attachInsertRecorder 漏抓）。
 */
export async function sweepByMarkers() {
  const results = { byTag: 0, byTitle: 0, errors: [] };

  const { data: tagData, error: tagErr } = await supabase
    .from('bookings')
    .delete()
    .eq('organizer', TEST_TAG)
    .select('id');
  if (tagErr) results.errors.push(`byTag: ${tagErr.message}`);
  else results.byTag = tagData?.length ?? 0;

  const { data: titleData, error: titleErr } = await supabase
    .from('bookings')
    .delete()
    .like('title', `${TEST_TITLE_PREFIX}%`)
    .select('id');
  if (titleErr) results.errors.push(`byTitle: ${titleErr.message}`);
  else results.byTitle = titleData?.length ?? 0;

  if (results.errors.length) {
    console.error('[CLEANUP layer2/3 errors]', results.errors);
  }
  return results;
}

/**
 * 完整清理：Layer 1 + Layer 2 + Layer 3。
 * 任一層失敗 throw，避免悄悄殘留資料。
 */
export async function fullCleanup(createdIds) {
  const byId = await cleanupByIds(createdIds);
  const bySweep = await sweepByMarkers();
  if (bySweep.errors.length) {
    throw new Error(`Sweep cleanup failed: ${bySweep.errors.join('; ')}`);
  }
  return {
    deletedById: byId.deleted,
    deletedByTag: bySweep.byTag,
    deletedByTitle: bySweep.byTitle,
  };
}

/**
 * 產生唯一的 test title（含 prefix + timestamp + random）。
 */
export function makeTestTitle(label = 'case') {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `${TEST_TITLE_PREFIX}_${label}_${ts}_${rand}`;
}

/**
 * 找一個距今 90 天以後、且當下 DB 沒有衝突的安全日期。
 * 避免測試卡到既有預約（衝突檢測會擋下來）。
 */
export async function pickSafeFutureDate(room = '302', startTime = '14:00', endTime = '14:30') {
  for (let offset = 90; offset < 180; offset++) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const iso = d.toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('bookings')
      .select('id, start_time, end_time')
      .eq('date', iso)
      .eq('room', room);
    if (error) throw error;
    const conflict = (data || []).some(b =>
      !(endTime <= b.start_time || startTime >= b.end_time)
    );
    if (!conflict) return iso;
  }
  throw new Error('Cannot find conflict-free date within next 90-180 days');
}
