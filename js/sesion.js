/* LinuxPath · sesión. Pregunta a server.js quién está conectado, muestra "Entrar" o tu nombre + "Salir" en la barra y sincroniza
   el progreso con la cuenta: al abrir una página se une el progreso de este navegador con el de la cuenta, y cada cambio se sube
   (con una pequeña espera para agrupar). Si hay otra cuenta distinta en este navegador, se descarta el progreso local de la anterior.
   Sin servidor (file:// o python -m http.server) no hace nada: el sitio sigue funcionando con el progreso local.
   window.Sesion: { usuario, servidor, lista (promesa del usuario o null), reiniciar() }. Necesita js/progreso.js cargado antes. */
(() => {
  const P = window.Progreso;
  if (!P) return;

  const api = (ruta, metodo = 'GET', cuerpo) => fetch(ruta, {
    method: metodo, credentials: 'same-origin',
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const el = (tag, clase, texto) => { const e = document.createElement(tag); e.className = clase; e.textContent = texto; return e; };

  const S = { usuario: null, servidor: false, lista: null };
  window.Sesion = S;
  let aplicando = false, subiendo = false, otraVez = false, timer = 0;

  // Cambios que vienen de la cuenta no deben volver a dispararse como "cambios nuevos"
  const sinEco = (fn) => { aplicando = true; try { fn(); } finally { aplicando = false; } };

  async function subir() {
    if (!S.usuario) return;
    if (subiendo) { otraVez = true; return; }
    subiendo = true;
    try {
      const r = await api('/api/progreso', 'PUT', P.exportar());
      if (r.ok) { const unido = await r.json(); sinEco(() => P.fusionar(unido)); }
    } catch (e) { /* sin conexión: se vuelve a intentar con el próximo cambio */ }
    subiendo = false;
    if (otraVez) { otraVez = false; subir(); }
  }
  addEventListener('progreso:cambio', () => {
    if (aplicando || !S.usuario) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; subir(); }, 800);
  });
  addEventListener('pagehide', () => { if (S.usuario && timer) { clearTimeout(timer); timer = 0; fetch('/api/progreso', { method: 'PUT', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(P.exportar()) }).catch(() => {}); } });

  async function salir() {
    try { await api('/api/salir', 'POST', {}); } catch (e) { /* aun así se limpia lo local */ }
    sinEco(() => P.reiniciar()); // en un equipo compartido no debe quedar el progreso de quien se fue
    location.href = 'index.html';
  }

  // Lo usa el botón "Reiniciar progreso" de la portada: con sesión borra también el de la cuenta
  S.reiniciar = async () => {
    if (S.usuario) {
      try { const r = await api('/api/progreso', 'DELETE'); if (!r.ok) throw new Error(); }
      catch (e) { alert('No se pudo borrar el progreso de tu cuenta. Inténtalo de nuevo.'); return; }
    }
    const dueno = P.dueno();
    P.reiniciar();
    if (dueno) sinEco(() => P.dueno(dueno));
  };

  function pintarNav() {
    const nav = document.querySelector('.nav');
    if (!nav || nav.querySelector('.nav-cuenta')) return;
    const c = document.createElement('div');
    c.className = 'nav-cuenta';
    if (S.usuario) {
      const b = el('button', 'nav-salir', 'Salir');
      b.type = 'button';
      b.onclick = salir;
      const n = el('span', 'nav-user', S.usuario.nombre);
      n.title = S.usuario.nombre;
      c.append(n, b);
    } else {
      const a = el('a', 'nav-entrar', 'Entrar');
      a.href = 'cuenta.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
      c.append(a);
    }
    const btn = nav.querySelector('.btn');
    if (btn) btn.before(c); else nav.append(c);
  }

  S.lista = (async () => {
    let datos;
    try {
      const r = await api('/api/yo');
      if (!r.ok || !/json/.test(r.headers.get('content-type') || '')) return null;
      datos = await r.json();
    } catch (e) { return null; }
    S.servidor = true;
    S.usuario = datos.usuario || null;
    pintarNav();
    if (S.usuario) {
      sinEco(() => {
        if (P.dueno() && P.dueno() !== S.usuario.id) P.reiniciar(); // otra cuenta usó antes este navegador
        P.dueno(S.usuario.id);
        P.fusionar(datos.progreso);
      });
      subir(); // sube lo que solo estaba en este navegador
    }
    return S.usuario;
  })();
})();
