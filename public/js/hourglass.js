import { clamp, fitCanvas, lerp, onFrame, onResize, random } from './utils.js';
import { TIMELINE_START, DEADLINE } from './config.js';

const STREAM_COUNT = 52;
const ORBIT_COUNT = 10;
const SPARKLE_COUNT = 24;

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

const drawAura = (ctx, geom, time, flowing) => {
  const { cx, midY, chamberR } = geom;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.002);
  const r = chamberR * 2.8;

  const outer = ctx.createRadialGradient(cx, midY, r * 0.1, cx, midY, r);
  outer.addColorStop(0, `rgba(120, 80, 255, ${0.14 + pulse * 0.08})`);
  outer.addColorStop(0.45, `rgba(212, 175, 88, ${0.06 + (flowing ? 0.06 : 0)})`);
  outer.addColorStop(1, 'rgba(120, 80, 255, 0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(cx, midY, r, 0, Math.PI * 2);
  ctx.fill();

  if (flowing) {
    const ring = ctx.createRadialGradient(cx, midY, 0, cx, midY, 42 + pulse * 12);
    ring.addColorStop(0, 'rgba(255, 230, 170, 0.35)');
    ring.addColorStop(0.5, 'rgba(212, 175, 88, 0.12)');
    ring.addColorStop(1, 'rgba(120, 80, 255, 0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(cx, midY, 42 + pulse * 12, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawOrbits = (ctx, geom, orbits, time) => {
  const { cx, midY, chamberR } = geom;
  for (let i = 0; i < orbits.length; i++) {
    const o = orbits[i];
    const angle = o.angle + time * o.speed;
    const rx = chamberR * 1.55 + Math.sin(time * 0.001 + o.phase) * 8;
    const ry = chamberR * 2.05;
    const x = cx + Math.cos(angle) * rx;
    const y = midY + Math.sin(angle) * ry;
    const tw = 0.4 + 0.6 * Math.sin(time * 0.003 + o.phase);

    if (o.glyph) {
      ctx.font = `${o.size}px 'Cormorant Garamond', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 248, 230, ${o.alpha * tw})`;
      ctx.fillText('∅', x, y);
    } else {
      ctx.beginPath();
      ctx.fillStyle = `rgba(212, 175, 88, ${o.alpha * tw})`;
      ctx.arc(x, y, o.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const drawGlassChamber = (ctx, geom, isTop, time) => {
  ctx.save();
  if (isTop) buildTopChamberPath(ctx, geom);
  else buildBottomChamberPath(ctx, geom);

  const { cx, chamberTopY: topY, chamberBottomY: bottomY, midY, chamberR } = geom;
  const grad = ctx.createLinearGradient(cx - chamberR, 0, cx + chamberR, 0);
  grad.addColorStop(0, 'rgba(6, 4, 12, 0.94)');
  grad.addColorStop(0.35, 'rgba(18, 12, 28, 0.75)');
  grad.addColorStop(0.5, 'rgba(28, 18, 42, 0.55)');
  grad.addColorStop(0.65, 'rgba(18, 12, 28, 0.75)');
  grad.addColorStop(1, 'rgba(6, 4, 12, 0.94)');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.clip();
  const sheenY = isTop ? topY : midY;
  const sheenEnd = isTop ? midY : bottomY;
  const sheen = ctx.createLinearGradient(cx - chamberR * 0.5, sheenY, cx + chamberR * 0.3, sheenEnd);
  sheen.addColorStop(0, 'rgba(255, 248, 230, 0.09)');
  sheen.addColorStop(0.35, 'rgba(120, 80, 255, 0.06)');
  sheen.addColorStop(1, 'rgba(212, 175, 88, 0.03)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - chamberR - 4, sheenY, chamberR * 2 + 8, sheenEnd - sheenY + 4);

  const shimmer = Math.sin(time * 0.003) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(255, 230, 170, ${0.08 + shimmer * 0.12})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - chamberR * 0.55, sheenY + 8);
  ctx.lineTo(cx - chamberR * 0.5, sheenEnd - 10);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  if (isTop) buildTopChamberPath(ctx, geom);
  else buildBottomChamberPath(ctx, geom);
  ctx.strokeStyle = 'rgba(212, 175, 88, 0.35)';
  ctx.lineWidth = 1.1;
  ctx.shadowColor = 'rgba(120, 80, 255, 0.45)';
  ctx.shadowBlur = 6;
  ctx.stroke();
  ctx.restore();
};

const drawSandGrains = (ctx, geom, topAmount, bottomAmount, time) => {
  const { cx, chamberTopY: topY, midY, chamberBottomY: bottomY, chamberR } = geom;
  const count = 28;
  for (let i = 0; i < count; i++) {
    const seed = i * 1.618;
    const flicker = 0.3 + 0.7 * Math.sin(time * 0.008 + seed);
    const inTop = i < count * 0.45 && topAmount > 0.05;
    const inBottom = i >= count * 0.45 && bottomAmount > 0.05;
    if (!inTop && !inBottom) continue;

    let y;
    let spread;
    const t = (i % 17) / 17;
    if (inTop) {
      const h = (midY - topY) * topAmount;
      y = midY - h + t * h * 0.85;
      spread = chamberR * 0.75;
    } else {
      const h = (bottomY - midY) * bottomAmount;
      y = bottomY - h + t * h * 0.9;
      spread = chamberR * 0.8;
    }
    const x = cx + Math.sin(seed * 4.2 + time * 0.002) * spread * 0.55;
    const bright = i % 4 === 0;
    ctx.fillStyle = bright
      ? `rgba(255, 240, 200, ${flicker * 0.9})`
      : `rgba(212, 175, 88, ${flicker * 0.75})`;
    ctx.fillRect(x, y, bright ? 1.4 : 1, bright ? 1.4 : 1);
  }
};

const drawTopSand = (ctx, geom, topAmount) => {
  if (topAmount <= 0.0001) return;
  const { cx, chamberTopY: topY, midY, chamberR: topR } = geom;
  ctx.save();
  buildTopChamberPath(ctx, geom);
  ctx.clip();
  const sandHeight = (midY - topY) * topAmount;
  const sandTop = midY - sandHeight;
  const dipDepth = Math.min(16, sandHeight * 0.38);
  const dipWidth = Math.min(topR * 0.62, 38);
  ctx.beginPath();
  ctx.moveTo(cx - topR - 6, sandTop);
  ctx.lineTo(cx - dipWidth, sandTop);
  ctx.quadraticCurveTo(cx, sandTop + dipDepth, cx + dipWidth, sandTop);
  ctx.lineTo(cx + topR + 6, sandTop);
  ctx.lineTo(cx + topR + 6, midY + 4);
  ctx.lineTo(cx - topR - 6, midY + 4);
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx - topR, sandTop, cx + topR, midY);
  grad.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
  grad.addColorStop(0.35, 'rgba(244, 210, 130, 0.98)');
  grad.addColorStop(1, 'rgba(140, 95, 40, 1)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(255, 230, 170, 0.5)';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;
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
  const peakHeight = Math.min(24, sandHeight * 0.34);
  const peakWidth = Math.min(bottomR * 0.72, 62);
  ctx.beginPath();
  ctx.moveTo(cx - bottomR - 6, sandTop);
  ctx.lineTo(cx - peakWidth, sandTop);
  ctx.quadraticCurveTo(cx, sandTop - peakHeight, cx + peakWidth, sandTop);
  ctx.lineTo(cx + bottomR + 6, sandTop);
  ctx.lineTo(cx + bottomR + 6, bottomY + 4);
  ctx.lineTo(cx - bottomR - 6, bottomY + 4);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, sandTop - peakHeight, 0, bottomY);
  grad.addColorStop(0, 'rgba(255, 248, 220, 1)');
  grad.addColorStop(0.45, 'rgba(212, 175, 88, 0.98)');
  grad.addColorStop(1, 'rgba(100, 70, 32, 1)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
};

const drawNeckVortex = (ctx, geom, time, flowing) => {
  const { cx, midY, neckR } = geom;
  if (!flowing) return;

  const spin = time * 0.012;
  for (let i = 0; i < 3; i++) {
    const r = neckR + 10 + i * 6;
    ctx.save();
    ctx.translate(cx, midY);
    ctx.rotate(spin + i * 0.8);
    ctx.strokeStyle = `rgba(255, 230, 170, ${0.15 - i * 0.04})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const core = ctx.createRadialGradient(cx, midY, 0, cx, midY, 32);
  core.addColorStop(0, 'rgba(255, 240, 200, 0.55)');
  core.addColorStop(0.4, 'rgba(212, 175, 88, 0.25)');
  core.addColorStop(1, 'rgba(120, 80, 255, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, midY, 32, 0, Math.PI * 2);
  ctx.fill();
};

const drawStream = (ctx, geom, particles, flowing, time) => {
  if (!flowing) return;
  const { cx, midY } = geom;

  ctx.save();
  const trail = ctx.createLinearGradient(cx, midY - 20, cx, midY + 80);
  trail.addColorStop(0, 'rgba(255, 240, 200, 0.08)');
  trail.addColorStop(0.5, 'rgba(212, 175, 88, 0.15)');
  trail.addColorStop(1, 'rgba(120, 80, 255, 0.05)');
  ctx.fillStyle = trail;
  ctx.fillRect(cx - 8, midY - 10, 16, 90);
  ctx.restore();

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = clamp(p.alpha, 0, 1);
    const len = 1.2 + p.glow * 2.5;
    ctx.save();
    ctx.translate(cx + p.x, p.y);
    ctx.rotate(Math.sin(time * 0.01 + p.seed) * 0.15);
    const g = ctx.createLinearGradient(0, -len, 0, len);
    g.addColorStop(0, `rgba(255, 248, 230, ${a * 0.3})`);
    g.addColorStop(0.5, i % 4 === 0 ? `rgba(255, 230, 170, ${a})` : `rgba(212, 175, 88, ${a})`);
    g.addColorStop(1, `rgba(120, 80, 255, ${a * 0.4})`);
    ctx.fillStyle = g;
    ctx.fillRect(-0.6, -len, 1.2, len * 2);
    ctx.restore();
  }
};

const drawSparkles = (ctx, geom, sparkles, time, flowing) => {
  if (!flowing) return;
  const { cx, midY, chamberR } = geom;
  for (let i = 0; i < sparkles.length; i++) {
    const s = sparkles[i];
    const tw = 0.2 + 0.8 * Math.sin(time * s.speed + s.phase);
    const x = cx + Math.sin(time * 0.0015 + s.phase) * chamberR * 0.35;
    const y = midY + s.offsetY + Math.cos(time * 0.002 + s.phase) * 12;
    ctx.fillStyle = `rgba(255, 248, 230, ${s.alpha * tw})`;
    ctx.beginPath();
    ctx.arc(x, y, s.r * tw, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawFrame = (ctx, geom, time) => {
  const { cx, plateTopY, plateBottomY, plateHeight, plateInsetX, midY, chamberR, neckR } = geom;
  const shimmer = Math.sin(time * 0.0025) * 0.5 + 0.5;

  const drawPlate = (y) => {
    const x0 = cx - chamberR - plateInsetX;
    const x1 = cx + chamberR + plateInsetX;
    const r = plateHeight / 2;
    const grad = ctx.createLinearGradient(0, y, 0, y + plateHeight);
    grad.addColorStop(0, 'rgba(70, 50, 20, 1)');
    grad.addColorStop(0.35, 'rgba(212, 175, 88, 1)');
    grad.addColorStop(0.5, `rgba(255, 240, 200, ${0.85 + shimmer * 0.15})`);
    grad.addColorStop(0.65, 'rgba(212, 175, 88, 1)');
    grad.addColorStop(1, 'rgba(70, 50, 20, 1)');
    ctx.fillStyle = grad;
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
    ctx.strokeStyle = 'rgba(255, 230, 170, 0.45)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  };

  drawPlate(plateTopY);
  drawPlate(plateBottomY);

  const pillarX = chamberR + plateInsetX - 6;
  const drawPillar = (x) => {
    const g = ctx.createLinearGradient(x - 2, plateTopY, x + 2, plateBottomY);
    g.addColorStop(0, 'rgba(120, 88, 36, 1)');
    g.addColorStop(0.5, 'rgba(255, 230, 170, 1)');
    g.addColorStop(1, 'rgba(120, 88, 36, 1)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 1.5, plateTopY + plateHeight, 3, plateBottomY - plateTopY - plateHeight);
    ctx.fillStyle = 'rgba(212, 175, 88, 1)';
    ctx.beginPath();
    ctx.arc(x, plateTopY + plateHeight + 2, 3.5, 0, Math.PI * 2);
    ctx.arc(x, plateBottomY - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawPillar(cx - pillarX);
  drawPillar(cx + pillarX);

  ctx.strokeStyle = 'rgba(212, 175, 88, 0.9)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = 'rgba(212, 175, 88, 0.35)';
  ctx.shadowBlur = 8;
  buildTopChamberPath(ctx, geom);
  ctx.stroke();
  buildBottomChamberPath(ctx, geom);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const band = ctx.createLinearGradient(cx - neckR - 8, midY, cx + neckR + 8, midY);
  band.addColorStop(0, 'rgba(160, 120, 50, 1)');
  band.addColorStop(0.5, 'rgba(255, 248, 230, 1)');
  band.addColorStop(1, 'rgba(160, 120, 50, 1)');
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.ellipse(cx, midY, neckR + 7, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 230, 170, 0.9)';
  ctx.beginPath();
  ctx.arc(cx, plateTopY - 5, 3.5, 0, Math.PI * 2);
  ctx.arc(cx, plateBottomY + plateHeight + 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
};

export const initHourglass = () => {
  const canvas = document.getElementById('hourglass');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let dim = { w: 0, h: 0, dpr: 1 };
  let geom = null;
  const stream = [];
  const orbits = [];
  const sparkles = [];

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
      chamberTopY, chamberBottomY, midY, chamberR, neckR
    };
  };

  const seedParticles = () => {
    stream.length = 0;
    for (let i = 0; i < STREAM_COUNT; i++) {
      stream.push({
        x: random(-2, 2),
        y: 0,
        vy: random(1, 2.8),
        alpha: random(0.35, 0.95),
        glow: random(0.3, 1),
        seed: Math.random()
      });
    }
    orbits.length = 0;
    for (let i = 0; i < ORBIT_COUNT; i++) {
      orbits.push({
        angle: (i / ORBIT_COUNT) * Math.PI * 2,
        speed: random(0.0004, 0.001) * (i % 2 ? 1 : -1),
        phase: random(0, Math.PI * 2),
        size: i % 3 === 0 ? random(9, 12) : random(1.5, 2.5),
        alpha: random(0.12, 0.35),
        glyph: i % 3 === 0
      });
    }
    sparkles.length = 0;
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      sparkles.push({
        offsetY: random(-40, 50),
        phase: random(0, Math.PI * 2),
        speed: random(0.004, 0.012),
        alpha: random(0.2, 0.7),
        r: random(0.6, 1.8)
      });
    }
  };

  const resize = () => {
    dim = fitCanvas(canvas);
    buildGeom();
    seedParticles();
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

    drawAura(ctx, geom, time, flowing);
    drawOrbits(ctx, geom, orbits, time);

    drawGlassChamber(ctx, geom, true, time);
    drawGlassChamber(ctx, geom, false, time);

    drawTopSand(ctx, geom, topAmount);
    drawBottomSand(ctx, geom, bottomAmount);
    drawSandGrains(ctx, geom, topAmount, bottomAmount, time);

    if (flowing) {
      const fallEnd =
        geom.chamberBottomY -
        (geom.chamberBottomY - geom.midY) * bottomAmount -
        Math.min(24, (geom.chamberBottomY - geom.midY) * bottomAmount * 0.34);
      const step = dt / 16;
      for (let i = 0; i < stream.length; i++) {
        const p = stream[i];
        if (p.y === 0) p.y = geom.midY + p.seed * (fallEnd - geom.midY);
        p.y += p.vy * step * 1.75;
        p.x = Math.sin(time * 0.005 + p.seed * 6.28) * (1.8 + p.glow);
        p.alpha = lerp(p.alpha, 0.55 + Math.sin(time * 0.02 + p.seed) * 0.35, 0.08);
        if (p.y > fallEnd) {
          p.y = geom.midY + random(0, 4);
          p.vy = random(1.1, 2.8);
          p.alpha = random(0.25, 0.7);
        }
      }
      drawStream(ctx, geom, stream, true, time);
      drawSparkles(ctx, geom, sparkles, time, true);
    }

    drawNeckVortex(ctx, geom, time, flowing);
    drawFrame(ctx, geom, time);
  });
};
