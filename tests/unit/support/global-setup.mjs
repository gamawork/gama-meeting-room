// 靜態守門檢查，在整個 `npm run test:unit` 開跑前執行一次
// （見 playwright.unit.config.js 的 globalSetup）。
//
// mock-supabase.mjs 的 page/route 攔截只在「spec 有 import 到那個被覆寫過的 test/page」時
// 才生效。如果之後有人新增一支 spec，直接 `import { test } from '@playwright/test'`
// （沒有經過 ./support/mock-supabase.mjs），那支測試就完全沒有路由攔截、fail-closed 全部失效，
// 而且 `npm run test:unit` 照樣會把它跑起來——這是原本的風險（審查報告 F-S1）。
//
// R2 對抗式再審（review-unit-tests-r2.md R2-1）找到這道檢查本身可以被繞過的四種寫法，這裡逐一補：
//   1. 放在子目錄（`tests/unit/sub/x.spec.mjs`）——原本 readdirSync 不遞迴，Playwright 的
//      testDir 卻會遞迴找檔。現在改用 `fs.readdirSync(dir, { recursive: true })` 遞迴掃描。
//   2. 換副檔名（`.test.mjs`／`.spec.js`）——原本只認 `.spec.mjs`。現在比對副檔名放寬到
//      `.spec.`／`.test.` 開頭、常見 JS/TS 副檔名結尾的檔案，跟 Playwright 預設 testMatch
//      的涵蓋範圍看齊（playwright.unit.config.js 另外把 testMatch 收窄成 `**/*.spec.mjs`，
//      兩層一起收才不會有落差）。
//   3. `import pwt from '@playwright/test'`（default import），把真正的 import 寫在註解裡
//      混淆審查——現在先把註解／字串常數整段拿掉，再用「只要有任何一種 import 語法從
//      '@playwright/test' 進來」的寬鬆比對，不管 named／default／namespace。
//   4. `import * as pw from '@playwright/test'`，把 mock 的 import 路徑寫進字串常數——同上，
//      拿掉字串常數之後這招失效；而且第 3 點的寬鬆比對本身就不管是哪一種 import 語法。
//
// 這道靜態掃描仍然只是「防新 spec 忘記接線」的第一層，不是唯一防線——第二層是
// playwright.unit.config.js 的 `use.proxy`（指向死位址，localhost 以外沒被 route 接住的
// 請求會直接連線失敗），細節見該檔案與 TESTING.md「防線與已知缺口」一節。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UNIT_DIR = path.resolve(__dirname, '..'); // tests/unit
const SUPPORT_DIRNAME = 'support'; // 這個目錄底下的檔案本來就要 import '@playwright/test'（mock-supabase.mjs 等），不掃

// Playwright 預設 testMatch 認得的測試檔命名慣例：*.spec.* 或 *.test.*（.js/.mjs/.cjs/.ts/.mts/.cts/.jsx/.tsx）。
// unit config 另外把 testMatch 收窄成 `**/*.spec.mjs`，這裡刻意掃得比它寬——就算以後
// testMatch 被誰放寬回預設值，這道掃描本身也不會跟著漏。
const TEST_FILE_RE = /\.(spec|test)\.(mjs|js|cjs|ts|mts|cts|jsx|tsx)$/i;

// 錨定在行首（可有前導空白）：只認「真的是一段 import 宣告」，不認「文字上剛好長得像 import
// 語句、但其實是賦值給變數的字串常數」為了避免語法檢查工具的誤判：
// `const s = "import { test } from './support/mock-supabase.mjs'";`——這一行不是從
// `import` 開始，是從 `const` 開始，錨定行首就不會誤判成真的 import）。
const IMPORT_FROM_PLAYWRIGHT_RE = /^[ \t]*import\b[^;]*?\bfrom\s*['"]@playwright\/test['"]/m;

/**
 * 比對 import 來源前，先把註解整段拿掉，避免「真正的 import 寫在註解裡混淆審查」這種招數
 * `import pwt from '@playwright/test'` 搭配註解寫一行假的 mock import。
 * 注意：不拿掉字串／樣板字面值——import 的來源路徑本身就是字串，整段拿掉字串內容會連真正
 * 的 import 來源都一起消失，變成永遠比對不到。防「藏在字串常數裡的假 import」靠的是下面的
 * 行首錨定，不是這裡。
 */
function stripComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, ' '); // 區塊註解
  out = out.replace(/\/\/[^\n]*/g, ' '); // 行註解（不處理字串裡剛好含 // 的邊角情況，這裡是防呆不是完整 parser）
  return out;
}

/** 建立「這個檔案有沒有從 mock-supabase.mjs 正確 import test」的比對式，路徑依檔案實際巢狀深度算。 */
function buildImportFromMockRe(fileFullPath) {
  const mockPath = path.join(UNIT_DIR, SUPPORT_DIRNAME, 'mock-supabase.mjs');
  let rel = path.relative(path.dirname(fileFullPath), mockPath).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = './' + rel;
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^[ \\t]*import\\s*\\{[^}]*\\btest\\b[^}]*\\}\\s*from\\s*['"]${escaped}['"]`, 'm');
}

/** 遞迴列出 UNIT_DIR 底下所有檔案的絕對路徑，跳過任何叫 support 的目錄。 */
function listFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  const files = [];
  for (const entry of entries) {
    // Node 的 recursive readdirSync 在部分版本會回傳帶 `parentPath`/`path` 的 Dirent；
    // 用 entry.parentPath（新版）或 entry.path（舊版）組出完整路徑，兩者都沒有就退回 dir。
    const parent = entry.parentPath || entry.path || dir;
    const rel = path.relative(dir, path.join(parent, entry.name)).split(path.sep);
    if (rel.includes(SUPPORT_DIRNAME)) continue; // 任何深度的 support/ 目錄都跳過
    if (entry.isFile()) {
      files.push(path.join(parent, entry.name));
    }
  }
  return files;
}

export default async function globalSetup() {
  const allFiles = listFilesRecursive(UNIT_DIR);
  const specFiles = allFiles.filter(f => TEST_FILE_RE.test(f));
  const problems = [];

  for (const full of specFiles) {
    const rawSrc = fs.readFileSync(full, 'utf8');
    const src = stripComments(rawSrc);
    const relLabel = path.relative(UNIT_DIR, full).split(path.sep).join('/');

    if (IMPORT_FROM_PLAYWRIGHT_RE.test(src)) {
      problems.push(`${relLabel}：直接從 '@playwright/test' import（不管是 named／default／namespace），繞過假 Supabase 安全網（F-S1）`);
    }
    if (!buildImportFromMockRe(full).test(src)) {
      problems.push(`${relLabel}：沒有從 mock-supabase.mjs import test，無法確定它裝上了路由攔截`);
    }
  }

  if (problems.length) {
    throw new Error(
      [
        'tests/unit 安全網守門檢查失敗（F-S1，見 tests/unit/support/global-setup.mjs）：',
        ...problems.map(p => `- ${p}`),
        '',
        '新增的 spec 必須這樣 import（依實際巢狀深度調整相對路徑）：',
        "  import { test, expect } from './support/mock-supabase.mjs';",
        "不能直接從 '@playwright/test' import（named／default／namespace 都不行），那樣會拿不到",
        '假 Supabase 的路由攔截，寫入測試可能直接打到正式資料庫。',
      ].join('\n')
    );
  }
}
