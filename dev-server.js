// MĂ¡y chá»§ cháº¡y thá»­ táº¡i mĂ¡y (khĂ´ng cáº§n Vercel CLI): npm run dev â†’ http://localhost:3000
// KhĂ´ng cĂ³ biáº¿n mĂ´i trÆ°á»ng Redis thĂ¬ dá»¯ liá»‡u lÆ°u trong bá»™ nhá»›, táº¯t mĂ¡y chá»§ lĂ  máº¥t.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (o) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z]/g, '');
      const mod = await import(`./api/${name}.js`);
      let raw = '';
      for await (const c of req) raw += c;
      req.body = raw ? JSON.parse(raw) : {};
      req.query = Object.fromEntries(url.searchParams);
      return await mod.default(req, res);
    }
    const p = path.join(root, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!p.startsWith(path.join(root, 'public'))) return res.status(403).end();
    const data = await fs.readFile(p);
    res.setHeader('Content-Type', types[path.extname(p)] || 'application/octet-stream');
    res.end(data);
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ERR_MODULE_NOT_FOUND') return res.status(404).end('Not found');
    console.error(e); res.status(500).end('Error');
  }
}).listen(process.env.PORT || 3000, () => console.log(`TNG Quiz: http://localhost:${process.env.PORT || 3000}`));

