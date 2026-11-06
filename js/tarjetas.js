/* Recorrido por tarjetas: la tarjeta activa depende de cuánto se ha bajado por la sección. Con "reducir movimiento" o sin JS se queda como una lista normal.
   También avisa a js/progreso.js: las tarjetas sin ejercicio (sin data-ejercicio) cuentan como hechas cuando se llega a ellas;
   las de ejercicio las marca ejercicios.js al resolverlas. La lección se identifica con data-leccion en la sección .recorrido. */
(() => {
  const rec = document.querySelector('.recorrido');
  if (!rec) return;

  const tarjetas = [...rec.querySelectorAll('.tarjeta')];
  const n = tarjetas.length;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = window.Progreso, id = rec.dataset.leccion;

  if (P && id) P.visitar(id, document.title.split(' | ')[0]);
  const vistas = (ks) => {
    ks = ks.filter((k) => !tarjetas[k].dataset.ejercicio);
    if (!P || !id || !ks.length) return;
    P.marcar(id, ks);
    ks.forEach((k) => tarjetas[k].classList.add('hecha'));
  };

  // Lleva la página hasta la tarjeta i (la usa el botón "Continuar" de la lección)
  window.irATarjeta = (i) => {
    if (reducido) { tarjetas[i].scrollIntoView({ block: 'center' }); return; }
    const arriba = rec.getBoundingClientRect().top + scrollY;
    scrollTo({ top: arriba + ((i + 0.5) / n) * (rec.offsetHeight - innerHeight), behavior: 'smooth' });
  };

  if (reducido) {
    const ver = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) vistas([tarjetas.indexOf(e.target)]); }), { threshold: 0.6 });
    tarjetas.forEach((t) => ver.observe(t));
    return;
  }

  const numero = rec.querySelector('.paso');
  const barra = rec.querySelector('.barra');
  let actual = -1, marcada = -1;

  const actualizar = () => {
    const r = rec.getBoundingClientRect();
    const p = Math.min(Math.max(-r.top / (r.height - innerHeight), 0), 0.9999);
    const i = Math.floor(p * n);
    // Solo cuenta como vista cuando el recorrido ya está en pantalla (no al abrir la página arriba del todo)
    if (r.top < innerHeight * 0.3 && i > marcada) {
      vistas(Array.from({ length: i - marcada }, (_, k) => marcada + 1 + k));
      marcada = i;
    }
    if (i === actual) return;
    actual = i;
    tarjetas.forEach((t, k) => {
      t.classList.toggle('activa', k === i);
      t.classList.toggle('pasada', k < i);
    });
    numero.textContent = i + 1;
    barra.style.transform = `scaleX(${(i + 1) / n})`;
  };

  rec.classList.add('listo');
  addEventListener('scroll', actualizar, { passive: true });
  addEventListener('resize', actualizar);
  actualizar();
})();
