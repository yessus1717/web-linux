#!/usr/bin/env node
/* LinuxPath · servidor de archivos. Sin dependencias: solo hace falta Node 18 o superior.
   Solo sirve el sitio (páginas, css, js y elementos). Las cuentas y el progreso viven en Supabase: ver js/supabase-config.js
   y supabase/schema.sql. Este servidor ya no tiene API ni guarda datos.
   Uso:  node server.js        (opcionales: PORT=3000, HOST=0.0.0.0) */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const PUERTO = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';

const err = (estado, mensaje) => Object.assign(new Error(mensaje), { estado });

function texto(res, estado, mensaje) {
  res.writeHead(estado, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(mensaje);
}

/* ---------- archivos del sitio: solo lo público (páginas, css, js, elementos), nunca server.js, supabase/ ni datos/ ---------- */
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
function estatico(req, res, url) {
  let ruta;
  try { ruta = decodeURIComponent(url.pathname); } catch (e) { throw err(400, 'Ruta inválida.'); }
  if (ruta === '/') ruta = '/index.html';
  const partes = ruta.split('/').filter(Boolean), ext = path.extname(ruta).toLowerCase();
  const publica = partes.length === 1 ? ext === '.html' : ['css', 'js', 'elementos'].includes(partes[0]);
  if (!publica || !TIPOS[ext] || partes.some((p) => p.startsWith('.') || p.includes('\\'))) throw err(404, 'No encontrado.');
  const archivo = path.join(RAIZ, ...partes);
  if (!archivo.startsWith(RAIZ + path.sep)) throw err(404, 'No encontrado.');
  fs.readFile(archivo, (e, datos) => {
    if (e) return texto(res, 404, 'No encontrado.');
    res.writeHead(200, { 'Content-Type': TIPOS[ext], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    res.end(req.method === 'HEAD' ? undefined : datos);
  });
}

const servidor = http.createServer((req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') throw err(405, 'Método no permitido.');
    estatico(req, res, new URL(req.url, 'http://localhost'));
  } catch (e) {
    if (!e.estado) console.error(e);
    if (!res.headersSent) texto(res, e.estado || 500, e.estado ? e.message : 'Error interno del servidor.');
  }
});
servidor.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `El puerto ${PUERTO} está ocupado. Cierra el otro servidor (por ejemplo python3 -m http.server) o usa: PORT=3000 node server.js` : e.message);
  process.exit(1);
});
servidor.listen(PUERTO, HOST, () => console.log(`LinuxPath en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`));
