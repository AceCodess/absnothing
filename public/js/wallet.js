/**
 * Solana wallet connect — Phantom / Wallet Standard (equivalent to
 * @solana/wallet-adapter-react for a static Express-hosted SPA).
 */
import { saveWallet } from './supabase-client.js';

const shortenKey = (key) => {
  if (!key || key.length < 12) return key || '';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
};

const detectProvider = () => {
  const w = window;
  if (w.solana?.isPhantom) return w.solana;
  if (w.phantom?.solana) return w.phantom.solana;
  if (w.solflare?.isSolflare) return w.solflare;
  return null;
};

export const initWallet = () => {
  const wrap = document.getElementById('wallet');
  const button = wrap?.querySelector('.connect');
  const keyEl = wrap?.querySelector('.wallet-key');
  const msg = document.getElementById('wallet-msg');
  if (!wrap || !button) return;

  const setMsg = (text) => {
    if (msg) msg.textContent = text;
  };

  const persist = async (publicKey) => {
    const result = await saveWallet(publicKey);
    if (result.ok) {
      setMsg(result.duplicate ? 'wallet already linked' : 'wallet saved');
    } else {
      setMsg(result.message || '');
    }
  };

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    if (wrap.dataset.state === 'connecting' || wrap.dataset.state === 'connected') return;

    const provider = detectProvider();
    if (!provider) {
      setMsg('install phantom or solflare');
      window.open('https://phantom.app/', '_blank', 'noopener');
      return;
    }

    wrap.dataset.state = 'connecting';
    setMsg('connecting…');

    try {
      const resp = await provider.connect();
      const publicKey =
        resp?.publicKey?.toString?.() ||
        provider.publicKey?.toString?.() ||
        '';

      if (!publicKey) {
        wrap.dataset.state = '';
        setMsg('connection cancelled');
        return;
      }

      wrap.dataset.state = 'connected';
      if (keyEl) keyEl.textContent = shortenKey(publicKey);
      await persist(publicKey);
    } catch (err) {
      wrap.dataset.state = '';
      if (keyEl) keyEl.textContent = '';
      setMsg(err?.message?.includes('User rejected') ? 'cancelled' : 'connection failed');
    }
  });

  const provider = detectProvider();
  if (provider?.on) {
    provider.on('disconnect', () => {
      wrap.dataset.state = '';
      if (keyEl) keyEl.textContent = '';
      setMsg('');
    });
    provider.on('accountChanged', (pk) => {
      if (pk?.toString) {
        const k = pk.toString();
        if (keyEl) keyEl.textContent = shortenKey(k);
        wrap.dataset.state = 'connected';
        persist(k);
      } else {
        wrap.dataset.state = '';
        if (keyEl) keyEl.textContent = '';
      }
    });
  }
};
