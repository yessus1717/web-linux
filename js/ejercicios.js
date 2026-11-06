/* Lecciones de ejercicios: lee elementos/linuxpath-ejercicios.json y arma el mismo recorrido por tarjetas de la lección 1
   (el scroll lo maneja js/tarjetas.js). Cada ejercicio es una tarjeta con su gráfico animado.
   Necesita un servidor local (python3 -m http.server): fetch no funciona con file://.
   Para un tipo nuevo: agrega su función y regístrala en TIPOS. */
(() => {
  const h = (t, c, x, p) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; if (p) p.append(e); return e; };
  const strip = (s) => String(s).replace(/<[^>]+>/g, '').trim();

  /* Validación de comandos. Linux distingue mayúsculas y minúsculas (ls -R no es ls -r), así que aquí también: solo se normalizan los espacios.
     Cuando la respuesta falla, el mensaje dice por qué: mayúsculas, mismo comando con otras opciones, comando del curso que no toca, o comando inexistente. */
  const norm = (s) => String(s).trim().replace(/\s+/g, ' ');
  const primeros = (c) => norm(c).split(/ ?(?:\|\||\||&&|;) ?/).map((p) => { const w = p.split(' '); return w[0] === 'sudo' && w[1] ? w[1] : w[0]; }).filter(Boolean);
  const conocidos = new Set(['sudo']); // primera palabra de cada comando del curso: separa «no existe» de «existe, pero no es lo que se pide»
  const registrar = (U) => Object.values(U).forEach((un) => un.lessons.forEach((l) => l.exercises.forEach((ex) => {
    [ex.command, ...(ex.steps || []).flatMap((s) => s.acceptedCommands || [s.command])].filter(Boolean).forEach((c) => primeros(c).forEach((w) => conocidos.add(w)));
  })));
  // Devuelve { ok } si coincide con algún comando aceptado; si no, { msg, cerca } (cerca = estaba a punto: conviene dejarle el texto para corregirlo).
  const evaluar = (txt, aceptados) => {
    const v = norm(txt), A = aceptados.map(norm), w = v.split(' ')[0];
    if (A.includes(v)) return { ok: true };
    if (A.some((a) => a.toLowerCase() === v.toLowerCase())) return { cerca: true, msg: 'Casi: Linux distingue mayúsculas de minúsculas y aquí cambian el significado. Revisa cómo lo escribiste.' };
    if (A.some((a) => a.split(' ')[0] === w)) return { cerca: true, msg: `«${w}» es el comando correcto, pero revisa las opciones o los argumentos.` };
    if (conocidos.has(w)) return { msg: `«${w}» existe, pero no es el comando que pide este objetivo.` };
    return { msg: `${w}: comando no encontrado. Revisa que esté bien escrito.` };
  };
  const mezclar = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((v) => v[1]);
  const main = document.getElementById('main');
  const ETQ = { concept: 'Entiende', 'type-command': 'Practica', 'autocomplete-command': 'Practica', 'multi-step-terminal': 'Practica',
    choice: 'Comprueba', order: 'Ordena', 'match-pairs': 'Relaciona', 'build-permission': 'Construye', 'predict-output': 'Predice' };

  fetch('elementos/linuxpath-ejercicios.json').then((r) => r.json()).then(iniciar).catch(() => {
    const c = h('div', 'card', null, h('div', 'wrap', null, h('section', 'sec lista', null, main)));
    h('h3', null, 'No se pudieron cargar los ejercicios', c);
    h('p', null, 'Abre el sitio con un servidor local: en la carpeta del proyecto ejecuta "python3 -m http.server" y entra en http://localhost:8000/practica.html', c);
  });

  /* La identidad de una lección es su "id" (campo del JSON), no su posición: así se pueden insertar lecciones nuevas sin romper el progreso guardado ni los enlaces.
     Las 30 originales conservan el id de siempre (u1l2…). Las nuevas llevan uno con nombre (p. ej. "tar-y-respaldos"): minúsculas, números y guiones, hasta 30 caracteres.
     Nunca cambies el id de una lección ya publicada: es la clave del progreso de la gente. */
  const ID_VALIDO = /^[a-z0-9-]{1,30}$/;
  function indexar(U) {
    const mapa = new Map();
    Object.entries(U).forEach(([u, un]) => un.lessons.forEach((les, i) => {
      if (!ID_VALIDO.test(les.id || '')) return console.error(`Lección sin id válido: unidad ${u}, posición ${i + 1} («${les.title}»). Añade "id" en el JSON.`);
      if (mapa.has(les.id)) return console.error(`id repetido en el JSON: "${les.id}" (unidad ${u}, posición ${i + 1}).`);
      mapa.set(les.id, { u, i, les });
    }));
    return mapa;
  }

  function iniciar(d) {
    const U = d.unitData, p = new URLSearchParams(location.search), mapa = indexar(U);
    registrar(U);
    // Enlace nuevo: ?id=navegacion. Enlace antiguo (?u=1&l=2): se busca por el id de siempre (u1l2), no por la posición, así sigue apuntando a la misma lección.
    const id = p.get('id') || (p.has('u') && p.has('l') ? `u${p.get('u')}l${p.get('l')}` : '');
    const hit = mapa.get(id);
    if (hit) leccion(U, hit.u, hit.i, hit.les); else selector(U);
  }

  function selector(U) {
    const w = h('div', 'wrap', null, h('section', 'sec lista', null, main));
    h('p', 'eyebrow', 'Ejercicios', w);
    h('h2', null, 'Elige una lección', w);
    Object.entries(U).forEach(([id, un]) => {
      const sec = h('div', 'un', null, w);
      h('p', 'etq', 'Unidad ' + id, sec);
      h('h3', null, un.title, sec);
      const grid = h('div', 'lecs', null, sec);
      un.lessons.forEach((les, i) => {
        const a = h('a', 'card', null, grid);
        a.href = `?id=${les.id}`;
        const nT = les.exercises.length, hT = Progreso.hechas(les.id, nT);
        if (hT >= nT) a.classList.add('completa'); else if (hT) a.classList.add('en-curso');
        h('span', 'etq', hT >= nT ? 'Completada · ' + nT + ' tarjetas' : hT ? `${hT} de ${nT} tarjetas` : nT + ' tarjetas', a);
        h('h3', null, les.title, a);
        h('p', null, les.sub, a);
      });
    });
  }

  function leccion(U, u, l, les) {
    const n = les.exercises.length, id = les.id, ya = Progreso.estan(id).filter((i) => i < n);
    document.title = les.title + ' | LinuxPath';
    const hero = h('section', 'hero', null, main), w = h('div', 'wrap', null, hero);
    h('div', 'arte', null, hero).setAttribute('aria-hidden', 'true');
    h('p', 'eyebrow', `Unidad ${u} · Lección ${l + 1}`, w);
    h('h1', null, les.title, w);
    h('p', 'lead', les.intro || les.sub, w);
    const pend = Progreso.primeraPendiente(id, n);
    const inicio = Object.assign(h('a', 'btn', ya.length ? (pend >= 0 ? `Continuar en la tarjeta ${pend + 1}` : 'Repasar la lección') : 'Empezar la lección'), { href: '#recorrido' });
    if (pend > 0 && ya.length) inicio.onclick = (e) => { e.preventDefault(); window.irATarjeta(pend); };
    h('div', 'acciones', null, w).append(inicio);
    h('p', 'meta', `${n} tarjetas` + (ya.length ? ` · ${ya.length} hechas` : ''), w);

    const rec = h('section', 'recorrido', null, main), pila = h('div', 'pila', null, h('div', 'escena', null, rec));
    rec.id = 'recorrido';
    rec.dataset.leccion = id;
    rec.style.setProperty('--n', n);
    les.exercises.forEach((ex, i) => {
      const c = h('article', 'card tarjeta', null, pila), hd = h('header', null, null, c);
      c.dataset.i = i;
      if (ex.type !== 'concept') c.dataset.ejercicio = '1'; // los conceptos cuentan como hechos al verlos (tarjetas.js); los ejercicios, al resolverlos (fb)
      if (ya.includes(i)) c.classList.add('hecha');
      h('span', 'etq', `${i + 1} de ${n} · ${ETQ[ex.type]}`, hd);
      h('h3', null, strip(ex.prompt), hd);
      const s = ex.type === 'concept' ? ex.body : ex.context;
      if (s) h('p', null, s, hd);
      const g = h('div', 'grafico', null, c);
      escena(g, ex, i);
      TIPOS[ex.type]({ ex, card: c, g });
    });
    const ct = h('p', 'contador', null, rec.querySelector('.escena')), a = h('span', null, null, ct);
    ct.setAttribute('aria-hidden', 'true');
    h('b', 'paso', '1', a);
    a.append(' / ' + n);
    h('span', 'barra', null, h('span', 'carril', null, ct)).style.transform = `scaleX(${1 / n})`;

    const cd = h('div', 'card', null, h('div', 'wrap', null, h('section', 'sec cierre', null, main)));
    h('h2', null, 'Lección completada', cd);
    h('p', null, 'Recorriste todas las tarjetas de ' + les.title + '.', cd);
    const sig = U[u].lessons[l + 1];
    Object.assign(h('a', 'btn', sig ? 'Siguiente: ' + sig.title : 'Todas las lecciones', cd), { href: sig ? `?id=${sig.id}` : 'practica.html' });
    document.body.append(Object.assign(document.createElement('script'), { src: 'js/tarjetas.js' }));
  }

  // Escenas animadas: cada tarjeta elige la que ilustra su comando o tema. Para una nueva, agrega su función a ESC y una regla a REG.
  const items = (a) => a.map((t, i) => `<span class="it" style="--i:${i}">${t}</span>`).join('');
  const ESC = {
    ls: () => `<div class="fila">${items(['documentos/', 'fotos/', 'proyectos/', 'notas.txt'])}</div>`,
    cd: () => `<div class="arbol rel"><i class="cur"></i>${['/', '├ home/', '│ └ user/', '│   └ proyectos/'].map((t, i) => `<span style="--i:${i}">${t}</span>`).join('')}</div>`,
    pwd: () => `<div class="fila">${['home', 'user', 'proyectos'].map((t, i) => `<span>/</span><span class="seg" style="--i:${i}">${t}</span>`).join('')}</div>`,
    crea: () => `<div class="fila">${items(['docs/', 'fotos/'])}<span class="it nuevo">nuevo/</span></div>`,
    borra: () => `<div class="fila">${items(['docs/', 'fotos/'])}<span class="it borra">viejo.txt</span></div>`,
    mueve: () => '<div class="fila sep"><span class="it">origen/</span><span class="it">destino/</span><span class="it vuela">foto.png</span></div>',
    doc: () => `<div class="doc2"><i class="hl"></i>${[80, 60, 90, 50, 70].map((w, i) => `<b style="width:${w}%;--i:${i}"></b>`).join('')}</div>`,
    busca: () => `<div class="fila">${['a.txt', 'b.log', 'c.sh', 'd.md', 'e.png', 'f.txt'].map((t, i) => `<span class="it brilla" style="--i:${i}">${t}</span>`).join('')}</div>`,
    flujo: (c) => {
      const p = c.split(/\s*(?:\||>>?)\s*/).filter(Boolean).slice(0, 3);
      if (p.length < 2) p.push('salida');
      return `<div class="fila sep">${p.map((t) => `<span class="it">${t.replace(/[<>&]/g, '')}</span>`).join('<i class="fl"></i>')}<i class="dot"></i></div>`;
    },
    perm: () => `<div class="fila">${['Usuario', 'Grupo', 'Otros'].map((n, r) => `<div class="rol"><small>${n}</small>${[...'rwx'].map((x, i) => `<i class="sq" style="--i:${r * 3 + i}">${x}</i>`).join('')}</div>`).join('')}</div>`,
    proc: () => `<div>${[70, 45, 85, 60].map((w, i) => `<div class="br${i === 3 ? ' mata' : ''}"><span>PID ${101 + i}</span><i style="--w:${w}%;--i:${i}"></i></div>`).join('')}</div>`,
    red: () => '<div class="fila sep"><span class="it">tu equipo</span><i class="fl"></i><span class="it">servidor</span><i class="dot ida"></i></div>',
    descarga: () => '<div class="fila"><span class="it">servidor</span><div class="prog"><i></i></div><span class="it">archivo.zip</span></div>',
    dns: () => '<div class="fila"><span class="it">ejemplo.com</span><i class="fl" style="max-width:48px"></i><span class="it ip">93.184.216.34</span></div>',
    hist: () => `<div class="hist">${['ls', 'cd proyectos', 'cat notas.txt', 'grep error log'].map((t, i) => `<p style="--i:${i}">$ ${t}</p>`).join('')}</div>`,
    capas: () => '<div class="capas-g"><i class="pulso"></i><div class="cap" style="--i:0">Tú</div><div class="cap so" style="--i:1">Terminal</div></div>',
    anid: () => '<div class="anidado" style="--i:0"><span class="etq">Terminal</span><div class="anidado" style="--i:1"><span class="etq">Shell · interpreta</span><div class="anidado nuc" style="--i:2"><span class="etq">Comando</span></div></div></div>',
  };
  const REG = [[/chmod|chown|chgrp|rwx|permiso|propietario/, 'perm'], [/\bps\b|\btop\b|\bkill|\bjobs\b|\bfg\b|\bbg\b|\bpid\b|proceso|segundo plano|señal/, 'proc'],
    [/curl|wget|descarg/, 'descarga'], [/\bping\b|traceroute|\bssh\b/, 'red'], [/\bdns\b|\bip\b|dominio|puerto/, 'dns'], [/\||>>?|tuber|redirec/, 'flujo'],
    [/\bfind\b|\blocate\b/, 'busca'], [/grep|\bcat\b|\bless\b|\bhead\b|\btail\b|\bwc\b/, 'doc'], [/history|historial|ctrl|atajo|autocompl|\btab\b/, 'hist'],
    [/\brm\b|rmdir|borr|elimin/, 'borra'], [/\bmv\b|\bcp\b|mueve|copia|renombr/, 'mueve'], [/mkdir|touch|crea/, 'crea'], [/\bcd\b|árbol|raíz|ruta/, 'cd'],
    [/\bpwd\b/, 'pwd'], [/\bls\b|lista/, 'ls']];
  function escena(g, ex, i) {
    const cmd = [ex.command, ex.correctOrder && ex.correctOrder.join(' '), ex.steps && ex.steps.map((s) => s.command).join(' '),
      ex.pairs && ex.pairs.map((p) => p.left).join(' '), ex.illustration && ex.illustration.filter((l) => l.you).map((l) => strip(l.text)).join(' ')].filter(Boolean).join(' ');
    let k = '';
    for (const t of [cmd.toLowerCase(), [ex.prompt, ex.context, ex.body].join(' ').toLowerCase()]) { const m = REG.find(([r]) => r.test(t)); if (m) { k = m[1]; break; } }
    h('div', 'esc', null, g).innerHTML = ESC[k || (i % 2 ? 'anid' : 'capas')](cmd);
  }

  const fb = (card, ok, t) => {
    const o = card.querySelector('.fb'); if (o) o.remove();
    h('p', 'fb ' + (ok ? 'ok' : 'mal'), t, card);
    if (ok) { card.classList.add('hecha'); Progreso.marcar(card.closest('.recorrido').dataset.leccion, +card.dataset.i); } // guarda el progreso al acertar
  };
  const aviso = (card, ok, ex, mal) => fb(card, ok, ok ? 'Correcto. ' + ex.explain : mal);

  // Conceptos: la escena va arriba y la conversación se escribe línea a línea
  function concept({ ex, g }) {
    const t = h('div', 'term', null, g);
    ex.illustration.forEach((l, i) => {
      const p = h('p', null, null, t);
      p.style.setProperty('--i', i);
      if (l.you) { h('span', 'ps', '$ ', p); h('span', 'tipea', strip(l.text), p).style.setProperty('--d', i * 0.7 + 0.2 + 's'); }
      else p.textContent = strip(l.text);
    });
  }

  function choice({ ex, g, card }) {
    const o = h('div', 'opciones', null, g);
    ex.options.forEach((t, i) => {
      const b = h('button', 'op', t, o);
      b.style.setProperty('--i', i);
      b.onclick = () => {
        if (i === ex.correctIdx) { b.classList.add('ok'); o.querySelectorAll('.op').forEach((x) => (x.disabled = true)); aviso(card, 1, ex); }
        else { b.classList.add('mal'); b.disabled = true; aviso(card, 0, ex, 'Casi. Prueba otra opción.'); }
      };
    });
  }

  function order({ ex, g, card }) {
    const w = h('div', 'ord', null, g), d = h('div', 'dest', null, w), bn = h('div', 'banco', null, w), pl = [];
    const ok = h('button', 'btn', 'Comprobar', w);
    ok.disabled = true;
    const pintar = () => {
      d.replaceChildren(); d.classList.remove('mal');
      pl.forEach((p, k) => { h('button', 'fi', p.t, d).onclick = () => { pl.splice(k, 1); p.b.classList.remove('usado'); pintar(); }; });
      ok.disabled = pl.length !== ex.correctOrder.length;
    };
    ex.chips.forEach((t, i) => {
      const b = h('button', 'fi', t, bn);
      b.style.setProperty('--i', i);
      b.onclick = () => { b.classList.add('usado'); pl.push({ t, b }); pintar(); };
    });
    ok.onclick = () => {
      const bien = JSON.stringify(pl.map((p) => p.t)) === JSON.stringify(ex.correctOrder);
      d.classList.add(bien ? 'ok' : 'mal');
      if (bien) { ok.remove(); w.style.pointerEvents = 'none'; }
      aviso(card, bien, ex, 'Casi. Quita piezas y prueba otro orden.');
    };
  }

  function match({ ex, g, card }) {
    const c = h('div', 'par2', null, g), L = h('div', null, null, c), R = h('div', null, null, c);
    let a = null, b = null, n = 0;
    const col = (el, key) => mezclar(ex.pairs.map((p, i) => [p[key], i])).forEach(([t, i], k) => {
      const x = h('button', 'mc', t, el);
      x.style.setProperty('--i', k);
      x.onclick = () => {
        el.querySelectorAll('.sel').forEach((y) => y.classList.remove('sel'));
        x.classList.add('sel');
        if (el === L) a = { x, i }; else b = { x, i };
        if (!a || !b) return;
        const par = [a.x, b.x];
        if (a.i === b.i) { par.forEach((y) => (y.className = 'mc hecho')); if (++n === ex.pairs.length) aviso(card, 1, ex); }
        else { par.forEach((y) => y.classList.add('mal')); setTimeout(() => par.forEach((y) => y.classList.remove('mal', 'sel')), 500); }
        a = b = null;
      };
    });
    col(L, 'left'); col(R, 'right');
  }

  // Switches rwx: la cadena de permisos y el octal se actualizan al instante
  function perm({ ex, g, card }) {
    const w = h('div', 'opciones', null, g), st = { u: [0, 0, 0], g: [0, 0, 0], o: [0, 0, 0] };
    const oct = () => Object.values(st).map((a) => a[0] * 4 + a[1] * 2 + a[2]).join('');
    const pv = h('p', 'pv', '---------  ·  chmod 000');
    Object.entries({ u: 'Usuario', g: 'Grupo', o: 'Otros' }).forEach(([k, nombre], r) => {
      const fila = h('div', 'pf', null, w);
      h('span', 'etq', nombre, fila);
      const s = h('div', 'sws', null, fila);
      [...'rwx'].forEach((ch, i) => {
        const bt = h('button', 'sw', ch, s);
        bt.style.setProperty('--i', r * 3 + i);
        bt.onclick = () => {
          st[k][i] ^= 1; bt.classList.toggle('on');
          pv.textContent = Object.values(st).map((a) => a.map((v, j) => (v ? 'rwx'[j] : '-')).join('')).join('') + '  ·  chmod ' + oct();
        };
      });
    });
    w.append(pv);
    const ok = h('button', 'btn', 'Comprobar', w);
    ok.onclick = () => {
      const bien = oct() === String(ex.correctOctal);
      if (bien) { ok.remove(); w.style.pointerEvents = 'none'; }
      aviso(card, bien, ex, 'Casi. Ajusta los switches y vuelve a comprobar.');
    };
  }

  function predict({ ex, g, card }) {
    const w = h('div', 'opciones', null, g), t = h('div', 'term', null, w), v = Array(9).fill(null);
    let ch = null;
    h('span', 'ps', '$ ', h('p', null, ex.command, t));
    h('p', 'meta-g', 'antes: ' + ex.before, t);
    const sl = h('div', 'slots', null, w);
    const slots = v.map((_, i) => {
      const s = h('button', 'sl', '', sl);
      s.style.setProperty('--i', i);
      s.onclick = () => { if (ch) { v[i] = ch; s.textContent = ch; s.classList.remove('ok'); } };
      return s;
    });
    const pal = h('div', 'slots', null, w);
    [...'rwx-'].forEach((c) => {
      const b = h('button', 'pal', c, pal);
      b.onclick = () => { ch = c; pal.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); b.classList.add('on'); };
    });
    const ok = h('button', 'btn', 'Comprobar', w);
    ok.onclick = () => {
      if (v.includes(null)) return aviso(card, 0, ex, 'Rellena los 9 caracteres antes de comprobar.');
      const bien = v.join('') === ex.correctAfter;
      if (bien) { ok.remove(); w.style.pointerEvents = 'none'; slots.forEach((s) => s.classList.add('ok')); }
      aviso(card, bien, ex, 'Casi. Revisa cada bloque rwx y vuelve a comprobar.');
    };
  }

  // type-command, autocomplete-command y multi-step-terminal comparten una terminal: todo se normaliza a una lista de pasos
  function pasos(ex) {
    if (ex.type === 'multi-step-terminal') {
      return ex.steps.map((s) => ({ goal: s.goal, cmds: s.acceptedCommands || [s.command], out: s.output, hint: s.hint || ex.context, tab: s.tabCandidates || [], c0: s.command }));
    }
    return [{ goal: '', cmds: [ex.command], out: ex.output, hint: ex.hint || ex.context, tab: ex.tabCandidates || ex.candidates || [], c0: ex.command, ph: ex.startPrefix }];
  }

  // Al acertar, el comando se descompone en piezas animadas: comando, opciones y argumentos
  function anatomia(g, cmd) {
    const c = h('div', 'chips', null, g);
    cmd.split(' ').forEach((w, i) => {
      const x = h('div', 'chip', null, c), s = h('span', null, w, x);
      x.style.setProperty('--i', i);
      x.prepend(h('b', null, i + 1));
      h('small', null, i === 0 ? 'comando' : w === '|' ? 'tubería' : /^>>?$/.test(w) ? 'redirección' : w[0] === '-' ? 'opción' : 'argumento', s);
    });
  }

  function term({ ex, g, card }) {
    const T = pasos(ex), t = h('div', 'term', null, g), hist = h('div', null, null, t), goal = h('p', 'meta-g', null, t), ln = h('p', null, null, t);
    h('span', 'ps', '$ ', ln);
    const inp = h('input', null, null, ln);
    Object.assign(inp, { autocomplete: 'off', spellcheck: false, placeholder: T[0].ph || '' });
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('aria-label', 'Escribe el comando');
    const out = h('p', 'out', null, t), ay = h('p', 'ay', null, t);
    let k = 0, at = 0;
    const paso = () => { goal.textContent = T[k].goal || ''; at = 0; out.textContent = ''; out.className = 'out'; ay.textContent = ''; inp.value = ''; };
    paso();
    inp.onkeydown = (e) => {
      const s = T[k];
      if (e.key === 'Tab') { // completa la última palabra; con varias coincidencias, las lista
        e.preventDefault();
        const i = inp.value.lastIndexOf(' ') + 1, w = inp.value.slice(i).toLowerCase();
        if (!w) return;
        const m = s.tab.filter((c) => c.toLowerCase().startsWith(w));
        if (m.length === 1) inp.value = inp.value.slice(0, i) + m[0]; else if (m.length > 1) out.textContent = m.join('   ');
        return;
      }
      if (e.key !== 'Enter') return;
      const val = norm(inp.value);
      if (!val) return; // Enter con la línea vacía no cuenta como intento
      const r = evaluar(val, s.cmds);
      if (r.ok) {
        const lin = h('p', null, null, hist);
        h('span', 'ps', '$ ', lin);
        lin.append(inp.value.trim());
        h('p', null, s.out, hist);
        if (++k === T.length) {
          inp.disabled = true; ln.hidden = true; goal.textContent = ''; out.textContent = ''; ay.textContent = '';
          if (T.length === 1) anatomia(g, s.c0);
          fb(card, 1, ex.successMsg);
        } else paso();
      } else {
        at++;
        out.className = 'out mal';
        out.textContent = r.msg;
        ay.textContent = 'Pista: ' + s.hint + (at >= 4 ? ` · empieza con "${s.c0[0]}"` : '');
        if (!r.cerca) inp.value = ''; // si estaba a punto, se conserva lo escrito para que lo corrija en vez de reescribirlo entero
      }
    };
  }

  const TIPOS = { concept, choice, order, 'match-pairs': match, 'build-permission': perm, 'predict-output': predict,
    'type-command': term, 'autocomplete-command': term, 'multi-step-terminal': term };
})();
