// Exporta os instantes dos eventos visuais para sincronizar a trilha sonora.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const s = await serve(root);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto(s.url + '/film.html?render');
await p.evaluate(() => window.filmReady);
const ev = await p.evaluate(() => ({
  TL,
  prompt: PROMPT.length,
  nodes: BR.birth.slice(1).map((t, i) => [+t.toFixed(4), BR.agent[i + 1]]),
  thoughts: TH.map((q) => [+q.ta.toFixed(4), +(q.x / 2.5).toFixed(3), q.cat]),
  hero: HERO.map((h) => [h[0], h[1], h[2].join(' ')]),
  flood: FLOODW.map((f) => +f[0].toFixed(4)),
  sweep: SW,
}));
await writeFile(process.argv[2], JSON.stringify(ev));
console.log('nós', ev.nodes.length, 'pensamentos', ev.thoughts.length, 'foco', ev.hero.length, 'enxurrada', ev.flood.length);
await b.close(); s.close();
