import { fitCanvas, onFrame, onResize, random, clamp } from './utils.js';

const STAR_COUNT = 140;

export const initConstellation = () => {
  const canvas = document.getElementById('constellation');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  let dim = { w: 0, h: 0, dpr: 1 };
  const stars = [];
  let mouseX = -9999;
  let mouseY = -9999;

  const seed = () => {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: random(0, dim.w),
        y: random(0, dim.h),
        r: random(0.4, 1.4),
        baseAlpha: random(0.15, 0.55),
        phase: random(0, Math.PI * 2),
        vx: 0,
        vy: 0
      });
    }
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

  onFrame((time) => {
    ctx.setTransform(dim.dpr, 0, 0, dim.dpr, 0, 0);
    ctx.clearRect(0, 0, dim.w, dim.h);

    const linkDist = 95;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const dx = mouseX - s.x;
      const dy = mouseY - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 220 && dist > 0.1) {
        const force = (220 - dist) / 220;
        s.vx += (dx / dist) * force * 0.08;
        s.vy += (dy / dist) * force * 0.08;
      }
      s.vx *= 0.92;
      s.vy *= 0.92;
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x = dim.w;
      if (s.x > dim.w) s.x = 0;
      if (s.y < 0) s.y = dim.h;
      if (s.y > dim.h) s.y = 0;

      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 + s.phase);
      const alpha = s.baseAlpha * twinkle;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 248, 230, ${alpha})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(120, 80, 255, 0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i];
        const b = stars[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          const lineAlpha = clamp(1 - d / linkDist, 0, 1) * 0.35;
          ctx.globalAlpha = lineAlpha;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  });
};
