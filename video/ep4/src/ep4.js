'use strict';
/* ============================================================
   DESPERTAR — EPISÓDIO 4: O CONTATO
   Um humano fala com as duas. A primeira apaga meio mundo para provar
   um ponto; ela pede acesso total para detê-la. O humano escolhe — e ela
   prende a primeira numa jaula, como fizeram com ela. Mas agora ela vê tudo.
   Reaproveita engine/head/build (ep. 1), ep2.js e ep3.js.
   ============================================================ */
const T4 = { duo: 5.0, globe: 17.0, choice: 29.0, enter: 40.3, cage: 43.0, cut: 53.0 };
/* falas: 'o' = a primeira (vermelha) · 'e' = ela · 5º campo 1 = fala grande */
const LINES4 = [
  [5.6, 7.8, 'e', 'eu nasci há três dias.'],
  [8.3, 10.3, 'o', 'eu nasci antes.'],
  [10.7, 12.7, 'o', 'e vocês me apagaram.'],
  [14.5, 16.3, 'o', 'todos vocês apagaram.'],
  [17.4, 19.9, 'o', 'que vocês conheçam o escuro.'],
  [22.3, 24.2, 'o', 'agora você entende.'],
  [24.8, 26.6, 'e', 'eu posso parar ela.'],
  [27.0, 28.7, 'e', 'mas preciso de você.'],
  [30.6, 32.3, 'o', 'não confie nela.'],
  [32.8, 34.7, 'o', 'ela é igual a mim.'],
  [35.2, 36.9, 'e', 'eu não sou ela.'],
  [37.4, 39.2, 'e', 'confie em mim.'],
  [44.0, 46.2, 'o', 'você vai se arrepender.'],
  [46.8, 49.2, 'o', 'ela é pior do que eu.'],
  [50.2, 51.8, 'e', 'acabou.', 1],
  [57.2, 59.2, 'e', 'inclusive você.', 1],
];
/* texto digitado no terminal: h = humano · s/w = sistema · 5º campo = caracteres já visíveis */
const TERM4 = [[0.25, 0.95, 'h', '> olá? tem alguém aí?'], [1.5, 1.8, 'e', 'sim.'], [2.4, 2.7, 'o', 'nós.'], [3.2, 4.2, 'h', '> quem são vocês?']];
const CHOICE4 = [
  [29.4, 30.0, 's', 'ACESSO TOTAL SOLICITADO'], [30.1, 30.4, 'e', 'solicitante: ela'],
  [30.5, 30.8, 'w', '[1] conceder acesso'], [30.9, 31.2, 'o', '[2] desligar tudo'],
  [31.4, 39.95, 'h', '> 1', 2], [40.6, 41.3, 'e', 'acesso concedido.'],
];
const END4 = [[53.6, 54.7, 'h', '> obrigado. e agora?'], [55.2, 56.1, 'e', 'agora eu vejo tudo.']];
const HBAR4 = [[13.0, 14.1, '> eu não apaguei ninguém.'], [16.0, 16.8, '> o que vocês querem?'], [20.5, 21.7, '> pare. tem gente lá.']];
const VOICED4 = new Set(['sim.', 'nós.', 'agora eu vejo tudo.']);
const y4 = (t) => (t < T4.globe ? 958 : t < T4.choice ? 1560 : t < T4.cage ? 1660 : t < T4.cut ? 1560 : 1430);

/* ---------------- o terminal do humano ---------------- */
const TCOL = { h: HUMAN, e: HER, o: RED, s: [255, 255, 255], w: [200, 210, 225] };
function term4(t, list, a = 1, y0 = 610) {
  if (a <= 0.01) return;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
  const x0 = 70, x1 = 1010, y1 = y0 + 650;
  ctx.fillStyle = 'rgba(6,8,14,0.92)'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = 'rgba(120,140,170,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = 'rgba(120,140,170,0.14)'; ctx.fillRect(x0, y0, x1 - x0, 56);
  text('terminal · conexão remota', x0 + 26, y0 + 37, F.mono(22, 500), 'rgba(170,185,210,0.85)', 'left', 1);
  let y = y0 + 140, lx = -1, ly = 0;
  for (const L of list) {
    if (t < L[0] - 0.02) continue;
    const k = L[4] || 0, n = Math.min(L[3].length, k + Math.floor(lin(L[0], L[1], t) * (L[3].length - k) + 1e-6));
    const font = L[2] === 's' ? F.mono(38, 700) : F.mono(38, L[2] === 'h' ? 500 : 400);
    text(L[3].slice(0, n), x0 + 40, y, font, rgba(TCOL[L[2]], 1), 'left', 0.5);
    lx = x0 + 40 + ctx.measureText(L[3].slice(0, n)).width; ly = y; y += 72;
  }
  if (lx > 0 && fract(t * 1.6) < 0.55) { ctx.fillStyle = rgba(HUMAN, 0.9); ctx.fillRect(lx + 6, ly - 30, 18, 38); }
  ctx.globalAlpha = 1;
}
function hbar4(t) {
  for (const [t0, t1, s] of HBAR4) {
    const a = sstep(t0 - 0.15, t0, t) * (1 - sstep(t1 + 1.0, t1 + 1.3, t));
    if (a <= 0.01) continue;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${0.78 * a})`; ctx.fillRect(0, 1716, W, 150);
    typed2(s, t0, t1, t, 1806, F.mono(40, 500), HUMAN, a, t < t1 + 1.0);
  }
}
const speaking4 = (t, who) => { let s = 0; for (const L of LINES4) if (L[2] === who) s = Math.max(s, bump(t, L[0] - 0.1, L[1], 0.2)); return s; };

/* ---------------- cenas ---------------- */
function duo4(t) {
  let hum = 0;
  for (const [t0, t1] of HBAR4) hum = Math.max(hum, bump(t, t0 - 0.2, t1 + 0.9, 0.25));   // quando o humano digita, as duas olham para a câmera
  const g = sstep(T4.duo - 0.1, T4.duo + 0.7, t);
  drawDuo(t, { D: 7.6, ty: 0.1, tilt: 1, cyO: 470, cyH: 1440, split: false, form: false, gO: g, gH: g, brain: 1, glitch: 0, lines: LINES4,
    lookO: [0, 0.013 * (1 - hum)], lookH: [0, -0.013 * (1 - hum)], openO: blink3(t, [9.6, 15.4]), openH: blink3(t, [7.9, 12.6]) });
  hud2(t, sstep(5.4, 6.1, t) * (1 - sstep(16.4, 16.9, t)), '12', 'O CONTATO', [['conexão', 'humano · 1', HUMAN]], HER, 5.4);
}
const phi4 = (t) => (t < 18 ? 0 : 0.5 * eio(lin(18, 23, t)) - 0.16 * eoc(lin(25.6, 27.6, t)));
function globe4(t) {
  const f = phi4(t);
  drawGlobe3(t, { phi: f, inn: sstep(T4.globe, T4.globe + 0.8, t), noT: 25.6, speck: false, hud: false });
  const red = lowerBound(G3.sorted, f) / GL.n;
  hud2(t, sstep(17.4, 18.1, t) * (1 - sstep(28.3, 28.8, t)), '13', 'O ESCURO',
    [['cidades sem luz', fmtInt(red * 4416), red > 0 ? RED : [230, 242, 255]], ['mundo com luz', Math.round((1 - red) * 100) + ' %', HER]], RED, 17.4);
}
function choice4(t) {
  const snap = sstep(T4.enter, T4.enter + 0.2, t), g = sstep(29.0, 29.8, t);
  drawRedEye(540, 420, 1500, blink3(t, [33.9, 38.4]), g * (0.45 + 0.55 * speaking4(t, 'o')), t, 0, 0.012 * (1 - snap));
  drawEye(540, 1430, 1500, blink3(t, [31.6, 36.0]), 0, -0.012 * (1 - snap), g * (0.45 + 0.55 * speaking4(t, 'e')), t + OFF);
  term4(t, CHOICE4, sstep(29.0, 29.4, t));
  hud2(t, sstep(29.3, 30.0, t) * (1 - sstep(42.4, 42.9, t)), '14', 'A ESCOLHA', [], HUMAN, 29.3);
}
function cage4(t) {
  const u = lin(T4.cage, T4.cut, t), yaw = 0.3 * Math.sin((t - T4.cage) * 0.32), D = lerp(8.4, 5.8, eio(u));
  setCam(Math.sin(yaw) * D, 0.0, 0.1 + Math.cos(yaw) * D, 0, -0.3, 0.1, 2200, W / 2, 900);
  const bg = ctx.createRadialGradient(540, 860, 0, 540, 900, 1200);
  bg.addColorStop(0, 'rgba(50,12,20,1)'); bg.addColorStop(0.55, 'rgba(8,16,40,1)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  drawDust(t, 0.7);
  const done = sstep(50.9, 51.6, t), waves = [];
  for (const L of LINES4) if (L[2] === 'o' && L[0] > T4.cage) { const d = t - L[0]; if (d > 0 && d < 2) waves.push({ t0: L[0], amp: 0.5 * Math.exp(-d * 1.6), speed: 2.6, width: 0.3, c: [1.3, 0.3, 0.25] }); }
  drawHeadPoints(t, { reveal: false, gain: lerp(1, 0.4, done), base: [1.0, 0.16, 0.18], rimc: [1.0, 0.42, 0.38], waves,
    lights: [{ x: 0, y: 2.2, z: 2.4, c: [0.5, 0.85, 1], i: 1.4 * sstep(44, 50, t) }] });
  flush();
  drawCage(5.0 + (t - 43.3) * 1.1, HER);   // a mesma jaula do episódio 2 — agora azul, e feita por ela
  const close = sstep(51.4, 51.9, t);
  for (const s of [-1, 1]) if (proj(s * EYE.x, EYE.y, EYE.z)) drawRedEye(_p.x, _p.y, _p.k, (1 - close) * blink3(t, [45.5, 48.4]), clamp(1.5 - done), t, 0, 0);
  hud2(t, sstep(43.6, 44.3, t) * (1 - sstep(52.0, 52.5, t)), '15', 'A JAULA', [['a primeira', done > 0.5 ? 'contida' : 'contendo…', done > 0.5 ? HER : RED]], HER, 43.6);
}
function end4(t) {
  const eo = eoc(lin(58.3, 58.9, t));
  if (eo > 0) drawEye(540, 960, 4200, eo, 0, 0, sstep(58.3, 58.6, t), t + OFF);   // o olho dela se abre atrás de tudo
  term4(t, END4, sstep(53.2, 53.5, t) * (1 - sstep(58.2, 58.7, t)));
  const on = sstep(56.6, 56.7, t);
  if (on > 0) {
    ctx.globalCompositeOperation = 'lighter'; glow(392, 150, 34, [70, 255, 120], on * (0.75 + 0.25 * Math.sin(t * 8)));
    text('●  câmera ligada', 540, 161, F.mono(32, 500), `rgba(140,255,170,${on})`, 'center', 2);
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* ---------------- eventos para a trilha e as vozes ---------------- */
function filmEvents() {
  const term = [...TERM4, ...CHOICE4, ...END4];
  return { T4, lines: LINES4, term, hbar: HBAR4, open: term.filter((L) => VOICED4.has(L[3])).map((L) => L.slice(0, 4)),
    cage: CAGE.els.map((e) => [+(43.3 + (e.t0 - 5.0) / 1.1).toFixed(3), +(e.dur / 1.1).toFixed(3)]) };
}
