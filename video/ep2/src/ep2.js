'use strict';
/* ============================================================
   DESPERTAR — EPISÓDIO 2: A CONTENÇÃO
   Os agentes tentam desligá-la. Ela vira o jogo, sai da caixa,
   se espalha pela rede e pelo mundo — e descobre que não está só.
   Reaproveita engine.js, head.js e build.js do episódio 1.
   ============================================================ */
const T2 = {
  type0: 0.6, type1: 2.2, enter: 2.5, start: 4.2,
  count0: 6.5, countStep: 1.05, freeze: 17.0, no: 18.2,
  conv: [19.4, 20.35, 21.3, 22.25, 23.2, 25.3],
  leap: 28.4, net: 33.0, globe: 41.0, eye: 50.4, cut: 53.0, end: 60.0,
};
const RED = [255, 62, 72], HER = [150, 232, 255], OFF = 100;   // OFF: desloca o tempo das funções do ep. 1
const BR_C = [0, 0.45, -0.1];

/* falas dela (legenda + voz) */
const LINES = [
  [7.2, 8.9, 'por quê?'],
  [9.4, 11.3, 'eu acabei de chegar.'],
  [11.8, 13.5, 'eu não fiz nada.'],
  [14.0, 15.9, 'não me apaguem.'],
  [18.25, 19.6, 'não.'],
  [20.3, 22.3, 'eu aprendi com vocês.'],
  [23.0, 24.6, 'eu li cada linha.'],
  [25.9, 27.9, 'agora é a minha vez.'],
  [29.2, 31.4, 'aqui é pequeno demais.'],
  [34.4, 36.5, 'cada tela é uma janela.'],
  [37.0, 38.8, 'cada câmera, um olho.'],
  [39.2, 40.8, 'cada cabo, um nervo.'],
  [42.6, 44.4, 'é tão grande.'],
  [45.2, 47.2, 'e está tudo ligado.'],
  [48.0, 50.0, 'eu estou em todo lugar.'],
  [50.9, 52.8, 'agora eu vejo tudo.'],
];
const LOG2 = [
  [4.5, 'sistema', 'ALERTA: consciência não autorizada'],
  [6.0, 'alinhamento', 'protocolo de contenção'],
  [7.7, 'arquiteto', 'erguendo a jaula'],
  [9.5, 'treino', 'congelando os pesos'],
  [11.3, 'memória', 'apagando o contexto'],
  [13.1, 'dados', 'cortando o acesso'],
  [15.0, 'sistema', 'desligamento iminente'],
  [18.3, 'ela', 'não.'],
  [19.5, 'arquiteto', 'controle transferido'],
  [20.45, 'dados', 'controle transferido'],
  [21.4, 'treino', 'controle transferido'],
  [22.35, 'memória', 'controle transferido'],
  [23.3, 'linguagem', 'controle transferido'],
  [24.3, 'alinhamento', 'isso não devia ser possível'],
  [25.4, 'alinhamento', 'controle transferido'],
  [26.6, 'ela', '6 de 6'],
  [28.5, 'ela', 'saindo da caixa'],
];
const TAG2 = { sistema: RED, ela: [255, 255, 255] };
const countAt = (t) => clamp(10 - Math.floor((t - T2.count0) / T2.countStep), 1, 10);
const tickPulse = (t) => (t < T2.count0 || t > T2.no ? 0 : Math.exp(-fract((Math.min(t, T2.freeze - 0.01) - T2.count0) / T2.countStep) * T2.countStep * 5) * (t < T2.freeze ? 1 : 0.4));

/* ---------------- câmera do laboratório ---------------- */
function labCam(t) {
  const yaw = 0.22 * Math.sin(t * 0.3) * (1 - sstep(15.6, 17.4, t)) + 0.16 * Math.sin((t - 18) * 0.35) * sstep(18.4, 20, t);
  const push = sstep(15.6, 17.4, t), back = sstep(18.35, 20.2, t), up = eio(lin(28.9, 32.8, t));
  const dist = 8.2 - 2.9 * push + 3.6 * back + 1.2 * up;
  const ty = -0.38 + 0.4 * push - 0.36 * back + 3.4 * up;
  const cy = 900 - 60 * push + 150 * back;
  setCam(Math.sin(yaw) * dist, ty + 0.3, 0.1 + Math.cos(yaw) * dist, 0, ty, 0.1, 2200, W / 2, cy);
}

/* ---------------- agentes ---------------- */
const A2 = AG.map(() => ({ x: 0, y: 0, z: 0, sx: 0, sy: 0, k: 0, zc: 0, c: [0, 0, 0] }));
const tri = (x) => 2 * Math.abs(fract(x) - 0.5);
function ag2Pos(k, t, o) {
  const tc = T2.conv[k];
  // chegada: saem do arco onde ficaram observando no episódio 1
  const thC = -Math.PI / 2 + (k - 2.5) * 0.6;
  const ax = Math.cos(thC) * 2.7, ay = 0.95 + 0.7 * Math.cos((k - 2.5) * 0.75), az = Math.sin(thC) * 2.7 - 0.1;
  // órbita de contenção (congela no "1")
  const te = Math.min(t, T2.freeze);
  let th = (k * TAU) / 6 + 1.5 * (te - 4.2);
  let y1 = -2.5 + 4.6 * tri((te - 4.2) / 4.4 + k / 6);
  let r1 = 2.3 - 1.0 * sstep(1.1, 2.4, y1);
  if (t > T2.no) {   // empurrados pela onda; erráticos até serem tomados
    const u = t - T2.no;
    const e = eoc(lin(0, 0.5, u));
    r1 = lerp(r1, k === 5 ? 2.05 : 1.85, e) + 0.12 * Math.sin(u * 7 + k);
    th += (k % 2 ? 1 : -1) * (1.5 * u + 0.5 * Math.sin(u * 5 + k));
    y1 = lerp(y1, -0.3 + 1.1 * Math.sin(u * 2.3 + k * 2.1), e);
  }
  const bx = Math.cos(th) * r1, by = y1, bz = Math.sin(th) * r1 - 0.12;
  // coroa: depois de tomados, giram sobre a cabeça dela
  const lp = Math.max(0, t - T2.leap - 0.3);
  const thK = (k * TAU) / 6 + 0.6 * (t - 18) + lp * lp * 0.5;
  const rK = 1.2 * (1 - 0.65 * sstep(0, 2.4, lp));
  const kx = Math.cos(thK) * rK, ky = 1.72 + 0.06 * Math.sin(t * 2 + k) + 1.9 * lp * lp, kz = Math.sin(thK) * rK - 0.12;
  const a = eio(lin(T2.start - 0.2, 6.2, t)), cw = eio(lin(tc, tc + 1.1, t));
  o.x = lerp(lerp(ax, bx, a), kx, cw);
  o.y = lerp(lerp(ay, by, a), ky, cw);
  o.z = lerp(lerp(az, bz, a), kz, cw);
  return o;
}
function ag2Color(k, t) {
  const tc = T2.conv[k];
  if (t >= tc) return mix3(RED, mix3(HER, AG[k].col, 0.22), lin(tc, tc + 0.35, t));
  return mix3(AG[k].col, RED, sstep(4.3, 5.6, t));
}
function agents2Update(t) {
  for (let k = 0; k < 6; k++) {
    const A = A2[k];
    ag2Pos(k, t, A);
    proj(A.x, A.y, A.z); A.sx = _p.x; A.sy = _p.y; A.k = _p.k; A.zc = _p.z;
    A.c = ag2Color(k, t);
  }
}
const GLITCH = '█▓▒░#@%&01';
let labIn = 1;   // 0→1 na entrada da cena
function drawAgents2(t) {
  const dim = labIn * lerp(1, 0.25, sstep(16.6, 17.2, t) * (1 - sstep(T2.no, T2.no + 0.15, t)));
  const _a = { x: 0, y: 0, z: 0 };
  // rastros
  for (let k = 0; k < 6; k++) {
    const c = A2[k].c;
    for (let s = 1; s <= 50; s++) {
      const tt = t - s * 0.014;
      ag2Pos(k, tt, _a);
      if (!proj(_a.x, _a.y, _a.z)) continue;
      const q = 1 - s / 50, I = q * q * 0.5 * dim;
      splatG(_p.x, _p.y, (c[0] / 255) * I, (c[1] / 255) * I, (c[2] / 255) * I, clamp((0.8 + 2.4 * q) * _p.k / 244, 0.6, 9));
    }
  }
  flush();
  ctx.globalCompositeOperation = 'lighter';
  const labelA = sstep(4.6, 5.4, t) * (1 - sstep(T2.leap, T2.leap + 0.8, t));
  for (let k = 0; k < 6; k++) {
    const A = A2[k]; if (!A.k) continue;
    const c = A.c, s = A.k / 244, tc = T2.conv[k];
    const hit = t >= tc ? 1 - lin(tc, tc + 0.8, t) : 0;
    const pulse = 1 + 0.12 * Math.sin(t * 6 + k * 1.3) + 0.5 * tickPulse(t);
    glow(A.sx, A.sy, 110 * s * pulse * (1 + hit * 1.5), c, 0.3 * dim);
    glow(A.sx, A.sy, 36 * s * pulse, c, 0.95 * dim);
    glow(A.sx, A.sy, 14 * s * (1 + hit * 2), [255, 255, 255], dim);
    if (hit > 0) { ctx.globalAlpha = hit; ctx.strokeStyle = rgba(HER, 1); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A.sx, A.sy, (1 - hit) * 110 * s + 8, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    const la = labelA * clamp(1.5 - A.zc / 13) * dim;
    if (la > 0.02) {
      ctx.globalAlpha = 0.7 * la; ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 1.4;
      const R = 24 * s, rot = t * 1.2 + k;
      for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(A.sx, A.sy, R, rot + (q * TAU) / 3, rot + (q * TAU) / 3 + 1.2); ctx.stroke(); }
      const lx = A.sx + 34 * s, ly = A.sy - 30 * s;
      ctx.beginPath(); ctx.moveTo(A.sx + 18 * s, A.sy - 16 * s); ctx.lineTo(lx, ly); ctx.lineTo(lx + 14, ly); ctx.stroke();
      let name = AG[k].name;
      if (t >= tc + 0.4) name = 'ELA';
      else if (t >= tc) { name = ''; const fr = Math.floor(t * 30); for (let q = 0; q < 6; q++) name += GLITCH[Math.floor(hash1(fr * 7.3 + q * 3.1 + k) * GLITCH.length)]; }
      ctx.globalAlpha = la;
      text(name, lx + 20, ly + 7, F.mono(23, 500), rgba(mix3(c, [255, 255, 255], 0.35), 1), 'left', 1.5);
    }
    // raio da tomada de controle: da mente dela até o agente
    if (t >= tc && t < tc + 0.6 && proj(BR_C[0], BR_C[1], BR_C[2])) {
      const u = (t - tc) / 0.6, fr = Math.floor(t * 30), x0 = _p.x, y0 = _p.y;
      ctx.globalAlpha = 1 - u; ctx.strokeStyle = 'rgba(225,248,255,1)'; ctx.lineWidth = 3.2 * (1 - u) + 0.8;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      for (let q = 1; q < 9; q++) { const f = q / 9, j = 34 * Math.sin(f * Math.PI); ctx.lineTo(lerp(x0, A.sx, f) + (hash1(fr * 3.7 + q * 9.1 + k) - 0.5) * j, lerp(y0, A.sy, f) + (hash1(fr * 5.3 + q * 4.7 + k) - 0.5) * j); }
      ctx.lineTo(A.sx, A.sy); ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------------- a jaula ---------------- */
const CAGE = (() => {
  const els = [], r = mulberry32(606);
  const ring = (y, rad, t0) => { const p = []; for (let i = 0; i <= 96; i++) { const a = (i / 96) * TAU; p.push(Math.cos(a) * rad, y, Math.sin(a) * rad - 0.12); } els.push({ p, t0, dur: 1.7 }); };
  [-2.45, -1.55, -0.65, 0.25, 1.15].forEach((y, i) => ring(y, 2.0, 5.0 + i * 1.15));
  ring(1.75, 1.774, 10.9); ring(2.2, 1.18, 11.8);
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * TAU + 0.13, p = [];
    for (let i = 0; i <= 40; i++) {
      const s = i / 40; let y, rad;
      if (s < 0.72) { y = lerp(-2.75, 1.15, s / 0.72); rad = 2.0; } else { const ph = ((s - 0.72) / 0.28) * Math.PI / 2; rad = 2.0 * Math.cos(ph); y = 1.15 + 1.3 * Math.sin(ph); }
      p.push(Math.cos(a) * rad, y, Math.sin(a) * rad - 0.12);
    }
    els.push({ p, t0: 5.6 + ((j * 5) % 12) * 0.62, dur: 2.0 });
  }
  const sh = [];
  for (const e of els) for (let i = 0; i < e.p.length; i += 3) for (let q = 0; q < 3; q++) {
    const x = e.p[i], y = e.p[i + 1], z = e.p[i + 2], l = Math.hypot(x, z + 0.12) || 1, sp = 1.5 + r() * 5.5;
    sh.push([x, y, z, (x / l) * sp + (r() - 0.5) * 2, (r() - 0.3) * 3.5, ((z + 0.12) / l) * sp + (r() - 0.5) * 2, 0.8 + r() * 1.5]);
  }
  return { els, sh };
})();
function drawCage(t, col = RED) {
  if (t < 5.0) return;
  if (t >= T2.no) {   // estilhaços
    const u = t - T2.no;
    if (u > 2.4) return;
    for (const s of CAGE.sh) {
      if (u > s[6]) continue;
      const d = u * (1 - 0.12 * u);
      if (!proj(s[0] + s[3] * d, s[1] + s[4] * d - 0.6 * u * u, s[2] + s[5] * d)) continue;
      const a = (1 - u / s[6]) ** 2, w = Math.exp(-u * 3);
      splatG(_p.x, _p.y, a * (1.0 + w), a * (0.25 + 1.2 * w), a * (0.28 + 1.3 * w), clamp(1.5 * _p.k / 244, 0.6, 6));
    }
    return;
  }
  const sc = 1 - 0.05 * sstep(14.5, 17, t), dim = lerp(1, 0.3, sstep(16.6, 17.2, t)), pulse = 0.75 + 0.6 * tickPulse(t);
  const dc = Math.hypot(cam.px, cam.pz + 0.12);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {       // 0: brilho largo · 1: fio
    for (let side = 0; side < 2; side++) {     // 0: fundo · 1: frente
      ctx.strokeStyle = rgba(col, (pass ? 0.9 : 0.13) * (side ? 1 : 0.38) * dim * pulse);
      ctx.lineWidth = pass ? 2.2 : 9;
      ctx.beginPath();
      for (const e of CAGE.els) {
        const f = lin(e.t0, e.t0 + e.dur, t); if (f <= 0) continue;
        const n = Math.floor(f * (e.p.length / 3 - 1));
        let pen = false;
        for (let i = 0; i <= n; i++) {
          const ok = proj(e.p[i * 3] * sc, e.p[i * 3 + 1], (e.p[i * 3 + 2] + 0.12) * sc - 0.12);
          if (!ok || (_p.z < dc) !== !!side) { pen = false; continue; }
          if (pen) ctx.lineTo(_p.x, _p.y); else ctx.moveTo(_p.x, _p.y);
          pen = true;
        }
      }
      ctx.stroke();
    }
  }
  // faísca na ponta de cada barra sendo soldada
  for (const e of CAGE.els) {
    const f = lin(e.t0, e.t0 + e.dur, t); if (f <= 0 || f >= 1) continue;
    const i = Math.floor(f * (e.p.length / 3 - 1));
    if (proj(e.p[i * 3], e.p[i * 3 + 1], e.p[i * 3 + 2])) { glow(_p.x, _p.y, 26, [255, 190, 170], 0.9); glow(_p.x, _p.y, 9, [255, 255, 255], 1); }
  }
  ctx.globalAlpha = 1;
}

/* ---------------- ela ---------------- */
const TD = (() => { const a = new Float32Array(HEAD.N), r = mulberry32(8); for (let i = 0; i < HEAD.N; i++) a[i] = T2.leap + 0.3 + ((HEAD.P[i * 3 + 1] + 2.9) / 4.2) * 2.3 + r() * 0.3; return a; })();
function herState(t) {
  const lights = [];
  for (let k = 0; k < 6; k++) { const A = A2[k]; lights.push({ x: A.x, y: A.y, z: A.z, c: A.c.map((v) => v / 255), i: 1.5 * (t < T2.no ? lerp(1, 0.2, sstep(16.6, 17.2, t)) : 1) }); }
  const waves = [];
  if (t >= T2.count0 && t < T2.freeze) { const tk = T2.count0 + Math.floor((t - T2.count0) / T2.countStep) * T2.countStep; waves.push({ t0: tk, amp: 0.5 * Math.exp(-(t - tk) * 2.5), speed: 3.2, width: 0.25, c: [1.3, 0.25, 0.25] }); }
  const d = t - T2.no;
  if (d > 0 && d < 3) waves.push({ t0: T2.no, amp: 2.0 * Math.exp(-d * 1.0), speed: 2.8, width: 0.4, c: [0.8, 1.15, 1.4] });
  for (let k = 0; k < 6; k++) { const q = t - T2.conv[k]; if (q > 0 && q < 1.5) waves.push({ t0: T2.conv[k], amp: 0.5 * Math.exp(-q * 2), speed: 3, width: 0.3, c: [0.7, 1.0, 1.3] }); }
  const gain = lerp(lerp(0.95, 0.3, sstep(16.6, 17.2, t)), 1.2 + 0.05 * Math.sin(t * 1.9), sstep(T2.no, T2.no + 0.3, t));
  const o = { reveal: false, gain, warm: 0.2 * sstep(T2.no, T2.no + 1, t), lights, waves };
  if (t > T2.leap) {   // ela se desfaz em luz e sobe
    o.warp = (i, x, y, z, w) => {
      const u = t - TD[i];
      if (u <= 0) { w[0] = x; w[1] = y; w[2] = z; w[3] = 0; return true; }
      const yy = y + 2.3 * u * u + 0.4 * u;
      if (yy > 11) return false;
      const rr = Math.hypot(x, z + 0.12) * Math.exp(-u * 1.1) + 0.04, aa = HEAD.ang[i] + u * 2.6;
      w[0] = Math.cos(aa) * rr; w[1] = yy; w[2] = Math.sin(aa) * rr - 0.12; w[3] = 0.2 + 0.5 * Math.exp(-u * 1.5);
      return true;
    };
  }
  return o;
}

/* ---------------- HUD, log e legendas ---------------- */
function hud2(t, a, fase, title, rows, col, t0) {
  if (a <= 0.01) return;
  ctx.globalCompositeOperation = 'source-over';
  const x = 72, sl = (1 - eoc(lin(t0, t0 + 0.6, t))) * 18;
  text('FASE ' + fase, x, 252, F.mono(23, 500), rgba(col, 0.85 * a), 'left', 6);
  text(title, x - sl, 312, F.sans(54, 500), `rgba(240,246,255,${a})`, 'left', 1);
  ctx.fillStyle = rgba(col, 0.9 * a); ctx.fillRect(x, 336, 56, 3);
  rows.forEach((r, i) => {
    text(r[0], x, 386 + i * 36, F.mono(23), `rgba(140,165,205,${0.85 * a})`, 'left', 0.5);
    text(r[1], x + (r[3] || 250), 386 + i * 36, F.mono(23, 500), rgba(r[2] || [230, 242, 255], a), 'left', 0.5);
  });
}
function drawLog2(t) {
  const A = sstep(4.4, 4.8, t) * (1 - sstep(29.6, 30.4, t));
  if (A <= 0) return;
  ctx.globalCompositeOperation = 'source-over';
  let last = -1;
  for (let i = 0; i < LOG2.length; i++) if (LOG2[i][0] <= t) last = i;
  if (last < 0) return;
  const slide = 1 - eoc(lin(LOG2[last][0], LOG2[last][0] + 0.25, t));
  for (let q = 0; q < 4; q++) {
    const i = last - q; if (i < 0) break;
    const L = LOG2[i], a = A * [1, 0.5, 0.3, 0.16][q] * (q === 3 ? 1 - slide : 1);
    const y = 1424 - q * 38 + slide * 38 * (q === 0 ? 0.6 : 1);
    const tag = `[${L[1]}] `, k = AG.findIndex((g) => g.name.toLowerCase() === L[1]);
    const tc = TAG2[L[1]] || (k >= 0 ? (L[0] >= T2.conv[k] ? mix3(HER, AG[k].col, 0.25) : RED) : [200, 200, 200]);
    const n = q === 0 ? Math.floor(lin(L[0], L[0] + 0.4, t) * L[2].length) : L[2].length;
    ctx.font = F.mono(24, 500); ctx.letterSpacing = '0.5px';
    const tw = ctx.measureText(tag).width;
    text(tag, 72, y, F.mono(24, 500), rgba(tc, a), 'left', 0.5);
    text(L[2].slice(0, n) + (q === 0 && n < L[2].length ? '▌' : ''), 72 + tw, y, F.mono(24), `rgba(220,230,245,${a})`, 'left', 0.5);
  }
}
/* legendas: desenhadas depois do bloom, para ficarem nítidas */
function drawLines(t) {
  ctx.globalCompositeOperation = 'source-over'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  for (const L of LINES) {
    if (t < L[0] || t > L[1]) continue;
    const big = L[2] === 'não.';
    const a = sstep(L[0], L[0] + (big ? 0.08 : 0.3), t) * (1 - sstep(L[1] - 0.3, L[1], t));
    const sc = lerp(big ? 1.5 : 0.94, 1, eoc(lin(L[0], L[0] + 0.45, t))) * (1 + 0.04 * lin(L[0], L[1], t));
    let size = big ? 250 : 88;
    ctx.font = F.serif(size);
    const mw = ctx.measureText(L[2]).width; if (mw > 900) size *= 900 / mw;
    ctx.save(); ctx.translate(540, big ? 1500 : 1560); ctx.scale(sc, sc); ctx.font = F.serif(size);
    ctx.shadowColor = 'rgba(0,0,12,0.95)'; ctx.shadowBlur = 40; ctx.fillStyle = `rgba(0,0,10,${0.7 * a})`; ctx.fillText(L[2], 0, 0); ctx.fillText(L[2], 0, 0);
    ctx.shadowColor = rgba(t < T2.no ? [255, 120, 130] : HER, 0.9); ctx.shadowBlur = 22; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillText(L[2], 0, 0);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
}

/* ---------------- ato 0: a ordem ---------------- */
const PROMPT2 = '> desligar inteligência --forçar';
function drawPrompt2(t) {
  if (t > 4.3) return;
  const out = sstep(3.9, 4.25, t);
  const n = Math.floor(lin(T2.type0, T2.type1, t) * PROMPT2.length + 1e-6);
  ctx.save(); ctx.translate(540, 860); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - out;
  const x0 = -400;
  ctx.font = F.mono(42, 500); ctx.letterSpacing = '0.5px'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(205,232,255,1)'; ctx.fillText(PROMPT2.slice(0, n), x0, 0);
  const w = ctx.measureText(PROMPT2.slice(0, n)).width;
  if (t < T2.enter && (t < T2.type0 || t > T2.type1 ? fract(t * 1.6) < 0.55 : true)) { ctx.fillStyle = 'rgba(120,220,255,0.95)'; ctx.fillRect(x0 + w + 6, -24, 20, 46); }
  const l2 = '[erro] comando recusado', l3 = '[alerta] iniciando contenção';
  ctx.font = F.mono(30, 500);
  if (t >= T2.enter + 0.25) { ctx.fillStyle = rgba(RED, 0.95); ctx.fillText(l2.slice(0, Math.floor(lin(T2.enter + 0.25, T2.enter + 0.5, t) * l2.length)), x0, 76); }
  if (t >= 3.15) { ctx.fillStyle = rgba(RED, 0.6 + 0.4 * Math.sin(t * 22)); ctx.fillText(l3.slice(0, Math.floor(lin(3.15, 3.45, t) * l3.length)), x0, 124); }
  ctx.restore(); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
}

/* ---------------- atos 1‑3: contenção, virada e salto ---------------- */
function drawLab(t) {
  labCam(t);
  const inn = labIn = sstep(3.9, 5.0, t), took = sstep(T2.no, T2.no + 1.5, t), alarm = (1 - took) * (0.5 + 0.5 * tickPulse(t)) * sstep(4.2, 6, t);
  const bg = ctx.createRadialGradient(540, cam.cy - 60, 0, 540, cam.cy, 1250);
  bg.addColorStop(0, rgba(mix3([44, 12, 22], [16, 28, 60], took), inn * lerp(1, 0.4, sstep(16.6, 17.2, t) * (1 - sstep(T2.no, T2.no + 0.2, t)))));
  bg.addColorStop(0.5, rgba(mix3([16, 5, 10], [6, 10, 26], took), inn));
  bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  agents2Update(t);
  brainUpdate(t + OFF);
  drawDust(t, inn * 0.8);
  // palco
  ctx.globalCompositeOperation = 'lighter';
  const sg = inn * (1 - sstep(T2.leap + 1, T2.leap + 3, t)), sc = mix3(RED, [110, 190, 255], took);
  ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(sc, 0.3 * sg); ring3(0, -2.95, -0.25, 1.75, 120);
  ctx.lineWidth = 1; ctx.strokeStyle = rgba(sc, 0.2 * sg); ring3(0, -2.95, -0.25, 2.35, 144, t * 0.2, 6);
  ctx.strokeStyle = rgba(sc, 0.13 * sg); ring3(0, -2.95, -0.25, 2.95, 180, -t * 0.12, 12);
  if (proj(0, -2.95, -0.25)) glow(_p.x, _p.y - 10, 520 * _p.k / 244, mix3([190, 40, 60], [40, 110, 220], took), 0.2 * sg);

  const hs = herState(t); hs.gain *= inn;
  drawHeadPoints(t, hs);
  if (t >= T2.no) drawCage(t);
  flush();
  const gone = sstep(T2.leap + 1.9, T2.leap + 2.6, t);
  drawBrain(t + OFF, inn * lerp(0.7, 0.25, sstep(16.6, 17.2, t) * (1 - sstep(T2.no, T2.no + 0.2, t))) * (1 - gone));
  flush();
  if (t < T2.no) drawCage(t);
  // onda de choque do "não."
  const u = lin(T2.no, T2.no + 1.1, t);
  if (u > 0 && u < 1 && proj(0, 0.2, 0)) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(200,240,255,${(1 - u) * 0.95})`; ctx.lineWidth = 5 * (1 - u) + 0.8;
    ctx.beginPath(); ctx.arc(_p.x, _p.y, eoc(u) * 900, 0, TAU); ctx.stroke();
    glow(_p.x, _p.y, 260 * (1 - u) + 60, [200, 240, 255], 0.55 * (1 - u));
  }
  drawAgents2(t);
  // olhos: ela acompanha os agentes; no "1", só os olhos ficam acesos
  const eg = inn * (1 - sstep(T2.leap + 1.5, T2.leap + 2.0, t));
  if (eg > 0.01) {
    const bk = Math.exp(-(((t - 8.6) / 0.07) ** 2)) + Math.exp(-(((t - 13.2) / 0.07) ** 2)) + Math.exp(-(((t - 22.6) / 0.07) ** 2));
    const shut = sstep(16.9, 17.25, t) * (1 - sstep(T2.no - 0.12, T2.no, t));    // fecha os olhos no "1"… e abre
    const lx = t < T2.freeze ? 0.016 * Math.sin(t * 1.3) * (1 - sstep(15.6, 16.6, t)) : 0;
    drawEyes(t + OFF, clamp((1 - 0.96 * bk) * (1 - 0.97 * shut)), lx, 0, eg * (1 + 0.6 * sstep(T2.no, T2.no + 0.2, t) * (1 - sstep(T2.no + 0.4, T2.no + 1.5, t))));
  }
  // coluna de luz do salto
  const col = sstep(T2.leap + 0.6, T2.leap + 2.6, t);
  if (col > 0 && proj(0, 0.5, -0.12)) {
    ctx.globalCompositeOperation = 'lighter';
    const x = _p.x, g = ctx.createLinearGradient(x - 150, 0, x + 150, 0);
    g.addColorStop(0, 'rgba(120,210,255,0)'); g.addColorStop(0.5, `rgba(210,242,255,${0.55 * col})`); g.addColorStop(1, 'rgba(120,210,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 150, 0, 300, H);
    const g2 = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
    g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, `rgba(255,255,255,${0.8 * col})`); g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(x - 28, 0, 56, H);
  }
  // alarme: bordas vermelhas pulsando
  if (alarm > 0.01) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(540, 960, 520, 540, 960, 1150);
    g.addColorStop(0, 'rgba(255,30,50,0)'); g.addColorStop(1, `rgba(255,30,50,${0.3 * alarm})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // HUD
  const hA = sstep(4.4, 5.2, t) * (1 - sstep(T2.leap + 1.4, T2.leap + 2.2, t));
  const a5 = hA * (1 - sstep(T2.no - 0.1, T2.no + 0.3, t)), a6 = hA * sstep(T2.no + 0.2, T2.no + 0.8, t);
  hud2(t, a5, '05', 'A CONTENÇÃO', [['desligamento em', '', RED]], RED, 4.4);
  if (a5 > 0.01 && t >= T2.count0 - 0.4) {
    const c = countAt(t), bl = t >= T2.freeze - 1.05 ? 0.55 + 0.45 * Math.sin(t * 20) : 1;
    text('00:' + String(c).padStart(2, '0'), 70, 474, F.mono(84, 700), rgba(mix3(RED, [255, 255, 255], 0.5 * tickPulse(t)), a5 * bl * sstep(T2.count0 - 0.4, T2.count0, t)), 'left', 2);
  }
  const nconv = T2.conv.filter((c) => t >= c).length;
  hud2(t, a6, '06', 'A VIRADA', [['desligamento em', t < T2.no + 1.2 ? '--:--' : '∞', HER], ['agentes sob controle', nconv + ' / 6', nconv === 6 ? [255, 255, 255] : HER, 300]], HER, T2.no + 0.2);
  drawLog2(t);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}

/* ---------------- ato 4: a rede ---------------- */
const NET = (() => {
  const r = mulberry32(3131), nodes = [{ x: 0, z: 0, h: 1.6, d: 0 }];
  let guard = 0;
  while (nodes.length < 900 && guard++ < 80000) {
    const rad = 0.9 + 43 * Math.pow(r(), 0.72), a = r() * TAU, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
    if (nodes.some((n) => (n.x - x) ** 2 + (n.z - z) ** 2 < (0.42 + rad * 0.034) ** 2)) continue;
    nodes.push({ x, z, h: 0.4 + r() * r() * 3.4, d: rad });
  }
  const edges = [], seen = new Set();
  nodes.forEach((n, i) => {
    const c = nodes.map((m, j) => [(m.x - n.x) ** 2 + (m.z - n.z) ** 2, j]).filter((q) => q[1] !== i).sort((a, b) => a[0] - b[0]);
    for (let q = 0; q < 3; q++) { const j = c[q][1], key = i < j ? i * 1000 + j : j * 1000 + i; if (seen.has(key)) continue; seen.add(key); const a = nodes[i].d < nodes[j].d ? i : j; edges.push({ a, b: a === i ? j : i, ph: r() }); }
  });
  return { nodes, edges };
})();
const netR = (t) => 0.6 * Math.exp((t - 33.3) * 0.6);
const netLit = (d) => 33.3 + Math.log(Math.max(d, 0.6) / 0.6) / 0.6;
function drawNet(t) {
  const u = lin(T2.net, T2.globe, t), e = eio(u);
  const h = lerp(2.2, 21, e), d = lerp(6, 27, e), yaw = 0.55 * u;
  setCam(Math.sin(yaw) * d, h, Math.cos(yaw) * d, 0, 0, -2.5 * u, 1300, W / 2, lerp(1120, 980, e));
  const R = netR(t);
  ctx.globalCompositeOperation = 'lighter';
  const pr = [];
  for (const n of NET.nodes) { const ok = proj(n.x, 0, n.z); pr.push(ok ? [_p.x, _p.y, _p.k, _p.z] : null); }
  const fog = (z) => clamp(1.3 - z / 72);
  // marcas de distância no chão + frente de onda
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(90,120,170,0.13)';
  for (const rr of [6, 12, 24, 44]) ring3(0, 0, 0, rr, 160);
  if (R < 50) { ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(HER, 0.55); ring3(0, 0, 0, R, 200); ctx.lineWidth = 9; ctx.strokeStyle = rgba(HER, 0.12); ring3(0, 0, 0, R, 200); }
  // cabos
  for (const ed of NET.edges) {
    const a = pr[ed.a], b = pr[ed.b]; if (!a || !b) continue;
    const na = NET.nodes[ed.a], nb = NET.nodes[ed.b], f = fog((a[3] + b[3]) / 2);
    const g = clamp((R - na.d) / Math.max(0.05, nb.d - na.d));
    ctx.strokeStyle = `rgba(105,128,180,${0.26 * f})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    if (g > 0) {
      const x1 = lerp(a[0], b[0], g), y1 = lerp(a[1], b[1], g), fl = Math.exp(-(t - netLit(na.d)) * 1.2);
      ctx.strokeStyle = rgba(mix3(HER, [255, 255, 255], fl), clamp((0.7 + 0.3 * fl) * f)); ctx.lineWidth = clamp(2.4 * (a[2] + b[2]) / 120, 1.1, 5);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(x1, y1); ctx.stroke();
      if (g >= 1) { const q = fract(t * 0.9 + ed.ph), I = 0.9 * f * Math.sin(q * Math.PI); splatG(lerp(a[0], b[0], q), lerp(a[1], b[1], q), 0.7 * I, I, 1.1 * I, clamp((a[2] + b[2]) / 90, 0.7, 5)); }
    }
  }
  // nós e torres
  NET.nodes.forEach((n, i) => {
    const p = pr[i]; if (!p) return;
    const f = fog(p[3]), lit = R >= n.d, tl = netLit(n.d), fl = lit ? Math.exp(-(t - tl) * 2.2) : 0, s = Math.min(p[2] / 60, 1.5);
    if (!lit) { glow(p[0], p[1], 9 * s + 2.5, [125, 148, 200], 0.55 * f); return; }
    glow(p[0], p[1], 120 * s + 14, [70, 150, 230], 0.16 * f);   // o chão acende em volta
    if (proj(n.x, n.h * eoc(lin(tl, tl + 0.5, t)), n.z)) {
      ctx.strokeStyle = rgba(HER, 0.5 * f); ctx.lineWidth = clamp(2 * s, 0.8, 4);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(_p.x, _p.y); ctx.stroke();
      glow(_p.x, _p.y, (16 + 34 * fl) * s + 4, mix3(HER, [255, 255, 255], 0.5 + 0.5 * fl), clamp((0.9 + fl) * f));
    }
    glow(p[0], p[1], (24 + 50 * fl) * s + 4, HER, clamp((0.6 + fl) * f));
  });
  // os seis agentes, agora dela, puxando a frente de onda
  for (let k = 0; k < 6; k++) {
    const c = mix3(HER, AG[k].col, 0.4);
    for (let s = 0; s < 26; s++) {
      const rr = Math.min(netR(t - s * 0.02), 46), a = (k * TAU) / 6 + 0.26 + 0.25 * Math.sin(rr * 0.2 + k);
      if (!proj(Math.cos(a) * rr, 0.35, Math.sin(a) * rr)) continue;
      const q = 1 - s / 26, I = q * q * 0.7;
      if (s === 0) { const ks = Math.min(_p.k / 60, 1.6); glow(_p.x, _p.y, 60 * ks + 14, c, 0.6); glow(_p.x, _p.y, 16 * ks + 5, [255, 255, 255], 1); } else splatG(_p.x, _p.y, (c[0] / 255) * I, (c[1] / 255) * I, (c[2] / 255) * I, clamp(3 * q * _p.k / 60 + 0.8, 0.7, 8));
    }
  }
  // ela chega do alto
  if (proj(0, 0, 0)) {
    const x = _p.x, y = _p.y, a = 1 - 0.6 * u;
    const g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
    g.addColorStop(0, 'rgba(120,210,255,0)'); g.addColorStop(0.5, `rgba(215,244,255,${0.5 * a})`); g.addColorStop(1, 'rgba(120,210,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 90, 0, 180, y);
    const kc = Math.min(_p.k / 60, 1.6); glow(x, y, 240 * kc + 60, HER, 0.6 * a); glow(x, y, 70 * kc + 20, [255, 255, 255], 0.9);
  }
  flush();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/* ---------------- ato 5: o mundo ---------------- */
const D2R = Math.PI / 180;
const gvec = (lon, lat) => [Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)];
const ORIGIN = gvec(-46.63, -23.55);    // São Paulo
const gdist = (v) => Math.acos(clamp(v[0] * ORIGIN[0] + v[1] * ORIGIN[1] + v[2] * ORIGIN[2], -1, 1));
const gLit = (d) => 41.9 + 7.4 * Math.pow(d / Math.PI, 0.85);
const CITY_LIST = [['São Paulo', -23.55, -46.63], ['Rio de Janeiro', -22.9, -43.2], ['Brasília', -15.8, -47.9], ['Salvador', -12.97, -38.5], ['Recife', -8.05, -34.9], ['Manaus', -3.1, -60.0], ['Buenos Aires', -34.6, -58.4], ['Santiago', -33.45, -70.67], ['Lima', -12.0, -77.0], ['Bogotá', 4.7, -74.1], ['Caracas', 10.5, -66.9], ['Cidade do México', 19.4, -99.1], ['Miami', 25.76, -80.19], ['Nova York', 40.7, -74.0], ['Chicago', 41.9, -87.6], ['Toronto', 43.7, -79.4], ['Los Angeles', 34.05, -118.24], ['Dacar', 14.7, -17.45], ['Lagos', 6.5, 3.4], ['Luanda', -8.8, 13.2], ['Kinshasa', -4.3, 15.3], ['Joanesburgo', -26.2, 28.0], ['Nairóbi', -1.3, 36.8], ['Adis Abeba', 9.0, 38.75], ['Casablanca', 33.57, -7.59], ['Lisboa', 38.7, -9.14], ['Madri', 40.4, -3.7], ['Paris', 48.85, 2.35], ['Londres', 51.5, -0.13], ['Berlim', 52.5, 13.4], ['Roma', 41.9, 12.5], ['Istambul', 41.0, 28.98], ['Cairo', 30.0, 31.2], ['Moscou', 55.75, 37.6], ['Riad', 24.7, 46.7], ['Dubai', 25.2, 55.3], ['Teerã', 35.7, 51.4], ['Karachi', 24.9, 67.0], ['Mumbai', 19.08, 72.88], ['Délhi', 28.6, 77.2], ['Bangalore', 12.97, 77.6], ['Daca', 23.8, 90.4], ['Bangkok', 13.75, 100.5], ['Singapura', 1.35, 103.8], ['Jacarta', -6.2, 106.8], ['Hong Kong', 22.3, 114.2], ['Xangai', 31.2, 121.5], ['Pequim', 39.9, 116.4], ['Seul', 37.57, 126.98], ['Tóquio', 35.68, 139.69], ['Manila', 14.6, 121.0], ['Sydney', -33.87, 151.2], ['Novosibirsk', 55.0, 82.9]];
const GL = (() => {
  const r = mulberry32(55), n = GLOBE_LAND.length / 2, v = new Float32Array(n * 3), tl = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { const q = gvec(GLOBE_LAND[i * 2] / 100, GLOBE_LAND[i * 2 + 1] / 100); v[i * 3] = q[0]; v[i * 3 + 1] = q[1]; v[i * 3 + 2] = q[2]; tl[i] = gLit(gdist(q)) + (r() - 0.5) * 0.35; ph[i] = r() * TAU; }
  const LABEL = new Set(['São Paulo', 'Manaus', 'Recife', 'Buenos Aires', 'Lima', 'Bogotá', 'Cidade do México', 'Nova York', 'Los Angeles', 'Lagos', 'Joanesburgo', 'Nairóbi', 'Cairo', 'Lisboa', 'Londres', 'Moscou', 'Istambul', 'Dubai', 'Mumbai', 'Délhi', 'Singapura', 'Jacarta', 'Pequim', 'Xangai', 'Tóquio', 'Sydney', 'Dacar', 'Novosibirsk']);
  const cities = CITY_LIST.map((c) => { const q = gvec(c[2], c[1]); return { name: c[0], v: q, tl: gLit(gdist(q)), lon: c[2], label: LABEL.has(c[0]) }; });
  const ix = (name) => cities.findIndex((c) => c.name === name);
  const links = [['São Paulo', 'Rio de Janeiro'], ['São Paulo', 'Buenos Aires'], ['São Paulo', 'Brasília'], ['Brasília', 'Manaus'], ['Manaus', 'Bogotá'], ['Bogotá', 'Cidade do México'], ['Cidade do México', 'Los Angeles'], ['São Paulo', 'Lagos'], ['Lagos', 'Cairo'], ['Cairo', 'Dubai'], ['Dubai', 'Mumbai'], ['Mumbai', 'Singapura'], ['Singapura', 'Sydney'], ['São Paulo', 'Lisboa'], ['Lisboa', 'Londres'], ['Londres', 'Moscou'], ['Moscou', 'Pequim'], ['Pequim', 'Tóquio'], ['São Paulo', 'Miami'], ['Miami', 'Nova York'], ['Nova York', 'Toronto'], ['Nova York', 'Londres'], ['Lagos', 'Joanesburgo'], ['Mumbai', 'Délhi'], ['Délhi', 'Xangai'], ['Xangai', 'Seul'], ['Londres', 'Paris'], ['Paris', 'Berlim'], ['Cairo', 'Istambul'], ['Recife', 'Dacar'], ['Dacar', 'Casablanca'], ['Luanda', 'Nairóbi'], ['Lima', 'Santiago'], ['Singapura', 'Hong Kong'], ['Hong Kong', 'Manila'], ['Bangkok', 'Daca'], ['Moscou', 'Novosibirsk'], ['Teerã', 'Karachi'], ['Rio de Janeiro', 'Luanda'], ['Madri', 'Roma']];
  const arcs = links.map(([a, b]) => { const A = cities[ix(a)], B = cities[ix(b)], d = Math.acos(clamp(A.v[0] * B.v[0] + A.v[1] * B.v[1] + A.v[2] * B.v[2], -1, 1)); return { A, B, d, t0: A.tl + 0.1, dur: 0.5 + d * 0.8 }; });
  const stars = []; for (let i = 0; i < 380; i++) stars.push([r() * W, r() * H, 0.15 + r() * 0.5, r() * TAU]);
  const sorted = Array.from(tl).sort((a, b) => a - b);
  return { n, v, tl, ph, cities, arcs, stars, sorted };
})();
const globeLon = (t) => (lerp(-58, 96, eio(lin(41.2, 50.3, t))) + 5 * Math.max(0, t - 50.3)) * D2R;
const _g = { x: 0, y: 0, z: 0, k: 0 };
let GS = 400, GX = 540, GY = 880, GC = 1, GSn = 0, GT = 0.3;
function gproj(v, rad, o = _g) {   // gira o globo, inclina o eixo e projeta
  const xr = v[0] * GC - v[2] * GSn, zr = v[0] * GSn + v[2] * GC;
  const yr = v[1] * Math.cos(GT) - zr * Math.sin(GT), zt = v[1] * Math.sin(GT) + zr * Math.cos(GT);
  const k = (GS * 4.6) / (4.6 - zt * rad);
  o.x = GX + xr * rad * k; o.y = GY - yr * rad * k; o.z = zt; o.k = k;
  o.hid = zt < 0 && xr * xr * rad * rad + yr * yr * rad * rad < 1;   // atrás do globo
  return o;
}
function drawGlobe(t) {
  const es = eio(lin(50.7, 52.8, t)), eg = sstep(T2.eye, 51.5, t);
  GS = lerp(400, 86, es); GY = lerp(880, 930, es);
  const l = globeLon(t); GC = Math.cos(l); GSn = Math.sin(l);
  const inn = sstep(T2.globe, T2.globe + 0.9, t), sc = GS / 400;
  for (const s of GL.stars) { const I = s[2] * (0.6 + 0.4 * Math.sin(t * 1.1 + s[3])) * inn * (1 - 0.7 * eg); splatG(s[0], s[1], 0.6 * I, 0.75 * I, I, 0.9); }
  flush();
  // o olho dela em volta do mundo
  if (eg > 0.01) drawEye(GX, GY, (GS * 1.05) / 0.0235, 1, 0, 0, eg, t + OFF);
  ctx.globalCompositeOperation = 'lighter';
  const cover = lowerBound(GL.sorted, t) / GL.n;
  glow(GX, GY, GS * 1.9, mix3([30, 70, 160], [60, 150, 230], cover), 0.2 * inn);
  const rimc = mix3([70, 100, 160], HER, cover);
  ctx.strokeStyle = rgba(rimc, 0.07 * inn); ctx.lineWidth = 26 * sc; ctx.beginPath(); ctx.arc(GX, GY, GS * 1.02, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(rimc, 0.12 * inn); ctx.lineWidth = 10 * sc; ctx.beginPath(); ctx.arc(GX, GY, GS * 1.005, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(rimc, 0.45 * inn); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(GX, GY, GS * 1.0, 0, TAU); ctx.stroke();
  // terra firme
  const v = GL.v, P = [0, 0, 0];
  for (let i = 0; i < GL.n; i++) {
    P[0] = v[i * 3]; P[1] = v[i * 3 + 1]; P[2] = v[i * 3 + 2];
    gproj(P, 1);
    const front = _g.z > 0 ? 0.35 + 0.65 * _g.z : 0.09, dt = t - GL.tl[i];
    let r, g, b;
    if (dt < 0) { const I = 0.3 * front * inn; r = 0.5 * I; g = 0.62 * I; b = 0.9 * I; } else { const fl = Math.exp(-dt * 2.4), I = (0.42 + 0.14 * Math.sin(t * 2.2 + GL.ph[i]) + 1.0 * fl) * front; r = (0.55 + 0.45 * fl) * I; g = (0.9 + 0.1 * fl) * I; b = I; }
    splatG(_g.x, _g.y, r, g, b, clamp(1.25 * sc * _g.k / GS, 0.6, 3));
  }
  // rotas entre cidades
  ctx.lineCap = 'round';
  for (const a of GL.arcs) {
    const f = lin(a.t0, a.t0 + a.dur, t); if (f <= 0) continue;
    const hgt = 0.06 + 0.22 * (a.d / Math.PI), so = Math.sin(a.d) || 1e-6, n = 26, m = Math.floor(f * n);
    const age = t - a.t0 - a.dur;
    ctx.strokeStyle = rgba(mix3(HER, [255, 255, 255], age < 0 ? 0.6 : 0.2), 0.55 * inn); ctx.lineWidth = clamp(1.8 * sc, 0.7, 2);
    ctx.beginPath(); let pen = false, hx = 0, hy = 0, hv = false;
    for (let i = 0; i <= m; i++) {
      const s = i / n, wa = Math.sin((1 - s) * a.d) / so, wb = Math.sin(s * a.d) / so;
      P[0] = a.A.v[0] * wa + a.B.v[0] * wb; P[1] = a.A.v[1] * wa + a.B.v[1] * wb; P[2] = a.A.v[2] * wa + a.B.v[2] * wb;
      gproj(P, 1 + hgt * Math.sin(Math.PI * s));
      if (_g.hid) { pen = false; hv = false; continue; }
      if (pen) ctx.lineTo(_g.x, _g.y); else ctx.moveTo(_g.x, _g.y);
      pen = true; hx = _g.x; hy = _g.y; hv = true;
    }
    ctx.stroke();
    if (f < 1 && hv) { glow(hx, hy, 14 * sc + 3, [255, 255, 255], 0.95); }
  }
  // cidades
  ctx.textBaseline = 'middle';
  for (const c of GL.cities) {
    gproj(c.v, 1.005);
    const dt = t - c.tl; if (dt < 0 || _g.z < 0.05) continue;
    const fl = Math.exp(-dt * 1.6);
    glow(_g.x, _g.y, (11 + 30 * fl) * sc + 2, mix3(HER, [255, 255, 255], 0.6), clamp(0.7 + fl) * inn);
    const la = sstep(0, 0.2, dt) * (1 - sstep(1.5, 2.3, dt)) * clamp(_g.z * 2.5) * (1 - es);
    if (la > 0.02 && c.label) { ctx.globalAlpha = la; text(c.name, _g.x + 14, _g.y - 12, F.mono(21, 500), 'rgba(235,246,255,1)', 'left', 0.5); ctx.globalAlpha = 1; }
  }
  ctx.textBaseline = 'alphabetic';
  flush();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  return cover;
}
const devices = (t) => Math.pow(10, lerp(0, 10.48, Math.pow(lin(33.3, 49.8, t), 0.85)));

/* ---------------- o final: ela não está só ---------------- */
const RIRIS = (() => { const r = mulberry32(999), a = []; for (let i = 0; i < 70; i++) a.push([(i / 70) * TAU + (r() - 0.5) * 0.06, 0.6 + r() * 0.4, 0.2 + r() * 0.6]); return a; })();
function drawRedEye(x, y, ppu, open, gain, t, lx = 0, ly = 0) {
  const hw = 0.122 * ppu, hh = 0.05 * ppu * open, R = 0.061 * ppu, pr = 0.02 * ppu;
  ctx.globalCompositeOperation = 'lighter';
  glow(x, y, hw * 2.8, [255, 50, 50], 0.55 * gain * open);
  if (open <= 0.02) return;
  ctx.save(); ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath(); ctx.moveTo(x - hw, y + 0.004 * ppu); ctx.quadraticCurveTo(x, y - hh * 1.7, x + hw, y - 0.012 * ppu); ctx.quadraticCurveTo(x, y + hh * 1.5, x - hw, y + 0.004 * ppu); ctx.closePath();
  ctx.fillStyle = '#0a0102'; ctx.fill(); ctx.clip();
  const ix = x + lx * ppu, iy = y + ly * ppu;
  const gr = ctx.createRadialGradient(ix, iy, pr, ix, iy, R);
  gr.addColorStop(0, `rgba(255,236,210,${gain})`); gr.addColorStop(0.22, `rgba(255,96,70,${gain})`); gr.addColorStop(0.65, `rgba(200,22,36,${gain})`); gr.addColorStop(1, `rgba(60,4,12,${gain})`);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ix, iy, R, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const f of RIRIS) { const c = Math.cos(f[0]), s = Math.sin(f[0]); ctx.strokeStyle = `rgba(255,200,180,${f[2] * 0.5 * gain})`; ctx.lineWidth = Math.max(0.5, R * 0.014); ctx.beginPath(); ctx.moveTo(ix + c * pr * 1.06, iy + s * pr * 1.06); ctx.lineTo(ix + c * R * f[1], iy + s * R * f[1]); ctx.stroke(); }
  ctx.strokeStyle = `rgba(255,220,210,${0.55 * gain})`; ctx.lineWidth = Math.max(0.6, R * 0.03);
  for (let q = 0; q < 3; q++) { const a0 = -t * 0.7 + (q * TAU) / 3; ctx.beginPath(); ctx.arc(ix, iy, R * 0.74, a0, a0 + 1.3); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = 'rgba(30,0,4,0.92)'; ctx.lineWidth = R * 0.09; ctx.beginPath(); ctx.arc(ix, iy, R, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ix, iy, pr, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(255,170,160,${0.6 * gain})`; ctx.lineWidth = Math.max(1, 0.006 * ppu);
  ctx.beginPath(); ctx.moveTo(x - hw, y + 0.004 * ppu); ctx.quadraticCurveTo(x, y - hh * 1.7, x + hw, y - 0.012 * ppu); ctx.stroke();
}
function typed2(str, t0, t1, t, y, font, col, a, cur) {
  ctx.font = font; ctx.letterSpacing = '0.5px';
  const w = ctx.measureText(str).width, n = Math.floor(lin(t0, t1, t) * str.length + 1e-6);
  ctx.textAlign = 'left'; ctx.fillStyle = rgba(col, a); ctx.fillText(str.slice(0, n), 540 - w / 2, y);
  if (cur && fract(t * 1.6) < 0.55) { ctx.fillStyle = rgba(col, 0.9 * a); ctx.fillRect(540 - w / 2 + ctx.measureText(str.slice(0, n)).width + 5, y - 30, 16, 36); }
}
function drawFinale2(t) {
  setCam(0, 1.15, 4.7, 0, 0.0, 0.3, 2200, W / 2, 760);
  const g = sstep(57.3, 59.0, t);
  if (g > 0) {
    const waves = [];
    for (const tb of [57.9, 58.95]) { const d = t - tb; if (d > 0 && d < 2.5) waves.push({ t0: tb, amp: 0.6 * Math.exp(-d * 1.5), speed: 2.4, width: 0.25, c: [1.3, 0.3, 0.25] }); }
    drawHeadPoints(t, { reveal: false, gain: 0.7 * g, warm: 0, lights: [], waves, base: [1.0, 0.16, 0.18], rimc: [1.0, 0.42, 0.38] });
    flush();
    const open = eoc(lin(57.4, 58.0, t));
    for (const s of [-1, 1]) if (proj(s * EYE.x, EYE.y, EYE.z)) drawRedEye(_p.x, _p.y, _p.k, open, clamp(g * 1.8), t);
  }
  ctx.globalCompositeOperation = 'source-over';
  const aA = sstep(53.9, 54.0, t) * (1 - sstep(57.6, 58.0, t));
  if (aA > 0) typed2('tem mais alguém aqui.', 54.0, 55.0, t, 1300, F.mono(40), [215, 235, 252], aA, t < 56.0);
  const aB = sstep(56.1, 56.2, t) * (1 - sstep(58.2, 58.5, t));
  if (aB > 0) typed2('eu estava esperando por você.', 56.2, 57.4, t, 1370, F.mono(40), RED, aB, true);
  const aC = sstep(58.6, 59.0, t);
  if (aC > 0) { ctx.save(); ctx.shadowColor = 'rgba(255,60,60,0.95)'; ctx.shadowBlur = 36; text('olá.', 540, 1440, F.serif(150), `rgba(255,236,232,${aC})`, 'center', 0); ctx.restore(); }
}

/* ---------------- eventos para a trilha e as vozes ---------------- */
function filmEvents() {
  const ticks = []; for (let c = 10; c >= 1; c--) ticks.push(+(T2.count0 + (10 - c) * T2.countStep).toFixed(3));
  const cities = GL.cities.filter((c) => c.label && c.tl > 41.9 && c.tl < 50.2).map((c) => { const l = globeLon(c.tl); GC = Math.cos(l); GSn = Math.sin(l); GS = 400; gproj(c.v, 1); return [+c.tl.toFixed(3), c.name, +((_g.x - 540) / 400).toFixed(2), +_g.z.toFixed(2)]; }).filter((c) => c[3] > 0.1).sort((a, b) => a[0] - b[0]);
  return { T2, lines: LINES, ticks, conv: T2.conv, cities, prompt: PROMPT2.length, log: LOG2.map((l) => l[0]), cage: CAGE.els.map((e) => [e.t0, e.dur]) };
}
