import { clamp, fitCanvas, lerp, onFrame, onResize, random } from './utils.js';
import { TIMELINE_START, DEADLINE } from './config.js';

const STREAM_PARTICLES = 38;

const getProportion = () => {
  const now = Date.now();
  if (now >= DEADLINE) return 1;
  const total = DEADLINE - TIMELINE_START;
  if (total <= 0) return 1;
  return clamp((now - TIMELINE_START) / total, 0, 1);
};

const buildTopChamberPath = (ctx, geom) => {
  const { cx, chamberTopY: topY, midY, chamberR: topR, neckR } = geom;
  const k = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx + topR, topY);
  ctx.bezierCurveTo(
    cx + topR, topY + (midY - topY) * k,
    cx + neckR + (topR - neckR) * 0.32, midY - (midY - topY) * 0.04,
    cx + neckR, midY
  );
  ctx.lineTo(cx - neckR, midY);
  ctx.bezierCurveTo(
    cx - neckR - (topR - neckR) * 0.32, midY - (midY - topY) * 0.04,
    cx - topR, topY + (midY - topY) * k,
    cx - topR, topY
  );
  ctx.closePath();
};

const buildBottomChamberPath = (ctx, geom) => {
  const { cx, midY, chamberBottomY: bottomY, chamberR: bottomR, neckR } = geom;
  const k = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx + neckR, midY);
  ctx.bezierCurveTo(
    cx + neckR + (bottomR - neckR) * 0.32, midY + (bottomY - midY) * 0.04,
    cx + bottomR, bottomY - (bottomY - midY) * k,
    cx + bottomR, bottomY
  );
  ctx.lineTo(cx - bottomR, bottomY);
  ctx.bezierCurveTo(
    cx - bottomR, bottomY - (bottomY - midY) * k,
    cx - neckR - (bottomR - neckR) * 0.32, midY + (bottomY - midY) * 0.04,
    cx - neckR, midY
  );
  ctx.closePath();
};

const drawGlassChamber = (ctx, geom, isTop) => {
  ctx.save();
  if (isTop) buildTopChamberPath(ctx, geom);
  else buildBottomChamberPath(ctx, geom);
  const { cx, chamberTopY: topY, chamberBottomY: bottomY } = geom;
  const grad = ctx.createLinearGradient(cx - geom.chamberR, 0, cx + geom.chamberR, 0);
  grad.addColorStop(0, 'rgba(8, 6, 14, 0.92)');
  grad.addColorStop(0.5, 'rgba(20, 14, 32, 0.68)');
  grad.addColorStop(1, 'rgba(8, 6, 14, 0.92)');
  ctx.fillStyle = grad;
  ctx.fill();
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
  const dipDepth = Math.min(14, sandHeight * 0.35);
  const dipWidth = Math.min(topR * 0.6, 36);
  ctx.beginPath();
  ctx.moveTo(cx - topR - 6, sandTop);
  ctx.lineTo(cx - dipWidth, sandTop);
  ctx.quadraticCurveTo(cx, sandTop + dipDepth, cx + dipWidth, sandTop);
  ctx.lineTo(cx + topR + 6, sandTop);
  ctx.lineTo(cx + topR + 6, midY + 4);
  ctx.lineTo(cx - topR - 6, midY + 4);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, sandTop, 0, midY);
  grad.addColorStop(0, 'rgba(244, 210, 130, 0.92)');
  grad.addColorStop(1, 'rgba(150, 110, 50, 1)');
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
  const peakHeight = Math.min(22, sandHeight * 0.32);
  const peakWidth = Math.min(bottomR * 0.7, 60);
  ctx.beginPath();
  ctx.moveTo(cx - bottomR - 6, sandTop);
  ctx.lineTo(cx - peakWidth, sandTop);
  ctx.quadraticCurveTo(cx, sandTop - peakHeight, cx + peakWidth, sandTop);
  ctx.lineTo(cx + bottomR + 6, sandTop);
  ctx.lineTo(cx + bottomR + 6, bottomY + 4);
  ctx.lineTo(cx - bottomR - 6, bottomY + 4);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, sandTop - peakHeight, 0, bottomY);
  grad.addColorStop(0, 'rgba(244, 210, 130, 0.95)');
  grad.addColorStop(1, 'rgba(140, 100, 40, 1)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
};

const drawNeckGlow = (ctx, geom, flowing) => {
  if (!flowing) return;
  const { cx, midY } = geom;
  const grad = ctx.createRadialGradient(cx, midY, 0, cx, midY, 26);
  grad.addColorStop(0, 'rgba(255, 220, 150, 0.45)');
  grad.addColorStop(1, 'rgba(212, 175, 88, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, midY, 26, 0, Math.PI * 2);
  ctx.fill();
};

const drawStream = (ctx, geom, particles, flowing) => {
  if (!flowing) return;
  const { cx } = geom;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = clamp(p.alpha, 0, 1);
    ctx.fillStyle = i % 5 === 0 ? `rgba(255, 230, 170, ${a})` : `rgba(212, 175, 88, ${a})`;
    ctx.fillRect(cx + p.x - 0.5, p.y, 1, 1.6);
  }
};

const drawFrame = (ctx, geom) => {
  const { cx, plateTopY, plateBottomY, plateHeight, plateInsetX, midY, chamberR, neckR } = geom;
  const goldStroke = 'rgba(212, 175, 88, 0.95)';
  const goldFill = 'rgba(212, 175, 88, 1)';

  const drawPlate = (y) => {
    const x0 = cx - chamberR - plateInsetX;
    const x1 = cx + chamberR + plateInsetX;
    const r = plateHeight / 2;
    ctx.fillStyle = 'rgba(212, 175, 88, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x0 + r, y);
    ctx.lineTo(x1 - r, y);
    ctx.quadraticCurveTo(x1, y, x1, y + r);
    ctx.quadraticCurveTo(x1, y + plateHeight, x1 - r, y + plateHeight);
    ctx.lineTo(x0 + r, y + plateHeight);
    ctx.quadraticCurveTo(x0, y + plateHeight, x0, y + r);
    ctx.quadraticCurveTo(x0, y, x0 + r, y);
    ctx.closePath();
    ctx.fill();
  };
  drawPlate(plateTopY);
  drawPlate(plateBottomY);

  ctx.strokeStyle = goldStroke;
  ctx.lineWidth = 1;
  buildTopChamberPath(ctx, geom);
  ctx.stroke();
  buildBottomChamberPath(ctx, geom);
  ctx.stroke();

  ctx.fillStyle = goldFill;
  ctx.beginPath();
  ctx.ellipse(cx, midY, neckR + 6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
};

export const initHourglass = () => {
  const canvas = document.getElementById('hourglass');
  const meta = document.getElementById('hourglass-meta');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let dim = { w: 0, h: 0, dpr: 1 };
  let geom = null;

  const buildGeom = () => {
    const W = dim.w;
    const H = dim.h;
    const cx = W / 2;
    const plateInsetX = Math.max(14, W * 0.06);
    const plateHeight = Math.max(12, H * 0.034);
    const plateTopY = Math.max(20, H * 0.06);
    const plateBottomY = H - plateTopY - plateHeight;
    const chamberTopY = plateTopY + plateHeight + 6;
    const chamberBottomY = plateBottomY - 6;
    const midY = (chamberTopY + chamberBottomY) / 2;
    const chamberR = Math.min(W * 0.34, (chamberBottomY - chamberTopY) * 0.34);
    const neckR = Math.max(3.2, W * 0.018);
    geom = {
      W, H, cx, plateInsetX, plateHeight, plateTopY, plateBottomY,
      chamberTopY, chamberBottomY, midY, chamberR, neckR, bottomAmount: 0
    };
  };

  const stream = [];
  const seedStream = () => {
    stream.length = 0;
    for (let i = 0; i < STREAM_PARTICLES; i++) {
      stream.push({
        x: random(-1.4, 1.4),
        y: 0,
        vy: random(0.8, 2.2),
        alpha: random(0.25, 0.85),
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

  let lastSecond = -1;

  const updateMeta = () => {
    if (!meta) return;
    const now = Date.now();
    if (now >= DEADLINE) {
      meta.textContent = '01.08.2026 — sand empty';
      meta.dataset.done = '1';
      return;
    }
    const remaining = Math.max(0, DEADLINE - now);
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    meta.textContent = `${days}d ${hours}h ${mins}m ${secs}s → 01.08.2026`;
    meta.dataset.done = '0';
  };

  onFrame((time, dt) => {
    if (!geom) return;
    ctx.setTransform(dim.dpr, 0, 0, dim.dpr, 0, 0);
    ctx.clearRect(0, 0, geom.W, geom.H);

    const proportion = getProportion();
    const topAmount = 1 - proportion;
    const bottomAmount = proportion;
    const flowing = topAmount > 0.0005 && Date.now() < DEADLINE;

    drawGlassChamber(ctx, geom, true);
    drawGlassChamber(ctx, geom, false);
    drawTopSand(ctx, geom, topAmount);
    drawBottomSand(ctx, geom, bottomAmount);

    if (flowing) {
      const fallEnd =
        geom.chamberBottomY -
        (geom.chamberBottomY - geom.midY) * bottomAmount -
        Math.min(22, (geom.chamberBottomY - geom.midY) * bottomAmount * 0.32);
      const step = dt / 16;
      for (let i = 0; i < stream.length; i++) {
        const p = stream[i];
        if (p.y === 0) p.y = geom.midY + p.seed * (fallEnd - geom.midY);
        p.y += p.vy * step * 1.6;
        p.x = Math.sin(time * 0.004 + p.seed * 6.28) * 1.2;
        if (p.y > fallEnd) {
          p.y = geom.midY + 0.5;
          p.vy = random(0.9, 2.2);
          p.alpha = random(0.2, 0.6);
        }
      }
      drawStream(ctx, geom, stream, true);
    }

    drawNeckGlow(ctx, geom, flowing);
    drawFrame(ctx, geom);

    const sec = Math.floor(time / 1000);
    if (sec !== lastSecond) {
      lastSecond = sec;
      updateMeta();
    }
  });

  updateMeta();
};
