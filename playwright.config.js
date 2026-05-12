// @ts-check
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,            // 寫入測試需序列以利清理
  workers: 1,                      // 同時 1 個 worker 避免測試之間搶 booking 時段
  forbidOnly: !!process.env.CI,
  retries: 0,                      // 失敗不重試（避免重複寫入 + 清理混亂）
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4321',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
