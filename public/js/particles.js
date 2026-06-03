import { fitCanvas, onFrame, onResize, random } from './utils.js';

const PARTICLE_COUNT = 48;

export const initParticles = () => {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let dim = { w: 0, h: 0, dpr: 1 };
  const particles = [];
  let mouseX = -9999;
  let mouseY = -9999;

  const spawn = (initial) => ({
    x: random(0, dim.w),
    y: initial ? random(0, dim.h) : dim.h + random(10, 60),
    vx: random(-0.12, 0.12),
    vy: random(-0.35, -0.08),
    size: Math.random() < 0.4 ? random(10, 16) : random(1, 2.2),
    char: Math.random() < 0.35 ? '∅' : '·',
    alpha: random(0.04, 0.16),
    phase: random(0, Math.PI * 2)
  });

  const seed = () => {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(spawn(true));
  };

  const resize = () => {
    dim = fitCanvas(canvas);
    seed();
  };
  resize();
  onResize(resize);

  const onMove = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('mousemove', onMove, { passive: true });

  onFrame((time, dt) => {
    ctx.setTransform(dim.dpr, 0, 0, dim.dpr, 0, 0);
    ctx.clearRect(0, 0, dim.w, dim.h);
    const step = dt / 16;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 180 && dist > 1) {
        p.vx += (dx / dist) * 0.04 * step;
        p.vy += (dy / dist) * 0.04 * step;
      }
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vx *= 0.98;
      p.vy *= 0.99;

      if (p.y < -40) Object.assign(p, spawn(false));
      if (p.x < -30) p.x = dim.w + 20;
      if (p.x > dim.w + 30) p.x = -20;

      const flicker = 0.6 + 0.4 * Math.sin(time * 0.0012 + p.phase);
      const a = p.alpha * flicker;

      if (p.char === '∅') {
        ctx.font = `300 italic ${p.size}px 'Cormorant Garamond', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(212, 175, 88, ${a})`;
        ctx.fillText(p.char, p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 248, 230, ${a * 1.1})`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
};
