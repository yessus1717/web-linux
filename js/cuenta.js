/* LinuxPath · página de cuenta: pestañas Entrar / Crear cuenta, validación en el navegador y envío a la API de server.js.
   Si ya hay sesión abierta, redirige. El destino viene en ?next=pagina.html (solo páginas del propio sitio). */
(() => {
  const $ = (s) => document.querySelector(s);
  const formas = { entrar: $('#form-entrar'), registro: $('#form-registro') };
  const pestanas = { entrar: $('#tab-entrar'), registro: $('#tab-registro') };
  const aviso = $('#aviso');
  const NEXT = /^[\w.-]{1,60}\.html(\?[\w=&.-]{0,40})?$/;
  const destino = () => { const n = new URLSearchParams(location.search).get('next'); return n && NEXT.test(n) ? n : 'index.html'; };

  function avisar(mensaje, campo) {
    document.querySelectorAll('.caja-cuenta [aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    aviso.hidden = !mensaje;
    aviso.textContent = mensaje || '';
    if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); }
  }

  function mostrar(cual) {
    for (const k in formas) { formas[k].hidden = k !== cual; pestanas[k].setAttribute('aria-selected', String(k === cual)); }
    $('#titulo').textContent = cual === 'entrar' ? 'Entra para guardar tu progreso' : 'Crea tu cuenta';
    avisar('');
    history.replaceState(null, '', cual === 'registro' ? '#registro' : location.pathname + location.search);
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

  async function enviar(e, cual) {
    e.preventDefault();
    const f = formas[cual], d = Object.fromEntries(new FormData(f));
    const fallo = validar(cual, d);
    if (fallo) return avisar(fallo.msg, f.elements[fallo.campo]);
    const boton = f.querySelector('button[type=submit]'), texto = boton.textContent;
    boton.disabled = true; boton.textContent = 'Un momento…'; avisar('');
    try {
      const cuerpo = cual === 'entrar' ? { email: d.email, password: d.password } : { nombre: d.nombre, email: d.email, password: d.password };
      const r = await fetch(cual === 'entrar' ? '/api/entrar' : '/api/registro', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return avisar(j.error || 'No se pudo completar la solicitud.', j.campo && f.elements[j.campo]);
      location.href = destino();
    } catch (err) {
      avisar('No se pudo conectar con el servidor. ¿Está en marcha? Arráncalo con: node server.js');
    } finally { boton.disabled = false; boton.textContent = texto; }
  }
  formas.entrar.onsubmit = (e) => enviar(e, 'entrar');
  formas.registro.onsubmit = (e) => enviar(e, 'registro');

  mostrar(location.hash === '#registro' ? 'registro' : 'entrar');
  if (window.Sesion) {
    window.Sesion.lista.then((u) => {
      if (u) location.replace(destino());
      else if (!window.Sesion.servidor) avisar('El servidor de cuentas no está activo. Arráncalo con: node server.js y abre http://localhost:8000');
    });
  }
})();
