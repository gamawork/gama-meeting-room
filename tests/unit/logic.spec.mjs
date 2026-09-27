// F9：預約核心邏輯的表格測試。
// checkRecurringConflicts／generateRecurringDates／mycalIsMine 都是 index.html 裡的全域函式，
// 這裡透過 page.evaluate 呼叫「真的」函式本體，不在測試裡重新實作一份邏輯。
// 預期值：checkRecurringConflicts、generateRecurringDates 的期望值是實際跑一次 index.html
// 記下來的現行輸出（見 git 歷史裡曾經跑過的 tests/unit/_probe_logic.spec.mjs），
// 已對照 CLAUDE.md 的半開區間 [) 語意與 calculateRelativeWeeklyDate 的月底退回邏輯確認合理。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp } from './support/app.mjs';

test.describe('checkRecurringConflicts（時段防撞第 1 層，半開區間 [)）', () => {
  const rows = [
    // 背靠背：既有 10:00-11:00
    { id: 1, date: '2026-10-05', room: '302', start_time: '10:00:00', end_time: '11:00:00', title: 'A', organizer: 'X', attendees: null },
    // 完全包含：既有 09:00-17:00
    { id: 2, date: '2026-10-06', room: '302', start_time: '09:00:00', end_time: '17:00:00', title: 'B', organizer: 'X', attendees: null },
    // 部分重疊-前：既有 09:00-10:00
    { id: 3, date: '2026-10-07', room: '302', start_time: '09:00:00', end_time: '10:00:00', title: 'C', organizer: 'X', attendees: null },
    // 部分重疊-後：既有 10:30-11:30
    { id: 4, date: '2026-10-08', room: '302', start_time: '10:30:00', end_time: '11:30:00', title: 'D', organizer: 'X', attendees: null },
    // 同時段不同會議室：既有 10:00-11:00 room 301
    { id: 5, date: '2026-10-09', room: '301', start_time: '10:00:00', end_time: '11:00:00', title: 'E', organizer: 'X', attendees: null },
    // 跨午：既有 11:30-13:00
    { id: 6, date: '2026-10-12', room: '302', start_time: '11:30:00', end_time: '13:00:00', title: 'F', organizer: 'X', attendees: null },
  ];

  const cases = [
    { name: '背靠背不算衝突（10-11 對 11-12）', dates: ['2026-10-05'], room: '302', s: '11:00', e: '12:00', expectConflictDates: [] },
    { name: '完全包含', dates: ['2026-10-06'], room: '302', s: '10:00', e: '11:00', expectConflictDates: ['2026-10-06'] },
    { name: '部分重疊（前）', dates: ['2026-10-07'], room: '302', s: '09:30', e: '10:30', expectConflictDates: ['2026-10-07'] },
    { name: '部分重疊（後）', dates: ['2026-10-08'], room: '302', s: '10:00', e: '11:00', expectConflictDates: ['2026-10-08'] },
    { name: '同時段不同會議室', dates: ['2026-10-09'], room: '302', s: '10:00', e: '11:00', expectConflictDates: [] },
    // 原名「同一天多筆」名不符實：seed 每天只有一筆，這條測的其實是「週期預約的多個日期中，
    // 只有一天撞到既有預約」（審查 L 級 finding）。
    { name: '週期多個日期中只有一天撞到既有預約', dates: ['2026-10-05', '2026-10-06', '2026-10-20'], room: '302', s: '11:00', e: '12:00', expectConflictDates: ['2026-10-06'] },
    { name: '跨午', dates: ['2026-10-12'], room: '302', s: '12:00', e: '12:30', expectConflictDates: ['2026-10-12'] },
    // 原本背靠背只測了一個方向（既有在前、新的在後）。這裡補反方向
    // （新會議結束＝既有會議開始）、完全相同時段、新的完全包住既有的——都用 id=1 那筆
    // 既有 10:00-11:00 當基準。M13（timeOverlap 左邊 s1<e2 改成 s1<=e2）會讓反方向那條
    // 誤判成衝突，變紅。
    { name: '背靠背反方向不算衝突（既有 10-11，新的 09-10，新會議結束＝既有會議開始）', dates: ['2026-10-05'], room: '302', s: '09:00', e: '10:00', expectConflictDates: [] },
    { name: '完全相同時段算衝突', dates: ['2026-10-05'], room: '302', s: '10:00', e: '11:00', expectConflictDates: ['2026-10-05'] },
    { name: '新的完全包住既有的算衝突', dates: ['2026-10-05'], room: '302', s: '09:00', e: '12:00', expectConflictDates: ['2026-10-05'] },
  ];

  for (const c of cases) {
    test(c.name, async ({ page, mock }) => {
      mock.seed(rows);
      await gotoApp(page);
      const result = await page.evaluate(
        ({ dates, room, s, e }) => checkRecurringConflicts(dates, room, s, e),
        { dates: c.dates, room: c.room, s: c.s, e: c.e }
      );
      expect(result.map(r => r.date)).toEqual(c.expectConflictDates);
    });
  }
});

test.describe('generateRecurringDates（現行輸出當基準）', () => {
  const cases = [
    { name: 'weekly 最短（2 週）', start: '2026-10-05', type: 'weekly', weeks: 2, expected: ['2026-10-05', '2026-10-12'] },
    { name: 'weekly 一般（3 次）', start: '2026-10-05', type: 'weekly', weeks: 3, expected: ['2026-10-05', '2026-10-12', '2026-10-19'] },
    { name: 'biweekly（5 週長度 → ceil(5/2)=3 次，每 14 天）', start: '2026-10-05', type: 'biweekly', weeks: 5, expected: ['2026-10-05', '2026-10-19', '2026-11-02'] },
    {
      // 原本用 2026-01-31（2 月最後一天，剛好也是第 4 個週六）當退化案例，
      // 分不出「退回第 4 個週六」跟「月底最後一天」這兩種語意（M10 把 fallback 改成
      // lastDayOfMonth 照樣全綠）。換成 2026-05-30（當月第 5 個週六，6 月最後一天是 30 號，
      // 但 6 月的第 4 個週六是 27 號），兩種語意在這裡會給出不同答案。
      name: 'monthly 月底邊界：5/30 出發（當月第 5 個週六），6 月沒有第 5 個週六要退回第 4 週（非月底最後一天）',
      start: '2026-05-30', type: 'monthly', weeks: 9,
      expected: ['2026-05-30', '2026-06-27'],
    },
    {
      name: 'monthly 跨年（12 月出發，6 個月）',
      start: '2026-12-15', type: 'monthly', weeks: 26,
      expected: ['2026-12-15', '2027-01-19', '2027-02-16', '2027-03-16', '2027-04-20', '2027-05-18'],
    },
  ];

  for (const c of cases) {
    test(c.name, async ({ page, mock }) => {
      await gotoApp(page);
      const result = await page.evaluate(
        ({ start, type, weeks }) => generateRecurringDates(start, type, weeks),
        { start: c.start, type: c.type, weeks: c.weeks }
      );
      expect(result).toEqual(c.expected);
    });
  }

  test('weekly 最長（156 週＝3 年）：筆數與頭尾日期', async ({ page, mock }) => {
    await gotoApp(page);
    const result = await page.evaluate(() => generateRecurringDates('2026-10-05', 'weekly', 156));
    expect(result).toHaveLength(156);
    expect(result[0]).toBe('2026-10-05');
    expect(result[result.length - 1]).toBe('2029-09-24');
  });

  test('monthly 最長（156 週≈3 年→36 次）：筆數與頭尾日期', async ({ page, mock }) => {
    await gotoApp(page);
    const result = await page.evaluate(() => generateRecurringDates('2026-10-05', 'monthly', 156));
    expect(result).toHaveLength(36);
    expect(result[0]).toBe('2026-10-05');
    expect(result[result.length - 1]).toBe('2029-09-03');
  });
});

test.describe('mycalIsMine（我的行事曆「我的會議」判斷）', () => {
  function booking(overrides) {
    return { id: 1, date: '2026-10-05', room: '302', startTime: '10:00', endTime: '11:00', title: 'T', organizer: '', attendees: '', ...overrides };
  }

  test('主辦人是我 → true', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = 'Ray'; return mycalIsMine(b); }, booking({ organizer: 'Ray' }));
    expect(r).toBe(true);
  });

  test('與會者含我（半形逗號）→ true', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = 'Ray'; return mycalIsMine(b); }, booking({ organizer: 'Angus', attendees: 'Casey, Ray, Ken' }));
    expect(r).toBe(true);
  });

  test('與會者含我（全形逗號、頓號、換行混用）→ true', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = 'Ray'; return mycalIsMine(b); }, booking({ organizer: 'Angus', attendees: 'Casey，Ken、\nRay' }));
    expect(r).toBe(true);
  });

  test('名字只是部分相同（Ray 對 Rayna）不算 → false', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = 'Ray'; return mycalIsMine(b); }, booking({ organizer: 'Angus', attendees: 'Rayna, Ken' }));
    expect(r).toBe(false);
  });

  test('attendees 為空字串 → false（除非我是主辦人）', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = 'Ray'; return mycalIsMine(b); }, booking({ organizer: 'Angus', attendees: '' }));
    expect(r).toBe(false);
  });

  test('attendees 為 null → false', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = 'Ray'; return mycalIsMine(b); }, booking({ organizer: 'Angus', attendees: null }));
    expect(r).toBe(false);
  });

  test('我沒選名字（mycalState.me 未設定）→ 一律 false', async ({ page, mock }) => {
    await gotoApp(page);
    const r = await page.evaluate(b => { mycalState.me = null; return mycalIsMine(b); }, booking({ organizer: 'Ray', attendees: 'Ray' }));
    expect(r).toBe(false);
  });
});
