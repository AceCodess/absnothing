import { isSolanaPublicKey } from './utils.js';
import { saveWallet } from './supabase-client.js';

export const initWallet = () => {
  const form = document.getElementById('wallet-form');
  const input = document.getElementById('wallet-address');
  const msg = document.getElementById('wallet-msg');
  if (!form || !input) return;

  const setMsg = (text, type = '') => {
    if (!msg) return;
    msg.textContent = text;
    msg.dataset.type = type;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.state === 'sending') return;

    const value = (input.value || '').trim();
    input.classList.remove('invalid');

    if (!isSolanaPublicKey(value)) {
      input.classList.add('invalid');
      setMsg('enter a valid solana address', 'err');
      input.focus();
      return;
    }

    form.dataset.state = 'sending';
    setMsg('saving…', '');

    const result = await saveWallet(value);

    if (result.ok) {
      form.dataset.state = 'done';
      setMsg(result.duplicate ? 'wallet already saved' : 'sent — ∅', 'ok');
    } else {
      form.dataset.state = '';
      setMsg(result.message || 'could not save — try again', 'err');
    }
  });
};
