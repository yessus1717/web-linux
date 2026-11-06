#!/usr/bin/env node
/* LinuxPath · servidor. Sin dependencias: solo hace falta Node 18 o superior.
   Sirve el sitio y ofrece la API de cuentas:
     GET    /api/yo         quién está conectado (y su progreso)
     POST   /api/registro   { nombre, email, password }
     POST   /api/entrar     { email, password }
     POST   /api/salir
     PUT    /api/progreso   sube el progreso y devuelve el resultado de unirlo con el de la cuenta
     DELETE /api/progreso   borra el progreso de la cuenta
   Uso:  node server.js        (opcionales: PORT=3000, HOST=0.0.0.0, COOKIE_SECURE=1 si lo sirves por HTTPS, TRUST_PROXY=1 detrás de un proxy)
   Los datos quedan en datos/db.json: contraseñas con scrypt y sal propia, sesiones guardadas solo como hash. No subas esa carpeta a ningún repositorio. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = __dirname;
const PUERTO = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const DB_RUTA = path.join(RAIZ, 'datos', 'db.json');
const SESION_MS = 30 * 24 * 3600e3;

const RE_NOMBRE = /^[A-Za-z0-9_]{3,24}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RE_ID = /^[a-z0-9-]{1,40}$/;
const RE_HREF = /^[\w.-]{1,60}\.html(\?[\w=&.-]{0,40})?$/;
const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;

const err = (estado, mensaje, campo) => Object.assign(new Error(mensaje), { estado, campo });

/* ---------- base de datos (un JSON; suficiente para una app pequeña) ---------- */
function cargarDB() {
  let texto;
  try { texto = fs.readFileSync(DB_RUTA, 'utf8'); }
  catch (e) { if (e.code === 'ENOENT') return { usuarios: [], sesiones: {} }; throw e; }
  const d = JSON.parse(texto); // si está corrupto falla y el servidor no arranca: así no se pisan datos buenos
  return { usuarios: Array.isArray(d.usuarios) ? d.usuarios : [], sesiones: d.sesiones && typeof d.sesiones === 'object' ? d.sesiones : {} };
}
let db;
try { db = cargarDB(); } catch (e) { console.error('No se pudo leer datos/db.json:', e.message); process.exit(1); }

function guardarDB() {
  fs.mkdirSync(path.dirname(DB_RUTA), { recursive: true });
  const tmp = DB_RUTA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(tmp, DB_RUTA); // escritura atómica: nunca queda un archivo a medias
}

/* ---------- contraseñas y sesiones ---------- */
const scrypt = (pw, sal) => new Promise((res, rej) => crypto.scrypt(pw, sal, 64, (e, k) => (e ? rej(e) : res(k))));
const SAL_FALSA = crypto.randomBytes(16); // para tardar lo mismo cuando el correo no existe
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email });

function cookie(req, nombre) {
  for (const p of String(req.headers.cookie || '').split(';')) {
    const i = p.indexOf('=');
    if (i > 0 && p.slice(0, i).trim() === nombre) { try { return decodeURIComponent(p.slice(i + 1).trim()); } catch (e) { return null; } }
  }
  return null;
}
const cookieSesion = (valor, segundos) => `sid=${valor}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${segundos}` + (COOKIE_SECURE ? '; Secure' : '');

function crearSesion(uid) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.sesiones[sha(token)] = { uid, expira: Date.now() + SESION_MS };
  return token;
}
function usuarioDe(req) {
  const t = cookie(req, 'sid');
  const s = t && db.sesiones[sha(t)];
  if (!s) return null;
  if (s.expira < Date.now()) { delete db.sesiones[sha(t)]; guardarDB(); return null; }
  return db.usuarios.find((u) => u.id === s.uid) || null;
}

/* ---------- límites de intentos (en memoria) ---------- */
const golpes = new Map();
const excedido = (clave, max) => {
  const g = golpes.get(clave);
  if (!g) return false;
  if (Date.now() > g.hasta) { golpes.delete(clave); return false; }
  return g.n >= max;
};
const anotar = (clave, ventanaMs) => {
  const g = golpes.get(clave);
  if (g && Date.now() <= g.hasta) g.n++; else golpes.set(clave, { n: 1, hasta: Date.now() + ventanaMs });
};
const ipDe = (req) => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'desconocida';
setInterval(() => {
  const ahora = Date.now();
  for (const [k, g] of golpes) if (ahora > g.hasta) golpes.delete(k);
  let cambio = false;
  for (const [k, s] of Object.entries(db.sesiones)) if (s.expira < ahora) { delete db.sesiones[k]; cambio = true; }
  if (cambio) guardarDB();
}, 600e3).unref();

/* ---------- progreso: validar y unir ---------- */
function limpiarProgreso(p) {
  const out = { lecciones: {}, dias: [], ultima: null };
  if (!p || typeof p !== 'object') return out;
  if (p.lecciones && typeof p.lecciones === 'object') {
    let n = 0;
    for (const [id, l] of Object.entries(p.lecciones)) {
      if (++n > 200) break;
      if (!RE_ID.test(id) || !l || !Array.isArray(l.h)) continue;
      out.lecciones[id] = { h: [...new Set(l.h.filter((i) => Number.isInteger(i) && i >= 0 && i < 500))].sort((a, b) => a - b) };
    }
  }
  if (Array.isArray(p.dias)) out.dias = [...new Set(p.dias.filter((d) => typeof d === 'string' && RE_DIA.test(d)))].sort().slice(-366);
  const u = p.ultima;
  if (u && typeof u.id === 'string' && RE_ID.test(u.id) && typeof u.href === 'string' && RE_HREF.test(u.href) && typeof u.titulo === 'string') {
    out.ultima = { id: u.id, href: u.href, titulo: u.titulo.slice(0, 120), t: Number.isFinite(u.t) ? u.t : 0 };
  }
  return out;
}
function fusionar(a, b) {
  const out = { lecciones: {}, dias: [...new Set([...a.dias, ...b.dias])].sort().slice(-366), ultima: null };
  for (const id of new Set([...Object.keys(a.lecciones), ...Object.keys(b.lecciones)])) {
    const h = new Set([...(a.lecciones[id] ? a.lecciones[id].h : []), ...(b.lecciones[id] ? b.lecciones[id].h : [])]);
    out.lecciones[id] = { h: [...h].sort((x, y) => x - y) };
  }
  out.ultima = a.ultima && b.ultima ? (b.ultima.t > a.ultima.t ? b.ultima : a.ultima) : a.ultima || b.ultima;
  return out;
}

/* ---------- utilidades HTTP ---------- */
function json(res, estado, cuerpo, cabeceras = {}) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...cabeceras });
  res.end(JSON.stringify(cuerpo));
}
function leerJSON(req, max = 65536) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return reject(err(415, 'Formato no admitido.'));
    const trozos = [];
    let n = 0, grande = false;
    req.on('data', (c) => { n += c.length; if (n > max) grande = true; else trozos.push(c); });
    req.on('end', () => {
      if (grande) return reject(err(413, 'La petición es demasiado grande.'));
      try { resolve(JSON.parse(Buffer.concat(trozos).toString('utf8') || '{}')); } catch (e) { reject(err(400, 'JSON inválido.')); }
    });
    req.on('error', reject);
  });
}
const origenValido = (req) => { // frena peticiones que vienen de otra web
  const o = req.headers.origin;
  if (!o) return true;
  try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
};

/* ---------- API ---------- */
async function yo(req, res) {
  const u = usuarioDe(req);
  json(res, 200, u ? { usuario: publico(u), progreso: limpiarProgreso(u.progreso) } : { usuario: null });
}

async function registro(req, res) {
  const ip = ipDe(req);
  if (excedido('reg|' + ip, 10)) throw err(429, 'Demasiados registros desde este equipo. Prueba más tarde.');
  const b = await leerJSON(req);
  const nombre = String(b.nombre || '').trim(), email = String(b.email || '').trim().toLowerCase(), pw = typeof b.password === 'string' ? b.password : '';
  if (!RE_NOMBRE.test(nombre)) throw err(400, 'El nombre de usuario debe tener de 3 a 24 caracteres: letras, números o guion bajo.', 'nombre');
  if (email.length > 254 || !RE_EMAIL.test(email)) throw err(400, 'Escribe un correo válido.', 'email');
  if (pw.length < 8) throw err(400, 'La contraseña debe tener al menos 8 caracteres.', 'password');
  if (pw.length > 128) throw err(400, 'La contraseña es demasiado larga (máximo 128 caracteres).', 'password');
  anotar('reg|' + ip, 3600e3);

  const sal = crypto.randomBytes(16);
  const hash = await scrypt(pw, sal);
  // Las comprobaciones de duplicados y el alta van juntas y sin await: dos registros a la vez no pueden colarse
  if (db.usuarios.some((u) => u.email === email)) throw err(409, 'Ese correo ya tiene una cuenta.', 'email');
  if (db.usuarios.some((u) => u.nombre.toLowerCase() === nombre.toLowerCase())) throw err(409, 'Ese nombre de usuario ya está en uso.', 'nombre');
  const u = { id: crypto.randomUUID(), nombre, email, sal: sal.toString('hex'), hash: hash.toString('hex'), creado: new Date().toISOString(), progreso: limpiarProgreso(null) };
  db.usuarios.push(u);
  const token = crearSesion(u.id);
  guardarDB();
  json(res, 201, { usuario: publico(u) }, { 'Set-Cookie': cookieSesion(token, SESION_MS / 1000) });
}

async function entrar(req, res) {
  const ip = ipDe(req), b = await leerJSON(req);
  const email = String(b.email || '').trim().toLowerCase(), pw = typeof b.password === 'string' ? b.password : '';
  const k1 = `in|${ip}|${email}`, k2 = `in|${ip}`, ventana = 15 * 60e3;
  if (excedido(k1, 5) || excedido(k2, 30)) throw err(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
  const u = pw.length <= 128 ? db.usuarios.find((x) => x.email === email) : null;
  const hash = await scrypt(pw.slice(0, 128), u ? Buffer.from(u.sal, 'hex') : SAL_FALSA);
  if (!u || !crypto.timingSafeEqual(hash, Buffer.from(u.hash, 'hex'))) {
    anotar(k1, ventana); anotar(k2, ventana);
    throw err(401, 'Correo o contraseña incorrectos.');
  }
  golpes.delete(k1);
  const viejo = cookie(req, 'sid');
  if (viejo) delete db.sesiones[sha(viejo)]; // sesión nueva en cada entrada
  const token = crearSesion(u.id);
  guardarDB();
  json(res, 200, { usuario: publico(u) }, { 'Set-Cookie': cookieSesion(token, SESION_MS / 1000) });
}

async function salir(req, res) {
  const t = cookie(req, 'sid');
  if (t && db.sesiones[sha(t)]) { delete db.sesiones[sha(t)]; guardarDB(); }
  json(res, 200, { ok: true }, { 'Set-Cookie': cookieSesion('', 0) });
}

async function subirProgreso(req, res) {
  const u = usuarioDe(req);
  if (!u) throw err(401, 'Inicia sesión.');
  const b = await leerJSON(req);
  u.progreso = fusionar(limpiarProgreso(u.progreso), limpiarProgreso(b));
  guardarDB();
  json(res, 200, u.progreso);
}
async function borrarProgreso(req, res) {
  const u = usuarioDe(req);
  if (!u) throw err(401, 'Inicia sesión.');
  u.progreso = limpiarProgreso(null);
  guardarDB();
  json(res, 200, u.progreso);
}

const RUTAS = {
  'GET /api/yo': yo, 'POST /api/registro': registro, 'POST /api/entrar': entrar, 'POST /api/salir': salir,
  'PUT /api/progreso': subirProgreso, 'DELETE /api/progreso': borrarProgreso,
};
async function api(req, res, url) {
  const f = RUTAS[req.method + ' ' + url.pathname];
  if (!f) throw err(404, 'No existe.');
  if (req.method !== 'GET' && !origenValido(req)) throw err(403, 'Origen no permitido.');
  await f(req, res);
}

/* ---------- archivos del sitio: solo lo público (páginas, css, js, elementos), nunca datos/ ni server.js ---------- */
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
    if (e) return json(res, 404, { error: 'No encontrado.' });
    res.writeHead(200, { 'Content-Type': TIPOS[ext], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY' });
    res.end(req.method === 'HEAD' ? undefined : datos);
  });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw err(405, 'Método no permitido.');
    estatico(req, res, url);
  } catch (e) {
    if (!e.estado) console.error(e);
    if (!res.headersSent) json(res, e.estado || 500, { error: e.estado ? e.message : 'Error interno del servidor.', campo: e.campo });
  }
});
servidor.on('error', (e) => {
  console.error(e.code === 'EADDRINUSE' ? `El puerto ${PUERTO} está ocupado. Cierra el otro servidor (por ejemplo python3 -m http.server) o usa: PORT=3000 node server.js` : e.message);
  process.exit(1);
});
servidor.listen(PUERTO, HOST, () => console.log(`LinuxPath en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PUERTO}`));
