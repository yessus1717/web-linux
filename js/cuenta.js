/* LinuxPath · página de cuenta: pestañas Entrar / Crear cuenta, validación en el navegador y envío a Supabase Auth (cliente en window.Sesion.cliente).
   Si ya hay sesión abierta, redirige. El destino viene en ?next=pagina.html (solo páginas del propio sitio).
   Si el proyecto de Supabase pide confirmar el correo, el registro avisa y la cuenta queda lista al abrir el enlace que llega al correo. */
(() => {
  const $ = (s) => document.querySelector(s);
  const S = window.Sesion;
  const formas = { entrar: $('#form-entrar'), registro: $('#form-registro') };
  const pestanas = { entrar: $('#tab-entrar'), registro: $('#tab-registro') };
  const aviso = $('#aviso');
  const NEXT = /^[\w.-]{1,60}\.html(\?[\w=&.-]{0,40})?$/;
  const destino = () => { const n = new URLSearchParams(location.search).get('next'); return n && NEXT.test(n) ? n : 'index.html'; };

  function avisar(mensaje, campo, ok) {
    document.querySelectorAll('.caja-cuenta [aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    aviso.hidden = !mensaje;
    aviso.textContent = mensaje || '';
    aviso.classList.toggle('ok', !!ok);
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
  }

  function mostrar(cual, historial = true) {
    for (const k in formas) { formas[k].hidden = k !== cual; pestanas[k].setAttribute('aria-selected', String(k === cual)); }
    $('#titulo').textContent = cual === 'entrar' ? 'Entra para guardar tu progreso' : 'Crea tu cuenta';
    avisar('');
    if (historial) history.replaceState(null, '', cual === 'registro' ? '#registro' : location.pathname + location.search);
  }
  for (const k in pestanas) pestanas[k].onclick = () => mostrar(k);

  const validar = (cual, d) => {
    if (cual === 'registro' && !/^[A-Za-z0-9_]{3,24}$/.test(d.nombre.trim())) return { campo: 'nombre', msg: 'El nombre de usuario debe tener de 3 a 24 caracteres: letras, números o guion bajo.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return { campo: 'email', msg: 'Escribe un correo válido.' };
    if (cual === 'entrar') return d.password ? null : { campo: 'password', msg: 'Escribe tu contraseña.' };
    if (d.password.length < 8) return { campo: 'password', msg: 'La contraseña debe tener al menos 8 caracteres.' };
    if (d.password !== d.repetir) return { campo: 'repetir', msg: 'Las contraseñas no coinciden.' };
    return null;
  };

  // Errores de Supabase (en inglés) → mensajes en español, con el campo que corresponde
  function traducir(e) {
    const m = String((e && e.message) || '').toLowerCase(), c = (e && e.code) || '';
    if (c === 'invalid_credentials' || m.includes('invalid login credentials')) return { msg: 'Correo o contraseña incorrectos.' };
    if (c === 'email_not_confirmed' || m.includes('email not confirmed')) return { msg: 'Falta confirmar tu correo. Abre el enlace que te enviamos al registrarte.' };
    if (c === 'user_already_exists' || m.includes('already registered')) return { msg: 'Ese correo ya tiene una cuenta.', campo: 'email' };
    if (c === 'weak_password' || m.includes('password should')) return { msg: 'La contraseña es demasiado débil. Usa al menos 8 caracteres y mezcla letras y números.', campo: 'password' };
    if (c === 'over_email_send_rate_limit') return { msg: 'Se enviaron demasiados correos de confirmación. Espera un rato e inténtalo de nuevo.' };
    if (c === 'over_request_rate_limit' || e.status === 429) return { msg: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
    if (m.includes('database error saving new user')) return { msg: 'No se pudo crear la cuenta. Es posible que ese nombre de usuario ya esté en uso.', campo: 'nombre' };
    if (m.includes('failed to fetch') || m.includes('network') || (e && e.name === 'AuthRetryableFetchError')) return { msg: 'No se pudo conectar con Supabase. Revisa tu conexión a internet.' };
    return { msg: 'No se pudo completar la solicitud. Inténtalo de nuevo.' };
  }

  const sinConfigurar = () => (window.supabase
    ? 'Falta configurar Supabase: abre js/supabase-config.js y pon la URL y la clave anon de tu proyecto.'
    : 'No se pudo cargar la librería de Supabase. Revisa tu conexión a internet y recarga la página.');

  async function enviar(e, cual) {
    e.preventDefault();
    const sb = S && S.cliente;
    if (!sb) return avisar(sinConfigurar());
    const f = formas[cual], d = Object.fromEntries(new FormData(f));
    const invalido = validar(cual, d);
    if (invalido) return avisar(invalido.msg, f.elements[invalido.campo]);
    const boton = f.querySelector('button[type=submit]'), texto = boton.textContent;
    boton.disabled = true; boton.textContent = 'Un momento…'; avisar('');
    const fallo = (err) => { const t = traducir(err); avisar(t.msg, t.campo && f.elements[t.campo]); };
    try {
      const email = d.email.trim();
      if (cual === 'entrar') {
        const { error } = await sb.auth.signInWithPassword({ email, password: d.password });
        if (error) return fallo(error);
        location.href = destino();
        return;
      }
      const nombre = d.nombre.trim();
      const libre = await sb.rpc('nombre_disponible', { n: nombre });
      if (libre.error) return fallo(libre.error);
      if (!libre.data) return avisar('Ese nombre de usuario ya está en uso.', f.elements.nombre);
      const { data, error } = await sb.auth.signUp({
        email, password: d.password,
        options: { data: { nombre }, emailRedirectTo: new URL('cuenta.html', location.href).href },
      });
      if (error) return fallo(error);
      // Con la confirmación de correo activada, un correo ya registrado no da error: devuelve un usuario sin identidades
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return fallo({ code: 'user_already_exists' });
      if (data.session) { location.href = destino(); return; }
      f.reset();
      avisar(`Te enviamos un correo a ${email}. Ábrelo y pulsa el enlace para activar tu cuenta; luego vuelve aquí para entrar.`, null, true);
    } catch (err) {
      fallo(err);
    } finally { boton.disabled = false; boton.textContent = texto; }
  }
  formas.entrar.onsubmit = (e) => enviar(e, 'entrar');
  formas.registro.onsubmit = (e) => enviar(e, 'registro');

  mostrar(location.hash === '#registro' ? 'registro' : 'entrar', false);

  // Si venimos de un enlace del correo que falló (caducado, ya usado…) Supabase deja el motivo en la URL
  const url = new URLSearchParams(location.search), hash = new URLSearchParams(location.hash.slice(1));
  if (url.get('error') || hash.get('error')) avisar('El enlace del correo no es válido o ya caducó. Entra con tu correo y contraseña; si no puedes, crea la cuenta de nuevo.');
  else if (!S || !S.configurado) avisar(sinConfigurar());

  if (S && S.lista) S.lista.then((u) => { if (u) location.replace(destino()); });
})();
