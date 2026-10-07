#!/usr/bin/env bash
# Space Survival (static) — serve the project directory in the foreground.
set -euo pipefail

time -p cd "$(dirname "$0")"
time -p bash -n start.sh

PROJECT_DIR="$(time -p pwd)"
PORT="${PORT:-3000}"
STATIC_DIR="$PROJECT_DIR" # pure static game: no build step, project root is the deploy dir

# Install + build only when the project actually defines a build script.
if time -p node -e "process.exit(require('./package.json').scripts && require('./package.json').scripts.build ? 0 : 1)"; then
  time -p npm install --no-audit --no-fund
  time -p npm run build
  STATIC_DIR="$PROJECT_DIR/dist"
fi

time -p test -f "$STATIC_DIR/index.html"

time -p mkdir -p "${OPENCODE_WEB_DIR:?}"
export PROJECT_DIR STATIC_DIR
time -p node -e "require('fs').writeFileSync(process.env.OPENCODE_WEB_DIR + '/deployment-output.json', JSON.stringify({ project: process.env.PROJECT_DIR, directory: process.env.STATIC_DIR }))"

export STATIC_DIR PORT
echo "Serving $STATIC_DIR on port $PORT (project $PROJECT_DIR)"
time -p node <<'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.env.STATIC_DIR;
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
http.createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (p !== root && !p.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'Content-Type': mime[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log('ready on :' + port));
EOF
