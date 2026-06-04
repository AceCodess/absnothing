'use strict';

/**
 * Express server for Render / local dev.
 * - Serves static SPA from /public
 * - Injects Supabase public config via /config.js
 * - Proxies writes with service role when browser insert fails
 *
 * Env (see .env.example):
 *   PORT, SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY), SUPABASE_SECRET_KEY
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  '';

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  } catch (_err) {
    supabaseAdmin = null;
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(compression());
app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    supabase: Boolean(supabaseAdmin),
    config: {
      hasUrl: Boolean(SUPABASE_URL),
      hasAnonKey: Boolean(SUPABASE_ANON_KEY),
      hasSecretKey: Boolean(SUPABASE_SECRET_KEY)
    },
    uptime: process.uptime()
  });
});

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  res.send(
    `window.__ENV__=${JSON.stringify({
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      SUPABASE_PUBLISHABLE_KEY: SUPABASE_ANON_KEY
    })};`
  );
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeEmail(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 254) return null;
  if (!EMAIL_RE.test(trimmed)) return null;
  return trimmed;
}

function sanitizePublicKey(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 32 || trimmed.length > 64) return null;
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed)) return null;
  return trimmed;
}

function isDuplicatePg(error) {
  return error && (error.code === '23505' || /duplicate/i.test(error.message || ''));
}

async function insertRow(table, row) {
  if (!supabaseAdmin) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_SECRET_KEY) missing.push('SUPABASE_SECRET_KEY');
    return {
      ok: false,
      duplicate: false,
      message:
        missing.length > 0
          ? `database not configured (set ${missing.join(' and ')} on Render)`
          : 'database not configured'
    };
  }
  const { error } = await supabaseAdmin.from(table).insert([row]);
  if (!error) return { ok: true, duplicate: false };
  if (isDuplicatePg(error)) return { ok: true, duplicate: true };
  return { ok: false, duplicate: false, message: error.message || 'insert failed' };
}

app.post('/api/subscribe', async (req, res) => {
  const email = sanitizeEmail(req.body && req.body.email);
  if (!email) return res.status(400).json({ ok: false, message: 'invalid email' });
  const result = await insertRow('subscribers', { email });
  return res.status(result.ok ? 200 : 503).json(result);
});

app.post('/api/wallet', async (req, res) => {
  const publicKey = sanitizePublicKey(req.body && req.body.public_key);
  if (!publicKey) return res.status(400).json({ ok: false, message: 'invalid public key' });
  const result = await insertRow('wallets', { public_key: publicKey });
  return res.status(result.ok ? 200 : 503).json(result);
});

app.use(
  express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
  })
);

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`∅ listening on :${PORT}`);
  if (!supabaseAdmin) {
    console.warn(
      '[supabase] NOT configured — set SUPABASE_URL + SUPABASE_SECRET_KEY (and SUPABASE_ANON_KEY for browser writes)'
    );
  } else {
    console.log('[supabase] connected');
  }
});
