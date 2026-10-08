#!/usr/bin/env node
/* Local preview server for the Pashu-Mitra frontend — DEV TOOLING ONLY.
 *
 * WHY: in production the frontend is served by Vercel and frontend/vercel.json
 * rewrites /api/* and /socket.io/* to the Render backend. A plain static server
 * cannot do that, so `python -m http.server` gives you a portal that cannot log
 * in. This script reproduces those rewrites locally with ZERO dependencies
 * (node:http + node:net only) so the merged redesign can be reviewed in a real
 * browser against a real backend:
 *
 *   cd backend && SIH_SECRET_KEY=dev-secret SIH_DB_PATH=/tmp/webcall_dev.db \
 *     DEMO_MODE=true python3 -c \
 *     "from app import app, socketio; socketio.run(app, host='127.0.0.1', port=5001, allow_unsafe_werkzeug=True)"
 *   node scripts/dev-preview.mjs          # http://127.0.0.1:8080
 *
 * Env: PM_PREVIEW_PORT (default 8080), PM_PREVIEW_BACKEND (default
 * http://127.0.0.1:5001). Never deploy this file; it is not part of the app.
 */
import { createServer, request as httpRequest } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { connect } from "node:net";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "frontend");
const PORT = Number(process.env.PM_PREVIEW_PORT || 8080);
const BACKEND = new URL(process.env.PM_PREVIEW_BACKEND || "http://127.0.0.1:5001");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2", ".woff": "font/woff", ".onnx": "application/octet-stream",
  ".wasm": "application/wasm", ".map": "application/json", ".jpg": "image/jpeg", ".webp": "image/webp",
};

const isProxied = p => p.startsWith("/api/") || p.startsWith("/api?") || p === "/socket.io" || p.startsWith("/socket.io/");

function proxy(req, res) {
  const opts = {
    hostname: BACKEND.hostname, port: BACKEND.port || 80, method: req.method,
    path: req.url, headers: { ...req.headers, host: BACKEND.host },
  };
  const up = httpRequest(opts, r => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  up.on("error", e => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("dev-preview: backend unreachable at " + BACKEND.origin + " (" + e.code + ")");
  });
  req.pipe(up);
}

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (isProxied(url)) return proxy(req, res);

  let file = normalize(join(ROOT, url === "/" ? "index.html" : url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(ROOT, "index.html"); // hash router
  if (!existsSync(file)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});

/* Socket.IO / WebRTC signalling over WebSocket: splice the raw TCP bytes
   through to the backend so the real signaling path is exercised. */
server.on("upgrade", (req, socket) => {
  const up = connect(BACKEND.port || 80, BACKEND.hostname, () => {
    const head = `${req.method} ${req.url} HTTP/1.1\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") + "\r\n\r\n";
    up.write(head);
    socket.pipe(up); up.pipe(socket);
  });
  const kill = () => { try { up.destroy(); } catch {} try { socket.destroy(); } catch {} };
  up.on("error", kill); socket.on("error", kill);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`dev-preview: http://0.0.0.0:${PORT}  ->  ${ROOT}`);
  console.log(`dev-preview: /api + /socket.io proxied to ${BACKEND.origin}`);
});
