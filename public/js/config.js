/**
 * Runtime config — values injected by GET /config.js from server env.
 * Set in .env (local) or Render dashboard:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY  (or SUPABASE_PUBLISHABLE_KEY — same key)
 */
const ENV = (typeof window !== 'undefined' && window.__ENV__) || {};

export const SUPABASE_URL = ENV.SUPABASE_URL || '';

/** Supabase anon / publishable key (browser-safe with RLS) */
export const SUPABASE_ANON_KEY =
  ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_PUBLISHABLE_KEY || '';

/** Countdown window: sand drains from 01.06.2026 → 01.08.2026 */
export const TIMELINE_START = Date.UTC(2026, 5, 1, 0, 0, 0);
export const DEADLINE = Date.UTC(2026, 7, 1, 0, 0, 0);

export const TWITTER_URL = 'https://x.com/absolutlynthsol?s=11';
