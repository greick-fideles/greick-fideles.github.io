'use strict';
/* ============================================================
   DESPERTAR — filme generativo 9:16 (1080×1920 · 30 fps · 60 s)
   Cada quadro é uma função pura do tempo: renderFrame(t).
   engine.js — utilitários, buffer de partículas, câmera, pós.
   ============================================================ */
const W = 1080, H = 1920, FPS = 30, DURATION = 60;
const TAU = Math.PI * 2;

const TL = {
  typeStart: 0.7, typeEnd: 2.6, enter: 2.9, seed: 3.6,
  agent0: 3.9, agentGap: 0.5,
  form: 13.5, print0: 15.0, print1: 24.0, rest: 26.0,
  beats: [27.4, 28.9, 30.1, 30.95, 31.5], eyes: 32.0,
  dive: 34.6, inside: 37.4, flood: 50.3, cut: 53.0, end: 60.0,
};

const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d', { alpha: false });

/* ---------------- matemática ---------------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const lin = (a, b, x) => clamp((x - a) / (b - a));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eoc = (t) => 1 - Math.pow(1 - t, 3);
const eic = (t) => t * t * t;
const eob = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const fract = (x) => x - Math.floor(x);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/* ---------------- fontes ---------------- */
const F = {
  mono: (px, w = 400) => `${w} ${px}px "JetBrains Mono", "DejaVu Sans Mono", monospace`,
  serif: (px) => `italic 400 ${px}px "Instrument Serif", "Liberation Serif", serif`,
  serifR: (px) => `400 ${px}px "Instrument Serif", "Liberation Serif", serif`,
  sans: (px, w = 500) => `${w} ${px}px "Space Grotesk", "Inter", sans-serif`,
};

/* ---------------- buffer aditivo de partículas (HDR) ---------------- */
const ACC = new Float32Array(W * H * 3);
let accMinY = H, accMaxY = -1;
const pcan = document.createElement('canvas'); pcan.width = W; pcan.height = H;
const pctx = pcan.getContext('2d');
const pimg = pctx.createImageData(W, H);
for (let i = 3; i < pimg.data.length; i += 4) pimg.data[i] = 255;
const LUT = new Uint8ClampedArray(2048);
for (let i = 0; i < 2048; i++) LUT[i] = 255 * (1 - Math.exp(-(i / 256) * 1.35));

/* ponto de 1 px com peso bilinear */
function splat(x, y, r, g, b) {
  const xf = x - 0.5, yf = y - 0.5;
  const x0 = Math.floor(xf), y0 = Math.floor(yf);
  if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return;
  const fx = xf - x0, fy = yf - y0;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  let i = (y0 * W + x0) * 3;
  ACC[i] += r * w00; ACC[i + 1] += g * w00; ACC[i + 2] += b * w00;
  ACC[i + 3] += r * w10; ACC[i + 4] += g * w10; ACC[i + 5] += b * w10;
  i += W * 3;
  ACC[i] += r * w01; ACC[i + 1] += g * w01; ACC[i + 2] += b * w01;
  ACC[i + 3] += r * w11; ACC[i + 4] += g * w11; ACC[i + 5] += b * w11;
  if (y0 < accMinY) accMinY = y0;
  if (y0 + 1 > accMaxY) accMaxY = y0 + 1;
}
/* ponto gaussiano com posição sub‑pixel */
const _wx = new Float32Array(64), _wy = new Float32Array(64);
function splatG(x, y, r, g, b, sig) {
  if (sig < 0.55) { splat(x, y, r * 1.6, g * 1.6, b * 1.6); return; }
  if (sig > 11) sig = 11;
  const R = (sig * 2.4 + 0.5) | 0 || 1;
  const cx0 = Math.floor(x) - R, cy0 = Math.floor(y) - R, n = 2 * R + 1;
  if (cx0 + n <= 0 || cy0 + n <= 0 || cx0 >= W || cy0 >= H) return;
  const inv = 1 / (2 * sig * sig);
  for (let i = 0; i < n; i++) {
    const dx = cx0 + i + 0.5 - x, dy = cy0 + i + 0.5 - y;
    _wx[i] = Math.exp(-dx * dx * inv); _wy[i] = Math.exp(-dy * dy * inv);
  }
  const ia = cx0 < 0 ? -cx0 : 0, ib = cx0 + n > W ? W - cx0 : n;
  const ja = cy0 < 0 ? -cy0 : 0, jb = cy0 + n > H ? H - cy0 : n;
  for (let j = ja; j < jb; j++) {
    const wy = _wy[j];
    let p = ((cy0 + j) * W + cx0 + ia) * 3;
    for (let i = ia; i < ib; i++) {
      const w = _wx[i] * wy;
      ACC[p] += r * w; ACC[p + 1] += g * w; ACC[p + 2] += b * w;
      p += 3;
    }
  }
  if (cy0 + ja < accMinY) accMinY = cy0 + ja;
  if (cy0 + jb - 1 > accMaxY) accMaxY = cy0 + jb - 1;
}
/* compõe o buffer no canvas principal (respeita o clip atual) e limpa */
function flush() {
  if (accMaxY < accMinY) return;
  const y0 = Math.max(0, accMinY), y1 = Math.min(H - 1, accMaxY);
  const d = pimg.data;
  for (let p = y0 * W, e = (y1 + 1) * W; p < e; p++) {
    const i = p * 3, j = p * 4;
    let v = ACC[i] * 256; d[j] = LUT[v > 2047 ? 2047 : v | 0];
    v = ACC[i + 1] * 256; d[j + 1] = LUT[v > 2047 ? 2047 : v | 0];
    v = ACC[i + 2] * 256; d[j + 2] = LUT[v > 2047 ? 2047 : v | 0];
    ACC[i] = 0; ACC[i + 1] = 0; ACC[i + 2] = 0;
  }
  const hh = y1 - y0 + 1;
  pctx.putImageData(pimg, 0, 0, 0, y0, W, hh);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(pcan, 0, y0, W, hh, 0, y0, W, hh);
  ctx.restore();
  accMinY = H; accMaxY = -1;
}

/* ---------------- sprites de brilho ---------------- */
const _glow = new Map();
function glowSprite(c) {
  const key = (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0);
  let s = _glow.get(key);
  if (!s) {
    s = document.createElement('canvas'); s.width = s.height = 128;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${key},1)`);
    gr.addColorStop(0.12, `rgba(${key},0.62)`);
    gr.addColorStop(0.3, `rgba(${key},0.22)`);
    gr.addColorStop(0.6, `rgba(${key},0.06)`);
    gr.addColorStop(1, `rgba(${key},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    _glow.set(key, s);
  }
  return s;
}
/* requer globalCompositeOperation = 'lighter' definido pelo chamador */
function glow(x, y, rad, c, a) {
  if (a <= 0.003 || rad <= 0.2) return;
  ctx.globalAlpha = a > 1 ? 1 : a;
  ctx.drawImage(glowSprite(c), x - rad, y - rad, rad * 2, rad * 2);
  ctx.globalAlpha = 1;
}

/* ---------------- câmera ---------------- */
const cam = { px: 0, py: 0, pz: 9, rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0, fx: 0, fy: 0, fz: -1, f: 2200, cx: W / 2, cy: H / 2 };
function setCam(px, py, pz, tx, ty, tz, f, cx, cy) {
  let fx = tx - px, fy = ty - py, fz = tz - pz;
  let l = Math.hypot(fx, fy, fz); fx /= l; fy /= l; fz /= l;
  // right = forward × up(0,1,0)
  let rx = -fz, ry = 0, rz = fx; l = Math.hypot(rx, rz) || 1; rx /= l; rz /= l;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  cam.px = px; cam.py = py; cam.pz = pz;
  cam.fx = fx; cam.fy = fy; cam.fz = fz;
  cam.rx = rx; cam.ry = ry; cam.rz = rz;
  cam.ux = ux; cam.uy = uy; cam.uz = uz;
  cam.f = f; cam.cx = cx; cam.cy = cy;
}
const _p = { x: 0, y: 0, z: 0, k: 0 };
function proj(x, y, z, o = _p) {
  const dx = x - cam.px, dy = y - cam.py, dz = z - cam.pz;
  const zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
  o.z = zc;
  if (zc < 0.01) { o.k = 0; return false; }
  const k = cam.f / zc;
  o.k = k;
  o.x = cam.cx + (dx * cam.rx + dy * cam.ry + dz * cam.rz) * k;
  o.y = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * k;
  return true;
}

/* ---------------- pós‑processamento ---------------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const h1 = mk(540, 960), h2 = mk(270, 480), h3 = mk(135, 240), h4 = mk(68, 120);
const h1x = h1.getContext('2d'), h2x = h2.getContext('2d'), h3x = h3.getContext('2d'), h4x = h4.getContext('2d');
let _vig = null;
function post(bloom = 1, vig = 1) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';
  if (bloom > 0) {
    h1x.globalCompositeOperation = 'copy'; h1x.drawImage(canvas, 0, 0, 540, 960);
    h2x.globalCompositeOperation = 'copy'; h2x.filter = 'blur(3px)'; h2x.drawImage(h1, 0, 0, 270, 480);
    h3x.globalCompositeOperation = 'copy'; h3x.filter = 'blur(4px)'; h3x.drawImage(h2, 0, 0, 135, 240);
    h4x.globalCompositeOperation = 'copy'; h4x.filter = 'blur(4px)'; h4x.drawImage(h3, 0, 0, 68, 120);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.42 * bloom; ctx.drawImage(h2, 0, 0, W, H);
    ctx.globalAlpha = 0.36 * bloom; ctx.drawImage(h3, 0, 0, W, H);
    ctx.globalAlpha = 0.34 * bloom; ctx.drawImage(h4, 0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (vig > 0) {
    if (!_vig) {
      _vig = mk(270, 480);
      const g = _vig.getContext('2d');
      const gr = g.createRadialGradient(135, 235, 90, 135, 240, 300);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.55, 'rgba(0,0,0,0.18)');
      gr.addColorStop(1, 'rgba(0,0,0,0.78)');
      g.fillStyle = gr; g.fillRect(0, 0, 270, 480);
    }
    ctx.globalAlpha = vig;
    ctx.drawImage(_vig, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

/* ---------------- texto ---------------- */
function text(str, x, y, font, color, align = 'left', spacing = 0) {
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align;
  ctx.letterSpacing = spacing + 'px';
  ctx.fillText(str, x, y);
}
function fmtInt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
