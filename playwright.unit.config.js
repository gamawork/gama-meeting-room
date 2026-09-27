// @ts-check
import { defineConfig, devices } from '@playwright/test';

// tests/unit 專用設定，跟 playwright.config.js（tests/i18n.spec.mjs 用，會寫入正式 Supabase）
// 完全分開，互不影響。
//
// timezoneId 固定在這裡的 use 層級，對 testDir 底下每一個 spec 檔都生效，
// 不像舊版放在 tests/unit/support/mock-supabase.mjs 裡的 test.use()——那個只有第一個
// import 到該模組的 spec 檔會套到（ESM 模組只執行一次 top-level code），其餘檔案其實吃的是
// 機器時區。
//
// globalSetup 在整個測試流程開跑前，靜態掃描 tests/unit 底下
// 所有 spec 檔（遞迴、跟 testMatch 一樣認 .spec.mjs）的 import 來源，擋下任何繞過
// tests/unit/support/mock-supabase.mjs 假 Supabase 的新 spec。這是「防新 spec 忘記接線」的
// 第一層，不是唯一防線；第二層是下面 use.proxy 這道網路層級的防線，兩層各自防不同的洞，
// 細節與已知缺口見 TESTING.md「防線與已知缺口」一節。
//
// testMatch 收窄成只認 `**/*.spec.mjs`：Playwright 預設 testMatch 還會認 `.test.mjs`／
// `.spec.js` 等副檔名，跟 global-setup 的掃描範圍對齊，兩邊都認同一組副檔名，才不會有
// 「Playwright 會跑、但 global-setup 沒掃到」或反過來的落差。
export default defineConfig({
  testDir: './tests/unit',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,           // 寫入測試需序列以利清理／衝突斷言的先後順序
  workers: 1,                     // 同時 1 個 worker 避免測試之間搶假表裡的 booking 時段
  forbidOnly: !!process.env.CI,
  retries: 0,                     // 失敗不重試（避免掩蓋偶發時序問題）
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-unit' }]],
  globalSetup: './tests/unit/support/global-setup.mjs',
  use: {
    baseURL: 'http://localhost:4321',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    timezoneId: 'Asia/Taipei',
    // 第二道不靠 import 掃描的防線。指向一個沒有東西在聽的本機位址（discard port），
    // localhost／127.0.0.1 以外一律要走這個死代理——被 mock 的 page.route/routeWebSocket
    // fulfill／abort 掉的請求根本不會走到這一步（Playwright 在瀏覽器的網路層之前就攔截、
    // 直接回應或中止），只有「沒被路由攔截接住」的請求才會嘗試連這個代理，連線會直接失敗，
    // 不會有機會連到真實網路。新開的 page（`context.newPage()`）、popup 都是同一個
    // BrowserContext，套用同一份 `use.proxy`，就算它們沒有 mock-supabase.mjs 覆寫過的
    // page 層 route，也一樣連不出去。
    proxy: { server: 'http://127.0.0.1:9', bypass: 'localhost,127.0.0.1' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run serve',
    url: 'http://localhost:4321/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
