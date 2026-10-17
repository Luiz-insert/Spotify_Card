// Servidor estático simples para rodar o Spotify Card localmente.
// O Spotify exige que o Redirect URI use HTTPS ou um IP de loopback
// (http://127.0.0.1) — "localhost" não é aceito.
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

http.createServer((request, response) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const filePath = path.join(ROOT, relative);
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()];

    // Só serve arquivos do front-end, nunca fora da pasta nem a pasta backend.
    if (!filePath.startsWith(ROOT + path.sep) || filePath.startsWith(__dirname) || !type) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return response.end('Não encontrado');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return response.end('Não encontrado');
        }
        // no-cache: o navegador sempre confere se o arquivo mudou (evita CSS/JS antigo em desenvolvimento).
        response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        response.end(data);
    });
}).listen(PORT, HOST, () => {
    console.log(`Spotify Card rodando em http://${HOST}:${PORT}/`);
});
