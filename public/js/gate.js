import { initCursor } from './cursor.js';
import { initBackground } from './background.js';

const STORAGE_KEY = 'absnothing_unlocked';
const SECRET_CODE = '01.08.26';
const QUANTUM_MS = 1100;

export const isUnlocked = () => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch (_e) {
    return false;
  }
};

const normalizeCode = (value) => (value || '').trim().replace(/\s+/g, '');

const playQuantumTransition = (gateEl, mainWrap, overlay) => {
  return new Promise((resolve) => {
    document.documentElement.classList.add('quantum-active');
    overlay?.setAttribute('aria-hidden', 'false');

    const finish = () => {
      document.documentElement.classList.remove('quantum-active', 'gate-active');
      gateEl?.remove();
      overlay?.setAttribute('aria-hidden', 'true');
      mainWrap?.classList.add('main-wrap--visible');
      document.body.classList.add('main-unlocked');
      resolve();
    };

    window.setTimeout(finish, QUANTUM_MS);
  });
};

export const initGate = async (onUnlock) => {
  const gate = document.getElementById('gate');
  const mainWrap = document.getElementById('main-wrap');
  const overlay = document.getElementById('quantum-warp');
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-code');
  const msg = document.getElementById('gate-msg');

  if (!gate || !mainWrap || !form || !input) {
    onUnlock();
    return;
  }

  document.documentElement.classList.add('gate-active');
  document.body.classList.remove('main-unlocked');

  initBackground();

  initCursor({
    bulbId: 'gate-bulb-cursor',
    glowId: 'gate-cursor-glow',
    torchId: 'gate-torch',
    spotlightClass: 'gate-spotlight-active',
    readyClass: 'gate-cursor-ready',
    enableTouch: true
  });

  const setMsg = (text, type = '') => {
    if (!msg) return;
    msg.textContent = text;
    msg.dataset.type = type;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.state === 'warping') return;

    const attempt = normalizeCode(input.value);
    input.classList.remove('invalid');

    if (attempt !== SECRET_CODE) {
      input.classList.add('invalid');
      setMsg('incorrect — search the dark', 'err');
      input.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(0)' }
        ],
        { duration: 360, easing: 'ease-out' }
      );
      input.focus();
      return;
    }

    form.dataset.state = 'warping';
    setMsg('', '');
    input.disabled = true;

    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (_e) {
      /* continue */
    }

    await playQuantumTransition(gate, mainWrap, overlay);
    onUnlock();
  });
};
