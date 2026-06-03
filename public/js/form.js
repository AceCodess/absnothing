import { isEmail } from './utils.js';
import { saveSubscriber } from './supabase-client.js';

export const initForm = () => {
  const form = document.getElementById('form');
  const input = document.getElementById('email');
  const msg = document.getElementById('form-msg');
  if (!form || !input) return;

  const setMsg = (text, type = '') => {
    if (!msg) return;
    msg.textContent = text;
    msg.dataset.type = type;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.state === 'sending') return;

    const value = (input.value || '').trim().toLowerCase();
    input.classList.remove('invalid');

    if (!isEmail(value)) {
      input.classList.add('invalid');
      setMsg('enter a valid email', 'err');
      input.focus();
      return;
    }

    form.dataset.state = 'sending';
    setMsg('saving…', '');

    const result = await saveSubscriber(value);

    if (result.ok) {
      form.dataset.state = 'done';
      setMsg(result.duplicate ? 'already subscribed' : 'saved — ∅', 'ok');
    } else {
      form.dataset.state = '';
      setMsg(result.message || 'could not save — try again', 'err');
    }
  });
};
