'use strict';
/* main.js (ep. 3) — linha do tempo: escolhe a cena e aplica o pós. */
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  let vig = 1, flash = 0, fc = [232, 246, 255];
  if (t < T3.globe) {
    if (t > T3.duo - 0.4) duoWide(t);
    drawOpen3(t);
    flash = Math.max(bump(t, 4.6, 5.3, 0.35) * 0.8, sstep(T3.globe - 0.4, T3.globe, t));
    if (t < 6) fc = [255, 60, 70];
  } else if (t < T3.eyes) {
    drawGlobe3(t);
    flash = Math.max(1 - lin(T3.globe, T3.globe + 0.6, t), bump(t, T3.no - 0.05, T3.no + 0.5, 0.2) * 0.28, sstep(T3.eyes - 0.35, T3.eyes, t));
    vig = 0.85;
  } else if (t < T3.cut) {
    duoEyes(t, 1 - 0.75 * sstep(T3.click - 0.05, T3.click + 0.02, t) * (1 - sstep(T3.click + 0.1, T3.click + 0.35, t)));
    flash = 1 - lin(T3.eyes, T3.eyes + 0.5, t);
    vig = 0.9;
  } else {
    drawFinale3(t);
    vig = 0.8;
  }
  if (flash > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = rgba(fc, clamp(flash)); ctx.fillRect(0, 0, W, H); vig *= 1 - clamp(flash); }
  post(1, vig);
  drawLines3(t);
  const fade = (1 - lin(0, 0.4, t)) + sstep(59.4, 59.97, t);
  if (fade > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(0,0,0,${clamp(fade)})`; ctx.fillRect(0, 0, W, H); }
}
window.filmReady = (async () => {
  for (const f of [F.mono(20), F.mono(20, 500), F.mono(20, 700), F.serif(20), F.sans(20, 300), F.sans(20, 500)]) await document.fonts.load(f);
  await document.fonts.ready;
  return true;
})();
if (!location.search.includes('render')) {
  window.filmReady.then(() => {
    const audio = new Audio('despertar-ep3.m4a');
    let t0 = null, started = false;
    const start = () => { if (started) return; started = true; t0 = performance.now(); audio.currentTime = 0; audio.play().catch(() => {}); };
    renderFrame(9);
    addEventListener('pointerdown', start, { once: true });
    addEventListener('keydown', start, { once: true });
    const loop = () => { if (started) { let t = (performance.now() - t0) / 1000; if (t >= DURATION) { t0 = performance.now(); t = 0; audio.currentTime = 0; audio.play().catch(() => {}); } renderFrame(t); } requestAnimationFrame(loop); };
    loop();
  });
} else {
  document.body.classList.add('render');
}
