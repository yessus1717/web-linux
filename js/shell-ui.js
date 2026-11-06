/* LinuxPath · interfaz de la terminal de práctica.
   Conecta js/shell-motor.js (la shell simulada) con la página: escribe el prompt y la salida, recorre el historial con ↑ ↓,
   completa con Tab, limpia con Ctrl+L y mantiene al día el panel con el árbol de archivos. */
(() => {
  const Shell = window.LinuxShell;
  const $ = (id) => document.getElementById(id);
  const salida = $('sh-salida'), entrada = $('sh-entrada'), promptEl = $('sh-prompt'), cuerpo = $('sh-cuerpo');
  const arbol = $('sh-arbol'), titulo = $('sh-titulo');
  if (!Shell || !salida || !entrada) return;

  let sh, pos = 0, borrador = '', tabPrev = null;

  const el = (tag, clase, texto) => {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto != null) e.textContent = texto;
    return e;
  };

  // Siempre con textContent: lo que escribe la persona o devuelve un comando nunca se interpreta como HTML.
  const promptNodos = () => {
    const p = sh.prompt();
    const f = document.createDocumentFragment();
    f.append(el('span', 'pu', `${p.usuario}@${p.host}`), ':', el('span', 'pd', p.ruta), '$ ');
    return f;
  };

  // El motor marca directorios y ejecutables con \x01d…\x02 y \x01x…\x02 para poder colorearlos.
  const pintar = (texto, p) => {
    const re = /\x01([dx])([^\x02]*)\x02/g;
    let i = 0, m;
    while ((m = re.exec(texto))) {
      if (m.index > i) p.append(texto.slice(i, m.index));
      p.append(el('span', m[1] === 'd' ? 'cd' : 'cx', m[2]));
      i = re.lastIndex;
    }
    if (i < texto.length) p.append(texto.slice(i));
  };

  const imprimir = (items) => {
    for (const { k, s } of items) {
      if (s === '') continue;
      const t = s.endsWith('\n') ? s.slice(0, -1) : s;
      for (const l of t.split('\n')) {
        const p = el('p', k === 'e' ? 'e' : 'o');
        pintar(l, p);
        salida.append(p);
      }
    }
  };

  const eco = (texto) => {
    const p = el('p', 'eco');
    p.append(promptNodos(), texto);
    salida.append(p);
  };

  const pintarArbol = () => {
    if (!arbol) return;
    arbol.replaceChildren(...sh.arbol().map((f) => el('p', (f.dir ? 'dir' : '') + (f.aqui ? ' aqui' : ''), f.texto)));
  };

  const actualizar = () => {
    promptEl.replaceChildren(promptNodos());
    if (titulo) titulo.textContent = `${sh.prompt().usuario}@linuxpath: ${sh.prompt().ruta}`;
    pintarArbol();
  };

  const bajar = () => { cuerpo.scrollTop = cuerpo.scrollHeight; };

  const bienvenida = () => {
    for (const t of ['Bienvenida a la terminal de LinuxPath.', 'Todo ocurre en un sistema simulado: crea, mueve y borra sin miedo, nada toca tu equipo.', 'Escribe help para ver los comandos y man COMANDO para ver cómo se usa.', '']) {
      salida.append(el('p', 'meta', t || '\u200b'));
    }
  };

  const enviar = (txt) => {
    eco(txt);
    const r = sh.ejecutar(txt);
    if (r.limpiar) salida.replaceChildren();
    imprimir(r.salida);
    entrada.value = '';
    pos = sh.history.length;
    borrador = '';
    tabPrev = null;
    actualizar();
    bajar();
  };

  const iniciar = () => {
    sh = new Shell();
    salida.replaceChildren();
    entrada.value = '';
    pos = 0; borrador = ''; tabPrev = null;
    bienvenida();
    actualizar();
    bajar();
  };

  entrada.addEventListener('input', () => { tabPrev = null; });

  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enviar(entrada.value);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pos > 0) { if (pos === sh.history.length) borrador = entrada.value; pos--; entrada.value = sh.history[pos]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (pos < sh.history.length) { pos++; entrada.value = pos === sh.history.length ? borrador : sh.history[pos]; }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const r = sh.completar(entrada.value);
      if (r.linea !== entrada.value) { entrada.value = r.linea; tabPrev = null; }
      else if (r.opciones.length) {
        if (tabPrev === entrada.value) {
          eco(entrada.value);
          const p = el('p', 'o');
          pintar(r.opciones.join('  '), p);
          salida.append(p);
          bajar();
        } else tabPrev = entrada.value;
      }
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
      e.preventDefault();
      salida.replaceChildren();
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      if (entrada.selectionStart !== entrada.selectionEnd) return; // con texto seleccionado, copiar con normalidad
      e.preventDefault();
      eco(entrada.value + '^C');
      entrada.value = '';
      pos = sh.history.length;
      bajar();
    }
  });

  // Clic en la terminal = enfocar el prompt, salvo que la persona esté seleccionando texto para copiarlo.
  cuerpo.addEventListener('click', () => { if (!window.getSelection().toString()) entrada.focus(); });

  // Los ejemplos rellenan el prompt: la persona decide cuándo pulsar Enter.
  document.querySelectorAll('.chip-cmd').forEach((b) => b.addEventListener('click', () => {
    entrada.value = b.dataset.cmd;
    entrada.focus();
    entrada.setSelectionRange(entrada.value.length, entrada.value.length);
  }));

  const reiniciar = $('sh-reiniciar');
  if (reiniciar) reiniciar.addEventListener('click', () => { iniciar(); entrada.focus(); });

  iniciar();
  if (window.matchMedia('(hover: hover)').matches) entrada.focus({ preventScroll: true });
})();
