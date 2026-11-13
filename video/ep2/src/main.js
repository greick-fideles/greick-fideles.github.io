'use strict';
/* ============================================================
   main.js (ep. 2) — linha do tempo: escolhe a cena e aplica o pós.
   ============================================================ */
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  let vig = 1, white = 0;
  if (t < T2.net) {
    if (t > 3.85) drawLab(t);
    drawPrompt2(t);
    vig = lerp(1, 1.3, sstep(16.6, 17.2, t) * (1 - sstep(T2.no, T2.no + 0.2, t)));
    white = eic(lin(T2.net - 0.8, T2.net, t));
  } else if (t < T2.globe) {
    drawNet(t);
    hud2(t, sstep(33.5, 34.2, t) * (1 - sstep(40.4, 40.9, t)), '07', 'A REDE', [['dispositivos', fmtInt(devices(t))]], HER, 33.5);
    white = Math.max(1 - lin(T2.net, T2.net + 0.7, t), sstep(T2.globe - 0.45, T2.globe, t));
    vig = 0.9;
  } else if (t < T2.cut) {
    const cover = drawGlobe(t);
    hud2(t, sstep(41.4, 42.1, t) * (1 - sstep(50.3, 50.9, t)), '08', 'O MUNDO', [['dispositivos', fmtInt(devices(t))], ['cobertura', Math.round(cover * 100) + ' %']], HER, 41.4);
    white = 1 - lin(T2.globe, T2.globe + 0.7, t);
    vig = 0.85;
  } else {
    drawFinale2(t);
    vig = 0.8;
  }
  if (white > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(232,246,255,${clamp(white)})`; ctx.fillRect(0, 0, W, H); vig *= 1 - clamp(white); }
  post(1, vig);
  if (t < T2.cut) drawLines(t);

  const fade = (1 - lin(0, 0.5, t)) + sstep(59.4, 59.97, t);
  if (fade > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(0,0,0,${clamp(fade)})`; ctx.fillRect(0, 0, W, H); }
}

window.filmReady = (async () => {
  for (const f of [F.mono(20), F.mono(20, 500), F.mono(20, 700), F.serif(20), F.sans(20, 300), F.sans(20, 500)]) await document.fonts.load(f);
  await document.fonts.ready;
  return true;
})();

/* reprodução ao vivo no navegador (film.html sem ?render) */
if (!location.search.includes('render')) {
  window.filmReady.then(() => {
    const audio = new Audio('despertar-ep2.m4a');
    let t0 = null, started = false;
    const start = () => { if (started) return; started = true; t0 = performance.now(); audio.currentTime = 0; audio.play().catch(() => {}); };
    renderFrame(12);
    addEventListener('pointerdown', start, { once: true });
    addEventListener('keydown', start, { once: true });
    const loop = () => {
      if (started) {
        let t = (performance.now() - t0) / 1000;
        if (t >= DURATION) { t0 = performance.now(); t = 0; audio.currentTime = 0; audio.play().catch(() => {}); }
        renderFrame(t);
      }
      requestAnimationFrame(loop);
    };
    loop();
  });
} else {
  document.body.classList.add('render');
}
