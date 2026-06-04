import { isCoarsePointer, onResize } from './utils.js';

const updateSpotSize = (root) => {
  const r = Math.min(220, Math.max(140, window.innerWidth * 0.22));
  root.style.setProperty('--spot-r', `${Math.round(r)}px`);
};

/**
 * @param {object} [options]
 * @param {string} [options.bulbId]
 * @param {string} [options.glowId]
 * @param {string} [options.torchId]
 * @param {string} [options.spotlightClass]
 * @param {string} [options.readyClass]
 * @param {boolean} [options.enableTouch] — allow spotlight on touch devices (gate)
 */
export const initCursor = (options = {}) => {
  const {
    bulbId = 'bulb-cursor',
    glowId = 'cursor-glow',
    torchId = 'torch',
    spotlightClass = 'spotlight-active',
    readyClass = 'cursor-ready',
    enableTouch = false
  } = options;

  if (!enableTouch && isCoarsePointer()) return;

  const bulb = document.getElementById(bulbId);
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
    root.classList.add(spotlightClass, readyClass);
  };

  const track = (clientX, clientY) => {
    targetX = clientX;
    targetY = clientY;
    activateSpotlight();
  };

  updateSpotSize(root);
  onResize(() => updateSpotSize(root));
  setVars(x, y);

  window.addEventListener('pointermove', (e) => track(e.clientX, e.clientY), { passive: true });
  window.addEventListener('mousemove', (e) => track(e.clientX, e.clientY), { passive: true });

  if (enableTouch) {
    window.addEventListener(
      'touchmove',
      (e) => {
        const t = e.touches[0];
        if (t) track(t.clientX, t.clientY);
      },
      { passive: true }
    );
    window.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        if (t) track(t.clientX, t.clientY);
      },
      { passive: true }
    );
  }

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

  const deactivate = () => {
    root.classList.remove(readyClass, spotlightClass);
    hasMoved = false;
    x = -9999;
    y = -9999;
    targetX = x;
    targetY = y;
    setVars(x, y);
  };

  window.addEventListener('mouseleave', deactivate);

  window.addEventListener('mouseenter', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    activateSpotlight();
  });

  return () => {
    cancelAnimationFrame(raf);
    deactivate();
  };
};
