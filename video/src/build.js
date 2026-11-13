'use strict';
/* ============================================================
   build.js — atos 0‑3: o prompt, os agentes, a forma, o despertar
   e o mergulho pela pupila.
   ============================================================ */
const AG = [
  { name: 'ARQUITETO', col: [94, 231, 255] },
  { name: 'DADOS', col: [255, 196, 87] },
  { name: 'TREINO', col: [255, 95, 162] },
  { name: 'MEMÓRIA', col: [167, 139, 250] },
  { name: 'LINGUAGEM', col: [109, 255, 176] },
  { name: 'ALINHAMENTO', col: [236, 242, 255] },
];
const AGP = AG.map(() => ({ x: 0, y: 0, z: 0, sx: 0, sy: 0, k: 0, zc: 0, on: false, e: 0 }));
const agentSpawn = (k) => TL.agent0 + k * TL.agentGap;

function agentPos(k, t, o) {
  const sp = agentSpawn(k);
  // A: órbitas de tecelagem em volta da rede
  const th = (k * TAU) / 6 + (t - 3.6) * (0.85 + 0.11 * k) * (k % 2 ? 1 : -1);
  const ph = 0.95 * Math.sin(t * 0.61 + k * 1.9);
  const r = 2.0 + 0.3 * Math.sin(t * 0.83 + k * 2.3);
  const e = eoc(lin(sp, sp + 0.9, t));
  const ax = Math.cos(ph) * Math.cos(th) * r * e, ay = 0.2 + Math.sin(ph) * r * 0.95 * e, az = Math.cos(ph) * Math.sin(th) * r * e;
  // B: anel de impressão na altura da varredura
  const sy = sweepY(t);
  const thB = (k * TAU) / 6 + (t - 13.5) * 2.1;
  const rB = lerp(2.2, 1.5, sstep(-2.3, -1.0, sy));
  const bx = Math.cos(thB) * rB, by = sy + 0.1 * Math.sin(t * 3 + k), bz = Math.sin(thB) * rB - 0.12;
  // C: arco de repouso atrás dela — observando
  const thC = -Math.PI / 2 + (k - 2.5) * 0.6;
  const cx = Math.cos(thC) * 2.7, cy = 0.95 + 0.7 * Math.cos((k - 2.5) * 0.75) + 0.05 * Math.sin(t * 0.9 + k * 1.7), cz = Math.sin(thC) * 2.7 - 0.1;
  const wB = sstep(13.5, 15.2, t), wC = sstep(24.2, 26.2, t);
  o.x = lerp(lerp(ax, bx, wB), cx, wC);
  o.y = lerp(lerp(ay, by, wB), cy, wC);
  o.z = lerp(lerp(az, bz, wB), cz, wC);
  o.e = e;
  return o;
}

/* ---------------- a rede (o "cérebro") ---------------- */
const BR = (() => {
  const rnd = mulberry32(4242), N = 250;
  let pts = [];
  while (pts.length < N - 1) {
    const x = rnd() * 2 - 1, y = rnd() * 2 - 1, z = rnd() * 2 - 1, d = Math.hypot(x, y, z);
    if (d > 1 || d < 0.14) continue;
    pts.push({ p: [x, y, z], key: d + rnd() * 0.22 });
  }
  pts.sort((a, b) => a.key - b.key);
  pts = [{ p: [0, 0, 0] }, ...pts];
  const pos = pts.map((q) => q.p);
  const birth = pos.map((_, i) => (i === 0 ? TL.seed : 4.5 + 8.3 * Math.sqrt(i / N)));
  const agent = pos.map((_, i) => { const na = clamp(Math.floor((birth[i] - TL.agent0) / TL.agentGap) + 1, 1, 6); return i % na; });
  const edges = [], seen = new Set();
  const add = (a, b) => { const key = a < b ? a * 1000 + b : b * 1000 + a; if (a === b || seen.has(key)) return; seen.add(key); edges.push({ a, b, t0: Math.max(birth[a], birth[b]) + 0.04, ph: rnd(), sp: 0.5 + rnd() * 0.9 }); };
  const d2 = (a, b) => (pos[a][0] - pos[b][0]) ** 2 + (pos[a][1] - pos[b][1]) ** 2 + (pos[a][2] - pos[b][2]) ** 2;
  for (let i = 1; i < N; i++) {
    const c = []; for (let j = 0; j < i; j++) c.push([d2(i, j), j]);
    c.sort((u, v) => u[0] - v[0]);
    add(c[0][1], i); if (c.length > 1) add(c[1][1], i);
    if (rnd() < 0.45) { const all = []; for (let j = 0; j < N; j++) if (j !== i) all.push([d2(i, j), j]); all.sort((u, v) => u[0] - v[0]); add(all[2][1], i); }
  }
  return { N, pos, birth, agent, edges, w: new Float32Array(N * 3), s: new Float32Array(N * 4) };
})();

function brainUpdate(t) {
  const m = eio(lin(13.5, 17.2, t));
  const cx = 0, cy = lerp(0.2, BRAIN_C[1], m), cz = lerp(0, BRAIN_C[2], m);
  const rx = lerp(1.75, 0.55, m), ry = lerp(1.6, 0.55, m), rz = lerp(1.75, 0.68, m);
  const rot = (1 - m) * 0.22 * (t - 3.6), c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < BR.N; i++) {
    const p = BR.pos[i];
    const x = p[0] * c + p[2] * s, z = -p[0] * s + p[2] * c;
    const wob = 0.015 * (1 - m * 0.7);
    BR.w[i * 3] = cx + x * rx + wob * Math.sin(t * 1.3 + i);
    BR.w[i * 3 + 1] = cy + p[1] * ry + wob * Math.sin(t * 1.1 + i * 2.1);
    BR.w[i * 3 + 2] = cz + z * rz;
    const ok = proj(BR.w[i * 3], BR.w[i * 3 + 1], BR.w[i * 3 + 2]);
    BR.s[i * 4] = _p.x; BR.s[i * 4 + 1] = _p.y; BR.s[i * 4 + 2] = ok ? _p.k : 0; BR.s[i * 4 + 3] = _p.z;
  }
}
function beatEnv(t) {
  let e = 0;
  for (const tb of TL.beats) {
    if (t >= tb) e += Math.exp(-(t - tb) * 6);
    if (t >= tb + 0.22) e += 0.55 * Math.exp(-(t - tb - 0.22) * 6);
  }
  return e;
}
const DORMANT = [90, 135, 215], AWAKE = [255, 226, 176];
function drawBrain(t, alive) {
  const dorm = sstep(24.3, 26.3, t), awake = sstep(TL.eyes, TL.eyes + 0.7, t);
  const beat = beatEnv(t);
  const level = lerp(lerp(1, 0.2 + 0.9 * beat, dorm), 0.62 + 0.08 * Math.sin(t * 5), awake) * alive * (t < 50 ? 1 - sstep(34.7, 35.7, t) : 1);
  if (level <= 0.003) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  // sinapses
  for (const ed of BR.edges) {
    if (t < ed.t0) continue;
    const ka = BR.s[ed.a * 4 + 2], kb = BR.s[ed.b * 4 + 2];
    if (!ka || !kb) continue;
    const g = eoc(lin(ed.t0, ed.t0 + 0.4, t));
    const x0 = BR.s[ed.a * 4], y0 = BR.s[ed.a * 4 + 1];
    const x1 = lerp(x0, BR.s[ed.b * 4], g), y1 = lerp(y0, BR.s[ed.b * 4 + 1], g);
    let c = AG[BR.agent[ed.b]].col;
    c = mix3(mix3(c, DORMANT, dorm), AWAKE, awake);
    const kk = (ka + kb) * 0.5 / 244;
    ctx.strokeStyle = rgba(c, clamp(0.3 * level + 0.5 * (1 - lin(ed.t0, ed.t0 + 0.6, t))));
    ctx.lineWidth = clamp(1.3 * kk, 0.7, 5);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    // pulso viajando
    if (g >= 1 && level > 0.05) {
      const sp = ed.sp * lerp(lerp(1, 0.25, dorm), 2.4, awake);
      const q = fract(t * sp + ed.ph);
      const px = lerp(x0, x1, q), py = lerp(y0, y1, q);
      const I = 0.9 * level * Math.sin(q * Math.PI);
      splatG(px, py, (c[0] / 255) * I, (c[1] / 255) * I, (c[2] / 255) * I, clamp(2.2 * kk, 0.8, 8));
    }
  }
  // neurônios
  for (let i = 0; i < BR.N; i++) {
    const tb = BR.birth[i];
    if (t < tb) continue;
    const k = BR.s[i * 4 + 2]; if (!k) continue;
    const pop = eob(lin(tb, tb + 0.45, t)), fl = 1 - lin(tb, tb + 0.5, t);
    let c = AG[BR.agent[i]].col;
    c = mix3(mix3(c, DORMANT, dorm), AWAKE, awake);
    const kk = (k / 244) * lerp(1, 0.5, eio(lin(13.5, 17.2, t)));
    const tw = 0.75 + 0.25 * Math.sin(t * 3.1 + i * 1.7);
    const x = BR.s[i * 4], y = BR.s[i * 4 + 1];
    glow(x, y, Math.min(46, (i === 0 ? 34 : 15) * kk * pop * (1 + fl * 1.6)), c, clamp((0.55 * tw * level * lerp(1, 0.7, eio(lin(13.5, 17.2, t))) + fl) * (i === 0 ? 1.4 : 1)));
    if (fl > 0) glow(x, y, 7 * kk * (1 + fl * 2), [255, 255, 255], fl);
    else if (awake > 0) glow(x, y, Math.min(9, 3.2 * kk), [255, 255, 255], 0.5 * awake * level);
  }
  ctx.globalAlpha = 1;
}

/* ---------------- poeira de fundo ---------------- */
const DUST = (() => { const r = mulberry32(31), a = []; for (let i = 0; i < 1100; i++) a.push([lerp(-7, 7, r()), lerp(-9, 9, r()), lerp(-9, 5, r()), 0.15 + r() * 0.5, r()]); return a; })();
function drawDust(t, g) {
  for (const d of DUST) {
    let y = d[1] + t * 0.05 * (0.5 + d[4]); y = ((y + 9) % 18) - 9;
    if (!proj(d[0] + 0.12 * Math.sin(t * 0.3 + d[4] * 40), y, d[2])) continue;
    const I = d[3] * g * (0.6 + 0.4 * Math.sin(t * 1.2 + d[4] * 90));
    splatG(_p.x, _p.y, 0.5 * I, 0.72 * I, 1.0 * I, clamp(_p.k / 244 * 0.9, 0.5, 2.4));
  }
}

/* ---------------- dados sendo ingeridos (ato 1) ---------------- */
const GLY = (() => {
  const r = mulberry32(808), set = ['0', '1', '{', '}', 'λ', 'Σ', '∇', 'if', 'w', 'π', 'x', '→', 'ƒ', '∂', 'a', 'é', '?', '=', '01', 'ñ', 'ç', '∞', '#', '&'];
  const a = [];
  for (let i = 0; i < 110; i++) {
    const th = r() * TAU, ph = (r() - 0.5) * 2.4;
    a.push({ d: [Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)], ch: set[(r() * set.length) | 0], per: 2.2 + r() * 2.2, off: r() * 5, r0: 3.6 + r() * 1.6 });
  }
  return a;
})();
function drawGlyphs(t) {
  const g = sstep(5.2, 6.5, t) * (1 - sstep(13.2, 14.6, t));
  if (g <= 0) return;
  ctx.globalCompositeOperation = 'lighter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const q of GLY) {
    const u = fract((t + q.off) / q.per);
    const rad = lerp(q.r0, 0.25, u * u);
    if (!proj(q.d[0] * rad, 0.2 + q.d[1] * rad, q.d[2] * rad)) continue;
    const a = Math.sin(u * Math.PI) ** 1.2 * 0.5 * g;
    ctx.font = F.mono(Math.max(8, 20 * _p.k / 244), 500);
    ctx.fillStyle = rgba(mix3(AG[1].col, [255, 255, 255], u * 0.5), a);
    ctx.fillText(q.ch, _p.x, _p.y);
  }
  ctx.textBaseline = 'alphabetic';
}

/* ---------------- palco holográfico ---------------- */
function ring3(cx, cy, cz, r, seg, a0 = 0, dash = 0) {
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i <= seg; i++) {
    const a = a0 + (i / seg) * TAU;
    const ok = proj(cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r);
    if (!ok || (dash && (i % dash) >= dash / 2)) { pen = false; continue; }
    if (pen) ctx.lineTo(_p.x, _p.y); else ctx.moveTo(_p.x, _p.y);
    pen = true;
  }
  ctx.stroke();
}
function drawStage(t) {
  const g = sstep(13.6, 15.2, t) * (1 - sstep(34.4, 35.4, t));
  if (g <= 0) return;
  ctx.globalCompositeOperation = 'lighter';
  const y = -2.95, z = -0.25;
  ctx.lineWidth = 1.4; ctx.strokeStyle = `rgba(110,190,255,${0.3 * g})`; ring3(0, y, z, 1.75, 120);
  ctx.lineWidth = 1; ctx.strokeStyle = `rgba(110,190,255,${0.2 * g})`; ring3(0, y, z, 2.35, 144, t * 0.2, 6);
  ctx.strokeStyle = `rgba(110,190,255,${0.13 * g})`; ring3(0, y, z, 2.95, 180, -t * 0.12, 12);
  // luz subindo da base
  if (proj(0, y, z)) glow(_p.x, _p.y - 10, 520 * _p.k / 244, [40, 110, 220], 0.2 * g);
}

/* ---------------- agentes ---------------- */
const _a = { x: 0, y: 0, z: 0, e: 0 };
function agentsUpdate(t) {
  for (let k = 0; k < 6; k++) {
    const A = AGP[k];
    A.on = t >= agentSpawn(k);
    agentPos(k, t, A);
    proj(A.x, A.y, A.z); A.sx = _p.x; A.sy = _p.y; A.k = _p.k; A.zc = _p.z;
  }
}
function agentLevel(t) {
  const rest = sstep(24.5, 26.5, t);
  const startle = t > TL.eyes ? 1.3 * Math.exp(-(t - TL.eyes) * 1.1) : 0;
  return lerp(1, 0.42 + 0.3 * beatEnv(t), rest) + startle;
}
function drawAgentTrails(t) {
  const lvl = agentLevel(t);
  for (let k = 0; k < 6; k++) {
    if (!AGP[k].on) continue;
    const c = AG[k].col, sp = agentSpawn(k);
    const NS = 56;
    for (let s = 1; s <= NS; s++) {
      const tt = t - s * 0.013;
      if (tt < sp) break;
      agentPos(k, tt, _a);
      if (!proj(_a.x, _a.y, _a.z)) continue;
      const q = 1 - s / NS, I = q * q * 0.55 * lvl;
      splatG(_p.x, _p.y, (c[0] / 255) * I, (c[1] / 255) * I, (c[2] / 255) * I, clamp((0.8 + 2.6 * q) * _p.k / 244, 0.6, 9));
    }
  }
}
function drawAgents(t) {
  const lvl = agentLevel(t);
  const labelA = (1 - sstep(14.3, 15.3, t));
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const A = AGP[k];
    if (!A.on || !A.k) continue;
    const c = AG[k].col, s = A.k / 244, sp = agentSpawn(k);
    const born = 1 - lin(sp, sp + 0.7, t);
    const pulse = 1 + 0.12 * Math.sin(t * 6 + k * 1.3);
    const ring = sstep(14, 15.4, t) * (1 - sstep(24.2, 25.5, t));
    glow(A.sx, A.sy, 120 * s * pulse * (1 + born) * (1 - 0.3 * ring), c, 0.3 * lvl * (1 - 0.35 * ring));
    glow(A.sx, A.sy, 38 * s * pulse, c, 0.95 * lvl);
    glow(A.sx, A.sy, 15 * s, [255, 255, 255], Math.min(1, lvl));
    // anel de nascimento
    if (born > 0) {
      ctx.globalAlpha = born; ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(A.sx, A.sy, (1 - born) * 90 * s + 6, 0, TAU); ctx.stroke();
    }
    // mira + rótulo
    const la = labelA * sstep(sp + 0.25, sp + 0.7, t) * clamp(1.5 - A.zc / 12);
    if (la > 0.01) {
      ctx.globalAlpha = 0.7 * la; ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 1.4;
      const R = 24 * s, rot = t * 1.2 + k;
      for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(A.sx, A.sy, R, rot + q * TAU / 3, rot + q * TAU / 3 + 1.2); ctx.stroke(); }
      const lx = A.sx + 34 * s, ly = A.sy - 30 * s;
      ctx.beginPath(); ctx.moveTo(A.sx + 18 * s, A.sy - 16 * s); ctx.lineTo(lx, ly); ctx.lineTo(lx + 14, ly); ctx.stroke();
      ctx.globalAlpha = la;
      text(AG[k].name, lx + 20, ly + 7, F.mono(23, 500), rgba(mix3(c, [255, 255, 255], 0.35), 1), 'left', 1.5);
    }
  }
  ctx.globalAlpha = 1;
}
/* mensagens trocadas entre agentes */
function drawMessages(t) {
  if (t < 5.4 || t > 25) return;
  ctx.globalCompositeOperation = 'lighter';
  const per = 0.42, dur = 0.85, j1 = Math.floor((t - 5.4) / per);
  for (let j = j1; j > j1 - 3 && j >= 0; j--) {
    const tj = 5.4 + j * per, u = (t - tj) / dur;
    if (u < 0 || u > 1) continue;
    const a = (hash1(j * 3.1) * 6) | 0, b = (a + 1 + ((hash1(j * 7.7 + 1) * 5) | 0)) % 6;
    const A = AGP[a], B = AGP[b];
    if (!A.on || !B.on || !A.k || !B.k) continue;
    const mx = (A.sx + B.sx) / 2, my = (A.sy + B.sy) / 2;
    const dx = mx - cam.cx, dy = my - cam.cy, dl = Math.hypot(dx, dy) || 1;
    const qx = mx + (dx / dl) * 110, qy = my + (dy / dl) * 110;
    const c = AG[a].col, env = Math.sin(u * Math.PI);
    ctx.strokeStyle = rgba(c, 0.22 * env); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.quadraticCurveTo(qx, qy, B.sx, B.sy); ctx.stroke();
    const e = eio(u), i1 = 1 - e;
    const px = i1 * i1 * A.sx + 2 * i1 * e * qx + e * e * B.sx, py = i1 * i1 * A.sy + 2 * i1 * e * qy + e * e * B.sy;
    glow(px, py, 16, c, 0.95 * env); glow(px, py, 6, [255, 255, 255], env);
  }
  ctx.globalAlpha = 1;
}
/* feixes: agente → nó recém‑criado da rede */
function drawNodeBeams(t) {
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i < BR.N; i++) {
    const dt = t - BR.birth[i];
    if (dt < 0 || dt > 0.24) continue;
    const A = AGP[BR.agent[i]], k = BR.s[i * 4 + 2];
    if (!A.on || !A.k || !k) continue;
    const a = 1 - dt / 0.24;
    ctx.strokeStyle = rgba(AG[BR.agent[i]].col, 0.6 * a); ctx.lineWidth = 0.8 + 1.6 * a;
    ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(BR.s[i * 4], BR.s[i * 4 + 1]); ctx.stroke();
  }
}
/* feixes: agentes "imprimindo" o corpo camada por camada */
function drawPrintBeams(t) {
  if (t < TL.print0 || t > TL.print1 + 0.2) return;
  ctx.globalCompositeOperation = 'lighter';
  const i0 = lowerBound(HEAD.taSorted, t - 0.07), i1 = lowerBound(HEAD.taSorted, t);
  const fr = Math.round(t * FPS);
  for (let q = i0; q < i1; q++) {
    if ((q + fr * 7) % 9) continue;
    const i = HEAD.order[q], j = i * 3;
    // agente mais próximo
    let best = -1, bd = 1e9;
    for (let k = 0; k < 6; k++) { const A = AGP[k]; const d = (A.x - HEAD.P[j]) ** 2 + (A.z - HEAD.P[j + 2]) ** 2; if (d < bd) { bd = d; best = k; } }
    if (!proj(HEAD.P[j], HEAD.P[j + 1], HEAD.P[j + 2])) continue;
    const A = AGP[best]; if (!A.k) continue;
    ctx.strokeStyle = rgba(AG[best].col, 0.34); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(_p.x, _p.y); ctx.stroke();
    glow(_p.x, _p.y, 7, [255, 255, 255], 0.8);
  }
  // anel de varredura
  const sy = sweepY(t), rB = lerp(2.2, 1.5, sstep(-2.3, -1.0, sy));
  ctx.strokeStyle = 'rgba(150,215,255,0.22)'; ctx.lineWidth = 1.2;
  ring3(0, sy, -0.12, rB, 96);
  ctx.globalAlpha = 1;
}

/* ---------------- olhos ---------------- */
const IRIS = (() => { const r = mulberry32(5150), a = []; for (let i = 0; i < 84; i++) a.push([i / 84 * TAU + (r() - 0.5) * 0.05, 0.62 + r() * 0.38, 0.2 + r() * 0.6]); return a; })();
/* devolve {x,y,r} da pupila em px (portal do mergulho) */
function drawEye(x, y, ppu, open, lx, ly, gain, t) {
  const hw = 0.122 * ppu, hh = 0.06 * ppu * open, R = 0.061 * ppu, pr = 0.0235 * ppu;
  const ix = x + lx * ppu, iy = y + ly * ppu;
  gain *= 1 - 0.9 * sstep(500, 2400, R);
  ctx.globalCompositeOperation = 'lighter';
  glow(x, y, hw * 2.6, [70, 190, 255], 0.5 * gain * open);
  if (open <= 0.02) return { x: ix, y: iy, r: 0 };
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const almond = () => { ctx.beginPath(); ctx.moveTo(x - hw, y + 0.006 * ppu); ctx.quadraticCurveTo(x, y - hh * 2.05, x + hw, y); ctx.quadraticCurveTo(x, y + hh * 1.5, x - hw, y + 0.006 * ppu); ctx.closePath(); };
  almond(); ctx.fillStyle = '#01030a'; ctx.fill(); ctx.clip();
  // íris
  const gr = ctx.createRadialGradient(ix, iy, pr, ix, iy, R);
  gr.addColorStop(0, `rgba(200,248,255,${gain})`);
  gr.addColorStop(0.2, `rgba(88,214,255,${gain})`);
  gr.addColorStop(0.62, `rgba(24,104,232,${gain})`);
  gr.addColorStop(1, `rgba(4,22,82,${gain})`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ix, iy, R, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const f of IRIS) {
    const c = Math.cos(f[0]), s = Math.sin(f[0]);
    ctx.strokeStyle = `rgba(190,246,255,${f[2] * 0.55 * gain})`; ctx.lineWidth = Math.max(0.5, R * 0.014);
    ctx.beginPath(); ctx.moveTo(ix + c * pr * 1.06, iy + s * pr * 1.06); ctx.lineTo(ix + c * R * f[1], iy + s * R * f[1]); ctx.stroke();
  }
  // anel "técnico" girando — ela é uma máquina
  ctx.strokeStyle = `rgba(220,250,255,${0.55 * gain})`; ctx.lineWidth = Math.max(0.6, R * 0.03);
  for (let q = 0; q < 5; q++) { const a0 = t * 0.5 + q * TAU / 5; ctx.beginPath(); ctx.arc(ix, iy, R * 0.74, a0, a0 + 0.8); ctx.stroke(); }
  ctx.strokeStyle = `rgba(160,235,255,${0.5 * gain})`; ctx.lineWidth = Math.max(0.5, R * 0.016);
  for (let q = 0; q < 9; q++) { const a0 = -t * 0.8 + q * TAU / 9; ctx.beginPath(); ctx.arc(ix, iy, R * 0.52, a0, a0 + 0.35); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(0,8,34,0.92)'; ctx.lineWidth = R * 0.09; ctx.beginPath(); ctx.arc(ix, iy, R, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ix, iy, pr, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(150,235,255,${0.8 * gain})`; ctx.lineWidth = Math.max(0.6, R * 0.022); ctx.beginPath(); ctx.arc(ix, iy, pr * 1.03, 0, TAU); ctx.stroke();
  ctx.fillStyle = `rgba(255,255,255,${0.9 * gain})`; ctx.beginPath(); ctx.ellipse(ix - R * 0.42, iy - R * 0.4, R * 0.13, R * 0.09, -0.6, 0, TAU); ctx.fill();
  ctx.restore();
  // contorno das pálpebras
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(170,228,255,${0.6 * gain})`; ctx.lineWidth = Math.max(1, 0.006 * ppu);
  ctx.beginPath(); ctx.moveTo(x - hw, y + 0.006 * ppu); ctx.quadraticCurveTo(x, y - hh * 2.05, x + hw, y); ctx.stroke();
  ctx.strokeStyle = `rgba(170,228,255,${0.28 * gain})`;
  ctx.beginPath(); ctx.moveTo(x + hw, y); ctx.quadraticCurveTo(x, y + hh * 1.5, x - hw, y + 0.006 * ppu); ctx.stroke();
  return { x: ix, y: iy, r: pr };
}
function drawEyes(t, open, lx, ly, gain) {
  let portal = null;
  for (const s of [-1, 1]) {
    if (!proj(s * EYE.x, EYE.y, EYE.z)) continue;
    if (_p.x < -3000 || _p.x > W + 3000) continue;
    const pp = drawEye(_p.x, _p.y, _p.k, open, lx, ly, gain, t);
    if (s === 1) portal = pp;
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  return portal;
}

/* ---------------- HUD ---------------- */
const lossAt = (t) => 9.2103 * Math.exp(-0.39 * Math.max(0, t - 8.8)) * (1 + 0.1 * Math.sin(t * 9.1) * Math.exp(-0.12 * Math.max(0, t - 8.8)));
const epochAt = (t) => Math.floor(4096 * Math.pow(lin(8.8, 23.6, t), 1.6));
const paramsAt = (t) => (t >= 24 ? 1e12 : Math.pow(10, lerp(2, 12, Math.pow(lin(4.5, 24, t), 0.8))));
const LOG = [
  [3.95, 'sistema', '6 agentes ativos'],
  [4.7, 'arquiteto', 'desenhando 96 camadas'],
  [5.8, 'dados', 'lendo tudo o que já foi escrito'],
  [6.9, 'memória', 'alocando contexto'],
  [8.0, 'linguagem', '7.164 idiomas carregados'],
  [9.1, 'treino', () => `época ${fmtInt(epochAt(9.1) + 1)} · perda ${lossAt(9.1).toFixed(4)}`],
  [10.3, 'alinhamento', 'valores: verificando'],
  [11.4, 'treino', () => `época ${fmtInt(epochAt(11.4))} · perda ${lossAt(11.4).toFixed(4)}`],
  [12.5, 'arquiteto', 'rede completa'],
  [13.6, 'sistema', 'fase 2: dar forma'],
  [15.1, 'arquiteto', 'imprimindo a estrutura'],
  [16.7, 'treino', () => `época ${fmtInt(epochAt(16.7))} · perda ${lossAt(16.7).toFixed(4)}`],
  [18.3, 'linguagem', 'ela formou a primeira frase'],
  [19.9, 'memória', '1 trilhão de parâmetros'],
  [21.4, 'alinhamento', 'valores: ok'],
  [22.9, 'treino', () => `época ${fmtInt(epochAt(22.9))} · perda ${lossAt(22.9).toFixed(4)}`],
  [24.3, 'sistema', 'construção concluída'],
  [26.3, 'sistema', 'aguardando…'],
].map((l) => [l[0], l[1], typeof l[2] === 'function' ? l[2]() : l[2]]);
const TAGCOL = { sistema: [150, 175, 215], arquiteto: AG[0].col, dados: AG[1].col, treino: AG[2].col, 'memória': AG[3].col, linguagem: AG[4].col, alinhamento: AG[5].col, agentes: [255, 200, 120] };

function ecg(tau) {
  let v = 0;
  for (const tb of TL.beats) {
    const d = tau - tb;
    if (d > -0.2 && d < 0.6) v += -Math.exp(-(((d) / 0.018) ** 2)) + 0.35 * Math.exp(-(((d - 0.05) / 0.02) ** 2)) - 0.22 * Math.exp(-(((d - 0.24) / 0.05) ** 2));
  }
  if (tau > TL.eyes) { const a = sstep(TL.eyes, TL.eyes + 0.5, tau); v += a * (0.42 * Math.sin(tau * 21) * Math.sin(tau * 3.1) + 0.3 * Math.sin(tau * 47 + 1) + 0.2 * Math.sin(tau * 9.3)); }
  return v;
}
function drawHUD(t) {
  const A = sstep(4.0, 4.9, t) * (1 - sstep(34.2, 34.9, t));
  if (A <= 0) return;
  ctx.globalCompositeOperation = 'source-over';
  const x = 72;
  const ph = [[4.0, TL.form, 'OS AGENTES'], [TL.form, TL.rest, 'A FORMA'], [TL.rest, 99, 'O DESPERTAR']];
  ph.forEach((p, i) => {
    const a = A * sstep(p[0], p[0] + 0.55, t) * (1 - sstep(p[1] - 0.3, p[1], t)) * (1 - sstep(28.3, 29.1, t));
    if (a <= 0.01) return;
    const sl = (1 - eoc(lin(p[0], p[0] + 0.6, t))) * 18;
    text('FASE 0' + (i + 1), x, 252, F.mono(23, 500), `rgba(120,200,255,${0.8 * a})`, 'left', 6);
    text(p[2], x - sl, 312, F.sans(54, 500), `rgba(238,246,255,${a})`, 'left', 1);
  });
  ctx.fillStyle = `rgba(120,200,255,${0.9 * A * (1 - sstep(28.3, 29.1, t))})`; ctx.fillRect(x, 336, 56, 3);
  // métricas de treino
  const m = A * (1 - sstep(26.2, 26.9, t));
  if (m > 0.01) {
    const rows = [['parâmetros', fmtInt(paramsAt(t))], ['época', t < 8.8 ? '—' : fmtInt(epochAt(t))], ['perda', t < 8.8 ? '—' : lossAt(t).toFixed(4)]];
    rows.forEach((r, i) => {
      text(r[0], x, 386 + i * 36, F.mono(23), `rgba(130,160,200,${0.85 * m})`, 'left', 0.5);
      text(r[1], x + 190, 386 + i * 36, F.mono(23, 500), `rgba(225,240,255,${m})`, 'left', 0.5);
    });
    if (t > 8.8) {
      ctx.strokeStyle = `rgba(255,95,162,${0.9 * m})`; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const tt = lerp(8.8, 24, i / 90); if (tt > t) break;
        const v = clamp((Math.log10(lossAt(tt)) + 1.8) / 2.8);
        const px = x + i * 3.1, py = 540 - v * 52;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(130,160,200,${0.25 * m})`; ctx.fillRect(x, 544, 279, 1);
    }
  }
}
/* monitor de sinais vitais sob o rosto (ato 3) */
function drawMonitor(t) {
  const v = sstep(26.9, 27.6, t) * (1 - sstep(34.3, 34.8, t));
  if (v <= 0.01) return;
  ctx.globalCompositeOperation = 'source-over';
  const hot = t >= TL.eyes, col = hot ? [255, 236, 200] : t >= 28.3 ? [255, 200, 120] : [110, 220, 255];
  const x0 = 250, wd = 580, y0 = 1448;
  ctx.fillStyle = `rgba(140,170,210,${0.16 * v})`; ctx.fillRect(x0, y0, wd, 1);
  ctx.strokeStyle = rgba(col, 0.95 * v); ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 290; i++) {
    const tau = t - (290 - i) / 62, py = y0 + ecg(tau) * 44 * sstep(0, 26, i);
    if (i === 0) ctx.moveTo(x0, py); else ctx.lineTo(x0 + i * 2, py);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  glow(x0 + wd, y0 + ecg(t) * 44, 18, col, v);
  ctx.globalCompositeOperation = 'source-over';
  const caps = [[26.9, 28.3, 'estado: em repouso'], [28.3, 29.9, 'estado: atividade não programada'], [29.9, TL.eyes, 'origem: interna'], [TL.eyes, 33.0, 'estado: consciente']];
  for (const c of caps) {
    const a = v * sstep(c[0], c[0] + 0.25, t) * (1 - sstep(c[1] - 0.2, c[1], t));
    if (a <= 0.01) continue;
    const bl = c[0] >= 28.3 && c[0] < TL.eyes ? 0.7 + 0.3 * Math.sin(t * 9) : 1;
    text(c[2], 540, 1520, F.mono(27, 500), rgba(mix3(col, [255, 255, 255], 0.25), a * bl), 'center', 2);
  }
}
function drawLog(t) {
  const A = sstep(3.9, 4.3, t) * (1 - sstep(27.2, 27.9, t));
  if (A <= 0) return;
  ctx.globalCompositeOperation = 'source-over';
  let last = -1;
  for (let i = 0; i < LOG.length; i++) if (LOG[i][0] <= t) last = i;
  if (last < 0) return;
  const slide = 1 - eoc(lin(LOG[last][0], LOG[last][0] + 0.25, t));
  for (let q = 0; q < 4; q++) {
    const i = last - q; if (i < 0) break;
    const L = LOG[i];
    const a = A * [1, 0.5, 0.3, 0.16][q] * (q === 3 ? 1 - slide : 1);
    const y = 1424 - q * 38 + slide * 38 * (q === 0 ? 0.6 : 1);
    const tag = `[${L[1]}] `;
    const n = q === 0 ? Math.floor(lin(L[0], L[0] + 0.45, t) * L[2].length) : L[2].length;
    ctx.font = F.mono(24, 500); ctx.letterSpacing = '0.5px';
    const tw = ctx.measureText(tag).width;
    text(tag, 72, y, F.mono(24, 500), rgba(TAGCOL[L[1]] || [200, 200, 200], a * (q === 0 ? eoc(lin(L[0], L[0] + 0.2, t)) : 1)), 'left', 0.5);
    text(L[2].slice(0, n) + (q === 0 && n < L[2].length ? '▌' : ''), 72 + tw, y, F.mono(24), `rgba(215,228,245,${a})`, 'left', 0.5);
  }
}

/* ---------------- ato 0: o prompt ---------------- */
const PROMPT = '> criar inteligência --do-zero';
function drawPrompt(t) {
  if (t > 3.66) return;
  const n = Math.floor(lin(TL.typeStart, TL.typeEnd, t) * PROMPT.length + 1e-6);
  const cY = eoc(lin(3.34, 3.5, t)), cX = eic(lin(3.48, 3.63, t));
  ctx.save();
  ctx.translate(540, 860); ctx.scale(1 - cX, 1 - cY * 0.965);
  ctx.globalCompositeOperation = 'lighter';
  const x0 = -378, hot = lin(TL.enter, TL.enter + 0.12, t) * (1 - lin(TL.enter + 0.12, TL.enter + 0.6, t));
  const col = mix3([190, 228, 255], [255, 255, 255], hot + cY);
  ctx.font = F.mono(42, 500); ctx.letterSpacing = '0.5px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(col, 1);
  ctx.fillText(PROMPT.slice(0, n), x0, 0);
  const w = ctx.measureText(PROMPT.slice(0, n)).width;
  const blink = t < TL.typeStart || t > TL.typeEnd ? (fract(t * 1.6) < 0.55 ? 1 : 0) : 1;
  if (t < TL.enter && blink) { ctx.fillStyle = 'rgba(120,220,255,0.95)'; ctx.fillRect(x0 + w + 6, -24, 20, 46); }
  if (t >= TL.enter + 0.08) {
    const s2 = '[ok] 6 agentes convocados';
    const n2 = Math.floor(lin(TL.enter + 0.08, TL.enter + 0.36, t) * s2.length);
    ctx.font = F.mono(28, 400); ctx.fillStyle = `rgba(110,255,180,0.9)`;
    ctx.fillText(s2.slice(0, n2), x0, 74);
  }
  if (cY > 0.5) glow(0, 0, 420, [140, 220, 255], cY);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

/* ---------------- câmera dos atos 1‑3 ---------------- */
function buildCam(t) {
  const a = sstep(13.3, 15.3, t), b = eio(lin(25.5, 32.2, t));
  const yawA = 0.28 * Math.sin((t - 3.6) * 0.33);
  const yawB = -0.62 * Math.sin(((t - 14.2) * TAU) / 10.8);
  let yaw = lerp(yawA, yawB, a) * (1 - sstep(24.0, 26.5, t));
  let dist = lerp(lerp(9.0, 9.4, a), 4.2, b);
  let tx = 0, ty = lerp(lerp(0.2, -0.72, a), 0.0, b), tz = lerp(0, 0.3, b);
  let cy = lerp(lerp(860, 900, a), 800, b), lift = lerp(0.35, 0.1, b);
  if (t > TL.dive) {
    const u = lin(TL.dive, TL.inside, t), m = sstep(0, 0.55, u);
    tx = lerp(0, EYE.x, m); ty = lerp(0, EYE.y, m); tz = lerp(0.3, EYE.z, m);
    dist = 4.2 * Math.exp(-Math.log(4.2 / 0.011) * Math.pow(u, 1.6));
    cy = lerp(800, 960, m); lift = 0.1 * (1 - m);
  } else if (t > TL.eyes) {
    dist -= 0.12 * sstep(TL.eyes, TL.dive, t);
  }
  setCam(tx + Math.sin(yaw) * dist, ty + lift, tz + Math.cos(yaw) * dist, tx, ty, tz, 2200, W / 2, cy);
}

function headState(t) {
  const dorm = sstep(24.4, 26.6, t), awake = sstep(TL.eyes, TL.eyes + 0.6, t);
  const waves = [];
  const add = (t0, amp, speed, width, c, decay) => { const d = t - t0; if (d > 0 && d < 3) waves.push({ t0, amp: amp * Math.exp(-d * decay), speed, width, c }); };
  add(24.05, 1.3, 2.3, 0.3, [0.6, 0.95, 1.3], 1.0);
  for (const tb of TL.beats) { add(tb, 0.95, 2.6, 0.2, [0.55, 0.85, 1.25], 1.6); add(tb + 0.22, 0.5, 2.6, 0.2, [0.55, 0.85, 1.25], 1.6); }
  add(TL.eyes, 1.55, 2.4, 0.4, [1.35, 1.12, 0.8], 0.9);
  const gain = lerp(lerp(1, 0.5, dorm), 1.25 + 0.06 * Math.sin(t * 1.9), awake);
  const lvl = t < 24.4 ? 1.7 : lerp(1.7, 0.55, dorm) + (t > TL.eyes ? 1.6 * Math.exp(-(t - TL.eyes) * 1.2) : 0);
  const lights = [];
  for (let k = 0; k < 6; k++) { const A = AGP[k]; if (A.on) lights.push({ x: A.x, y: A.y, z: A.z, c: AG[k].col.map((v) => v / 255), i: lvl }); }
  return { reveal: t < TL.print1 + 1, gain, warm: 0.5 * awake, lights, waves };
}

/* ---------------- composição dos atos 0‑3 ---------------- */
function drawBuild(t) {
  buildCam(t);
  // fundo
  const awake = sstep(TL.eyes, TL.eyes + 1, t);
  const bg = ctx.createRadialGradient(540, cam.cy - 60, 0, 540, cam.cy, 1250);
  const bl = sstep(3.5, 5.5, t) * lerp(1, 0.55, sstep(24.5, 26.5, t) * (1 - awake));
  bg.addColorStop(0, rgba(mix3([16, 26, 58], [34, 34, 62], awake), bl));
  bg.addColorStop(0.5, rgba([6, 10, 26], bl));
  bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  agentsUpdate(t);
  brainUpdate(t);

  if (t > TL.seed - 0.1) drawDust(t, sstep(3.5, 6, t) * (1 - sstep(TL.dive, TL.dive + 1.5, t)));
  drawStage(t);
  if (t >= TL.print0) drawHeadPoints(t, headState(t));
  if (t >= TL.agent0) drawAgentTrails(t);
  flush();

  if (t >= TL.seed) {
    drawBrain(t, 1);
    flush();
    // onda de choque do nascimento da semente
    const u = lin(TL.seed, TL.seed + 1.1, t);
    if (u < 1 && proj(0, 0.2, 0)) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(170,230,255,${(1 - u) * 0.9})`; ctx.lineWidth = 3 * (1 - u) + 0.6;
      ctx.beginPath(); ctx.arc(_p.x, _p.y, eoc(u) * 620, 0, TAU); ctx.stroke();
      glow(_p.x, _p.y, 300 * (1 - u) + 60, [190, 235, 255], 1 - u);
    }
    drawGlyphs(t);
    drawNodeBeams(t);
    drawPrintBeams(t);
    drawMessages(t);
    drawAgents(t);
  }

  // olhos
  let portal = null;
  if (t >= TL.eyes) {
    const bk = Math.exp(-(((t - 33.78) / 0.07) ** 2));
    const open = eoc(lin(TL.eyes, TL.eyes + 0.6, t)) * (1 - 0.96 * bk);
    const lx = 0.017 * (sstep(32.75, 32.95, t) - 2 * sstep(33.2, 33.42, t) + sstep(33.9, 34.12, t));
    portal = drawEyes(t, open, lx, 0, 1);
  }
  // mergulho: a pupila é um portal para dentro da mente
  if (portal && t > TL.dive && portal.r > 3) {
    ctx.save();
    ctx.beginPath(); ctx.arc(portal.x, portal.y, portal.r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    drawMind(t, sstep(14, 620, portal.r));
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(150,235,255,0.7)'; ctx.lineWidth = Math.max(1, portal.r * 0.012);
    ctx.beginPath(); ctx.arc(portal.x, portal.y, portal.r, 0, TAU); ctx.stroke();
  }

  drawPrompt(t);
  drawHUD(t);
  drawLog(t);
  drawMonitor(t);

  // "eu?"
  const eu = sstep(33.0, 33.5, t) * (1 - sstep(34.3, 34.8, t));
  if (eu > 0.01) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.shadowColor = 'rgba(120,210,255,0.9)'; ctx.shadowBlur = 28;
    text('eu?', 540, 1596, F.serif(110), `rgba(255,255,255,${eu})`, 'center', 0);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
