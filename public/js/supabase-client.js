import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let _client = null;

export const getClient = () => {
  if (_client) return _client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (_e) {
    _client = null;
  }
  return _client;
};

const isDuplicateError = (error) => {
  if (!error) return false;
  const code = error.code || error.status;
  return code === '23505' || code === 409 || /duplicate/i.test(error.message || '');
};

const postFallback = async (path, body) => {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true
  });
  if (res.status === 204) return { ok: true, duplicate: false };
  let data = {};
  try {
    data = await res.json();
  } catch (_e) {
    return { ok: res.ok, duplicate: false, message: 'unexpected response' };
  }
  return {
    ok: Boolean(data.ok),
    duplicate: Boolean(data.duplicate),
    message: data.message || ''
  };
};

export const saveSubscriber = async (email) => {
  const client = getClient();
  if (client) {
    try {
      const { error } = await client.from('subscribers').insert([{ email }]);
      if (!error) return { ok: true, duplicate: false };
      if (isDuplicateError(error)) return { ok: true, duplicate: true };
    } catch (_e) {
      /* fallthrough */
    }
  }
  return postFallback('/api/subscribe', { email });
};
