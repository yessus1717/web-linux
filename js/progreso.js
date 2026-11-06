/* LinuxPath · progreso. Guarda en localStorage (solo en este navegador) qué tarjetas de cada lección están hechas,
   la última lección visitada y los días de práctica. La API queda en window.Progreso y cada cambio dispara el evento "progreso:cambio".
   Forma de lo guardado: { v: 1, lecciones: { "u1l2": { h: [0, 1, 4] }, "que-es-linux": { h: [0, 1] } },
                           ultima: { id, href, titulo, t }, dias: ["2026-11-05", ...], u: id de la cuenta dueña de estos datos (si hay) }
   "h" son los índices de tarjeta hechos. Si cambias el contenido de una lección, los índices siguen valiendo mientras no reordenes tarjetas.
   Si cambias la forma de los datos, sube v y la CLAVE. En la portada también pinta el avance (lecciones, unidades y panel "Tu progreso"). */
(() => {
  const CLAVE = 'linuxpath:progreso:v1';
  const HREF = /^[\w.-]{1,60}\.html(\?[\w=&.-]{0,40})?$/; // solo páginas del propio sitio: el href guardado acaba en un enlace
  const DIA = /^\d{4}-\d{2}-\d{2}$/;
  const vacio = () => ({ v: 1, lecciones: {}, ultima: null, dias: [], u: null });
  let mem = null; // copia por si localStorage no está disponible (modo privado, disco lleno): dura lo que dure la visita

  const cargar = () => {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { /* sin acceso o JSON roto */ }
    d = d || mem;
    if (!d || d.v !== 1 || !d.lecciones || typeof d.lecciones !== 'object') return vacio();
    if (!Array.isArray(d.dias)) d.dias = [];
    return d;
  };
  const guardar = (d) => {
    mem = d;
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* se queda en memoria */ }
    dispatchEvent(new CustomEvent('progreso:cambio'));
  };
  const pad = (n) => String(n).padStart(2, '0');
  const dia = (f = new Date()) => `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;
  const lista = (v) => (Array.isArray(v) ? v : [v]).filter((i) => Number.isInteger(i) && i >= 0);

  const P = {
    // Marca una tarjeta (o varias) como hecha. Devuelve true si algo cambió.
    marcar(id, indices) {
      const d = cargar();
      const l = d.lecciones[id] || (d.lecciones[id] = { h: [] });
      const nuevas = lista(indices).filter((i) => !l.h.includes(i));
      if (!nuevas.length) return false;
      l.h = [...l.h, ...nuevas].sort((a, b) => a - b);
      const hoy = dia();
      if (!d.dias.includes(hoy)) d.dias = [...d.dias, hoy].slice(-366);
      guardar(d);
      return true;
    },
    estan(id) { const l = cargar().lecciones[id]; return l ? l.h.slice() : []; },
    hechas(id, total) { return P.estan(id).filter((i) => i < total).length; },
    primeraPendiente(id, total) {
      const h = P.estan(id);
      for (let i = 0; i < total; i++) if (!h.includes(i)) return i;
      return -1;
    },
    // Recuerda cuál fue la última lección abierta (para el botón "Continuar" de la portada).
    visitar(id, titulo) {
      const d = cargar(), href = location.pathname.split('/').pop() + location.search;
      const u = d.ultima;
      if (u && u.id === id && u.href === href && u.titulo === titulo) return;
      d.ultima = { id, href, titulo, t: Date.now() };
      guardar(d);
    },
    ultima() { return cargar().ultima; },
    totalTarjetas() { return Object.values(cargar().lecciones).reduce((s, l) => s + l.h.length, 0); },
    // Días seguidos con práctica; sigue viva si practicaste hoy o ayer.
    racha() {
      const dias = new Set(cargar().dias), f = new Date();
      if (!dias.has(dia(f))) f.setDate(f.getDate() - 1);
      let n = 0;
      while (dias.has(dia(f))) { n++; f.setDate(f.getDate() - 1); }
      return n;
    },
    // --- sincronización con la cuenta (la usa js/sesion.js) ---
    exportar() { const d = cargar(); return { lecciones: d.lecciones, ultima: d.ultima, dias: d.dias }; },
    // Une el progreso de la cuenta con el local: tarjetas y días se suman y gana la última lección más reciente. Solo guarda si algo cambió.
    fusionar(otro) {
      if (!otro || typeof otro !== 'object') return false;
      const d = cargar();
      let cambio = false;
      for (const [id, l] of Object.entries(otro.lecciones || {})) {
        if (!/^[a-z0-9-]{1,40}$/.test(id) || !l || !Array.isArray(l.h)) continue;
        const mio = d.lecciones[id] || { h: [] };
        const nuevas = lista(l.h).filter((i) => !mio.h.includes(i));
        if (!nuevas.length) continue;
        mio.h = [...mio.h, ...nuevas].sort((a, b) => a - b);
        d.lecciones[id] = mio;
        cambio = true;
      }
      const dias = (Array.isArray(otro.dias) ? otro.dias : []).filter((x) => typeof x === 'string' && DIA.test(x) && !d.dias.includes(x));
      if (dias.length) { d.dias = [...d.dias, ...dias].sort().slice(-366); cambio = true; }
      const u = otro.ultima;
      if (u && typeof u.id === 'string' && typeof u.href === 'string' && HREF.test(u.href) && typeof u.titulo === 'string' && (u.t || 0) > ((d.ultima && d.ultima.t) || 0)) {
        d.ultima = { id: u.id, href: u.href, titulo: u.titulo.slice(0, 120), t: u.t };
        cambio = true;
      }
      if (cambio) guardar(d);
      return cambio;
    },
    // Cuenta a la que pertenecen los datos de este navegador (sin argumento la devuelve).
    dueno(id) {
      const d = cargar();
      if (id === undefined) return d.u || null;
      if (d.u === id) return id;
      d.u = id;
      guardar(d);
      return id;
    },
    reiniciar() { guardar(vacio()); },
  };
  window.Progreso = P;

  /* ---------- portada: avance en las lecciones, las unidades y el panel "Tu progreso" ---------- */
  const idDeHref = (href) => {
    const m = /practica\.html\?u=(\d+)&l=(\d+)/.exec(href || '');
    return m ? `u${m[1]}l${m[2]}` : /que-es-linux/.test(href || '') ? 'que-es-linux' : null;
  };
  const el = (tag, clase, texto, padre) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    if (padre) padre.append(e);
    return e;
  };

  function pintarPortada() {
    const enlaces = [...document.querySelectorAll('a.lec')];
    if (!enlaces.length) return;
    const completa = {}; // id -> true/false
    let primera = null, tarjetas = 0;
    enlaces.forEach((a) => {
      const id = idDeHref(a.getAttribute('href')), n = a.querySelector('.n');
      if (!id || !n) return;
      if (!n.dataset.base) { n.dataset.base = n.textContent; n.dataset.total = parseInt(n.textContent, 10); }
      const total = +n.dataset.total, hechas = P.hechas(id, total), lista = hechas >= total;
      a.classList.toggle('completa', lista);
      a.classList.toggle('en-curso', hechas > 0 && !lista);
      n.textContent = lista ? `Completada · ${n.dataset.base}` : hechas ? `${hechas} de ${total} tarjetas` : n.dataset.base;
      let barra = a.querySelector('.lec-barra');
      if (hechas) {
        if (!barra) { barra = el('i', 'lec-barra', null, a); el('b', null, null, barra); }
        barra.firstChild.style.width = Math.round((hechas / total) * 100) + '%';
      } else if (barra) barra.remove();
      completa[id] = lista;
      tarjetas += hechas;
      if (!lista && !primera) primera = { href: a.getAttribute('href'), titulo: a.querySelector('h4').textContent };
    });

    document.querySelectorAll('.unidad').forEach((u) => {
      const c = u.querySelector('.u-cnt');
      if (!c) return;
      if (!c.dataset.base) c.dataset.base = c.textContent;
      const ok = u.querySelectorAll('a.lec.completa').length;
      c.textContent = ok ? `${ok} de ${u.querySelectorAll('a.lec').length} lecciones` : c.dataset.base;
    });

    let panel = document.getElementById('mi-progreso');
    if (!tarjetas) { if (panel) panel.remove(); return; }
    if (!panel) {
      const ancla = document.querySelector('.hero .meta');
      if (!ancla) return;
      panel = el('div', 'mi-progreso');
      panel.id = 'mi-progreso';
      ancla.after(panel);
    }
    panel.replaceChildren();
    const total = Object.keys(completa).length, hechasTodas = Object.values(completa).filter(Boolean).length, racha = P.racha();
    const datos = el('div', 'mp-datos', null, panel);
    el('p', 'mp-t', `Tu progreso: ${hechasTodas} de ${total} lecciones`, datos);
    el('p', 'mp-s', `${tarjetas} tarjetas resueltas` + (racha ? ` · racha de ${racha} ${racha === 1 ? 'día' : 'días'}` : ''), datos);
    el('i', null, null, el('span', 'mp-carril', null, datos)).style.width = Math.round((hechasTodas / total) * 100) + '%';

    const acc = el('div', 'mp-acc', null, panel), u = P.ultima();
    const dest = u && completa[u.id] === false && HREF.test(u.href) ? { href: u.href, titulo: u.titulo, seguir: true } : primera && { ...primera, seguir: false };
    if (dest) el('a', 'btn', (dest.seguir ? 'Continuar: ' : 'Siguiente: ') + dest.titulo, acc).href = dest.href;
    else el('p', 'mp-s', 'Completaste todas las lecciones.', acc);
    const r = el('button', 'btn fantasma', 'Reiniciar progreso', acc);
    r.type = 'button';
    r.onclick = () => {
      const S = window.Sesion, cuenta = S && S.usuario ? ' También se borrará el de tu cuenta.' : '';
      if (confirm('¿Borrar todo tu progreso? No se puede deshacer.' + cuenta)) (S && S.reiniciar ? S.reiniciar() : P.reiniciar());
    };
  }

  addEventListener('progreso:cambio', pintarPortada);
  addEventListener('storage', (e) => { if (e.key === CLAVE) pintarPortada(); }); // cambios hechos desde otra pestaña
  addEventListener('pageshow', pintarPortada); // al volver con "atrás" la portada puede estar vieja
  pintarPortada();
})();
