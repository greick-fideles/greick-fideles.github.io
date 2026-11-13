// Renderiza todos os quadros em paralelo: node tools/render.mjs <pasta-dos-quadros> [workers] [t0] [t1]
// Cada quadro é função pura do tempo, então as páginas dividem o trabalho sem estado compartilhado.
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
const workers = Number(process.argv[3] || 4);
const FPS = 30, DURATION = 60;
const f0 = Math.round(Number(process.argv[4] || 0) * FPS);
const f1 = Math.round(Number(process.argv[5] || DURATION) * FPS);
await mkdir(outDir, { recursive: true });

const s = await serve(root);
const browser = await chromium.launch();
let next = f0, done = 0;
const started = Date.now();
async function worker() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('[erro na página]', e.message); process.exitCode = 1; });
  await page.goto(s.url + '/film.html?render');
  await page.evaluate(() => window.filmReady);
  while (next < f1) {
    const f = next++;
    const url = await page.evaluate((t) => { renderFrame(t); return canvas.toDataURL('image/jpeg', 0.96); }, f / FPS);
    await writeFile(path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if (++done % 150 === 0) console.log(`${done}/${f1 - f0} quadros · ${((Date.now() - started) / 1000).toFixed(0)} s`);
  }
  await page.close();
}
await Promise.all(Array.from({ length: workers }, worker));
console.log(`pronto: ${done} quadros em ${((Date.now() - started) / 1000).toFixed(0)} s`);
await browser.close(); s.close();
