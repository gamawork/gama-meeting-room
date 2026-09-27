// 這個檔案是「假 Supabase」的唯一定義處，所有 tests/unit/*.spec.mjs 都經由這裡
// 取得已經裝好 fail-closed 路由攔截、Realtime websocket 阻擋、固定時鐘的 page。
//
// 安全模型（跟正式 tests/i18n.spec.mjs 完全不同、不共用）：
//   - 這裡從不連正式 Supabase，也不連任何真實網路。page.route('**/*', ...) 是唯一一個路由
//     handler，用「host 比對」（不是字串前綴）分派：localhost/127.0.0.1 放行（本機 http-server）、
//     Supabase host 走下面的 fail-closed REST 分派、unpkg 的 supabase-js SDK 與 jsdelivr 的假日
//     JSON 從本機檔案／fixture 回應，其餘 host 一律 route.abort() 並記錄違規（全域安全網）。
//   - Realtime 用 page.routeWebSocket(() => true, ...) 同樣是唯一一個 handler：只有 Supabase
//     host 的 WebSocket 會接進假 Phoenix 伺服器，其餘一律關閉並記違規，不會真的連到正式伺服器。
//   - 時間用 page.clock 固定在 2026-09-27 10:00 Asia/Taipei；時區 timezoneId 設在
//     playwright.unit.config.js 的 use 層級，對 tests/unit 底下每一個 spec 都生效。
//   - 「每個 spec 都有經過這個 fixture」這件事，靠 playwright.unit.config.js 的
//     globalSetup（tests/unit/support/global-setup.mjs）在整個測試開跑前靜態掃描
//     import 來源守住：只要有新 spec 直接 `import { test } from '@playwright/test'`
//     繞過這裡，整次 `npm run test:unit` 直接失敗，不會悄悄漏測（F-S1）。
import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const INDEX_HTML_PATH = path.resolve(REPO_ROOT, 'index.html');
const indexHtmlSource = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

function extractConst(name) {
  const m = indexHtmlSource.match(new RegExp(`const ${name}\\s*=\\s*'([^']+)'`));
  if (!m) {
    throw new Error(`找不到 index.html 內的常數 ${name}，無法建立測試 fixture（index.html 可能改過命名，測試要跟著更新）`);
  }
  return m[1];
}

// 從 index.html 唯一定義處讀，不手抄。
export const SUPABASE_URL = extractConst('SUPABASE_URL');
// Realtime 走 WebSocket，scheme 跟 REST 不一樣（wss:// 而非 https://）。
export const SUPABASE_WS_URL = SUPABASE_URL.replace(/^http/, 'ws');
// F-S1：路由分派一律比對 hostname，不比對完整 URL 字串前綴——SUPABASE_URL 帶不帶結尾 `/`、
// 換 custom domain 都不影響判斷。
const SUPABASE_HOST = new URL(SUPABASE_URL).hostname;

// 這兩個是 Postgres 標準 SQLSTATE（23P01=exclusion_violation、
// 23505=unique_violation），是外部事實，寫死在這裡，不能從被測的 isSlotConflictError() 自己
// 推導——原本用 regex 從 index.html 抽字面值，若原始碼把 '23P01' 打錯字，假回應會跟著錯，
// 變成同義反覆，測不出真正的錯誤碼。CLAUDE.md「Supabase」節、PostgreSQL 官方 errcodes
// 都是同一組值，來源不是被測程式。
export const SLOT_CONFLICT_CODES = ['23P01', '23505'];

// 固定時鐘：2026-09-27 10:00 Asia/Taipei = 2026-09-27T02:00:00.000Z。
// 搭配 playwright.unit.config.js 的 use.timezoneId，讓 index.html 內 new Date() 系列運算
// 看到的「今天」是台北時區的 2026-09-27（星期日）。
export const FIXED_NOW_UTC = '2026-09-27T02:00:00.000Z';

// ---------- SDK 與假日資料一律走本機檔案／fixture，不連真實網路 ----------

const UNPKG_HOST = 'unpkg.com';
const JSDELIVR_HOST = 'cdn.jsdelivr.net';

// index.html 用固定版本字串載入 SDK（<script src="https://unpkg.com/@supabase/supabase-js@X/dist/umd/supabase.js">）。
const SUPABASE_JS_PATH_RE = /^\/@supabase\/supabase-js@([^/]+)\/dist\/umd\/supabase\.js$/;
const SUPABASE_JS_UMD_PATH = path.resolve(REPO_ROOT, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js');
const SUPABASE_JS_PKG_PATH = path.resolve(REPO_ROOT, 'node_modules/@supabase/supabase-js/package.json');

// index.html 目前用哪個版本字串載入 SDK，從原始碼抽，不手抄（跟 SUPABASE_URL 同樣的理由）。
function extractIndexHtmlSupabaseJsVersion() {
  const m = indexHtmlSource.match(/unpkg\.com\/@supabase\/supabase-js@([^/]+)\/dist\/umd\/supabase\.js/);
  if (!m) {
    throw new Error('找不到 index.html 載入 supabase-js SDK 的 <script src>，無法確認版本要釘多少');
  }
  return m[1];
}
const INDEX_HTML_SUPABASE_JS_VERSION = extractIndexHtmlSupabaseJsVersion();

let cachedSupabaseJsUmdSource = null;
function getSupabaseJsUmdSource() {
  if (cachedSupabaseJsUmdSource === null) {
    if (!fs.existsSync(SUPABASE_JS_UMD_PATH)) {
      throw new Error(
        `找不到本機的 @supabase/supabase-js UMD 檔（${SUPABASE_JS_UMD_PATH}）。` +
          `請先執行：npm install -D --save-exact @supabase/supabase-js@${INDEX_HTML_SUPABASE_JS_VERSION}`
      );
    }
    cachedSupabaseJsUmdSource = fs.readFileSync(SUPABASE_JS_UMD_PATH, 'utf8');
  }
  return cachedSupabaseJsUmdSource;
}

function getLocalSupabaseJsVersion() {
  return JSON.parse(fs.readFileSync(SUPABASE_JS_PKG_PATH, 'utf8')).version;
}

const HOLIDAY_JSON_PATH_RE = /^\/gh\/ruyut\/TaiwanCalendar\/data\/\d{4}\.json$/;
// 空陣列：格式照 index.html 的 loadHolidayCalendar()（陣列，每筆 {date:'YYYYMMDD', description,
// isHoliday}）。目前沒有任何測試斷言依賴實際節日內容，回空陣列最不會意外影響既有斷言；
// 未來若某條測試需要特定節日（例如驗證節日 emoji），在這裡擴充，不要改成打真實 CDN。
const HOLIDAY_FIXTURE_JSON = '[]';

function applyFilter(row, key, rawValue) {
  const dotIndex = rawValue.indexOf('.');
  const op = rawValue.slice(0, dotIndex);
  const val = rawValue.slice(dotIndex + 1);
  switch (op) {
    case 'eq':
      return String(row[key]) === val;
    case 'gte':
      return String(row[key]) >= val;
    case 'lte':
      return String(row[key]) <= val;
    case 'in': {
      const inner = val.replace(/^\(/, '').replace(/\)$/, '');
      const list = inner.length ? inner.split(',') : [];
      return list.includes(String(row[key]));
    }
    default:
      // fail-closed：沒實作的 PostgREST 運算子直接丟例外，讓呼叫端把它變成測試失敗，
      // 不准忽略參數整包回傳（安全要求）。
      throw new Error(`不支援的 PostgREST 篩選運算子 "${op}"（欄位 ${key}=${rawValue}）`);
  }
}

// 正式 Postgres 的 time 欄位不管插入時給幾位，讀回來一律是 'HH:MM:SS'。前端送出的是
// 'HH:MM'（見 index.html saveBooking()），假表原本直接回顯client送的格式，跟正式環境不一致
// （審查 L 級 finding）。這裡補正規化，確認前端讀取剛插入的資料（例如「我的行事曆」用
// savedRecords 標黃）不會挑 'HH:MM' 或 'HH:MM:SS' 其中一種格式。
function normalizeDbTimeString(v) {
  return typeof v === 'string' && v.length === 5 ? `${v}:00` : v;
}

class FakeBookingsTable {
  constructor(initialRows = []) {
    this.rows = initialRows.map(r => ({ ...r }));
    const maxId = this.rows.reduce((m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m), 0);
    this.nextId = maxId + 1;
  }

  query(url) {
    const params = url.searchParams;
    let rows = this.rows.slice();
    for (const [key, value] of params.entries()) {
      if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') continue;
      rows = rows.filter(row => applyFilter(row, key, value));
    }
    const order = params.get('order');
    if (order) {
      const parts = order.split(',').map(p => {
        const [field, dir] = p.split('.');
        return { field, desc: dir === 'desc' };
      });
      rows.sort((a, b) => {
        for (const { field, desc } of parts) {
          const av = a[field];
          const bv = b[field];
          if (av < bv) return desc ? 1 : -1;
          if (av > bv) return desc ? -1 : 1;
        }
        return 0;
      });
    }
    const limit = params.get('limit');
    if (limit) rows = rows.slice(0, parseInt(limit, 10));
    const select = params.get('select') || '*';
    if (select !== '*') {
      const fields = select.split(',');
      rows = rows.map(row => Object.fromEntries(fields.map(f => [f, row[f]])));
    }
    return rows;
  }

  insert(newRows) {
    const inserted = newRows.map(r => ({
      id: this.nextId++,
      ...r,
      start_time: normalizeDbTimeString(r.start_time),
      end_time: normalizeDbTimeString(r.end_time),
    }));
    this.rows.push(...inserted.map(r => ({ ...r })));
    return inserted;
  }
}

// 假 Realtime 伺服器：跟真正的 Supabase Realtime 協定對過（用 page.routeWebSocket 攔截、
// 不轉發真連線的方式，實際跑一次 index.html 觀察 client 送出／期待的 frame 格式探測出來的，
// 不是憑印象猜的）——join 用 {topic,event:'phx_join',payload,ref,join_ref} 這種純 JSON frame（vsn=1.0.0），
// 回 phx_reply {status:'ok', response:{postgres_changes:[{id,...}]}}；
// 廣播用 {topic, event:'postgres_changes', payload:{ids:[id], data:{schema,table,commit_timestamp,type,columns:[],record,old_record,errors}}}。
// 欄位名稱固定是 record/old_record（不是 new/old）、type（不是 eventType）——這是 client 端
// （node_modules/@supabase/realtime-js RealtimeChannel.ts _updateFilterTransform/_getPayloadRecords）
// 认得的唯一格式，隨便改欄位名 client 會整個吃不到、且不會報錯，非常難排查，故用探測結果鎖死。
// 註（L 級修正）：這裡接住 phx_join 之後只回 phx_reply，連線本身維持開著，讓後續
// mock.realtime.sendChange(...) 可以繼續送 postgres_changes 廣播——不是「接住、立刻關閉」。
function createRealtimeServer() {
  let ws = null;
  let joinTopic = null;
  let subId = 1;
  let readyResolve;
  const ready = new Promise(res => { readyResolve = res; });

  function bindTo(wsHandle) {
    ws = wsHandle;
    ws.onMessage(raw => {
      let msg;
      try { msg = JSON.parse(typeof raw === 'string' ? raw : String(raw)); } catch (e) { return; }
      if (msg.event === 'phx_join') {
        joinTopic = msg.topic;
        ws.send(JSON.stringify({
          topic: msg.topic,
          event: 'phx_reply',
          payload: { status: 'ok', response: { postgres_changes: [{ id: subId, event: '*', schema: 'public', table: 'bookings' }] } },
          ref: msg.ref,
        }));
        readyResolve();
      }
    });
  }

  return {
    bindTo,
    /** 等待 realtime channel 完成 join（index.html 的 setupRealtimeSubscription() 呼叫 .subscribe() 之後）。*/
    waitUntilReady() { return ready; },
    /**
     * 模擬一筆 DB 異動廣播進來。type: 'INSERT' | 'UPDATE' | 'DELETE'。
     * INSERT 帶 record；DELETE 帶 old_record（至少要有 id，因為 index.html 的
     * Realtime callback 用 payload.old.id 判斷刪的是哪一筆）。
     * UPDATE 兩個都要帶：record 是新資料，old_record 至少要有 id——實測發現少了 old_record，
     * supabase-js（@supabase/realtime-js）根本不會觸發這筆事件（不是丟例外，是靜默不觸發），
     * 跟真實 Postgres REPLICA IDENTITY 預設一定帶 old_record 的行為一致，寫 UPDATE 測試別漏掉。
     */
    async sendChange({ type, record = null, old_record = null }) {
      if (!ws || !joinTopic) {
        throw new Error('Realtime channel 尚未 join，測試要先 await mock.realtime.waitUntilReady()');
      }
      await ws.send(JSON.stringify({
        topic: joinTopic,
        event: 'postgres_changes',
        payload: {
          ids: [subId],
          data: { schema: 'public', table: 'bookings', commit_timestamp: new Date().toISOString(), type, columns: [], record, old_record, errors: null },
        },
        ref: null,
      }));
    },
  };
}

export function createSupabaseMock(initialRows = []) {
  const table = new FakeBookingsTable(initialRows);
  const violations = [];
  const insertCalls = []; // 每次 POST 的原始 body（陣列，通常只有一筆）
  const requestLog = []; // 依時間順序記錄每次放行的請求，方便斷言先後順序（例如衝突檢查的 GET 要在 POST 之前）
  const realtime = createRealtimeServer();
  let insertHandler = null;
  let latencyMs = 0;

  async function attach(page) {
    // F-S1：Realtime 也要 fail-closed。單一 catch-all，只有 Supabase host 的 WebSocket
    // 才接進假伺服器，其餘一律關閉並記違規——不會對非 Supabase 的 WebSocket 靜默放行。
    await page.routeWebSocket(() => true, ws => {
      let host = null;
      try { host = new URL(ws.url()).hostname; } catch (e) { /* URL 解析失敗視為不明來源，走下面 fail-closed */ }
      if (host === SUPABASE_HOST) {
        realtime.bindTo(ws);
        return;
      }
      violations.push(`未預期的 WebSocket 連線（非 Supabase host）：${ws.url()}`);
      ws.close();
    });

    // F-S1：單一 catch-all，用 hostname 比對（不是字串前綴）分派。localhost/127.0.0.1 之外
    // 只放行明確列出的三種用途（Supabase REST、unpkg 的 SDK、jsdelivr 的假日資料），
    // 其餘 host 一律 abort 並記違規——新 spec 就算忘記加白名單，也不會悄悄打到真實網路。
    await page.route('**/*', async (route) => {
      const request = route.request();
      let url;
      try {
        url = new URL(request.url());
      } catch (e) {
        violations.push(`無法解析的請求 URL：${request.url()}`);
        return route.abort();
      }

      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return route.continue();
      }

      if (url.hostname === UNPKG_HOST) {
        const m = url.pathname.match(SUPABASE_JS_PATH_RE);
        if (!m) {
          violations.push(`未預期的 unpkg 請求：${url.pathname}`);
          return route.abort();
        }
        const requestedVersion = m[1];
        const localVersion = getLocalSupabaseJsVersion();
        if (requestedVersion !== localVersion) {
          // fail-closed：index.html 要求的版本跟 package.json 釘住、node_modules 實際裝的版本
          // 不一致時，寧可讓測試整批失敗，也不要假裝載入成功——那樣測試環境跟正式環境用的
          // SDK 就不是同一份，行為差異會變成排查不出來的假綠／假紅。
          violations.push(
            `index.html 要求的 supabase-js 版本（${requestedVersion}）跟本機釘住的版本` +
              `（${localVersion}，見 package.json）不一致`
          );
          return route.abort();
        }
        return route.fulfill({ status: 200, contentType: 'application/javascript', body: getSupabaseJsUmdSource() });
      }

      if (url.hostname === JSDELIVR_HOST) {
        if (HOLIDAY_JSON_PATH_RE.test(url.pathname)) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: HOLIDAY_FIXTURE_JSON });
        }
        violations.push(`未預期的 jsdelivr 請求：${url.pathname}`);
        return route.abort();
      }

      if (url.hostname !== SUPABASE_HOST) {
        violations.push(`未預期的外部請求（非 localhost／Supabase／unpkg／jsdelivr）：${request.method()} ${url.href}`);
        return route.abort();
      }

      // ---- 以下都是 Supabase host 底下的請求 ----
      if (url.pathname !== '/rest/v1/bookings') {
        violations.push(`未預期的路徑：${request.method()} ${url.pathname}${url.search}`);
        return route.abort();
      }
      if (latencyMs) await new Promise(r => setTimeout(r, latencyMs));
      const method = request.method();
      if (method === 'GET') {
        let rows;
        try {
          rows = table.query(url);
        } catch (e) {
          violations.push(`GET 查詢參數處理失敗：${e.message}（${url.search}）`);
          return route.abort();
        }
        requestLog.push({ method: 'GET', search: url.search });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
      }
      if (method === 'POST') {
        if (!insertHandler) {
          violations.push(`未預期的 POST（測試沒呼叫 mock.allowInserts()）：${request.postData()}`);
          return route.abort();
        }
        let bodyRows;
        try {
          bodyRows = JSON.parse(request.postData() || '[]');
        } catch (e) {
          violations.push(`POST body 不是合法 JSON：${request.postData()}`);
          return route.abort();
        }
        insertCalls.push(bodyRows);
        requestLog.push({ method: 'POST', search: url.search, body: bodyRows });
        let verdict;
        try {
          verdict = insertHandler(bodyRows, request);
        } catch (e) {
          violations.push(`insert handler 丟出例外：${e.message}`);
          return route.abort();
        }
        if (verdict && verdict.conflict) {
          return route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'slot conflict (fixture)', details: null, hint: null, code: verdict.conflict }),
          });
        }
        const inserted = table.insert(bodyRows);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(inserted) });
      }
      // 本測試套件目前沒有任何情境需要 PATCH/DELETE，一律視為未預期、fail-closed。
      violations.push(`未預期的 ${method}：${url.pathname}${url.search}`);
      return route.abort();
    });
  }

  return {
    table,
    violations,
    insertCalls,
    requestLog,
    realtime,
    attach,
    /** 測試開頭（goto 之前）灌初始資料，取代 constructor 傳的 initialRows。 */
    seed(rows) {
      table.rows = rows.map(r => ({ ...r }));
      const maxId = table.rows.reduce((m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m), 0);
      table.nextId = maxId + 1;
    },
    /**
     * 放行 POST /rest/v1/bookings。customizer(bodyRows, request) 可回傳
     * { conflict: '23P01' } 之類的物件模擬 DB 擋下衝突；不回傳（或回傳 falsy）就正常寫入。
     */
    allowInserts(customizer) {
      insertHandler = customizer || (() => undefined);
    },
    disallowInserts() {
      insertHandler = null;
    },
    /** 幫 GET／POST 加人工延遲（ms），用來撐開「衝突檢查到寫入之間的空窗」給雙擊測試用。 */
    setLatency(ms) {
      latencyMs = ms;
    },
  };
}

// Node 端（測試檔自己的 async function，不是 page.evaluate 裡的瀏覽器程式碼）如果
// 直接呼叫全域 fetch() 打外部位址，前面幾層防線都管不到——那些防線都是瀏覽器層的
// route/proxy，Node process 的網路請求走的是另一條路。這裡包一層 globalThis.fetch，
// 非 localhost/127.0.0.1 的請求直接 throw，讓這種寫法立刻在呼叫處爆炸，而不是真的打出去。
// 這不是完整的防線：只包了 `fetch`，換成 Node 內建的 http/https 模組或其他 HTTP client
// （axios、undici 的 Pool 等）不會被這層攔到；也只在測試執行期間生效，globalSetup／
// import 階段的頂層程式碼不受影響。剩下的缺口寫在 TESTING.md「防線與已知缺口」一節，
// 不假裝這裡封死了。
function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export const test = base.extend({
  mock: async ({}, use) => {
    const mock = createSupabaseMock();
    await use(mock);
  },
  // auto:true——不必被任何測試明確請求這個 fixture，每個測試都會自動套用。
  nodeFetchGuard: [
    async ({}, use) => {
      const originalFetch = globalThis.fetch;
      if (typeof originalFetch === 'function') {
        globalThis.fetch = async function guardedFetch(input, init) {
          const rawUrl = typeof input === 'string' ? input
            : input instanceof URL ? input.href
            : (input && typeof input === 'object' && 'url' in input) ? input.url
            : String(input);
          let hostname = null;
          try {
            hostname = new URL(rawUrl).hostname;
          } catch (e) {
            // 解析不出來（例如相對路徑）一律當成不明來源，fail-closed 擋下，不放行。
          }
          if (!isLocalHost(hostname)) {
            throw new Error(
              `[nodeFetchGuard] Node 端直接 fetch 非 localhost 的位址被擋下：${rawUrl}` +
                '（測試檔的 Node 程式碼不該直接連外部服務，見 mock-supabase.mjs 的 nodeFetchGuard 註解）'
            );
          }
          return originalFetch.call(this, input, init);
        };
      }
      await use();
      if (typeof originalFetch === 'function') {
        globalThis.fetch = originalFetch;
      }
    },
    { auto: true },
  ],
  // 覆寫內建的 page fixture：在測試拿到 page 之前就把時鐘固定、把路由攔截裝好，
  // 確保任何一個 spec 都不可能在忘記裝 fixture 的情況下打到正式 Supabase。
  page: async ({ page, mock }, use) => {
    await page.clock.setFixedTime(new Date(FIXED_NOW_UTC));
    await mock.attach(page);
    await use(page);
    if (mock.violations.length) {
      throw new Error(
        'Supabase mock 攔到未預期請求（fail-closed 已 route.abort()，測試判定失敗）：\n' +
          mock.violations.map(v => `- ${v}`).join('\n')
      );
    }
  },
});

// timezoneId 已放到 playwright.unit.config.js 的 use 層級，對 tests/unit 底下每一個 spec
// 都生效，不受 import 順序影響。

export { expect };
