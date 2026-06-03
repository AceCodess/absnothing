import { isCoarsePointer, onResize } from './utils.js';

const updateSpotSize = (root) => {
  const r = Math.min(220, Math.max(140, window.innerWidth * 0.22));
  root.style.setProperty('--spot-r', `${Math.round(r)}px`);
};

export const initCursor = () => {
  if (isCoarsePointer()) return;

  const bulb = document.getElementById('bulb-cursor');
  const root = document.documentElement;
  if (!bulb) return;

  let x = -9999;
  let y = -9999;
  let targetX = x;
  let targetY = y;
  let hasMoved = false;

  const setVars = (px, py) => {
    root.style.setProperty('--mx', `${px}px`);
    root.style.setProperty('--my', `${py}px`);
  };

  const activateSpotlight = () => {
    if (hasMoved) return;
    hasMoved = true;
    root.classList.add('spotlight-active', 'cursor-ready');
  };

  updateSpotSize(root);
  onResize(() => updateSpotSize(root));
  setVars(x, y);

  const onMove = (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    activateSpotlight();
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('mousemove', onMove, { passive: true });

  document.addEventListener('pointerover', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('a, button, input, textarea, select, label')) {
      bulb.dataset.hover = '1';
    }
  });
  document.addEventListener('pointerout', (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest('a, button, input, textarea, select, label')) {
      bulb.dataset.hover = '0';
    }
  });

  let raf = 0;
  const tick = () => {
    if (hasMoved) {
      x += (targetX - x) * 0.38;
      y += (targetY - y) * 0.38;
      setVars(x, y);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  window.addEventListener('mouseleave', () => {
    root.classList.remove('cursor-ready');
    root.classList.remove('spotlight-active');
    hasMoved = false;
    x = -9999;
    y = -9999;
    targetX = x;
    targetY = y;
    setVars(x, y);
  });

  window.addEventListener('mouseenter', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    activateSpotlight();
  });

  return () => cancelAnimationFrame(raf);
};
