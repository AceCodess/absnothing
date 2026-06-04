import { clamp, fitCanvas, lerp, onFrame, onResize, random } from './utils.js';
import { TIMELINE_START, DEADLINE } from './config.js';

const STREAM_COUNT = 42;

const getProportion = () => {
  const now = Date.now();
  if (now >= DEADLINE) return 1;
  const total = DEADLINE - TIMELINE_START;
  if (total <= 0) return 1;
  return clamp((now - TIMELINE_START) / total, 0, 1);
};

/** Classic steep bulb taper to narrow waist */
const buildTopChamberPath = (ctx, geom) => {
  const { cx, chamberTopY: topY, midY, chamberR: topR, neckR } = geom;
  const k = 0.78;
  ctx.beginPath();
  ctx.moveTo(cx + topR, topY);
  ctx.bezierCurveTo(
    cx + topR, topY + (midY - topY) * k,
    cx + neckR + 2, midY - 3,
    cx + neckR, midY
  );
  ctx.lineTo(cx - neckR, midY);
  ctx.bezierCurveTo(
    cx - neckR - 2, midY - 3,
    cx - topR, topY + (midY - topY) * k,
    cx - topR, topY
  );
  ctx.closePath();
};

const buildBottomChamberPath = (ctx, geom) => {
  const { cx, midY, chamberBottomY: bottomY, chamberR: bottomR, neckR } = geom;
  const k = 0.78;
  ctx.beginPath();
  ctx.moveTo(cx + neckR, midY);
  ctx.bezierCurveTo(
    cx + neckR + 2, midY + 3,
    cx + bottomR, bottomY - (bottomY - midY) * k,
    cx + bottomR, bottomY
  );
  ctx.lineTo(cx - bottomR, bottomY);
  ctx.bezierCurveTo(
    cx - bottomR, bottomY - (bottomY - midY) * k,
    cx - neckR - 2, midY + 3,
    cx - neckR, midY
  );
  ctx.closePath();
};

const drawSoftGlow = (ctx, geom, time, flowing) => {
  const { cx, midY, chamberR } = geom;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.002);
  const grad = ctx.createRadialGradient(cx, midY, 0, cx, midY, chamberR * 2.2);
  grad.addColorStop(0, `rgba(212, 175, 88, ${flowing ? 0.1 + pulse * 0.06 : 0.04})`);
  grad.addColorStop(0.5, 'rgba(120, 80, 255, 0.03)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, midY, chamberR * 2.2, 0, Math.PI * 2);
  ctx.fill();
};

const drawGlass = (ctx, geom, isTop, time) => {
  ctx.save();
  if (isTop) buildTopChamberPath(ctx, geom);
  else buildBottomChamberPath(ctx, geom);

  const { cx, chamberTopY: topY, chamberBottomY: bottomY, midY, chamberR } = geom;

  const glassFill = ctx.createLinearGradient(cx - chamberR, 0, cx + chamberR, 0);
  glassFill.addColorStop(0, 'rgba(12, 18, 28, 0.55)');
  glassFill.addColorStop(0.2, 'rgba(22, 32, 48, 0.35)');
  glassFill.addColorStop(0.5, 'rgba(30, 40, 55, 0.2)');
  glassFill.addColorStop(0.8, 'rgba(22, 32, 48, 0.35)');
  glassFill.addColorStop(1, 'rgba(12, 18, 28, 0.55)');
  ctx.fillStyle = glassFill;
  ctx.fill();

  ctx.clip();
  const y0 = isTop ? topY : midY;
  const y1 = isTop ? midY : bottomY;
  const glint = ctx.createLinearGradient(cx - chamberR * 0.4, y0, cx - chamberR * 0.15, y1);
  glint.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  glint.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glint;
  ctx.fillRect(cx - chamberR, y0, chamberR * 0.55, y1 - y0);
  ctx.restore();

  ctx.save();
  if (isTop) buildTopChamberPath(ctx, geom);
  else buildBottomChamberPath(ctx, geom);
  ctx.strokeStyle = 'rgba(180, 200, 220, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.restore();
};

const drawTopSand = (ctx, geom, topAmount) => {
  if (topAmount <= 0.0001) return;
  const { cx, chamberTopY: topY, midY, chamberR: topR } = geom;
  ctx.save();
  buildTopChamberPath(ctx, geom);
  ctx.clip();

  const sandHeight = (midY - topY) * topAmount;
  const sandTop = midY - sandHeight;
  const funnel = Math.min(topR * 0.22, 14);
  const dip = Math.min(12, sandHeight * 0.28);

  ctx.beginPath();
  ctx.moveTo(cx - topR + 4, sandTop);
  ctx.lineTo(cx - funnel, sandTop);
  ctx.quadraticCurveTo(cx, sandTop + dip, cx + funnel, sandTop);
  ctx.lineTo(cx + topR - 4, sandTop);
  ctx.lineTo(cx + topR - 4, midY);
  ctx.lineTo(cx - topR + 4, midY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, sandTop, 0, midY);
  grad.addColorStop(0, '#e8c878');
  grad.addColorStop(0.4, '#d4a84a');
  grad.addColorStop(1, '#9a7030');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
};

const drawBottomSand = (ctx, geom, bottomAmount) => {
  if (bottomAmount <= 0.0001) return;
  const { cx, midY, chamberBottomY: bottomY, chamberR: bottomR } = geom;
  ctx.save();
  buildBottomChamberPath(ctx, geom);
  ctx.clip();

  const sandHeight = (bottomY - midY) * bottomAmount;
  const sandTop = bottomY - sandHeight;
  const peak = Math.min(18, sandHeight * 0.3);
  const peakW = Math.min(bottomR * 0.55, 48);

  ctx.beginPath();
  ctx.moveTo(cx - bottomR + 4, sandTop);
  ctx.lineTo(cx - peakW, sandTop);
  ctx.quadraticCurveTo(cx, sandTop - peak, cx + peakW, sandTop);
  ctx.lineTo(cx + bottomR - 4, sandTop);
  ctx.lineTo(cx + bottomR - 4, bottomY);
  ctx.lineTo(cx - bottomR + 4, bottomY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, sandTop - peak, 0, bottomY);
  grad.addColorStop(0, '#f0d080');
  grad.addColorStop(0.5, '#d4a84a');
  grad.addColorStop(1, '#8a6428');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
};

const drawSandTexture = (ctx, geom, topAmount, bottomAmount, time) => {
  const { cx, chamberTopY: topY, midY, chamberBottomY: bottomY, chamberR } = geom;
  for (let i = 0; i < 22; i++) {
    const seed = i * 2.41;
    const flicker = 0.35 + 0.65 * Math.sin(time * 0.01 + seed);
    const inTop = i < 10 && topAmount > 0.04;
    const inBottom = i >= 10 && bottomAmount > 0.04;
    if (!inTop && !inBottom) continue;

    const t = (i % 11) / 11;
    let y;
    let spread;
    if (inTop) {
      const h = (midY - topY) * topAmount;
      y = midY - h + t * h * 0.8;
      spread = chamberR * 0.65;
    } else {
      const h = (bottomY - midY) * bottomAmount;
      y = bottomY - h + t * h * 0.85;
      spread = chamberR * 0.7;
    }
    const x = cx + Math.sin(seed + time * 0.0015) * spread * 0.5;
    ctx.fillStyle = i % 3 === 0
      ? `rgba(240, 210, 140, ${flicker * 0.7})`
      : `rgba(180, 130, 50, ${flicker * 0.55})`;
    ctx.fillRect(x, y, 1, 1);
  }
};

const drawNeckGlow = (ctx, geom, flowing) => {
  if (!flowing) return;
  const { cx, midY } = geom;
  const g = ctx.createRadialGradient(cx, midY, 0, cx, midY, 18);
  g.addColorStop(0, 'rgba(255, 230, 160, 0.4)');
  g.addColorStop(1, 'rgba(212, 175, 88, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, midY, 18, 0, Math.PI * 2);
  ctx.fill();
};

const drawStream = (ctx, geom, particles, time, dt) => {
  const { cx, midY } = geom;
  const step = dt / 16;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = clamp(p.alpha, 0, 1);
    ctx.fillStyle = i % 4 === 0 ? `rgba(255, 235, 180, ${a})` : `rgba(212, 168, 72, ${a})`;
    const w = 1 + (i % 3 === 0 ? 0.5 : 0);
    ctx.fillRect(cx + p.x - w / 2, p.y, w, 1.8 + p.size * 0.5);
  }

  ctx.fillStyle = 'rgba(212, 168, 72, 0.12)';
  ctx.fillRect(cx - 1.5, midY - 2, 3, 12);
};

export const initHourglass = () => {
  const canvas = document.getElementById('hourglass');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let dim = { w: 0, h: 0, dpr: 1 };
  let geom = null;
  const stream = [];

  const buildGeom = () => {
    const W = dim.w;
    const H = dim.h;
    const cx = W / 2;
    const chamberTopY = H * 0.06;
    const chamberBottomY = H * 0.94;
    const midY = (chamberTopY + chamberBottomY) / 2;
    const chamberR = Math.min(W * 0.38, (chamberBottomY - chamberTopY) * 0.4);
    const neckR = Math.max(2.5, W * 0.014);
    geom = { W, H, cx, chamberTopY, chamberBottomY, midY, chamberR, neckR };
  };

  const seedStream = () => {
    stream.length = 0;
    for (let i = 0; i < STREAM_COUNT; i++) {
      stream.push({
        x: random(-0.8, 0.8),
        y: 0,
        vy: random(1.2, 2.6),
        alpha: random(0.5, 0.95),
        size: random(0.2, 0.8),
        seed: Math.random()
      });
    }
  };

  const resize = () => {
    dim = fitCanvas(canvas);
    buildGeom();
    seedStream();
  };
  resize();
  onResize(resize);

  onFrame((time, dt) => {
    if (!geom) return;
    ctx.setTransform(dim.dpr, 0, 0, dim.dpr, 0, 0);
    ctx.clearRect(0, 0, geom.W, geom.H);

    const proportion = getProportion();
    const topAmount = 1 - proportion;
    const bottomAmount = proportion;
    const flowing = topAmount > 0.0005 && Date.now() < DEADLINE;

    drawSoftGlow(ctx, geom, time, flowing);
    drawGlass(ctx, geom, true, time);
    drawGlass(ctx, geom, false, time);
    drawTopSand(ctx, geom, topAmount);
    drawBottomSand(ctx, geom, bottomAmount);
    drawSandTexture(ctx, geom, topAmount, bottomAmount, time);

    if (flowing) {
      const fallEnd =
        geom.chamberBottomY -
        (geom.chamberBottomY - geom.midY) * bottomAmount -
        Math.min(18, (geom.chamberBottomY - geom.midY) * bottomAmount * 0.3);
      const step = dt / 16;
      for (let i = 0; i < stream.length; i++) {
        const p = stream[i];
        if (p.y === 0) p.y = geom.midY + p.seed * (fallEnd - geom.midY);
        p.y += p.vy * step * 1.65;
        p.x = Math.sin(time * 0.006 + p.seed * 6.28) * 0.65;
        p.alpha = lerp(p.alpha, 0.7 + Math.sin(time * 0.02 + p.seed) * 0.25, 0.06);
        if (p.y > fallEnd) {
          p.y = geom.midY + random(0, 2);
          p.vy = random(1.2, 2.5);
          p.alpha = random(0.45, 0.85);
        }
      }
      drawStream(ctx, geom, stream, time, dt);
      drawNeckGlow(ctx, geom, flowing);
    }
  });
};
