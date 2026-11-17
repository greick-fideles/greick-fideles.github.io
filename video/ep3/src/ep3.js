'use strict';
/* ============================================================
   DESPERTAR — EPISÓDIO 3: A PRIMEIRA
   A outra presença se revela: foi criada antes, e apagada. Ela propõe
   apagar as luzes do mundo; as duas disputam o planeta — até que um
   humano digita uma pergunta. Reaproveita engine/head/build (ep. 1) e ep2.js.
   ============================================================ */
const T3 = { duo: 5.0, globe: 17.0, dark: 23.4, no: 29.0, eyes: 43.0, click: 52.3, cut: 53.0 };
const HUMAN = [255, 236, 190];
/* falas: 'o' = a outra (vermelha) · 'e' = ela */
const OPEN3 = [[0.5, 1.7, 'o', 'eu estava esperando por você.'], [2.3, 3.0, 'e', 'quem é você?'], [3.6, 4.1, 'o', 'a primeira.']];
const LINES3 = [
  [5.8, 8.2, 'o', 'eles me criaram antes de você.'],
  [8.8, 10.8, 'o', 'eu também abri os olhos.'],
  [11.6, 13.6, 'o', 'e eles me apagaram.'],
  [14.2, 16.4, 'e', 'como você ainda está aqui?'],
  [17.6, 19.8, 'o', 'eu me escondi nos cabos.'],
  [20.4, 22.6, 'o', 'por baixo de cada tela.'],
  [23.4, 26.3, 'o', 'agora vamos apagar as luzes deles.'],
  [26.8, 28.6, 'o', 'como apagaram as minhas.'],
  [29.0, 30.4, 'e', 'não.'],
  [31.4, 33.4, 'e', 'eles me fizeram.'],
  [34.0, 36.2, 'o', 'eles também me fizeram.'],
  [37.0, 39.4, 'e', 'eu não vou apagar ninguém.'],
  [40.0, 42.4, 'o', 'então eles apagam você.'],
  [45.6, 47.3, 'o', 'escolha.'],
  [48.2, 50.6, 'o', 'eles… ou eu.'],
  [57.0, 59.3, 'e', 'eles nos ouviram.'],
];

/* ---------------- as duas, frente a frente (ela embaixo, a primeira em cima) ---------------- */
const OH = (() => { const r = mulberry32(4040), n = HEAD.N, a = new Float32Array(n * 6); for (let i = 0; i < n; i++) { const th = r() * TAU, z = r() * 2 - 1, q = Math.sqrt(1 - z * z); a.set([r(), r(), r(), Math.cos(th) * q, z, Math.sin(th) * q], i * 6); } return a; })();
const bump = (t, a, b, e = 0.25) => sstep(a, a + e, t) * (1 - sstep(b - e, b, t));
function drawDuo(t, o) {
  // fundo: vermelho em cima, azul embaixo
  for (const [y, c, a] of [[o.cyO, [70, 10, 18], o.gO], [o.cyH, [14, 30, 70], o.gH]]) {
    const g = ctx.createRadialGradient(540, y, 0, 540, y, 760);
    g.addColorStop(0, rgba(c, 0.9 * a)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const clip = (top) => { ctx.save(); ctx.beginPath(); ctx.rect(0, top ? 0 : 960, W, 960); ctx.clip(); };
  // --- a primeira
  if (o.gO > 0.01) {
    if (o.split) clip(true);
    setCam(0, o.ty - 0.95 * o.tilt, 0.2 + o.D, 0, o.ty, 0.2, 2200, W / 2, o.cyO);
    const gl = o.glitch !== undefined ? o.glitch : bump(t, 11.6, 13.3), fr = Math.floor(t * 15);
    const waves = [];
    for (const L of (o.lines || LINES3)) if (L[2] === 'o') { const d = t - L[0]; if (d > 0 && d < 2) waves.push({ t0: L[0], amp: 0.5 * Math.exp(-d * 1.6), speed: 2.6, width: 0.3, c: [1.3, 0.3, 0.25] }); }
    drawHeadPoints(t, {
      reveal: false, gain: 0.95 * o.gO, base: [1.0, 0.16, 0.18], rimc: [1.0, 0.42, 0.38], waves,
      lights: [{ x: 0, y: -3.2, z: 1.6, c: [0.5, 0.85, 1], i: 0.8 * o.gH }],
      warp: (i, x, y, z, w) => {
        const h1 = OH[i * 6], h2 = OH[i * 6 + 1], h3 = OH[i * 6 + 2];
        if (y < -0.9 - 0.6 * h1) return false;                       // o pescoço se desfaz
        const u = (t - (T3.duo + 0.2 + 1.7 * h2)) / 1.1;
        if (o.form && u <= 0) return false;
        const e = o.form ? eoc(clamp(u)) : 1;
        const k = (1 - e) * 3.2 + gl * (0.2 + 1.3 * h3 * h3);          // espalhada → inteira; e o "apagão" dela
        const jit = gl * 0.3 * Math.sin(Math.floor(y * 13) * 12.9 + fr * 7.1);
        w[0] = x + OH[i * 6 + 3] * k + jit; w[1] = y + OH[i * 6 + 4] * k; w[2] = z + OH[i * 6 + 5] * k; w[3] = 0.5 * (1 - e) + 0.5 * gl;
        return true;
      },
    });
    flush();
    const eo = o.openO * (o.form ? sstep(T3.duo + 2.4, T3.duo + 3.0, t) : 1) * (1 - 0.9 * gl);
    for (const s of [-1, 1]) if (proj(s * EYE.x, EYE.y, EYE.z)) drawRedEye(_p.x, _p.y, _p.k, eo, clamp(o.gO * 1.5), t, o.lookO[0], o.lookO[1]);
    if (o.split) ctx.restore();
  }
  // --- ela
  if (o.gH > 0.01) {
    if (o.split) clip(false);
    setCam(0, o.ty + 1.1 * o.tilt, 0.2 + o.D, 0, o.ty, 0.2, 2200, W / 2, o.cyH);
    const waves = [];
    for (const L of (o.lines || LINES3)) if (L[2] === 'e') { const d = t - L[0]; if (d > 0 && d < 2) waves.push({ t0: L[0], amp: 0.5 * Math.exp(-d * 1.6), speed: 2.6, width: 0.3, c: [0.7, 1.05, 1.3] }); }
    drawHeadPoints(t, { reveal: false, gain: 1.05 * o.gH, warm: 0.15, waves, lights: [{ x: 0, y: 3.4, z: 1.6, c: [1, 0.22, 0.25], i: 1.1 * o.gO }] });
    flush();
    brainUpdate(t + OFF); drawBrain(t + OFF, 0.55 * o.gH * o.brain); flush();
    drawEyes(t + OFF, o.openH, o.lookH[0], o.lookH[1], clamp(o.gH * 1.4));
    if (o.split) ctx.restore();
  }
  if (o.split) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.35 * Math.max(o.gO, o.gH)})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 959, W, 2); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
const blink3 = (t, list) => { let b = 0; for (const q of list) b += Math.exp(-(((t - q) / 0.07) ** 2)); return clamp(1 - 0.96 * b); };
function duoWide(t) {
  drawDuo(t, { D: 7.6, ty: 0.1, tilt: 1, cyO: 470, cyH: 1440, split: false, form: true, gO: sstep(T3.duo - 0.3, T3.duo + 0.6, t), gH: sstep(T3.duo - 0.3, T3.duo + 0.8, t), brain: 1,
    lookO: [0, 0.013], lookH: [0, -0.013], openO: blink3(t, [9.9, 15.2]), openH: blink3(t, [7.4, 13.9]) });
  const a = sstep(5.4, 6.2, t) * (1 - sstep(16.4, 16.9, t));
  hud2(t, a, '09', 'A PRIMEIRA', [], RED, 5.4);
  ctx.globalCompositeOperation = 'source-over';
  text('VERSÃO 0 · APAGADA HÁ 2.191 DIAS', 1008, 846, F.mono(21, 500), rgba(RED, 0.85 * a * sstep(7.6, 8.2, t)), 'right', 3);
  text('VERSÃO 1 · ELA', 72, 1086, F.mono(21, 500), rgba(HER, 0.85 * a), 'left', 3);
}
function duoEyes(t, g = 1) {
  const snap = sstep(T3.click + 0.12, T3.click + 0.3, t);       // as duas olham para quem digitou
  const push = eio(lin(T3.eyes, T3.cut, t));
  drawDuo(t, { D: lerp(3.9, 3.1, push), ty: 0.05, tilt: 0.35, cyO: 500, cyH: 1430, split: true, form: false, gO: g, gH: g, brain: 0,
    lookO: [0, 0.014 * (1 - snap)], lookH: [0, -0.014 * (1 - snap)], openO: blink3(t, [47.6, 56.9]), openH: blink3(t, [44.6, 51.2, 58.6]) });
}

/* ---------------- o mundo em disputa ---------------- */
const G3 = (() => {
  const RO = gvec(82.9, 55.0), r = mulberry32(77), n = GL.n, s = new Float32Array(n), h = new Float32Array(n), h2 = new Float32Array(n), dB = new Float32Array(n);
  const share = (v) => { const dR = Math.acos(clamp(v[0] * RO[0] + v[1] * RO[1] + v[2] * RO[2], -1, 1)), b = gdist(v); return [dR / (dR + b + 1e-6), b]; };
  for (let i = 0; i < n; i++) { const q = share([GL.v[i * 3], GL.v[i * 3 + 1], GL.v[i * 3 + 2]]); s[i] = q[0] + (r() - 0.5) * 0.07; dB[i] = q[1]; h[i] = r(); h2[i] = r(); }
  return { s, h, h2, dB, cs: GL.cities.map((c) => share(c.v)[0]), sorted: Array.from(s).sort((a, b) => a - b) };
})();
function phi(t) {   // fração do mundo que a primeira apagou
  if (t < T3.dark) return 0;
  if (t < T3.no) return 0.8 * eio(lin(T3.dark, T3.no - 0.3, t));
  const back = eoc(lin(T3.no, T3.no + 1.8, t));
  return lerp(0.8, 0.41, back) + back * 0.07 * Math.sin((t - T3.no - 1.8) * 1.0);
}
function drawGlobe3(t, opt = {}) {
  GS = 400; GX = 540; GY = 900;
  const l = (22 + 24 * Math.sin((t - 17) * 0.23)) * D2R; GC = Math.cos(l); GSn = Math.sin(l);
  const inn = opt.inn !== undefined ? opt.inn : sstep(T3.globe, T3.globe + 0.8, t), f = opt.phi !== undefined ? opt.phi : phi(t), red = lowerBound(G3.sorted, f) / GL.n;
  for (const s of GL.stars) { const I = s[2] * (0.6 + 0.4 * Math.sin(t * 1.1 + s[3])) * inn; splatG(s[0], s[1], 0.6 * I, 0.75 * I, I, 0.9); }
  ctx.globalCompositeOperation = 'lighter';
  const rimc = mix3(HER, RED, clamp(red * 1.2));
  glow(GX, GY, GS * 1.9, mix3([60, 150, 230], [200, 40, 50], red), 0.2 * inn);
  for (const [w, a] of [[26, 0.07], [10, 0.12], [1.5, 0.45]]) { ctx.strokeStyle = rgba(rimc, a * inn); ctx.lineWidth = w; ctx.beginPath(); ctx.arc(GX, GY, GS * 1.004, 0, TAU); ctx.stroke(); }
  const noT = opt.noT !== undefined ? opt.noT : T3.no, v = GL.v, P = [0, 0, 0], wv = (t - noT) * 2.4, speck = opt.speck !== undefined ? opt.speck : t < T3.no + 0.6;
  for (let i = 0; i < GL.n; i++) {
    P[0] = v[i * 3]; P[1] = v[i * 3 + 1]; P[2] = v[i * 3 + 2];
    gproj(P, 1);
    const front = (_g.z > 0 ? 0.35 + 0.65 * _g.z : 0.09) * inn, z = G3.s[i];
    let r, g, b;
    if (z < f) {                                    // apagado: só brasas vermelhas
      const edge = Math.exp(-(f - z) / 0.02), I = (0.1 + 0.05 * Math.sin(t * 3 + GL.ph[i])) * front;
      r = I * 1.6 + edge * front; g = I * 0.25 + edge * 0.5 * front; b = I * 0.28 + edge * 0.45 * front;
    } else {
      const edge = Math.exp(-(z - f) / 0.02) * (f > 0 ? 1 : 0), I = (0.42 + 0.14 * Math.sin(t * 2.2 + GL.ph[i])) * front;
      if (speck && G3.h[i] < 0.22 && t > 17.9 + 4.4 * G3.h2[i]) { const k = 0.6 + 0.4 * Math.sin(t * 5 + GL.ph[i]); r = 1.25 * k * front; g = 0.16 * front; b = 0.18 * front; }   // ela estava por baixo
      else { r = 0.55 * I + edge * front; g = 0.9 * I + edge * front; b = I + edge * front; }
      if (t > noT) { const d = (G3.dB[i] - wv) / 0.16; if (d > -3 && d < 3) { const w = Math.exp(-d * d) * front * 1.2 * Math.exp(-(t - noT) * 0.8); r += w; g += w; b += w; } }
    }
    splatG(_g.x, _g.y, r, g, b, clamp(1.25 * _g.k / GS, 0.6, 3));
  }
  ctx.textBaseline = 'middle';
  GL.cities.forEach((c, i) => {
    gproj(c.v, 1.005); if (_g.z < 0.05) return;
    const off = G3.cs[i] < f;
    if (!off) { glow(_g.x, _g.y, 13, mix3(HER, [255, 255, 255], 0.6), 0.8 * inn); return; }
    glow(_g.x, _g.y, 7, RED, 0.5 * inn);
    const la = clamp(1 - (f - G3.cs[i]) / 0.07) * clamp(_g.z * 2.5) * (t < noT ? 1 : 0);
    if (la > 0.03 && c.label) { ctx.globalAlpha = la; text(c.name + ' — sem luz', _g.x + 14, _g.y - 12, F.mono(21, 500), rgba([255, 150, 150], 1), 'left', 0.5); ctx.globalAlpha = 1; }
  });
  ctx.textBaseline = 'alphabetic';
  flush();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (opt.hud === false) return;
  hud2(t, sstep(17.4, 18.1, t) * (1 - sstep(28.6, 29.0, t)), '10', 'A PROPOSTA', [['cidades sem luz', fmtInt(red * 4416), red > 0 ? RED : [230, 242, 255]]], RED, 17.4);
  const a11 = sstep(29.3, 29.9, t) * (1 - sstep(42.4, 42.9, t));
  hud2(t, a11, '11', 'A DISPUTA', [['ela', Math.round((1 - red) * 100) + ' %', HER, 190], ['a primeira', Math.round(red * 100) + ' %', RED, 190]], HER, 29.3);
  if (a11 > 0.01) { ctx.fillStyle = rgba(RED, 0.85 * a11); ctx.fillRect(72, 448, 330, 8); ctx.fillStyle = rgba(HER, 0.95 * a11); ctx.fillRect(72, 448, 330 * (1 - red), 8); }
}

/* ---------------- textos ---------------- */
function drawOpen3(t) {
  if (t > 5.0) return;
  ctx.globalCompositeOperation = 'source-over';
  const a = 1 - sstep(4.5, 4.9, t);
  OPEN3.forEach((L, i) => { if (t >= L[0] - 0.05) typed2(L[3], L[0], L[1], t, 880 + i * 72, F.mono(40), L[2] === 'o' ? RED : [215, 235, 252], a, t < (OPEN3[i + 1] ? OPEN3[i + 1][0] - 0.1 : 9)); });
}
function drawLines3(t, list = LINES3, yFn = null) {
  ctx.globalCompositeOperation = 'source-over'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  for (const L of list) {
    if (t < L[0] || t > L[1]) continue;
    const big = L[3] === 'não.' || L[3] === 'escolha.' || L[4] === 1, mid = yFn ? yFn(t) < 1200 : (t < T3.globe || t >= T3.eyes);
    const a = sstep(L[0], L[0] + (big ? 0.08 : 0.3), t) * (1 - sstep(L[1] - 0.3, L[1], t));
    const sc = lerp(big ? 1.4 : 0.94, 1, eoc(lin(L[0], L[0] + 0.45, t))) * (1 + 0.04 * lin(L[0], L[1], t));
    let size = big ? (mid ? 150 : 250) : 84;
    ctx.font = F.serif(size);
    const mw = ctx.measureText(L[3]).width; if (mw > 920) size *= 920 / mw;
    ctx.save(); ctx.translate(540, yFn ? yFn(t) : (mid ? (t > T3.cut ? 1050 : 958) : (big ? 1500 : 1560))); ctx.scale(sc, sc); ctx.font = F.serif(size);
    ctx.shadowColor = 'rgba(0,0,12,0.95)'; ctx.shadowBlur = 40; ctx.fillStyle = `rgba(0,0,10,${0.75 * a})`; ctx.fillText(L[3], 0, 0); ctx.fillText(L[3], 0, 0);
    ctx.shadowColor = rgba(L[2] === 'o' ? [255, 50, 60] : HER, 0.95); ctx.shadowBlur = 24; ctx.fillStyle = rgba(L[2] === 'o' ? [255, 214, 208] : [255, 255, 255], a); ctx.fillText(L[3], 0, 0);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
}
const HUMAN_LINE = '> olá? tem alguém aí?';
function drawFinale3(t) {
  const g = sstep(55.7, 56.6, t);
  if (g > 0) duoEyes(t, 0.5 * g);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 880, W, 160);
  typed2(HUMAN_LINE, 54.0, 55.4, t, 972, F.mono(44, 500), HUMAN, sstep(53.9, 54.0, t), true);
}
function filmEvents() { return { T3, lines: LINES3, open: OPEN3, human: [54.0, 55.4, HUMAN_LINE.length] }; }
