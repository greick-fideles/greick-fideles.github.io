// Gera ep2/src/globe-data.js: pontos de terra firme espalhados uniformemente no globo.
// Uso (numa pasta com world-atlas, topojson-client e d3-geo instalados):
//   node make-globe.mjs caminho/para/ep2/src/globe-data.js
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
const require = createRequire(path.join(process.cwd(), 'x.js'));
const { feature } = require('topojson-client');
const { geoContains } = require('d3-geo');
const topo = require('world-atlas/land-110m.json');
const land = feature(topo, topo.objects.land);
const N = 46000, out = [];
const ga = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (2 * (i + 0.5)) / N, lat = (Math.asin(y) * 180) / Math.PI;
  let lon = (((i * ga * 180) / Math.PI) % 360) - 180;
  if (lat < -62 && i % 3) continue;               // Antártida mais rala
  if (geoContains(land, [lon, lat])) out.push(Math.round(lon * 100), Math.round(lat * 100));
}
writeFileSync(process.argv[2], `'use strict';\n// Gerado por tools/make-globe.mjs a partir de Natural Earth 110m (domínio público). Pares lon,lat ×100.\nconst GLOBE_LAND = new Int16Array([${out.join(',')}]);\n`);
console.log('pontos de terra:', out.length / 2);
