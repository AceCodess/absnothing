import { clamp, isCoarsePointer } from './utils.js';

const SPOT_RADIUS = () => {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--spot-radius');
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 200;
};

export const initCursor = () => {
  if (isCoarsePointer()) return;

  const bulb = document.getElementById('bulb-cursor');
  const glow = document.getElementById('cursor-glow');
  const root = document.documentElement;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let targetX = x;
  let targetY = y;

  const setVars = (px, py) => {
    root.style.setProperty('--mx', `${px}px`);
    root.style.setProperty('--my', `${py}px`);
  };

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('mousemove', onMove, { passive: true });

  document.addEventListener('pointerover', (e) => {
    if (!(e.target instanceof Element) || !bulb) return;
    if (e.target.closest('a, button, input, textarea, select, label')) {
      bulb.dataset.hover = '1';
    }
  });
  document.addEventListener('pointerout', (e) => {
    if (!(e.target instanceof Element) || !bulb) return;
    if (e.target.closest('a, button, input, textarea, select, label')) {
      bulb.dataset.hover = '0';
    }
  });

  let raf = 0;
  const tick = () => {
    x += (targetX - x) * 0.35;
    y += (targetY - y) * 0.35;
    setVars(x, y);
    void SPOT_RADIUS;
    raf = requestAnimationFrame(tick);
  };

  setVars(x, y);
  root.classList.add('cursor-ready');
  raf = requestAnimationFrame(tick);

  window.addEventListener('mouseleave', () => {
    root.classList.remove('cursor-ready');
  });
  window.addEventListener('mouseenter', () => {
    root.classList.add('cursor-ready');
  });

  return () => cancelAnimationFrame(raf);
};
