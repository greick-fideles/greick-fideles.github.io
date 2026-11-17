'use strict';
/* main.js (ep. 4) — linha do tempo: escolhe a cena e aplica o pós. */
function renderFrame(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

  let vig = 1;
  if (t < T4.duo) term4(t, TERM4, sstep(0.05, 0.3, t));
  else if (t < T4.globe) { duo4(t); hbar4(t); }
  else if (t < T4.choice) { globe4(t); hbar4(t); vig = 0.85; }
  else if (t < T4.cage) { choice4(t); vig = 0.9; }
  else if (t < T4.cut) cage4(t);
  else { end4(t); vig = 0.8; }
  const white = Math.max(bump(t, 4.6, 5.4, 0.35) * 0.75, bump(t, 16.6, 17.6, 0.4), bump(t, 42.5, 43.6, 0.5));
  const black = Math.max(bump(t, 28.5, 29.5, 0.5), sstep(52.3, 52.95, t) * (1 - sstep(53.0, 53.3, t)));
  if (white > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(226,242,255,${clamp(white)})`; ctx.fillRect(0, 0, W, H); vig *= 1 - clamp(white); }
  if (black > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(0,0,0,${clamp(black)})`; ctx.fillRect(0, 0, W, H); }
  post(1, vig);
  drawLines3(t, LINES4, y4);
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
    const audio = new Audio('despertar-ep4.m4a');
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
