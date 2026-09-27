// 瀏覽器時區由 playwright.unit.config.js 的 use.timezoneId 控制，而不是 TZ 環境變數。
// 這條測試直接斷言瀏覽器自己回報的時區，確保 config 改變時能立刻發現，
// 而不是繼續假裝有效。
import { test, expect } from './support/mock-supabase.mjs';
import { gotoApp } from './support/app.mjs';

test('瀏覽器實際時區是 Asia/Taipei（直接讀 Intl，不靠 TZ 環境變數這種間接訊號）', async ({ page }) => {
  await gotoApp(page);
  const resolvedTimeZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  expect(resolvedTimeZone).toBe('Asia/Taipei');
});
