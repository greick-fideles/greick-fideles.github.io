'use strict';
/* ============================================================
   main.js — linha do tempo: escolhe a cena e aplica o pós.
   ============================================================ */
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  let bloom = 1, vig = 1, wo = 0;
  if (t < TL.inside) {
    drawBuild(t);
    vig = lerp(1, 1.25, sstep(24.5, 26.5, t) * (1 - sstep(TL.eyes, TL.eyes + 0.8, t)));
  } else if (t < TL.cut) {
    drawMind(t, 1);
    drawMindHUD(t);
    drawHeroBacking(t);
    const inn = sstep(TL.inside, TL.inside + 1.2, t);   // sem salto de brilho na passagem pela pupila
    bloom = lerp(1, 1.1, inn); vig = lerp(1, 0.9, inn);
    wo = eic(lin(52.25, 52.96, t));
    if (wo > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(255,250,244,${wo})`; ctx.fillRect(0, 0, W, H); vig *= 1 - wo; }
  } else {
    drawFinale(t);
    vig = 0.8;
  }
  post(bloom, vig);
  if (t >= TL.inside && t < TL.cut) drawHero(t, wo);

  // fades de abertura e encerramento
  const fade = (1 - lin(0, 0.5, t)) + sstep(59.3, 59.95, t);
  if (fade > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(0,0,0,${clamp(fade)})`; ctx.fillRect(0, 0, W, H); }
}

window.filmReady = (async () => {
  await document.fonts.load(F.mono(20));
  await document.fonts.load(F.mono(20, 500));
  await document.fonts.load(F.serif(20));
  await document.fonts.load(F.sans(20, 300));
  await document.fonts.load(F.sans(20, 500));
  await document.fonts.ready;
  for (const q of TH) thoughtSprite(q);
  return true;
})();

/* reprodução ao vivo no navegador (film.html sem ?render) */
if (!location.search.includes('render')) {
  window.filmReady.then(() => {
    const audio = new Audio('despertar.m4a');
    let t0 = null, started = false;
    const start = () => { if (started) return; started = true; t0 = performance.now(); audio.currentTime = 0; audio.play().catch(() => {}); };
    renderFrame(1.8);
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
