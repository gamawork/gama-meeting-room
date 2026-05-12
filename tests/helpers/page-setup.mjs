// 共用 page setup：等 loading 結束。
// 注意：每個 test 預設用全新 BrowserContext，localStorage 是乾淨的，會自動 fallback 到 'en'。
// 不能用 addInitScript 預設語言 — 它會在每次 navigation 都跑，蓋掉使用者切換的結果，
// 導致「reload 後語言應保留」這類測試假性失敗。
export async function setupCleanPage(page, { lang = 'en' } = {}) {
  await page.goto('/index.html');
  if (lang !== 'en') {
    // 想從中文起跑：先到頁面 → setItem → reload，讓 init 流程讀到 zh
    await page.evaluate((l) => {
      try { window.localStorage.setItem('gama_lang', l); } catch (_) {}
    }, lang);
    await page.reload();
  }
  await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 15_000 }).catch(() => {});
}

export async function switchLang(page, target) {
  const current = await page.evaluate(() => window.localStorage.getItem('gama_lang') || 'en');
  if (current === target) return;
  await page.locator('#langSwitch').click();
  // 等切換生效（h1 文字變動）
  const expected = target === 'en' ? 'Gama Meeting Room Booking System' : 'Gama 會議室預約系統';
  await page.waitForFunction(
    (t) => document.querySelector('h1')?.textContent?.trim() === t,
    expected,
    { timeout: 3000 }
  );
}
