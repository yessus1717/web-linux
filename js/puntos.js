/* Fondo de puntos de la portada: los puntos cercanos al cursor crecen, se tiñen
   con un degradado púrpura, azul y menta, y se apartan un poco; al alejarte vuelven a su sitio con suavidad.
   Si no hay JS, el dispositivo es táctil o se prefiere menos movimiento, se queda
   la cuadrícula estática de CSS (.portada::before). */
(() => {
  const portada = document.querySelector('.portada');
  const canvas = portada && portada.querySelector('.puntos');
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  // Ajustes de la animación
  const PASO = 24;       // separación entre puntos (igual que la cuadrícula de CSS)
  const ALCANCE = 170;   // radio de influencia del cursor, en px
  const EMPUJE = 8;      // cuánto se apartan los puntos del cursor, en px
  const CRECE = 2.8;     // cuánto aumenta el radio del punto bajo el cursor
  const BASE = 'rgba(255, 255, 255, 0.14)';
  const PURPURA = [175, 139, 255];
  const AZUL = [139, 172, 255];
  const MENTA = [82, 254, 202];

  let ancho = 0;
  let alto = 0;
  let cx = 0, cy = 0;   // posición suavizada del cursor
  let tx = 0, ty = 0;   // posición real del cursor
  let fuerza = 0;       // 0 = sin efecto, 1 = efecto completo
  let objetivo = 0;
  let raf = 0;

  const mezclar = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

  // Degradado según la cercanía al cursor: púrpura en el borde, azul en medio, menta en el centro
  const colorPunto = (cerca) => {
    const [r, g, b] = cerca < 0.5 ? mezclar(PURPURA, AZUL, cerca * 2) : mezclar(AZUL, MENTA, (cerca - 0.5) * 2);
    const alfa = 0.14 + 0.86 * Math.min(1, cerca * 1.5) * fuerza;
    return `rgba(${r}, ${g}, ${b}, ${alfa})`;
  };

  const dibujar = () => {
    ctx.clearRect(0, 0, ancho, alto);
    for (let y = PASO / 2; y < alto; y += PASO) {
      for (let x = PASO / 2; x < ancho; x += PASO) {
        let px = x, py = y, f = 0, cerca = 0;
        if (fuerza > 0.001) {
          const dx = x - cx, dy = y - cy;
          const d = Math.hypot(dx, dy);
          if (d < ALCANCE) {
            cerca = 1 - d / ALCANCE;
            f = cerca ** 2 * fuerza;
            if (d > 0) { px += (dx / d) * f * EMPUJE; py += (dy / d) * f * EMPUJE; }
          }
        }
        ctx.fillStyle = f > 0.002 ? colorPunto(cerca) : BASE;
        ctx.beginPath();
        ctx.arc(px, py, 1 + CRECE * f, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const cuadro = () => {
    raf = 0;
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    fuerza += (objetivo - fuerza) * 0.12;
    const quieto = Math.abs(tx - cx) < 0.3 && Math.abs(ty - cy) < 0.3 && Math.abs(objetivo - fuerza) < 0.005;
    if (quieto && objetivo === 0) fuerza = 0;
    dibujar();
    if (!quieto) raf = requestAnimationFrame(cuadro); // se detiene cuando no hay nada que animar
  };

  const arrancar = () => { if (!raf) raf = requestAnimationFrame(cuadro); };

  const ajustar = () => {
    const caja = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = caja.width;
    alto = caja.height;
    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar();
  };

  portada.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const caja = canvas.getBoundingClientRect();
    tx = e.clientX - caja.left;
    ty = e.clientY - caja.top;
    if (fuerza < 0.02) { cx = tx; cy = ty; } // al entrar, el efecto nace bajo el cursor
    objetivo = ty < alto + ALCANCE ? 1 : 0;
    arrancar();
  });

  portada.addEventListener('pointerleave', () => { objetivo = 0; arrancar(); });

  portada.classList.add('puntos-activos'); // oculta la cuadrícula de CSS y muestra el canvas
  ajustar();
  new ResizeObserver(ajustar).observe(canvas);
})();
