// Renderiza quadros avulsos para conferência: node tools/stills.mjs <pasta> <t1> <t2> ...
// Com --sheet junta tudo em uma folha de contato reduzida.
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const sheet = args.includes('--sheet');
const [outDir, ...ts] = args.filter((a) => a !== '--sheet');
await mkdir(outDir, { recursive: true });
const s = await serve(root);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('console', (m) => console.log('[page]', m.text()));
p.on('pageerror', (e) => console.log('[erro]', e.message));
await p.goto(s.url + '/' + (process.env.FILM || 'film.html') + '?render');
await p.evaluate(() => window.filmReady);
const times = ts.map(Number);
if (sheet) {
  const cols = Math.min(times.length, 5), rows = Math.ceil(times.length / cols);
  const url = await p.evaluate(({ times, cols, rows }) => {
    const cw = 360, ch = 640;
    const sc = document.createElement('canvas'); sc.width = cols * cw; sc.height = rows * ch;
    const g = sc.getContext('2d');
    const ms = [];
    times.forEach((t, i) => {
      const t0 = performance.now(); renderFrame(t); ms.push((performance.now() - t0) | 0);
      g.imageSmoothingQuality = 'high';
      g.drawImage(canvas, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
      g.fillStyle = '#ff0'; g.font = '20px monospace'; g.fillText(t.toFixed(2) + 's', (i % cols) * cw + 8, Math.floor(i / cols) * ch + 24);
    });
    console.log('ms por quadro: ' + ms.join(' '));
    return sc.toDataURL('image/jpeg', 0.9);
  }, { times, cols, rows });
  await writeFile(path.join(outDir, 'sheet.jpg'), Buffer.from(url.split(',')[1], 'base64'));
} else {
  for (const t of times) {
    const url = await p.evaluate((t) => { const t0 = performance.now(); renderFrame(t); console.log(t + 's: ' + ((performance.now() - t0) | 0) + ' ms'); return canvas.toDataURL('image/jpeg', 0.92); }, t);
    await writeFile(path.join(outDir, `t${t.toFixed(2).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
}
await b.close(); s.close();
