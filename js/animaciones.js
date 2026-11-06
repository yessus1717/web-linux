/* Animaciones de LinuxPath: aparición al hacer scroll, barra que se oscurece y contador.
   Si la persona prefiere menos movimiento, no se hace nada y todo se ve estático. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const nav = document.querySelector('.nav');
  if (nav) {
    const marcar = () => nav.classList.toggle('scrolled', scrollY > 8);
    marcar();
    addEventListener('scroll', marcar, { passive: true });
  }
  if (!('IntersectionObserver' in window)) return;

  const contar = (el) => {
    const fin = +el.dataset.contar, t0 = performance.now();
    const paso = (t) => {
      const k = Math.min((t - t0) / 1200, 1);
      el.textContent = Math.round(fin * (1 - (1 - k) ** 3));
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };

  // Al terminar la entrada se quita la clase para que el hover vuelva a funcionar con normalidad
  const limpiar = (el) => function fin(ev) {
    if (ev.propertyName !== 'transform' || !el.classList.contains('visto')) return;
    el.classList.remove('revela', 'visto');
    el.removeEventListener('transitionend', fin);
  };

  const io = new IntersectionObserver((entradas) => entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    io.unobserve(el);
    el.addEventListener('transitionend', limpiar(el));
    el.classList.add('visto');
    const n = el.querySelector('[data-contar]');
    if (n) contar(n);
  }), { threshold: 0.15 });

  document.querySelectorAll('.hero .wrap > *, .sec .wrap > *:not(.tres):not(.ruta):not(.capas), .tres > *, .ruta > *, .capas > *')
    .forEach((el) => {
      el.style.setProperty('--i', Math.min([...el.parentNode.children].indexOf(el), 6));
      el.classList.add('revela');
      io.observe(el);
    });
})();
