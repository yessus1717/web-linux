/* LinuxPath · sesión con Supabase. Pregunta a Supabase Auth quién está conectado, muestra "Entrar" o tu nombre + "Salir" en la barra
   y sincroniza el progreso con la cuenta (tabla "progreso"): al abrir una página se une el progreso de este navegador con el de la cuenta,
   y cada cambio se sube (con una pequeña espera para agrupar). Si hay otra cuenta distinta en este navegador, se descarta el progreso
   local de la anterior. Si Supabase no está configurado (js/supabase-config.js) no hace nada: el sitio sigue con el progreso local.
   Si algo no se alcanza a subir (cerrar la pestaña, sin conexión), queda en este navegador y se sube en la próxima visita.
   window.Sesion: { usuario, servidor, configurado, cliente (supabase-js o null), lista (promesa del usuario o null), reiniciar() }.
   Necesita cargados antes: supabase-js (CDN), js/supabase-config.js y js/progreso.js. */
(() => {
  const P = window.Progreso;
  if (!P) return;

  const cfg = window.SUPABASE_CONFIG || {};
  const configurado = !!(window.supabase && cfg.url && cfg.anonKey && !/TU-PROYECTO|TU_ANON_KEY/.test(cfg.url + cfg.anonKey));
  // PKCE: los enlaces del correo traen ?code=... (se queda en la URL aunque la página reescriba el #hash)
  const sb = configurado ? window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;

  const el = (tag, clase, texto) => { const e = document.createElement(tag); e.className = clase; e.textContent = texto; return e; };
  const publico = (u) => ({
    id: u.id,
    email: u.email,
    nombre: (u.user_metadata && u.user_metadata.nombre) || String(u.email || '').split('@')[0],
  });

  const S = { usuario: null, servidor: configurado, configurado, cliente: sb, lista: null };
  window.Sesion = S;
  let aplicando = false, subiendo = false, otraVez = false, saliendo = false, timer = 0;

  // Cambios que vienen de la cuenta no deben volver a dispararse como "cambios nuevos"
  const sinEco = (fn) => { aplicando = true; try { fn(); } finally { aplicando = false; } };

  // Une lo que hay en la cuenta con lo local (P.fusionar valida todo lo que recibe) y sube el resultado
  async function subir() {
    if (!sb || !S.usuario) return;
    if (subiendo) { otraVez = true; return; }
    subiendo = true;
    const uid = S.usuario.id;
    try {
      const { data, error } = await sb.from('progreso').select('datos').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      if (data && data.datos) sinEco(() => P.fusionar(data.datos));
      const r = await sb.from('progreso').upsert({ user_id: uid, datos: P.exportar(), actualizado: new Date().toISOString() });
      if (r.error) throw r.error;
    } catch (e) { /* sin conexión: se vuelve a intentar con el próximo cambio o en la próxima visita */ }
    subiendo = false;
    if (otraVez) { otraVez = false; subir(); }
  }
  addEventListener('progreso:cambio', () => {
    if (aplicando || !S.usuario) return;
    clearTimeout(timer);
    timer = setTimeout(() => { timer = 0; subir(); }, 800);
  });
  addEventListener('pagehide', () => { if (S.usuario && timer) { clearTimeout(timer); timer = 0; subir(); } });

  async function salir() {
    saliendo = true;
    if (timer) { clearTimeout(timer); timer = 0; await subir(); } // no perder lo último que hiciste
    try { await sb.auth.signOut({ scope: 'local' }); } catch (e) { /* aun así se limpia lo local */ } // local: no cierra tus otros dispositivos
    S.usuario = null;
    sinEco(() => P.reiniciar()); // en un equipo compartido no debe quedar el progreso de quien se fue
    location.href = 'index.html';
  }

  // Lo usa el botón "Reiniciar progreso" de la portada: con sesión borra también el de la cuenta
  S.reiniciar = async () => {
    if (S.usuario && sb) {
      try {
        const { error } = await sb.from('progreso').delete().eq('user_id', S.usuario.id);
        if (error) throw error;
      } catch (e) { alert('No se pudo borrar el progreso de tu cuenta. Inténtalo de nuevo.'); return; }
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
      const volver = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      const a = el('a', 'nav-entrar', 'Entrar');
      a.href = 'cuenta.html?next=' + volver;
      const r = el('a', 'nav-registro', 'Crear cuenta');
      r.href = 'cuenta.html?next=' + volver + '#registro';
      c.append(a, r);
    }
    const btn = nav.querySelector('.btn');
    if (btn) btn.before(c); else nav.append(c);
  }

  S.lista = (async () => {
    if (!sb) return null;
    // Si la sesión se cierra en otra pestaña, esta se actualiza (sin llamar a Supabase dentro del callback)
    sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT' && S.usuario && !saliendo) location.reload(); });
    let sesion = null;
    try {
      const r = await sb.auth.getSession(); // espera a que termine el intercambio del ?code= si venimos del correo
      if (r.error) throw r.error;
      sesion = r.data.session;
    } catch (e) { /* sin sesión */ }
    S.usuario = sesion ? publico(sesion.user) : null;
    pintarNav();
    const acceso = document.getElementById('acceso'); // sección de la portada que invita a crear cuenta: solo sin sesión
    if (acceso) acceso.hidden = !!S.usuario;
    if (S.usuario) {
      sinEco(() => {
        if (P.dueno() && P.dueno() !== S.usuario.id) P.reiniciar(); // otra cuenta usó antes este navegador
        P.dueno(S.usuario.id);
      });
      subir(); // une con lo de la cuenta y sube lo que solo estaba en este navegador
    }
    return S.usuario;
  })();
})();
