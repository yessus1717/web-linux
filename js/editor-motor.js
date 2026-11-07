/* LinuxPath · motor de los editores nano y vim.
   Son editores simulados: un búfer de texto en memoria con las teclas que se enseñan en las lecciones. Nada toca el equipo de quien los usa.
   No depende del navegador: se puede probar con Node (require('./editor-motor.js')).

   Uso:
     const ed = LinuxEditor.crear({ tipo: 'nano' | 'vim', nombre: 'notas.txt', texto: '…', existe: true,
                                    escribible: true, legible: true, guardar: (texto, nombre) => null | 'Permission denied' });
     ed.tecla('i'); ed.tecla('Escape'); ed.teclas('ihola<Esc>:wq<CR>');   // notación de vim: <Esc> <CR> <BS> <Del> <Tab> <Up> <C-o> <A-u> <lt>
     ed.pantalla()   // lo que hay que dibujar: líneas, cursor, mensajes, barra de atajos…
     ed.cerrado, ed.guardado (texto de la última vez que se guardó), ed.huboGuardado, ed.descarto (salió tirando cambios)

   Nombres de tecla: un carácter ('a', ' ', 'á'), 'Enter', 'Escape', 'Backspace', 'Delete', 'Tab', 'ArrowLeft/Right/Up/Down',
   'Home', 'End', 'PageUp', 'PageDown', 'C-x' (Ctrl+x) y 'A-x' (Alt+x).

   nano: escribir, flechas, Ctrl+O guardar, Ctrl+X salir, Ctrl+W buscar, Alt+W repetir, Ctrl+K cortar línea, Ctrl+U pegar,
         Ctrl+C posición, Ctrl+/ ir a línea, Alt+U deshacer, Alt+E rehacer, Ctrl+G ayuda.
   vim:  modos normal/insertar/línea de órdenes; i a I A o O, Esc, h j k l 0 ^ $ w b gg G, x r dd yy dw d$ d0 yw y$ y0 D p P u Ctrl+R,
         cuentas (3dd, 4x), /texto n N, :w :q :wq :x :q! :w! :N :set number, ZZ ZQ.
   Lo que no está lo avisa en pantalla.aviso, nunca finge que funciona. Los textos del editor están en inglés, como en casi todos los servidores. */
(function (global_) {
  'use strict';

  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const bytes = (s) => (enc ? enc.encode(s).length : s.length);
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const alta = (c) => c >= '\uD800' && c <= '\uDBFF';
  const baja = (c) => c >= '\uDC00' && c <= '\uDFFF';
  // Los índices son de JavaScript (UTF-16): estos pasos no dejan el cursor partiendo un emoji por la mitad.
  const izq = (s, c) => (c <= 0 ? 0 : c >= 2 && baja(s[c - 1]) && alta(s[c - 2]) ? c - 2 : c - 1);
  const der = (s, c) => (c >= s.length ? s.length : alta(s[c]) && c + 1 < s.length ? c + 2 : c + 1);
  const esTexto = (k) => (k.length === 1 ? k >= ' ' && k !== '\x7f' : k.length === 2 && alta(k[0]) && baja(k[1]));
  const clase = (ch) => (/\s/.test(ch) ? 0 : /\w/.test(ch) ? 1 : 2);

  // Siguiente inicio de palabra dentro de la línea (l.length si no hay más) y comienzo de la palabra anterior.
  const palabraSig = (l, c) => {
    if (c >= l.length) return l.length;
    const k = clase(l[c]);
    let i = c;
    if (k) while (i < l.length && clase(l[i]) === k) i++;
    while (i < l.length && clase(l[i]) === 0) i++;
    return i;
  };
  const palabraAnt = (l, c) => {
    let i = c - 1;
    while (i > 0 && clase(l[i]) === 0) i--;
    if (i < 0) return 0;
    const k = clase(l[i]);
    while (i > 0 && clase(l[i - 1]) === k) i--;
    return i;
  };

  /* ---------- notación de teclas (la de vim) para pruebas y soluciones ---------- */
  const NOMBRES = { Esc: 'Escape', CR: 'Enter', BS: 'Backspace', Del: 'Delete', Tab: 'Tab', Up: 'ArrowUp', Down: 'ArrowDown', Left: 'ArrowLeft', Right: 'ArrowRight',
    Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', lt: '<', Space: ' ' };
  function parsear(s) {
    const out = [];
    for (let i = 0; i < s.length;) {
      if (s[i] === '<') {
        const j = s.indexOf('>', i);
        if (j > i + 1) {
          const n = s.slice(i + 1, j), m = /^([CA])-(.)$/.exec(n);
          if (NOMBRES[n]) { out.push(NOMBRES[n]); i = j + 1; continue; }
          if (m) { out.push(m[1] + '-' + m[2].toLowerCase()); i = j + 1; continue; }
        }
      }
      const cp = String.fromCodePoint(s.codePointAt(i));
      i += cp.length;
      if (cp === '\n') out.push('Enter'); else if (cp !== '\r') out.push(cp === '\t' ? 'Tab' : cp);
    }
    return out;
  }

  /* ---------- base común: búfer, cursor, deshacer, búsqueda ---------- */
  class Base {
    constructor(o) {
      this.nombre = o.nombre || '';
      this.guardarFn = typeof o.guardar === 'function' ? o.guardar : () => null;
      this.existe = !!o.existe;
      this.escribible = o.escribible !== false;
      this.esDir = !!o.esDir;
      this.magica = !!this.constructor.MAGICA; // nano conserva una última línea vacía tras el último salto de línea; vim no
      this.lineas = this.cargar(o.texto || '');
      this.fila = 0; this.col = 0; this.deseada = 0;
      this.guardado = this.texto();
      this.sucio = false; this.cerrado = false; this.huboGuardado = false; this.descarto = false;
      this.mensaje = ''; this.aviso = null;
      this.undo = []; this.redo = [];
      this.ultimo = ''; this._acc = null; this._vert = false; this._des = undefined;
      this.buscado = ''; this.reg = null;
    }

    cargar(t) {
      const l = String(t).split('\n');
      if (!this.magica && l.length > 1 && l[l.length - 1] === '') l.pop();
      return l;
    }
    texto() {
      const t = this.lineas.join('\n');
      if (this.magica) return t === '' || t.endsWith('\n') ? t : t + '\n';
      return this.lineas.length === 1 && this.lineas[0] === '' ? '' : t + '\n';
    }
    nLineas() {
      const n = this.lineas.length;
      return this.magica ? (this.lineas[n - 1] === '' ? n - 1 : n) : (n === 1 && this.lineas[0] === '' ? 0 : n);
    }
    maxCol() { return this.lineas[this.fila].length; }
    ajustar() { const m = this.maxCol(); if (this.col > m) this.col = m; }

    /* ---------- teclas ---------- */
    tecla(k) {
      if (this.cerrado) return this;
      this.aviso = null; this._acc = null;
      this.manejar(String(k));
      this.ultimo = this._acc || 'otro';
      if (!this._vert) this.deseada = this._des !== undefined ? this._des : this.col; // el movimiento vertical recuerda la columna
      this._vert = false; this._des = undefined;
      return this;
    }
    teclas(s) { for (const k of Array.isArray(s) ? s : parsear(s)) this.tecla(k); return this; }

    /* ---------- cambios y deshacer ---------- */
    snap(tipo) { // los caracteres tecleados seguidos forman un solo paso de deshacer
      if (tipo === 'tipeo' && this.ultimo === 'tipeo') return;
      this.undo.push({ l: this.lineas.slice(), f: this.fila, c: this.col });
      if (this.undo.length > 200) this.undo.shift();
      this.redo = [];
    }
    edit(tipo) { this.snap(tipo); this.sucio = true; this._acc = tipo; }
    restaurar(de, a) {
      const s = de.pop();
      if (!s) return false;
      a.push({ l: this.lineas, f: this.fila, c: this.col });
      this.lineas = s.l; this.fila = s.f; this.col = s.c;
      this.sucio = this.texto() !== this.guardado;
      this.ajustar();
      return true;
    }
    deshacer() { return this.restaurar(this.undo, this.redo); }
    rehacer() { return this.restaurar(this.redo, this.undo); }

    /* ---------- edición del búfer ---------- */
    insertar(ch) { const l = this.lineas[this.fila]; this.lineas[this.fila] = l.slice(0, this.col) + ch + l.slice(this.col); this.col += ch.length; }
    partir() {
      const l = this.lineas[this.fila];
      this.lineas.splice(this.fila + 1, 0, l.slice(this.col));
      this.lineas[this.fila] = l.slice(0, this.col);
      this.fila++; this.col = 0;
    }
    hayAtras() { return this.col > 0 || this.fila > 0; }
    hayAdelante() { return this.col < this.lineas[this.fila].length || this.fila < this.lineas.length - 1; }
    borrarAtras() {
      const l = this.lineas[this.fila];
      if (this.col > 0) { const c = izq(l, this.col); this.lineas[this.fila] = l.slice(0, c) + l.slice(this.col); this.col = c; }
      else { const p = this.lineas[this.fila - 1]; this.col = p.length; this.lineas[this.fila - 1] = p + l; this.lineas.splice(this.fila, 1); this.fila--; }
    }
    borrarAdelante() {
      const l = this.lineas[this.fila];
      if (this.col < l.length) this.lineas[this.fila] = l.slice(0, this.col) + l.slice(der(l, this.col));
      else { this.lineas[this.fila] = l + this.lineas[this.fila + 1]; this.lineas.splice(this.fila + 1, 1); }
    }

    /* ---------- movimiento ---------- */
    vertical(d) {
      const f = Math.max(0, Math.min(this.lineas.length - 1, this.fila + d));
      this._vert = true;
      if (f === this.fila) return;
      this.fila = f;
      this.col = Math.min(this.deseada, this.maxCol());
    }
    izquierda() {
      if (this.col > 0) this.col = izq(this.lineas[this.fila], this.col);
      else if (this.fila > 0) { this.fila--; this.col = this.lineas[this.fila].length; }
    }
    derecha() {
      const l = this.lineas[this.fila];
      if (this.col < l.length) this.col = der(l, this.col);
      else if (this.fila < this.lineas.length - 1) { this.fila++; this.col = 0; }
    }
    irLinea(n, col) {
      this.fila = Math.max(0, Math.min(this.lineas.length - 1, n - 1));
      this.col = col == null ? 0 : Math.max(0, Math.min(this.lineas[this.fila].length, col));
      this.ajustar();
    }

    /* ---------- búsqueda de texto literal; devuelve { fila, col, envuelto } o null ---------- */
    buscarTexto(patron, adelante, ci) {
      const n = this.lineas.length, norm = (s) => (ci ? s.toLowerCase() : s), p = norm(patron);
      if (!p) return null;
      for (let k = 0; k <= n; k++) {
        if (adelante) {
          const f = (this.fila + k) % n, l = norm(this.lineas[f]);
          const i = l.indexOf(p, k === 0 ? this.col + 1 : 0);
          if (i >= 0) return { fila: f, col: i, envuelto: this.fila + k >= n };
        } else {
          const f = (this.fila - k + n * 2) % n, l = norm(this.lineas[f]);
          if (k === 0 && this.col === 0) continue;
          const i = l.lastIndexOf(p, k === 0 ? this.col - 1 : l.length);
          if (i >= 0) return { fila: f, col: i, envuelto: this.fila - k < 0 };
        }
      }
      return null;
    }

    /* ---------- guardar y cerrar ---------- */
    cerrar(descarto) { this.cerrado = true; this.descarto = !!descarto; }
    escribirArchivo(nombre) { // devuelve null si salió bien o el motivo del error (en inglés, como el sistema)
      if (this.esDir && nombre === this.nombre) return 'Is a directory';
      const t = this.texto(), e = this.guardarFn(t, nombre);
      if (e) return e;
      if (nombre === this.nombre || !this.nombre) { this.nombre = nombre; this.guardado = t; this.sucio = false; this.existe = true; this.huboGuardado = true; }
      return null;
    }
  }

  /* ========================================================================== nano ========================================================================== */
  const BARRA_NANO = [
    [['^G', 'Help', 'C-g'], ['^O', 'Write Out', 'C-o'], ['^W', 'Where Is', 'C-w'], ['^K', 'Cut', 'C-k'], ['^T', 'Execute', null], ['^C', 'Location', 'C-c']],
    [['^X', 'Exit', 'C-x'], ['^R', 'Read File', null], ['^\\', 'Replace', null], ['^U', 'Paste', 'C-u'], ['^J', 'Justify', null], ['^/', 'Go To Line', 'C-/']],
  ];
  const AYUDA_NANO = ['Main nano help text (resumen del simulador)', '',
    ' ^G    Display this help text', ' ^X    Close the help text / Exit from nano', ' ^O    Write the current file to disk',
    ' ^W    Search for a string', ' M-W   Repeat the last search', ' ^K    Cut the current line and store it in the cutbuffer',
    ' ^U    Paste the contents of the cutbuffer at the cursor', ' ^C    Report the cursor position', ' ^/    Go to line (and column) number',
    ' M-U   Undo the last operation', ' M-E   Redo the last undone operation', ' M-\\   Go to the first line of the file', ' M-/   Go to the last line of the file', '',
    ' ^ means Ctrl and M- means Alt (Meta).'];

  class Nano extends Base {
    constructor(o) {
      super(o);
      this.prompt = null; this.ayudaVista = false; this.cortado = null;
      const n = this.nombre;
      if (o.esDir) this.mensaje = `[ "${n}" is a directory ]`;
      else if (o.legible === false) this.mensaje = `[ Error reading ${n}: Permission denied ]`;
      else if (this.existe) this.mensaje = this.escribible ? `[ Read ${plural(this.nLineas(), 'line', 'lines')} ]` : `[ File '${n}' is unwritable ]`;
      else if (n) this.mensaje = '[ New File ]';
    }

    manejar(k) {
      if (this.ayudaVista) { if (k === 'C-x' || k === 'C-g') this.ayudaVista = false; return; }
      if (this.prompt) return this.teclaPrompt(k);
      this.mensaje = '';
      const l = this.lineas[this.fila];
      if (esTexto(k)) { this.edit('tipeo'); this.insertar(k); return; }
      switch (k) {
        case 'Enter': this.edit('enter'); this.partir(); break;
        case 'Tab': this.edit('tipeo'); this.insertar('\t'); break;
        case 'Backspace': if (this.hayAtras()) { this.edit('borrar'); this.borrarAtras(); } break;
        case 'Delete': case 'C-d': if (this.hayAdelante()) { this.edit('borrar'); this.borrarAdelante(); } break;
        case 'ArrowLeft': case 'C-b': this.izquierda(); break;
        case 'ArrowRight': case 'C-f': this.derecha(); break;
        case 'ArrowUp': case 'C-p': this.vertical(-1); break;
        case 'ArrowDown': case 'C-n': this.vertical(1); break;
        case 'PageUp': this.vertical(-8); break;
        case 'PageDown': this.vertical(8); break;
        case 'Home': case 'C-a': this.col = 0; break;
        case 'End': case 'C-e': this.col = l.length; break;
        case 'A-\\': this.irLinea(1); break;
        case 'A-/': this.irLinea(this.lineas.length, 0); break;
        case 'C-k': this.cortar(); break;
        case 'C-u': this.pegar(); break;
        case 'C-w': this.prompt = { tipo: 'buscar', etiqueta: this.buscado ? `Search [${this.buscado}]` : 'Search', valor: '' }; break;
        case 'A-w': if (this.buscado) this.hallar(this.buscado); else this.mensaje = '[ No current search pattern ]'; break;
        case 'C-o': this.prompt = { tipo: 'guardar', etiqueta: 'File Name to Write', valor: this.nombre, salir: false }; break;
        case 'C-x':
          if (!this.sucio) this.cerrar(false);
          else this.prompt = { tipo: 'salir', etiqueta: 'Save modified buffer?', valor: '' };
          break;
        case 'C-c': this.ubicacion(); break;
        case 'C-g': this.ayudaVista = true; break;
        case 'C-/': case 'C-_': case 'A-g': this.prompt = { tipo: 'ir', etiqueta: 'Enter line number, column number', valor: '' }; break;
        case 'A-u': this.deshacer(); break;
        case 'A-e': this.rehacer(); break;
        case 'C-t': case 'C-r': case 'C-\\': case 'C-j': this.aviso = 'Esa función de nano no está en el simulador.'; break;
        default: break; // Escape y demás: nano no hace nada
      }
    }

    cortar() {
      const seguido = this.ultimo === 'cortar', l = this.lineas[this.fila], ultima = this.fila === this.lineas.length - 1;
      if (ultima && l === '' && this.lineas.length > 1) return; // la línea vacía final no se corta
      this.edit('cortar');
      this.cortado = seguido && this.cortado ? [...this.cortado, l] : [l]; // Ctrl+K seguidos acumulan líneas
      if (this.lineas.length === 1) this.lineas = [''];
      else { this.lineas.splice(this.fila, 1); if (this.fila >= this.lineas.length) this.fila = this.lineas.length - 1; }
      this.col = 0;
    }
    pegar() {
      if (!this.cortado) { this.mensaje = '[ Cutbuffer is empty ]'; return; }
      this.edit('pegar');
      this.lineas.splice(this.fila, 0, ...this.cortado); // las líneas cortadas entran encima de la línea actual
      this.fila += this.cortado.length;
      this.ajustar();
    }
    hallar(p) {
      this.buscado = p;
      const r = this.buscarTexto(p, true, true); // nano busca sin distinguir mayúsculas
      if (!r) { this.mensaje = `[ "${p}" not found ]`; return; }
      this.fila = r.fila; this.col = r.col;
      if (r.envuelto) this.mensaje = '[ Search Wrapped ]';
    }
    ubicacion() {
      const L = this.lineas, total = L.length, antes = L.slice(0, this.fila).reduce((s, x) => s + x.length + 1, 0) + this.col;
      const tch = L.reduce((s, x) => s + x.length + 1, 0), len = L[this.fila].length + 1;
      const pct = (a, b) => (b ? Math.floor((a * 100) / b) : 0);
      this.mensaje = `[ line ${this.fila + 1}/${total} (${pct(this.fila + 1, total)}%), col ${this.col + 1}/${len} (${pct(this.col + 1, len)}%), char ${antes + 1}/${tch} (${pct(antes + 1, tch)}%) ]`;
    }
    irA(v) {
      const m = /^\s*(\d+)\s*(?:,\s*(\d+))?\s*$/.exec(v);
      if (!m) { this.mensaje = '[ Invalid line or column number ]'; return; }
      this.irLinea(parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) - 1 : 0);
    }
    guardarComo(nombre) {
      if (!nombre) { this.mensaje = '[ Cancelled ]'; return false; }
      const e = this.escribirArchivo(nombre);
      if (e) { this.mensaje = `[ Error writing ${nombre}: ${e} ]`; return false; }
      this.mensaje = `[ Wrote ${plural(this.nLineas(), 'line', 'lines')} ]`;
      return true;
    }

    teclaPrompt(k) {
      const p = this.prompt;
      if (p.tipo === 'salir') {
        if (k === 'y' || k === 'Y') this.prompt = { tipo: 'guardar', etiqueta: 'File Name to Write', valor: this.nombre, salir: true };
        else if (k === 'n' || k === 'N') { this.prompt = null; this.cerrar(true); }
        else if (k === 'C-c') { this.prompt = null; this.mensaje = '[ Cancelled ]'; }
        return;
      }
      if (k === 'C-c') { this.prompt = null; this.mensaje = '[ Cancelled ]'; return; }
      if (k === 'Enter') {
        this.prompt = null; this.mensaje = '';
        if (p.tipo === 'guardar') { if (this.guardarComo(p.valor.trim()) && p.salir) this.cerrar(false); }
        else if (p.tipo === 'buscar') { const q = p.valor || this.buscado; if (q) this.hallar(q); else this.mensaje = '[ Cancelled ]'; }
        else this.irA(p.valor);
        return;
      }
      if (k === 'Backspace') p.valor = Array.from(p.valor).slice(0, -1).join('');
      else if (esTexto(k)) p.valor += k;
    }

    pantalla() {
      const it = ([k, t, tecla]) => ({ k, t, tecla, ok: !!tecla });
      const p = this.prompt;
      let barra = BARRA_NANO.map((f) => f.map(it));
      if (this.ayudaVista) barra = [[it(['^X', 'Exit', 'C-x'])]];
      else if (p && p.tipo === 'salir') barra = [[{ k: 'Y', t: 'Yes', tecla: 'y', ok: true }], [{ k: 'N', t: 'No', tecla: 'n', ok: true }, { k: '^C', t: 'Cancel', tecla: 'C-c', ok: true }]];
      else if (p) barra = [[{ k: '^C', t: 'Cancel', tecla: 'C-c', ok: true }]];
      return {
        tipo: 'nano', nombre: this.nombre, aviso: this.aviso,
        titulo: { izq: 'GNU nano 7.2', centro: this.nombre || 'New Buffer', der: this.sucio ? 'Modified' : '' },
        lineas: this.ayudaVista ? AYUDA_NANO : this.lineas,
        cursor: this.ayudaVista || p ? null : { fila: this.fila, col: this.col },
        estado: p ? '' : this.mensaje,
        prompt: p ? { texto: p.tipo === 'salir' ? p.etiqueta : `${p.etiqueta}: ${p.valor}`, entrada: p.tipo !== 'salir' } : null,
        barra,
      };
    }
  }
  Nano.MAGICA = true;

  /* ========================================================================== vim ========================================================================== */
  const primerNoBlanco = (l) => { const m = /\S/.exec(l); return m ? m.index : Math.max(0, l.length - 1); };

  class Vim extends Base {
    constructor(o) {
      super(o);
      this.modo = 'normal'; this.cmd = ''; this.cuenta = ''; this.pend = ''; this.numeros = false; this.insNuevo = false; this.sentido = true;
      const n = this.nombre;
      if (o.esDir) this.mensaje = `"${n}" is a directory`;
      else if (o.legible === false) this.mensaje = `"${n}" [Permission Denied]`;
      else if (n) this.mensaje = this.existe ? `"${n}"${this.escribible ? '' : ' [readonly]'} ${this.nLineas()}L, ${bytes(o.texto || '')}B` : `"${n}" [New]`;
    }

    maxCol() { const n = this.lineas[this.fila].length; return this.modo === 'insertar' ? n : Math.max(0, n - 1); }

    manejar(k) {
      if (this.modo === 'insertar') return this.mInsertar(k);
      if (this.modo === 'comando' || this.modo === 'buscar') return this.mLinea(k);
      return this.mNormal(k);
    }

    /* ---------- modo insertar ---------- */
    entrarInsertar(nuevo = true) { this.modo = 'insertar'; this.mensaje = ''; this.insNuevo = nuevo; }
    editIns() { if (this.insNuevo) { this.snap('ins'); this.insNuevo = false; } this.sucio = true; }
    mInsertar(k) {
      if (esTexto(k)) { this.editIns(); this.insertar(k); return; }
      switch (k) {
        case 'Escape': case 'C-[': case 'C-c': this.modo = 'normal'; this.col = izq(this.lineas[this.fila], this.col); this.ajustar(); break;
        case 'Enter': this.editIns(); this.partir(); break;
        case 'Tab': this.editIns(); this.insertar('\t'); break;
        case 'Backspace': if (this.hayAtras()) { this.editIns(); this.borrarAtras(); } break;
        case 'Delete': if (this.hayAdelante()) { this.editIns(); this.borrarAdelante(); } break;
        case 'ArrowLeft': this.izquierda(); break;
        case 'ArrowRight': this.derecha(); break;
        case 'ArrowUp': this.vertical(-1); break;
        case 'ArrowDown': this.vertical(1); break;
        case 'Home': this.col = 0; break;
        case 'End': this.col = this.lineas[this.fila].length; break;
        default: break;
      }
    }

    /* ---------- línea de órdenes (:) y búsqueda (/) ---------- */
    mLinea(k) {
      if (k === 'Escape' || k === 'C-c') { this.modo = 'normal'; this.cmd = ''; return; }
      if (k === 'Enter') {
        const c = this.cmd, era = this.modo;
        this.modo = 'normal'; this.cmd = '';
        return era === 'comando' ? this.exCmd(c) : this.buscarVim(c, true);
      }
      if (k === 'Backspace') { if (!this.cmd) this.modo = 'normal'; else this.cmd = Array.from(this.cmd).slice(0, -1).join(''); return; }
      if (esTexto(k)) this.cmd += k;
    }
    buscarVim(p, adelante) {
      if (!p) p = this.buscado;
      if (!p) { this.mensaje = 'E35: No previous regular expression'; return; }
      this.buscado = p; this.sentido = adelante;
      const r = this.buscarTexto(p, adelante, false);
      if (!r) { this.mensaje = `E486: Pattern not found: ${p}`; return; }
      this.fila = r.fila; this.col = r.col;
      this.mensaje = r.envuelto ? (adelante ? 'search hit BOTTOM, continuing at TOP' : 'search hit TOP, continuing at BOTTOM') : `${adelante ? '/' : '?'}${p}`;
    }
    exCmd(txt) {
      txt = txt.trim();
      this.mensaje = '';
      if (!txt) return;
      if (/^\d+$/.test(txt)) { this.irLinea(parseInt(txt, 10)); this.col = primerNoBlanco(this.lineas[this.fila]); return; }
      const m = /^([a-z]+)(!?)\s*(.*)$/.exec(txt);
      if (!m) { this.mensaje = `E492: Not an editor command: ${txt}`; return; }
      const [, c, bang, arg] = m, fuerza = bang === '!';
      switch (c) {
        case 'w': case 'write': this.escribirVim(arg, fuerza); break;
        case 'q': case 'quit':
          if (this.sucio && !fuerza) this.mensaje = 'E37: No write since last change (add ! to override)';
          else this.cerrar(fuerza && this.sucio);
          break;
        case 'wq': case 'x': case 'xit': case 'exit':
          if (c !== 'wq' && !this.sucio && this.existe && !arg) { this.cerrar(false); break; } // :x solo escribe si hubo cambios
          if (this.escribirVim(arg, fuerza)) this.cerrar(false);
          break;
        case 'set': this.opcion(arg); break;
        default: this.mensaje = `E492: Not an editor command: ${txt}`;
      }
    }
    opcion(a) {
      if (a === 'number' || a === 'nu') this.numeros = true;
      else if (a === 'nonumber' || a === 'nonu') this.numeros = false;
      else this.mensaje = `E518: Unknown option: ${a}`;
    }
    escribirVim(arg, fuerza) {
      const destino = arg || this.nombre, propio = !arg || arg === this.nombre || !this.nombre;
      if (!destino) { this.mensaje = 'E32: No file name'; return false; }
      if (propio && this.esDir) { this.mensaje = `E502: "${destino}" is a directory`; return false; }
      if (propio && !this.escribible && !fuerza) { this.mensaje = "E45: 'readonly' option is set (add ! to override)"; return false; }
      const nuevo = propio && !this.existe, t = this.texto(), e = this.guardarFn(t, destino);
      if (e) { this.mensaje = "E212: Can't open file for writing"; return false; }
      if (propio) { this.nombre = destino; this.guardado = t; this.sucio = false; this.existe = true; this.huboGuardado = true; }
      this.mensaje = `"${destino}"${nuevo ? ' [New]' : ''} ${this.nLineas()}L, ${bytes(t)}B written`;
      return true;
    }

    /* ---------- modo normal ---------- */
    informe(n, texto) { if (n > 2) this.mensaje = `${n} ${texto}`; }
    noImplementado() { this.aviso = 'El simulador no implementa esa orden de vim.'; }

    mNormal(k) {
      if (k === 'Escape') { this.pend = ''; this.cuenta = ''; return; }
      if (this.pend === 'r') { this.pend = ''; this.reemplazar(k, this.cuenta ? parseInt(this.cuenta, 10) : 1); this.cuenta = ''; return; }
      if (esTexto(k) && k >= '0' && k <= '9' && !(k === '0' && !this.cuenta)) { this.cuenta += k; return; }
      const n = this.cuenta ? parseInt(this.cuenta, 10) : 0, c = n || 1, l = this.lineas[this.fila];
      if (this.pend) { const p = this.pend; this.pend = ''; this.cuenta = ''; return this.completar(p, k, c, n); }
      switch (k) {
        case 'h': case 'ArrowLeft': case 'Backspace': for (let i = 0; i < c && this.col > 0; i++) this.col = izq(l, this.col); break;
        case 'l': case 'ArrowRight': case ' ': for (let i = 0; i < c && this.col < this.maxCol(); i++) this.col = der(l, this.col); break;
        case 'j': case 'ArrowDown': this.vertical(c); break;
        case 'k': case 'ArrowUp': this.vertical(-c); break;
        case 'Enter': this.vertical(c); this._vert = false; this.col = primerNoBlanco(this.lineas[this.fila]); break;
        case '0': case 'Home': this.col = 0; break;
        case '^': this.col = primerNoBlanco(l); break;
        case '$': case 'End': this.col = this.maxCol(); this._des = Infinity; break;
        case 'w': this.palabra(c, true); break;
        case 'b': this.palabra(c, false); break;
        case 'G': this.irLinea(n || this.lineas.length); this.col = primerNoBlanco(this.lineas[this.fila]); break;
        case 'PageDown': this.vertical(10); break;
        case 'PageUp': this.vertical(-10); break;
        case 'g': case 'd': case 'y': case 'Z': case 'r': this.pend = k; return; // espera la tecla que completa la orden, conservando la cuenta
        case 'x': case 'Delete': this.borrarChars(c); break;
        case 'D': this.completar('d', '$', 1, 0); break;
        case 'i': this.entrarInsertar(); break;
        case 'a': if (l.length) this.col = der(l, this.col); this.entrarInsertar(); break;
        case 'I': this.col = primerNoBlanco(l); this.entrarInsertar(); break;
        case 'A': this.col = l.length; this.entrarInsertar(); break;
        case 'o': case 'O': this.abrirLinea(k === 'o'); break;
        case 'p': case 'P': this.pegarVim(k === 'P', c); break;
        case 'u': if (this.deshacer()) this.mensaje = ''; else this.mensaje = 'Already at oldest change'; break;
        case 'C-r': if (this.rehacer()) this.mensaje = ''; else this.mensaje = 'Already at newest change'; break;
        case 'n': this.buscarVim('', this.sentido); break;
        case 'N': this.buscarVim('', !this.sentido); break;
        case '/': this.modo = 'buscar'; this.cmd = ''; this.mensaje = ''; break;
        case ':': this.modo = 'comando'; this.cmd = ''; this.mensaje = ''; break;
        default: if (esTexto(k) || k.startsWith('C-')) this.noImplementado();
      }
      this.cuenta = '';
      if (this.modo === 'normal') this.ajustar();
    }

    palabra(c, adelante) {
      for (let i = 0; i < c; i++) {
        const l = this.lineas[this.fila];
        if (adelante) {
          const j = palabraSig(l, this.col);
          if (j < l.length) this.col = j;
          else if (this.fila < this.lineas.length - 1) { this.fila++; const s = this.lineas[this.fila]; this.col = /\S/.test(s) ? /\S/.exec(s).index : 0; }
          else { this.col = Math.max(0, l.length - 1); break; }
        } else if (this.col > 0) this.col = palabraAnt(l, this.col);
        else if (this.fila > 0) { this.fila--; const p = this.lineas[this.fila]; this.col = palabraAnt(p, p.length); }
        else break;
      }
    }
    reemplazar(k, n) {
      const l = this.lineas[this.fila];
      if (!esTexto(k) || this.col + n > l.length) return;
      this.edit('cmd');
      this.lineas[this.fila] = l.slice(0, this.col) + k.repeat(n) + l.slice(this.col + n);
      this.col += n - 1;
    }
    borrarChars(c) {
      const l = this.lineas[this.fila];
      if (!l.length) return;
      const fin = Math.min(l.length, this.col + c);
      this.edit('cmd');
      this.reg = { texto: l.slice(this.col, fin), linea: false };
      this.lineas[this.fila] = l.slice(0, this.col) + l.slice(fin);
    }
    abrirLinea(abajo) {
      this.snap('ins'); this.sucio = true;
      const f = abajo ? this.fila + 1 : this.fila;
      this.lineas.splice(f, 0, '');
      this.fila = f; this.col = 0;
      this.entrarInsertar(false);
    }
    completar(p, k, c, n) {
      if (p === 'g') { if (k === 'g') { this.irLinea(n || 1); this.col = primerNoBlanco(this.lineas[this.fila]); } else this.noImplementado(); return; }
      if (p === 'Z') { if (k === 'Z') this.exCmd('x'); else if (k === 'Q') this.exCmd('q!'); else this.noImplementado(); return; }
      const borrar = p === 'd';
      if (k === p) { // dd y yy
        const f = this.fila, hasta = Math.min(this.lineas.length, f + c);
        this.reg = { lineas: this.lineas.slice(f, hasta), linea: true };
        if (!borrar) { this.informe(hasta - f, 'lines yanked'); return; }
        this.edit('cmd');
        this.lineas.splice(f, hasta - f);
        if (!this.lineas.length) this.lineas = [''];
        this.fila = Math.min(f, this.lineas.length - 1);
        this.col = primerNoBlanco(this.lineas[this.fila]);
        this.informe(hasta - f, 'fewer lines');
        return;
      }
      const l = this.lineas[this.fila];
      let a = this.col, b;
      if (k === 'w') { b = a; for (let i = 0; i < c; i++) b = palabraSig(l, b); }
      else if (k === '$') b = l.length;
      else if (k === '0') { b = this.col; a = 0; }
      else return this.noImplementado();
      const t = l.slice(a, b);
      if (!t) return;
      this.reg = { texto: t, linea: false };
      if (borrar) { this.edit('cmd'); this.lineas[this.fila] = l.slice(0, a) + l.slice(b); }
      this.col = a;
    }
    pegarVim(antes, c) {
      const r = this.reg;
      if (!r) { this.mensaje = 'E353: Nothing in register "'; return; }
      this.edit('cmd');
      if (r.linea) {
        const bloque = [];
        for (let i = 0; i < c; i++) bloque.push(...r.lineas);
        const pos = antes ? this.fila : this.fila + 1;
        this.lineas.splice(pos, 0, ...bloque);
        this.fila = pos; this.col = primerNoBlanco(this.lineas[pos]);
        this.informe(bloque.length, 'more lines');
      } else {
        const l = this.lineas[this.fila], t = r.texto.repeat(c), a = antes || !l.length ? this.col : der(l, this.col);
        this.lineas[this.fila] = l.slice(0, a) + t + l.slice(a);
        this.col = a + t.length - 1;
      }
    }

    pantalla() {
      const f = this.fila + 1, l = this.lineas[this.fila], total = this.lineas.length;
      const pos = total <= 12 ? 'All' : f === 1 ? 'Top' : f === total ? 'Bot' : Math.floor(((f - 1) * 100) / (total - 1)) + '%';
      const enLinea = this.modo === 'comando' || this.modo === 'buscar';
      return {
        tipo: 'vim', nombre: this.nombre, aviso: this.aviso, modo: this.modo, numeros: this.numeros,
        lineas: this.lineas, cursor: enLinea ? null : { fila: this.fila, col: this.col },
        estado: this.modo === 'comando' ? ':' + this.cmd : this.modo === 'buscar' ? '/' + this.cmd : this.modo === 'insertar' ? '-- INSERT --' : this.mensaje,
        enLinea, pendiente: this.cuenta + this.pend,
        regla: `${f},${l.length ? this.col + 1 : '0-1'}`, posicion: pos,
      };
    }
  }

  const Editor = {
    crear: (o) => (String(o.tipo) === 'nano' ? new Nano(o) : new Vim(o)),
    parsear, Nano, Vim,
    // Texto pegado o escrito de golpe → lista de teclas
    teclasDeTexto: (s) => parsear(String(s).replace(/</g, '<lt>')),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Editor;
  else global_.LinuxEditor = Editor;
})(typeof window !== 'undefined' ? window : globalThis);
