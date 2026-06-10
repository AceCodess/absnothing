export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const lerp = (a, b, t) => a + (b - a) * t;

export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);

export const random = (min, max) => min + Math.random() * (max - min);

export const isEmail = (value) => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.length < 3 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
};

export const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_e) {
    return false;
  }
};

export const isCoarsePointer = () => {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch (_e) {
    return false;
  }
};

export const onResize = (handler) => {
  let frame = 0;
  const fire = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(handler);
  };
  window.addEventListener('resize', fire, { passive: true });
  window.addEventListener('orientationchange', fire, { passive: true });
  return () => {
    window.removeEventListener('resize', fire);
    window.removeEventListener('orientationchange', fire);
  };
};

export const fitCanvas = (canvas) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  return { w, h, dpr };
};

let _rafSubscribers = [];
let _rafRunning = false;
let _lastTime = 0;

const _tick = (time) => {
  const dt = _lastTime ? Math.min(50, time - _lastTime) : 16;
  _lastTime = time;
  for (let i = 0; i < _rafSubscribers.length; i++) {
    try {
      _rafSubscribers[i](time, dt);
    } catch (_e) {
      /* swallow */
    }
  }
  if (_rafSubscribers.length > 0) {
    requestAnimationFrame(_tick);
  } else {
    _rafRunning = false;
    _lastTime = 0;
  }
};

export const onFrame = (fn) => {
  _rafSubscribers.push(fn);
  if (!_rafRunning) {
    _rafRunning = true;
    requestAnimationFrame(_tick);
  }
  return () => {
    _rafSubscribers = _rafSubscribers.filter((f) => f !== fn);
  };
};
