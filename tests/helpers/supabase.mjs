// Supabase client for tests (READS the same i18n constants from index.html).
import { createClient } from '@supabase/supabase-js';

// 與 index.html 同步（不更動 index.html 內的值，僅鏡像）
export const SUPABASE_URL = 'https://vicvccudnqluufsgyznk.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpY3ZjY3VkbnFsdXVmc2d5em5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMzkyMDMsImV4cCI6MjA3MDcxNTIwM30.55ZG0B_L6UVJOUteqZ7sPXGHm8DG6K5Qk4xcQ9lF01U';

// 統一的測試標記 — 所有測試建立的資料必須帶這個 organizer
export const TEST_TAG = '__playwright_test__';

// 任何測試的 title 都加這個前綴 — 第二道清理依據
export const TEST_TITLE_PREFIX = '__pwtest__';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
