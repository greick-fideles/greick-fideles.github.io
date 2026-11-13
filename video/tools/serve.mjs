// servidor estático mínimo para a renderização (fontes exigem http)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.mp4': 'video/mp4' };
export function serve(root) {
  return new Promise((resolve) => {
    const srv = http.createServer(async (req, res) => {
      try {
        const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
        if (!p.startsWith(root)) throw new Error('fora da raiz');
        const data = await readFile(p);
        res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
        res.end(data);
      } catch { res.writeHead(404); res.end('404'); }
    });
    srv.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() }));
  });
}
