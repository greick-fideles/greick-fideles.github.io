'use strict';
/* ============================================================
   head.js — a "forma" dela: busto esculpido por campo de distância
   (SDF) e amostrado em ~70 mil pontos com normais e oclusão.
   ============================================================ */
const EYE = { x: 0.31, y: 0.045, z: 0.752 };
const BRAIN_C = [0, 0.45, -0.1];

const HEAD = (() => {
  function ell(x, y, z, cx, cy, cz, rx, ry, rz) {
    x -= cx; y -= cy; z -= cz;
    const k0 = Math.sqrt((x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz));
    const k1 = Math.sqrt((x * x) / (rx ** 4) + (y * y) / (ry ** 4) + (z * z) / (rz ** 4));
    return k1 < 1e-6 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  }
  const sph = (x, y, z, cx, cy, cz, r) => Math.hypot(x - cx, y - cy, z - cz) - r;
  function cap(x, y, z, ax, ay, az, bx, by, bz, r1, r2) {
    const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz));
    return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - lerp(r1, r2, h);
  }
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };

  function sdf(x, y, z) {
    const ax = Math.abs(x);
    let d = ell(x, y, z, 0, 0.44, -0.14, 0.75, 0.81, 0.9);                  // crânio
    d = smin(d, ell(x, y, z, 0, -0.16, 0.16, 0.63, 0.74, 0.62), 0.2);       // rosto
    d = smin(d, ell(ax, y, z, 0.3, -0.56, 0.1, 0.27, 0.3, 0.42), 0.22);     // mandíbula
    d = smin(d, ell(x, y, z, 0, -0.8, 0.4, 0.25, 0.2, 0.26), 0.2);          // queixo
    d = smin(d, ell(ax, y, z, 0.41, -0.1, 0.42, 0.2, 0.17, 0.2), 0.18);     // maçãs do rosto
    d = smin(d, ell(ax, y, z, 0.24, 0.235, 0.63, 0.23, 0.08, 0.13), 0.16);  // arco da sobrancelha
    d = smax(d, -ell(ax, y, z, 0.31, 0.04, 0.86, 0.2, 0.125, 0.17), 0.09);  // órbitas
    d = smin(d, sph(ax, y, z, 0.31, 0.045, 0.6, 0.152), 0.04);              // pálpebras
    let n = cap(x, y, z, 0, 0.16, 0.73, 0, -0.22, 0.875, 0.05, 0.06);       // nariz
    n = smin(n, sph(x, y, z, 0, -0.25, 0.88, 0.078), 0.05);
    n = smin(n, sph(ax, y, z, 0.085, -0.285, 0.8, 0.055), 0.04);
    d = smin(d, n, 0.075);
    d = smax(d, -ell(x, y, z, 0, -0.42, 0.86, 0.05, 0.07, 0.06), 0.06);     // filtro labial
    let l = ell(x, y, z, 0, -0.545, 0.705, 0.17, 0.04, 0.085);              // lábios
    l = smin(l, ell(x, y, z, 0, -0.635, 0.69, 0.14, 0.052, 0.09), 0.008);
    d = smin(d, l, 0.045);
    d = smax(d, -ell(x, y, z, 0, -0.74, 0.74, 0.14, 0.035, 0.06), 0.05);    // sulco do queixo
    d = smin(d, ell(ax, y, z, 0.715, 0.02, -0.1, 0.065, 0.21, 0.13), 0.05); // orelhas
    d = smin(d, cap(x, y, z, 0, -0.7, -0.16, 0, -1.85, -0.32, 0.34, 0.4), 0.14); // pescoço
    let s = cap(ax, y, z, 0.2, -1.93, -0.32, 1.12, -2.2, -0.32, 0.3, 0.33); // ombros
    s = smin(s, ell(x, y, z, 0, -2.9, -0.22, 1.25, 0.85, 0.56), 0.35);      // tórax
    d = smin(d, s, 0.32);
    return d;
  }
  const E = 0.0025;
  function grad(x, y, z, o) {
    o[0] = sdf(x + E, y, z) - sdf(x - E, y, z);
    o[1] = sdf(x, y + E, z) - sdf(x, y - E, z);
    o[2] = sdf(x, y, z + E) - sdf(x, y, z - E);
  }

  const N = 72000;
  const P = new Float32Array(N * 3), Nm = new Float32Array(N * 3);
  const ao = new Float32Array(N), fade = new Float32Array(N), ta = new Float32Array(N), dc = new Float32Array(N);
  const ang = new Float32Array(N);
  const rnd = mulberry32(20261113);
  const g = [0, 0, 0];
  let n = 0, guard = 0;
  while (n < N && guard++ < 4e6) {
    let x = lerp(-1.75, 1.75, rnd()), y = lerp(-2.9, 1.32, rnd()), z = lerp(-1.2, 1.08, rnd());
    let d = sdf(x, y, z);
    if (Math.abs(d) > 0.1) continue;
    // densidade: mais pontos no rosto, menos no busto
    const face = z > 0.15 && y > -1.05 && y < 0.75;
    const w = face ? 1 : y > -1.0 ? 0.55 : y > -1.9 ? 0.42 : 0.32;
    if (rnd() > w) continue;
    const ring = rnd() < 0.34;
    if (ring) y = Math.round(y / 0.05) * 0.05;
    let ok = true;
    for (let it = 0; it < 7; it++) {
      d = sdf(x, y, z); grad(x, y, z, g);
      if (ring) g[1] = 0;
      const gg = (g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) / (4 * E * E);
      if (gg < 0.04) { ok = false; break; }
      const s = d / gg / (2 * E);
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    if (!ok || Math.abs(sdf(x, y, z)) > 0.002 || y < -2.88) continue;
    grad(x, y, z, g);
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    const nx = g[0] / gl, ny = g[1] / gl, nz = g[2] / gl;
    const j = n * 3;
    P[j] = x; P[j + 1] = y; P[j + 2] = z;
    Nm[j] = nx; Nm[j + 1] = ny; Nm[j + 2] = nz;
    // oclusão ambiente barata: o campo cresce menos em regiões côncavas
    const a1 = sdf(x + nx * 0.09, y + ny * 0.09, z + nz * 0.09) / 0.09;
    const a2 = sdf(x + nx * 0.2, y + ny * 0.2, z + nz * 0.2) / 0.2;
    ao[n] = clamp(0.25 + 0.75 * Math.pow(clamp(a1 * 0.5 + a2 * 0.5), 1.6));
    fade[n] = sstep(-2.86, -2.1, y);
    dc[n] = Math.hypot(x - BRAIN_C[0], y - BRAIN_C[1], z - BRAIN_C[2]);
    ang[n] = Math.atan2(z + 0.12, x);
    n++;
  }
  return { N: n, P, Nm, ao, fade, ta, dc, ang, sdf, rnd };
})();

/* ---- "impressão" camada por camada ---- */
const SW = [[15.0, -2.9], [17.5, -1.15], [22.5, 0.74], [24.0, 1.36]];
function sweepY(t) {
  if (t <= SW[0][0]) return SW[0][1];
  for (let i = 1; i < SW.length; i++) if (t < SW[i][0]) return lerp(SW[i - 1][1], SW[i][1], (t - SW[i - 1][0]) / (SW[i][0] - SW[i - 1][0]));
  return SW[SW.length - 1][1];
}
function sweepT(y) {
  if (y <= SW[0][1]) return SW[0][0];
  for (let i = 1; i < SW.length; i++) if (y < SW[i][1]) return lerp(SW[i - 1][0], SW[i][0], (y - SW[i - 1][1]) / (SW[i][1] - SW[i - 1][1]));
  return SW[SW.length - 1][0];
}
(() => {
  const r = mulberry32(99);
  for (let i = 0; i < HEAD.N; i++) HEAD.ta[i] = sweepT(HEAD.P[i * 3 + 1]) + r() * 0.14;
  // ordem por instante de aparição (para os feixes dos agentes)
  const ord = new Uint32Array(HEAD.N);
  for (let i = 0; i < HEAD.N; i++) ord[i] = i;
  HEAD.order = Array.from(ord).sort((a, b) => HEAD.ta[a] - HEAD.ta[b]);
  HEAD.taSorted = HEAD.order.map((i) => HEAD.ta[i]);
})();
function lowerBound(arr, v) { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < v) lo = m + 1; else hi = m; } return lo; }

/* luz principal fixa no mundo */
const KEY_L = (() => { const v = [-0.45, 0.55, 0.7]; const l = Math.hypot(...v); return v.map((a) => a / l); })();

const _w = [0, 0, 0, 0];
/* o: {reveal, gain, warm, lights:[{x,y,z,c:[r,g,b],i}], waves:[{t0,amp,speed,width,c}],
      base:[r,g,b], rimc:[r,g,b], warp(i,x,y,z,out)→bool} */
function drawHeadPoints(t, o) {
  const P = HEAD.P, Nm = HEAD.Nm, n = HEAD.N;
  const gain = o.gain;
  if (gain <= 0.002) return;
  const warm = o.warm || 0;
  let bR = lerp(0.42, 1.0, warm), bG = lerp(0.72, 0.86, warm), bB = lerp(1.0, 0.72, warm);
  let rR = lerp(0.62, 1.0, warm), rG = lerp(0.9, 0.95, warm), rB = lerp(1.0, 0.88, warm);
  if (o.base) { bR = o.base[0]; bG = o.base[1]; bB = o.base[2]; }
  if (o.rimc) { rR = o.rimc[0]; rG = o.rimc[1]; rB = o.rimc[2]; }
  const lights = o.lights || [], nl = lights.length;
  const waves = o.waves || [], nw = waves.length;
  const sigK = o.sig || 0.0024;
  for (let i = 0; i < n; i++) {
    const j = i * 3;
    let x = P[j], y = P[j + 1], z = P[j + 2];
    const nx = Nm[j], ny = Nm[j + 1], nz = Nm[j + 2];
    let flash = 0;
    if (o.reveal) {
      const dt = t - HEAD.ta[i];
      if (dt < 0) continue;
      flash = Math.exp(-dt * 3.2);
      if (dt < 0.55) { const q = 1 - dt / 0.55; const pop = q * q * q * 0.32; x += nx * pop; y += ny * pop; z += nz * pop; }
    }
    let extra = 0;
    if (o.warp) { if (!o.warp(i, x, y, z, _w)) continue; x = _w[0]; y = _w[1]; z = _w[2]; extra = _w[3]; }
    const dx = x - cam.px, dy = y - cam.py, dz = z - cam.pz;
    const zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
    if (zc < 0.02) continue;
    const k = cam.f / zc;
    const sx = cam.cx + (dx * cam.rx + dy * cam.ry + dz * cam.rz) * k;
    const sy = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * k;
    if (sx < -12 || sx > W + 12 || sy < -12 || sy > H + 12) continue;
    const inv = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz);
    const facing = -(nx * dx + ny * dy + nz * dz) * inv;
    const af = facing < 0 ? -facing : facing;
    const rim = 1 - af, rim3 = rim * rim * rim;
    const a = HEAD.ao[i];
    let diff = nx * KEY_L[0] + ny * KEY_L[1] + nz * KEY_L[2];
    diff = diff > 0 ? diff * a : 0;
    const back = facing < 0 ? 0.16 : 1;
    const d2s = diff * diff * (3 - 2 * diff);
    let I = (0.03 + 0.62 * d2s) * back, RI = 0.7 * rim3 * rim * (facing < 0 ? 0.3 : 1) * (0.45 + 0.55 * a);
    let r = I * bR + RI * rR, g = I * bG + RI * rG, b = I * bB + RI * rB;
    for (let q = 0; q < nl; q++) {
      const L = lights[q];
      const lx = L.x - x, ly = L.y - y, lz = L.z - z;
      const d2 = lx * lx + ly * ly + lz * lz;
      const ndl = (nx * lx + ny * ly + nz * lz) / Math.sqrt(d2);
      if (ndl > 0) {
        const w = (ndl * L.i * back) / (1 + d2 * 1.1);
        r += L.c[0] * w; g += L.c[1] * w; b += L.c[2] * w;
      }
    }
    if (flash > 0.01) { r += flash * 0.75; g += flash * 1.05; b += flash * 1.2; }
    if (extra) { r += extra * 0.8; g += extra; b += extra * 1.15; }
    for (let q = 0; q < nw; q++) {
      const wv = waves[q];
      const ph = (t - wv.t0) * wv.speed;
      const dd = (HEAD.dc[i] - ph) / wv.width;
      if (dd > -3 && dd < 3) {
        const w = Math.exp(-dd * dd) * wv.amp;
        r += w * wv.c[0]; g += w * wv.c[1]; b += w * wv.c[2];
      }
    }
    const gg = gain * HEAD.fade[i];
    let sig = k * sigK; if (sig < 0.6) sig = 0.6; else if (sig > 7) sig = 7;
    splatG(sx, sy, r * gg, g * gg, b * gg, sig);
  }
}
