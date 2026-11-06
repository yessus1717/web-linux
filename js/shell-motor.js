/* LinuxPath · motor de la terminal de práctica.
   Es una shell simulada: un sistema de archivos virtual en memoria y comandos que se comportan como los reales
   (permisos, pipes, redirecciones, globs, comillas, &&, ||, ;). Nada de lo que ocurre aquí toca el equipo de quien la usa.
   No depende del navegador: se puede probar con Node (require('./shell-motor.js')).
   Para añadir un comando: crea un método cmd_<nombre>(args, io) que devuelva el texto de salida (io.stdin es la entrada
   por tubería, io.tty indica si la salida va a pantalla) y, si quieres, descríbelo en AYUDA para help y man. */
(function (global_) {
  'use strict';

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const USUARIOS = { root: { uid: 0, grupos: ['root'] }, ana: { uid: 1000, grupos: ['ana', 'users'] }, maria: { uid: 1001, grupos: ['maria', 'users'] } };
  const GRUPOS = ['root', 'ana', 'maria', 'users'];
  const GID = { root: 0, ana: 1000, maria: 1001, users: 100 };
  const E = {
    noexiste: 'No existe el archivo o el directorio', permiso: 'Permiso denegado', esdir: 'Es un directorio',
    nodir: 'No es un directorio', existe: 'El archivo ya existe', novacio: 'El directorio no está vacío', noperm: 'Operación no permitida',
  };

  class ErrorShell extends Error {}

  const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const bytes = (s) => (enc ? enc.encode(s).length : s.length);
  const pad2 = (n) => String(n).padStart(2, '0');
  const fecha = (d) => `${MESES[d.getMonth()]} ${String(d.getDate()).padStart(2)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const globRe = (p, ci) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', ci ? 'i' : '');
  const cmpNombre = (a, b) => a.replace(/^\./, '').localeCompare(b.replace(/^\./, ''), 'es', { sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
  // Marcas para colorear en pantalla: \x01d nombre \x02 = directorio, \x01x nombre \x02 = ejecutable. Solo si la salida va a la terminal.
  const marca = (nombre, n, tty) => (!tty ? nombre : n.t === 'd' ? '\x01d' + nombre + '\x02' : n.mode & 0o111 ? '\x01x' + nombre + '\x02' : nombre);
  const tamTxt = (n, humano) => {
    const t = n.t === 'd' ? 4096 : bytes(n.txt);
    return humano && t >= 1024 ? (t / 1024).toFixed(t < 10240 ? 1 : 0) + 'K' : String(t);
  };

  const T0 = new Date(2026, 10, 5, 10, 20);
  const dir = (c = {}, mode = 0o755, owner = 'ana', group = owner) => ({ t: 'd', c, mode, owner, group, mtime: T0 });
  const arch = (txt = '', mode = 0o644, owner = 'ana', group = owner) => ({ t: 'f', txt, mode, owner, group, mtime: T0 });

  function crearFS() {
    const log = [];
    for (let i = 1; i <= 40; i++) {
      log.push(i === 14 ? 'error: conexión rechazada' : i === 37 ? 'error: disco casi lleno' : i % 7 === 0 ? `aviso: respuesta lenta (${i * 12} ms)` : `info: petición ${i} atendida`);
    }
    return dir({
      home: dir({
        ana: dir({
          documentos: dir({
            'notas.txt': arch('Comprar café\nLlamar al banco\nRevisar el servidor\n'),
            'informe.md': arch('# Informe mensual\n\nResumen de actividad del mes.\nTodo en orden.\n'),
            'lista.txt': arch('manzanas\npan\nleche\npan\nmanzanas\npan\n'),
          }),
          proyectos: dir({
            web: dir({ 'index.html': arch('<h1>Hola, Linux</h1>\n'), 'estilos.css': arch('body { margin: 0; }\n') }),
            'leeme.txt': arch('Carpeta de proyectos.\nCada subcarpeta es un proyecto distinto.\n'),
          }),
          descargas: dir({ 'manual.pdf': arch('(contenido simulado)\n') }),
          '.bashrc': arch('# ~/.bashrc: configuración de la terminal de ana\n'),
          'servidor.log': arch(log.join('\n') + '\n'),
          'backup.sh': arch('#!/bin/bash\n# Copia de seguridad de los documentos\necho "Iniciando copia de seguridad..."\nmkdir -p /tmp/respaldo\ncp -r ~/documentos /tmp/respaldo\necho "Copia terminada"\n'),
          'privado.txt': arch('Contenido solo para María.\n', 0o600, 'maria'),
        }),
        maria: dir({ 'secreto.txt': arch('No es para ti.\n', 0o600, 'maria') }, 0o750, 'maria'),
      }, 0o755, 'root'),
      etc: dir({
        hostname: arch('linuxpath\n', 0o644, 'root'),
        'os-release': arch('NAME="LinuxPath OS"\nVERSION="1.0"\n', 0o644, 'root'),
        passwd: arch('root:x:0:0:root:/root:/bin/bash\nana:x:1000:1000:Ana:/home/ana:/bin/bash\nmaria:x:1001:1001:María:/home/maria:/bin/bash\n', 0o644, 'root'),
        shadow: arch('root:*:20000:0:99999:7:::\n', 0o640, 'root'),
      }, 0o755, 'root'),
      tmp: dir({}, 0o777, 'root'),
      var: dir({ log: dir({ syslog: arch('nov  5 10:20:01 linuxpath CRON[812]: sesión abierta\nnov  5 10:20:09 linuxpath sshd[612]: servidor escuchando en el puerto 22\n', 0o644, 'root') }, 0o755, 'root') }, 0o755, 'root'),
      root: dir({}, 0o700, 'root'),
    }, 0o755, 'root');
  }

  // [uso, descripción, opciones "-x|texto"]. Lo usan help y man.
  const AYUDA = {
    cat: ['cat [-n] [ARCHIVO]...', 'muestra el contenido de uno o varios archivos', ['-n|numera las líneas']],
    cd: ['cd [RUTA]', 'cambia de directorio; sin argumentos vuelve a tu carpeta personal y «cd -» al anterior'],
    chgrp: ['chgrp [-R] GRUPO ARCHIVO...', 'cambia el grupo de un archivo', ['-R|aplica el cambio de forma recursiva']],
    chmod: ['chmod [-R] MODO ARCHIVO...', 'cambia los permisos; MODO puede ser numérico (755) o simbólico (u+x, go-w, a=r)', ['-R|aplica el cambio de forma recursiva']],
    chown: ['chown [-R] USUARIO[:GRUPO] ARCHIVO...', 'cambia el propietario de un archivo (solo root: prueba con sudo)', ['-R|aplica el cambio de forma recursiva']],
    clear: ['clear', 'limpia la pantalla (también con Ctrl+L)'],
    cp: ['cp [-r] ORIGEN... DESTINO', 'copia archivos y carpetas', ['-r|copia directorios de forma recursiva']],
    date: ['date', 'muestra la fecha y la hora'],
    echo: ['echo [-n] [TEXTO]...', 'escribe texto; con > o >> lo guarda en un archivo', ['-n|no añade el salto de línea final']],
    exit: ['exit', 'aquí no hay sesión que cerrar'],
    find: ['find [RUTA]... [-name PATRÓN] [-type f|d] [-maxdepth N]', 'busca archivos y carpetas por nombre o tipo', ['-name|nombre o patrón, p. ej. "*.txt"', '-iname|igual, sin distinguir mayúsculas', '-type|f = archivos, d = directorios', '-maxdepth|profundidad máxima de búsqueda']],
    grep: ['grep [-nicvr] PATRÓN [ARCHIVO]...', 'busca líneas que coincidan con un patrón', ['-n|muestra el número de línea', '-i|ignora mayúsculas y minúsculas', '-c|cuenta las líneas que coinciden', '-v|muestra las que NO coinciden', '-r|busca dentro de carpetas']],
    head: ['head [-n N] [ARCHIVO]...', 'muestra las primeras líneas (10 por defecto)', ['-n|número de líneas']],
    help: ['help', 'lista los comandos disponibles'],
    history: ['history [N] [-c]', 'muestra los comandos que has escrito', ['-c|borra el historial']],
    hostname: ['hostname', 'muestra el nombre del equipo'],
    id: ['id', 'muestra tu usuario y los grupos a los que perteneces'],
    kill: ['kill PID...', 'termina procesos por su número (PID)'],
    ll: ['ll', 'atajo de ls -l'],
    ls: ['ls [-lahd] [RUTA]...', 'lista el contenido de un directorio', ['-l|formato largo: permisos, dueño, tamaño y fecha', '-a|incluye los archivos ocultos (empiezan por punto)', '-h|tamaños legibles junto con -l', '-d|muestra la propia carpeta en vez de su contenido']],
    man: ['man COMANDO', 'muestra cómo se usa un comando'],
    mkdir: ['mkdir [-p] CARPETA...', 'crea carpetas', ['-p|crea también las carpetas intermedias']],
    mv: ['mv ORIGEN... DESTINO', 'mueve o renombra archivos y carpetas'],
    ping: ['ping [-c N] DESTINO', 'comprueba si un equipo responde (simulado)', ['-c|número de paquetes']],
    ps: ['ps [aux]', 'muestra los procesos en ejecución', ['aux|todos los procesos del sistema']],
    pwd: ['pwd', 'muestra la ruta del directorio actual'],
    rm: ['rm [-rf] ARCHIVO...', 'borra archivos y carpetas (¡no hay papelera!)', ['-r|borra carpetas y su contenido', '-f|no pregunta ni avisa si no existe']],
    rmdir: ['rmdir CARPETA...', 'borra carpetas vacías'],
    sort: ['sort [-rnu] [ARCHIVO]...', 'ordena las líneas', ['-r|orden inverso', '-n|orden numérico', '-u|elimina repetidas']],
    sudo: ['sudo COMANDO...', 'ejecuta un comando como administrador (root)'],
    tail: ['tail [-n N] [ARCHIVO]...', 'muestra las últimas líneas (10 por defecto)', ['-n|número de líneas']],
    touch: ['touch ARCHIVO...', 'crea un archivo vacío o actualiza su fecha'],
    tree: ['tree [RUTA]', 'dibuja el árbol de carpetas y archivos'],
    uname: ['uname [-a]', 'muestra información del sistema', ['-a|toda la información']],
    uniq: ['uniq [-c] [ARCHIVO]', 'elimina líneas repetidas consecutivas (ordena antes con sort)', ['-c|cuenta las repeticiones']],
    wc: ['wc [-lwc] [ARCHIVO]...', 'cuenta líneas, palabras y bytes', ['-l|líneas', '-w|palabras', '-c|bytes']],
    whoami: ['whoami', 'muestra con qué usuario estás trabajando'],
  };

  class Shell {
    constructor() {
      this.fs = crearFS();
      this.user = 'ana';
      this.env = { HOME: '/home/ana' };
      this.cwd = '/home/ana';
      this.oldpwd = null;
      this.history = [];
      this.status = 0;
      this.st = 0;
      this.sudo = false;
      this.prof = 0;
      this.salida = [];
      this.limpiar = false;
      this.procs = [
        { pid: 1, user: 'root', cmd: '/sbin/init', cpu: 0.0, mem: 0.1, tty: '?' },
        { pid: 612, user: 'root', cmd: '/usr/sbin/sshd', cpu: 0.0, mem: 0.2, tty: '?' },
        { pid: 1204, user: 'ana', cmd: 'bash', cpu: 0.0, mem: 0.3, tty: 'pts/0' },
        { pid: 2210, user: 'ana', cmd: 'python3 servidor.py', cpu: 1.4, mem: 1.2, tty: 'pts/0' },
        { pid: 2275, user: 'ana', cmd: 'sleep 300', cpu: 0.0, mem: 0.0, tty: 'pts/0' },
      ];
    }

    get eu() { return this.sudo ? 'root' : this.user; }

    prompt() {
      const h = this.env.HOME;
      const ruta = this.cwd === h ? '~' : this.cwd.startsWith(h + '/') ? '~' + this.cwd.slice(h.length) : this.cwd;
      return { usuario: this.user, host: 'linuxpath', ruta };
    }

    /* ---------- sistema de archivos ---------- */
    ruta(p) {
      if (!p) p = '.';
      if (p === '~' || p.startsWith('~/')) p = this.env.HOME + p.slice(1);
      const base = p[0] === '/' ? [] : this.cwd.split('/').filter(Boolean);
      for (const s of p.split('/')) {
        if (s === '' || s === '.') continue;
        if (s === '..') base.pop(); else base.push(s);
      }
      return '/' + base.join('/');
    }
    nodo(abs) {
      let n = this.fs;
      for (const s of abs.split('/').filter(Boolean)) {
        if (n.t !== 'd' || !n.c[s]) return null;
        n = n.c[s];
      }
      return n;
    }
    padre(abs) {
      if (abs === '/') return null;
      const i = abs.lastIndexOf('/');
      const dp = i === 0 ? '/' : abs.slice(0, i);
      return { dir: this.nodo(dp), nombre: abs.slice(i + 1), ruta: dp };
    }
    nombres(n) { return Object.keys(n.c).sort(cmpNombre); }
    puede(n, bit) { // bit: 4 = leer, 2 = escribir, 1 = ejecutar/entrar
      const eu = this.eu;
      if (eu === 'root') return bit !== 1 || n.t === 'd' || (n.mode & 0o111) > 0;
      const clase = n.owner === eu ? (n.mode >> 6) & 7 : USUARIOS[eu].grupos.includes(n.group) ? (n.mode >> 3) & 7 : n.mode & 7;
      return (clase & bit) !== 0;
    }
    grupoPrimario(u) { return USUARIOS[u].grupos[0]; }
    nuevoDir() { return { t: 'd', c: {}, mode: 0o755, owner: this.eu, group: this.grupoPrimario(this.eu), mtime: new Date() }; }
    nuevoArchivo(txt) { return { t: 'f', txt, mode: 0o644, owner: this.eu, group: this.grupoPrimario(this.eu), mtime: new Date() }; }
    modoStr(n) { return (n.t === 'd' ? 'd' : '-') + [6, 3, 0].map((s) => { const b = (n.mode >> s) & 7; return (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-'); }).join(''); }
    arreglarCwd() { while (!this.nodo(this.cwd)) this.cwd = this.cwd.slice(0, this.cwd.lastIndexOf('/')) || '/'; }
    clonar(n) {
      const c = { ...n, owner: this.eu, group: this.grupoPrimario(this.eu), mtime: new Date() };
      if (n.t === 'd') { c.c = {}; for (const k of Object.keys(n.c)) c.c[k] = this.clonar(n.c[k]); }
      return c;
    }
    // Escribe texto en un archivo (lo crea si hace falta). Devuelve el motivo del error o null.
    escribir(abs, txt, añadir) {
      const n = this.nodo(abs);
      if (n) {
        if (n.t === 'd') return E.esdir;
        if (!this.puede(n, 2)) return E.permiso;
        n.txt = añadir ? n.txt + txt : txt; n.mtime = new Date();
        return null;
      }
      const p = this.padre(abs);
      if (!p || !p.dir) return E.noexiste;
      if (p.dir.t !== 'd') return E.nodir;
      if (!this.puede(p.dir, 2)) return E.permiso;
      p.dir.c[p.nombre] = this.nuevoArchivo(txt);
      return null;
    }
    colocar(abs, nodo) {
      const p = this.padre(abs);
      if (!p || !p.dir) return E.noexiste;
      if (p.dir.t !== 'd') return E.nodir;
      if (!this.puede(p.dir, 2)) return E.permiso;
      const ex = p.dir.c[p.nombre];
      if (ex && ex.t === 'd' && nodo.t !== 'd') return 'No se puede sobrescribir un directorio con un no directorio';
      if (ex && ex.t !== 'd' && nodo.t === 'd') return 'No se puede sobrescribir un no directorio con un directorio';
      p.dir.c[p.nombre] = nodo;
      return null;
    }
    leer(arg, cmd) {
      const n = this.nodo(this.ruta(arg));
      if (!n) return this.err(`${cmd}: ${arg}: ${E.noexiste}`), null;
      if (n.t === 'd') return this.err(`${cmd}: ${arg}: ${E.esdir}`), null;
      if (!this.puede(n, 4)) return this.err(`${cmd}: ${arg}: ${E.permiso}`), null;
      return n.txt;
    }
    lineas(t) { const l = t.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; }
    recorrer(abs, base, cb) { // recorre en profundidad los archivos y carpetas debajo de abs
      const n = this.nodo(abs);
      if (!n || n.t !== 'd' || !this.puede(n, 4)) return;
      for (const k of this.nombres(n)) {
        const ruta = base === '' ? k : base.replace(/\/$/, '') + '/' + k;
        cb(ruta, n.c[k]);
        if (n.c[k].t === 'd') this.recorrer((abs === '/' ? '' : abs) + '/' + k, ruta, cb);
      }
    }
    recursivo(n, rec, fn) { fn(n); if (rec && n.t === 'd') for (const k of Object.keys(n.c)) this.recursivo(n.c[k], true, fn); }

    /* ---------- análisis de la línea ---------- */
    expandirVar(s, i) {
      const m = /^(\?|[A-Za-z_][A-Za-z0-9_]*)/.exec(s.slice(i + 1));
      if (!m) return ['$', i + 1];
      const n = m[1];
      const v = n === '?' ? String(this.status) : n === 'PWD' ? this.cwd : n === 'HOME' ? this.env.HOME : n === 'USER' ? this.eu
        : n === 'HOSTNAME' || n === 'HOST' ? 'linuxpath' : n === 'SHELL' ? '/bin/bash' : '';
      return [v, i + 1 + m[0].length];
    }

    tokenizar(s) {
      const toks = [];
      const meta = /[\s|&;<>]/;
      let i = 0;
      while (i < s.length) {
        const c = s[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === '#') break;
        if (c === '|') { if (s[i + 1] === '|') { toks.push({ op: '||' }); i += 2; } else { toks.push({ op: '|' }); i++; } continue; }
        if (c === '&') {
          if (s[i + 1] === '&') { toks.push({ op: '&&' }); i += 2; continue; }
          throw new ErrorShell('ejecutar en segundo plano (&) no está disponible en esta terminal');
        }
        if (c === ';') { toks.push({ op: ';' }); i++; continue; }
        if (c === '>') { if (s[i + 1] === '>') { toks.push({ op: '>>' }); i += 2; } else { toks.push({ op: '>' }); i++; } continue; }
        if (c === '<') throw new ErrorShell('la redirección de entrada (<) no está disponible en esta terminal');
        let v = '', glob = false;
        while (i < s.length && !meta.test(s[i])) {
          const d = s[i];
          if (d === "'") {
            const j = s.indexOf("'", i + 1);
            if (j < 0) throw new ErrorShell('comilla simple sin cerrar');
            v += s.slice(i + 1, j); i = j + 1;
          } else if (d === '"') {
            let j = i + 1;
            while (j < s.length && s[j] !== '"') {
              if (s[j] === '\\' && '"\\$'.includes(s[j + 1] || ' ')) { v += s[j + 1]; j += 2; }
              else if (s[j] === '$') { const [x, k] = this.expandirVar(s, j); v += x; j = k; }
              else { v += s[j]; j++; }
            }
            if (j >= s.length) throw new ErrorShell('comilla doble sin cerrar');
            i = j + 1;
          } else if (d === '\\') { v += s[i + 1] || ''; i += 2; }
          else if (d === '$') { const [x, k] = this.expandirVar(s, i); v += x; i = k; }
          else if (d === '~' && v === '' && (i + 1 >= s.length || s[i + 1] === '/' || meta.test(s[i + 1]))) { v += this.env.HOME; i++; }
          else { if (d === '*' || d === '?') glob = true; v += d; i++; }
        }
        toks.push({ v, glob });
      }
      return toks;
    }

    parsear(toks) {
      const seq = [];
      let pipe = [], cmd = { ws: [], red: null }, enlace = ';';
      const cerrar = (op) => {
        if (!cmd.ws.length && !cmd.red) throw new ErrorShell(`error de sintaxis cerca del elemento inesperado «${op}»`);
        pipe.push(cmd); cmd = { ws: [], red: null };
      };
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (t.op === '>' || t.op === '>>') {
          const sig = toks[i + 1];
          if (!sig || sig.op) throw new ErrorShell('error de sintaxis cerca del elemento inesperado «nueva línea»');
          cmd.red = { modo: t.op, f: sig.v }; i++;
        } else if (t.op === '|') cerrar('|');
        else if (t.op) { cerrar(t.op); seq.push({ pipe, enlace }); pipe = []; enlace = t.op; }
        else cmd.ws.push(t);
      }
      if (cmd.ws.length || cmd.red) { pipe.push(cmd); seq.push({ pipe, enlace }); }
      else if (pipe.length || enlace === '&&' || enlace === '||') throw new ErrorShell('error de sintaxis: la línea termina de forma inesperada');
      return seq;
    }

    expandir(ws) { // globs: * y ? contra el contenido del directorio
      const r = [];
      for (const w of ws) {
        if (!w.glob) { r.push(w.v); continue; }
        const i = w.v.lastIndexOf('/');
        const dirTxt = i >= 0 ? w.v.slice(0, i + 1) : '';
        const pat = w.v.slice(i + 1);
        if (/[*?]/.test(dirTxt)) { r.push(w.v); continue; }
        const dn = this.nodo(this.ruta(dirTxt || '.'));
        const re = globRe(pat);
        let m = [];
        if (dn && dn.t === 'd' && this.puede(dn, 4)) m = this.nombres(dn).filter((k) => re.test(k) && (pat.startsWith('.') || !k.startsWith('.'))).map((k) => dirTxt + k);
        r.push(...(m.length ? m : [w.v]));
      }
      return r;
    }

    /* ---------- ejecución ---------- */
    emitir(k, s) { this.salida.push({ k, s }); }
    err(m) { this.emitir('e', m); this.st = 1; }

    ejecutar(linea) {
      this.salida = []; this.limpiar = false;
      const t = linea.trim();
      if (!t) return { salida: [], limpiar: false };
      this.history.push(t);
      try { this.ejecutarSecuencia(this.parsear(this.tokenizar(t))); }
      catch (e) { if (e instanceof ErrorShell) { this.emitir('e', 'bash: ' + e.message); this.status = 2; } else throw e; }
      return { salida: this.salida, limpiar: this.limpiar };
    }

    ejecutarSecuencia(seq) {
      for (const { pipe, enlace } of seq) {
        if (enlace === '&&' && this.status !== 0) continue;
        if (enlace === '||' && this.status === 0) continue;
        this.ejecutarPipe(pipe);
      }
    }

    ejecutarPipe(pipe) {
      let entrada = '';
      pipe.forEach((cmd, i) => {
        const ultimo = i === pipe.length - 1;
        const ws = this.expandir(cmd.ws);
        const out = ws.length ? this.ejecutarPalabras(ws, entrada, ultimo && !cmd.red) : '';
        if (cmd.red) {
          const e = this.escribir(this.ruta(cmd.red.f), out, cmd.red.modo === '>>');
          if (e) { this.emitir('e', `bash: ${cmd.red.f}: ${e}`); this.status = 1; }
          entrada = '';
        } else if (ultimo) { if (out) this.emitir('o', out); }
        else entrada = out;
      });
    }

    ejecutarPalabras(ws, stdin, tty) {
      const prev = this.st;
      this.st = 0;
      const out = this.correr(ws, stdin, tty);
      this.status = this.st;
      this.st = prev;
      return out;
    }

    correr(ws, stdin, tty) {
      const nombre = ws[0];
      if (nombre.includes('/')) return this.script(nombre);
      const f = this['cmd_' + nombre];
      if (typeof f !== 'function') { this.emitir('e', `bash: ${nombre}: orden no encontrada`); this.st = 127; return ''; }
      return f.call(this, ws.slice(1), { stdin, tty }) || '';
    }

    script(w) {
      const a = this.ruta(w), n = this.nodo(a);
      if (!n) { this.emitir('e', `bash: ${w}: ${E.noexiste}`); this.st = 127; return ''; }
      if (n.t === 'd') { this.emitir('e', `bash: ${w}: ${E.esdir}`); this.st = 126; return ''; }
      if (!this.puede(n, 1) || !this.puede(n, 4)) { this.emitir('e', `bash: ${w}: ${E.permiso}`); this.st = 126; return ''; }
      if (this.prof >= 5) { this.emitir('e', 'bash: demasiados niveles de scripts anidados'); this.st = 1; return ''; }
      this.prof++;
      try {
        for (const l of n.txt.split('\n')) {
          const t = l.trim();
          if (!t || t.startsWith('#')) continue;
          try { this.ejecutarSecuencia(this.parsear(this.tokenizar(t))); }
          catch (e) { if (e instanceof ErrorShell) { this.emitir('e', 'bash: ' + e.message); this.status = 2; } else throw e; }
        }
      } finally { this.prof--; }
      this.st = this.status;
      return '';
    }

    opciones(args, cmd, validas) {
      const f = new Set(), r = [];
      let fin = false;
      for (const a of args) {
        if (!fin && a === '--') { fin = true; continue; }
        if (!fin && /^-[A-Za-z]+$/.test(a)) {
          for (const ch of a.slice(1)) {
            if (!validas.includes(ch)) { this.err(`${cmd}: opción incorrecta -- '${ch}'`); this.err(`Pruebe «man ${cmd}» para más información.`); return null; }
            f.add(ch);
          }
        } else r.push(a);
      }
      return { f, r };
    }

    /* ---------- autocompletado con Tab ---------- */
    completar(linea) {
      const m = /[^\s]*$/.exec(linea);
      const pal = m[0], ini = linea.length - pal.length;
      const antes = linea.slice(0, ini).trim();
      const posCmd = antes === '' || /(\||&&|;)$/.test(antes);
      let cand = [], nombres = [];
      if (posCmd && !pal.includes('/')) {
        cand = nombres = Object.getOwnPropertyNames(Shell.prototype).filter((n) => n.startsWith('cmd_')).map((n) => n.slice(4)).filter((n) => n.startsWith(pal)).sort();
      } else {
        const i = pal.lastIndexOf('/');
        const dirTxt = i >= 0 ? pal.slice(0, i + 1) : '';
        const pref = pal.slice(i + 1);
        const dn = this.nodo(this.ruta(dirTxt || '.'));
        if (dn && dn.t === 'd' && this.puede(dn, 4)) {
          const ks = this.nombres(dn).filter((k) => k.startsWith(pref) && (pref.startsWith('.') || !k.startsWith('.')));
          cand = ks.map((k) => dirTxt + k + (dn.c[k].t === 'd' ? '/' : ''));
          nombres = ks.map((k) => k + (dn.c[k].t === 'd' ? '/' : ''));
        }
      }
      if (!cand.length) return { linea, opciones: [] };
      let comun = cand[0];
      for (const c of cand) while (!c.startsWith(comun)) comun = comun.slice(0, -1);
      let nueva = linea.slice(0, ini) + comun;
      if (cand.length === 1 && !comun.endsWith('/')) nueva += ' ';
      return { linea: nueva, opciones: cand.length > 1 ? nombres : [] };
    }

    // Árbol de todo el sistema para el panel lateral (sin archivos ocultos).
    arbol() {
      const filas = [{ texto: '/', dir: true, aqui: this.cwd === '/' }];
      const rec = (n, abs, pref) => {
        const ks = this.nombres(n).filter((k) => !k.startsWith('.'));
        ks.forEach((k, i) => {
          const h = n.c[k], ult = i === ks.length - 1, ruta = (abs === '/' ? '' : abs) + '/' + k;
          filas.push({ texto: pref + (ult ? '└─ ' : '├─ ') + k + (h.t === 'd' ? '/' : ''), dir: h.t === 'd', aqui: ruta === this.cwd });
          if (h.t === 'd') rec(h, ruta, pref + (ult ? '   ' : '│  '));
        });
      };
      rec(this.fs, '/', '');
      return filas;
    }

    /* ---------- comandos ---------- */
    cmd_pwd() { return this.cwd + '\n'; }

    cmd_cd(args) {
      if (args.length > 1) { this.err('cd: demasiados argumentos'); return ''; }
      let dest = args[0];
      if (dest === undefined || dest === '~') dest = this.env.HOME;
      const volver = dest === '-';
      if (volver) dest = this.oldpwd || this.cwd;
      const a = this.ruta(dest), n = this.nodo(a);
      if (!n) this.err(`cd: ${args[0]}: ${E.noexiste}`);
      else if (n.t !== 'd') this.err(`cd: ${args[0]}: ${E.nodir}`);
      else if (!this.puede(n, 1)) this.err(`cd: ${args[0]}: ${E.permiso}`);
      else { this.oldpwd = this.cwd; this.cwd = a; if (volver) return a + '\n'; }
      return '';
    }

    cmd_ls(args, io) {
      const o = this.opciones(args, 'ls', 'lah1d'); if (!o) return '';
      const largo = o.f.has('l'), todo = o.f.has('a'), humano = o.f.has('h'), uno = o.f.has('1'), propia = o.f.has('d');
      const rutas = o.r.length ? o.r : ['.'];
      const archivos = [], dirs = [];
      for (const p of rutas) {
        const a = this.ruta(p), n = this.nodo(a);
        if (!n) { this.err(`ls: no se puede acceder a '${p}': ${E.noexiste}`); continue; }
        (n.t === 'd' && !propia ? dirs : archivos).push({ p, a, n });
      }
      const formato = (ents, total) => {
        if (largo) return this.listaLarga(ents, humano, io.tty, total);
        if (!ents.length) return '';
        const nombres = ents.map((e) => marca(e.name, e.n, io.tty));
        return (io.tty && !uno ? nombres.join('  ') : nombres.join('\n')) + '\n';
      };
      const bloques = [];
      if (archivos.length) bloques.push(formato(archivos.map((x) => ({ name: x.p, n: x.n })), false));
      for (const d of dirs) {
        if (!this.puede(d.n, 4)) { this.err(`ls: no se puede abrir el directorio '${d.p}': ${E.permiso}`); continue; }
        const ents = [];
        if (todo) {
          ents.push({ name: '.', n: d.n });
          const pa = this.padre(d.a);
          ents.push({ name: '..', n: pa && pa.dir ? pa.dir : d.n });
        }
        for (const k of this.nombres(d.n)) if (todo || !k.startsWith('.')) ents.push({ name: k, n: d.n.c[k] });
        bloques.push((rutas.length > 1 ? d.p + ':\n' : '') + formato(ents, true));
      }
      return bloques.join('\n');
    }

    listaLarga(ents, humano, tty, conTotal) {
      const filas = ents.map(({ name, n }) => [
        this.modoStr(n), String(n.t === 'd' ? 2 + Object.values(n.c).filter((x) => x.t === 'd').length : 1),
        n.owner, n.group, tamTxt(n, humano), fecha(n.mtime), marca(name, n, tty),
      ]);
      const w = [0, 1, 2, 3, 4].map((i) => Math.max(0, ...filas.map((f) => f[i].length)));
      const total = ents.reduce((s, { n }) => s + (n.t === 'd' ? 4 : Math.ceil(bytes(n.txt) / 4096) * 4), 0);
      return (conTotal ? `total ${total}\n` : '')
        + filas.map((f) => [f[0], f[1].padStart(w[1]), f[2].padEnd(w[2]), f[3].padEnd(w[3]), f[4].padStart(w[4]), f[5], f[6]].join(' ')).join('\n')
        + (filas.length ? '\n' : '');
    }

    cmd_ll(args, io) { return this.cmd_ls(['-l', ...args], io); }

    cmd_mkdir(args) {
      const o = this.opciones(args, 'mkdir', 'pv'); if (!o) return '';
      if (!o.r.length) { this.err('mkdir: falta un operando'); return ''; }
      for (const p of o.r) {
        const a = this.ruta(p);
        if (this.nodo(a)) { if (!o.f.has('p')) this.err(`mkdir: no se puede crear el directorio '${p}': ${E.existe}`); continue; }
        const partes = a.split('/').filter(Boolean);
        let cur = this.fs;
        for (let i = 0; i < partes.length; i++) {
          const s = partes[i];
          let sig = cur.c[s];
          if (!sig) {
            if (i < partes.length - 1 && !o.f.has('p')) { this.err(`mkdir: no se puede crear el directorio '${p}': ${E.noexiste}`); break; }
            if (!this.puede(cur, 2)) { this.err(`mkdir: no se puede crear el directorio '${p}': ${E.permiso}`); break; }
            sig = cur.c[s] = this.nuevoDir();
          } else if (sig.t !== 'd') { this.err(`mkdir: no se puede crear el directorio '${p}': ${E.nodir}`); break; }
          cur = sig;
        }
      }
      return '';
    }

    cmd_rmdir(args) {
      if (!args.length) { this.err('rmdir: falta un operando'); return ''; }
      for (const p of args) {
        const a = this.ruta(p), n = this.nodo(a);
        if (!n) { this.err(`rmdir: fallo al borrar '${p}': ${E.noexiste}`); continue; }
        if (n.t !== 'd') { this.err(`rmdir: fallo al borrar '${p}': ${E.nodir}`); continue; }
        if (Object.keys(n.c).length) { this.err(`rmdir: fallo al borrar '${p}': ${E.novacio}`); continue; }
        const pa = this.padre(a);
        if (!pa || !this.puede(pa.dir, 2)) { this.err(`rmdir: fallo al borrar '${p}': ${E.permiso}`); continue; }
        delete pa.dir.c[pa.nombre];
      }
      this.arreglarCwd();
      return '';
    }

    cmd_touch(args) {
      if (!args.length) { this.err('touch: falta un operando archivo'); return ''; }
      for (const p of args) {
        const a = this.ruta(p), n = this.nodo(a);
        if (n) { n.mtime = new Date(); continue; }
        const e = this.escribir(a, '', false);
        if (e) this.err(`touch: no se puede hacer touch '${p}': ${e}`);
      }
      return '';
    }

    cmd_cat(args, io) {
      const o = this.opciones(args, 'cat', 'n'); if (!o) return '';
      const num = (t) => (o.f.has('n') ? this.lineas(t).map((l, i) => String(i + 1).padStart(6) + '\t' + l).join('\n') + '\n' : t);
      if (!o.r.length) return num(io.stdin);
      let s = '';
      for (const p of o.r) { const t = this.leer(p, 'cat'); if (t !== null) s += num(t); }
      return s;
    }

    cmd_echo(args) {
      args = args.slice();
      let nl = true, esc = false;
      while (args[0] && /^-[neE]+$/.test(args[0])) { const f = args.shift(); if (f.includes('n')) nl = false; if (f.includes('e')) esc = true; }
      let s = args.join(' ');
      if (esc) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      return s + (nl ? '\n' : '');
    }

    contarLineas(args, cmd) {
      let n = 10;
      const r = [];
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '-n') { n = parseInt(args[++i], 10); if (isNaN(n) || n < 0) { this.err(`${cmd}: número de líneas inválido: «${args[i]}»`); return null; } }
        else if (/^-n\d+$/.test(a)) n = +a.slice(2);
        else if (/^-\d+$/.test(a)) n = +a.slice(1);
        else r.push(a);
      }
      return { n, r };
    }
    cabeceraCola(cmd, args, io, f) {
      const o = this.contarLineas(args, cmd); if (!o) return '';
      const fmt = (t) => { const r = f(this.lineas(t), o.n); return r.length ? r.join('\n') + '\n' : ''; };
      if (!o.r.length) return fmt(io.stdin);
      let s = '';
      o.r.forEach((p, i) => {
        const t = this.leer(p, cmd);
        if (t === null) return;
        if (o.r.length > 1) s += (i ? '\n' : '') + `==> ${p} <==\n`;
        s += fmt(t);
      });
      return s;
    }
    cmd_head(args, io) { return this.cabeceraCola('head', args, io, (l, n) => l.slice(0, n)); }
    cmd_tail(args, io) { return this.cabeceraCola('tail', args, io, (l, n) => (n === 0 ? [] : l.slice(-n))); }

    cmd_wc(args, io) {
      const o = this.opciones(args, 'wc', 'lwc'); if (!o) return '';
      const cols = ['l', 'w', 'c'].filter((k) => o.f.size === 0 || o.f.has(k));
      const cuenta = (t) => ({ l: (t.match(/\n/g) || []).length, w: t.trim() ? t.trim().split(/\s+/).length : 0, c: bytes(t) });
      const fila = (c, nombre) => cols.map((k) => c[k]).join(' ') + (nombre ? ' ' + nombre : '') + '\n';
      if (!o.r.length) return fila(cuenta(io.stdin), '');
      let s = '', n = 0;
      const tot = { l: 0, w: 0, c: 0 };
      for (const p of o.r) {
        const t = this.leer(p, 'wc'); if (t === null) continue;
        const c = cuenta(t); s += fila(c, p); for (const k in tot) tot[k] += c[k]; n++;
      }
      if (n > 1) s += fila(tot, 'total');
      return s;
    }

    cmd_sort(args, io) {
      const o = this.opciones(args, 'sort', 'rnu'); if (!o) return '';
      let l = [];
      if (!o.r.length) l = this.lineas(io.stdin);
      else for (const p of o.r) { const t = this.leer(p, 'sort'); if (t !== null) l.push(...this.lineas(t)); }
      l.sort(o.f.has('n') ? (a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0) : cmpNombre);
      if (o.f.has('u')) l = l.filter((x, i) => i === 0 || x !== l[i - 1]);
      if (o.f.has('r')) l.reverse();
      return l.length ? l.join('\n') + '\n' : '';
    }

    cmd_uniq(args, io) {
      const o = this.opciones(args, 'uniq', 'c'); if (!o) return '';
      let l;
      if (o.r.length) { const t = this.leer(o.r[0], 'uniq'); if (t === null) return ''; l = this.lineas(t); }
      else l = this.lineas(io.stdin);
      const out = [];
      for (const x of l) { const u = out[out.length - 1]; if (u && u.t === x) u.n++; else out.push({ t: x, n: 1 }); }
      return out.map((u) => (o.f.has('c') ? String(u.n).padStart(7) + ' ' : '') + u.t).join('\n') + (out.length ? '\n' : '');
    }

    cmd_grep(args, io) {
      const o = this.opciones(args, 'grep', 'nicvrEl'); if (!o) return '';
      if (!o.r.length) { this.err('Uso: grep [OPCIÓN]... PATRONES [ARCHIVO]...'); this.st = 2; return ''; }
      const [pat, ...rutas] = o.r;
      let re;
      try { re = new RegExp(pat, o.f.has('i') ? 'i' : ''); } catch (e) { this.err('grep: expresión regular inválida'); this.st = 2; return ''; }
      const obj = [];
      if (!rutas.length) { if (o.f.has('r')) rutas.push(''); else obj.push({ nombre: null, txt: io.stdin }); }
      for (const p of rutas) {
        const a = this.ruta(p), n = this.nodo(a);
        if (!n) { this.err(`grep: ${p}: ${E.noexiste}`); continue; }
        if (n.t === 'd') {
          if (!o.f.has('r')) { this.err(`grep: ${p}: ${E.esdir}`); continue; }
          this.recorrer(a, p, (ruta, nodo) => { if (nodo.t === 'f' && this.puede(nodo, 4)) obj.push({ nombre: ruta, txt: nodo.txt }); });
        } else if (!this.puede(n, 4)) this.err(`grep: ${p}: ${E.permiso}`);
        else obj.push({ nombre: p, txt: n.txt });
      }
      const prefijo = obj.length > 1 || o.f.has('r');
      const inv = o.f.has('v');
      let out = '', hay = false;
      for (const ob of obj) {
        let cuenta = 0;
        const pre = prefijo && ob.nombre ? ob.nombre + ':' : '';
        this.lineas(ob.txt).forEach((l, i) => {
          if (re.test(l) === inv) return;
          cuenta++; hay = true;
          if (!o.f.has('c') && !o.f.has('l')) out += pre + (o.f.has('n') ? (i + 1) + ':' : '') + l + '\n';
        });
        if (o.f.has('c')) out += pre + cuenta + '\n';
        if (o.f.has('l') && cuenta) out += ob.nombre + '\n';
      }
      if (!hay) this.st = 1;
      return out;
    }

    cmd_find(args) {
      const rutas = [];
      let i = 0;
      while (i < args.length && !args[i].startsWith('-')) rutas.push(args[i++]);
      let nombre = null, ci = false, tipo = null, prof = Infinity;
      while (i < args.length) {
        const a = args[i++];
        if (a === '-name' || a === '-iname') {
          nombre = args[i++]; ci = a === '-iname';
          if (nombre === undefined) { this.err(`find: falta un argumento para «${a}»`); return ''; }
        } else if (a === '-type') {
          tipo = args[i++];
          if (!['f', 'd'].includes(tipo)) { this.err(`find: Argumento desconocido para -type: ${tipo}`); return ''; }
        } else if (a === '-maxdepth') {
          prof = parseInt(args[i++], 10);
          if (isNaN(prof)) { this.err('find: se esperaba un número para -maxdepth'); return ''; }
        } else { this.err(`find: predicado desconocido «${a}»`); return ''; }
      }
      const re = nombre !== null ? globRe(nombre, ci) : null;
      let out = '';
      const rec = (disp, n, d) => {
        const base = disp === '.' ? '.' : disp.split('/').filter(Boolean).pop() || '/';
        if ((!tipo || (tipo === 'f' && n.t === 'f') || (tipo === 'd' && n.t === 'd')) && (!re || re.test(base))) out += disp + '\n';
        if (n.t === 'd' && d < prof) {
          if (!this.puede(n, 4)) { this.err(`find: ‘${disp}’: ${E.permiso}`); return; }
          for (const k of this.nombres(n)) rec((disp.endsWith('/') ? disp : disp + '/') + k, n.c[k], d + 1);
        }
      };
      for (const p of rutas.length ? rutas : ['.']) {
        const n = this.nodo(this.ruta(p));
        if (!n) { this.err(`find: ‘${p}’: ${E.noexiste}`); continue; }
        rec(p, n, 0);
      }
      return out;
    }

    cmd_tree(args, io) {
      const p = args[0] || '.', n = this.nodo(this.ruta(p));
      if (!n) { this.err(`${p} [error al abrir el directorio]`); return ''; }
      const lineas = [p];
      let dirs = 0, files = 0;
      const rec = (x, pref) => {
        if (!this.puede(x, 4)) { lineas.push(pref + '└── [Permiso denegado]'); return; }
        const ks = this.nombres(x).filter((k) => !k.startsWith('.'));
        ks.forEach((k, i) => {
          const h = x.c[k], ult = i === ks.length - 1;
          lineas.push(pref + (ult ? '└── ' : '├── ') + marca(k, h, io.tty));
          if (h.t === 'd') { dirs++; rec(h, pref + (ult ? '    ' : '│   ')); } else files++;
        });
      };
      if (n.t === 'd') rec(n, '');
      return lineas.join('\n') + `\n\n${dirs} directorios, ${files} archivos\n`;
    }

    cmd_cp(args) {
      const o = this.opciones(args, 'cp', 'rRf'); if (!o) return '';
      const rec = o.f.has('r') || o.f.has('R');
      if (o.r.length < 2) { this.err(o.r.length ? `cp: falta el fichero de destino después de '${o.r[0]}'` : 'cp: falta un operando fichero'); return ''; }
      const dst = o.r.pop(), da = this.ruta(dst), dn = this.nodo(da);
      const enDir = dn && dn.t === 'd';
      if (o.r.length > 1 && !enDir) { this.err(`cp: el objetivo '${dst}' no es un directorio`); return ''; }
      for (const s of o.r) {
        const sa = this.ruta(s), sn = this.nodo(sa);
        if (!sn) { this.err(`cp: no se puede efectuar 'stat' sobre '${s}': ${E.noexiste}`); continue; }
        if (sn.t === 'd' && !rec) { this.err(`cp: -r no especificado; se omite el directorio '${s}'`); continue; }
        if (sn.t === 'f' && !this.puede(sn, 4)) { this.err(`cp: no se puede abrir '${s}' para lectura: ${E.permiso}`); continue; }
        const base = sa.split('/').pop();
        const destino = enDir ? (da === '/' ? '' : da) + '/' + base : da;
        if (destino === sa) { this.err(`cp: '${s}' y '${dst}' son el mismo fichero`); continue; }
        if (sn.t === 'd' && destino.startsWith(sa + '/')) { this.err(`cp: no se puede copiar un directorio, '${s}', dentro de sí mismo, '${destino}'`); continue; }
        const e = this.colocar(destino, this.clonar(sn));
        if (e) this.err(`cp: no se puede crear ${sn.t === 'd' ? 'el directorio' : 'el fichero regular'} '${enDir ? dst.replace(/\/$/, '') + '/' + base : dst}': ${e}`);
      }
      return '';
    }

    cmd_mv(args) {
      const o = this.opciones(args, 'mv', 'f'); if (!o) return '';
      if (o.r.length < 2) { this.err(o.r.length ? `mv: falta el fichero de destino después de '${o.r[0]}'` : 'mv: falta un operando fichero'); return ''; }
      const dst = o.r.pop(), da = this.ruta(dst), dn = this.nodo(da);
      const enDir = dn && dn.t === 'd';
      if (o.r.length > 1 && !enDir) { this.err(`mv: el objetivo '${dst}' no es un directorio`); return ''; }
      for (const s of o.r) {
        const sa = this.ruta(s), sn = this.nodo(sa);
        if (!sn) { this.err(`mv: no se puede efectuar 'stat' sobre '${s}': ${E.noexiste}`); continue; }
        const base = sa.split('/').pop();
        const destino = enDir ? (da === '/' ? '' : da) + '/' + base : da;
        if (destino === sa) { this.err(`mv: '${s}' y '${dst}' son el mismo fichero`); continue; }
        if (sn.t === 'd' && destino.startsWith(sa + '/')) { this.err(`mv: no se puede mover '${s}' a un subdirectorio de sí mismo, '${destino}'`); continue; }
        const pa = this.padre(sa);
        if (!pa || !this.puede(pa.dir, 2)) { this.err(`mv: no se puede mover '${s}' a '${dst}': ${E.permiso}`); continue; }
        const e = this.colocar(destino, sn);
        if (e) { this.err(`mv: no se puede mover '${s}' a '${dst}': ${e}`); continue; }
        delete pa.dir.c[pa.nombre];
      }
      this.arreglarCwd();
      return '';
    }

    cmd_rm(args) {
      const o = this.opciones(args, 'rm', 'rRf'); if (!o) return '';
      const rec = o.f.has('r') || o.f.has('R'), forzar = o.f.has('f');
      if (!o.r.length) { if (!forzar) this.err('rm: falta un operando'); return ''; }
      for (const p of o.r) {
        const a = this.ruta(p);
        if (/(^|\/)\.\.?$/.test(p)) { this.err("rm: no se puede borrar '.' o '..'"); continue; }
        if (a === '/') { this.err("rm: es peligroso operar recursivamente en '/'"); this.err('rm: utilice --no-preserve-root para anular esta protección'); continue; }
        const n = this.nodo(a);
        if (!n) { if (!forzar) this.err(`rm: no se puede borrar '${p}': ${E.noexiste}`); continue; }
        if (n.t === 'd' && !rec) { this.err(`rm: no se puede borrar '${p}': ${E.esdir}`); continue; }
        const pa = this.padre(a);
        if (!this.puede(pa.dir, 2)) { this.err(`rm: no se puede borrar '${p}': ${E.permiso}`); continue; }
        delete pa.dir.c[pa.nombre];
      }
      this.arreglarCwd();
      return '';
    }

    modoNuevo(actual, txt) {
      if (/^[0-7]{1,4}$/.test(txt)) return parseInt(txt, 8) & 0o777;
      let m = actual;
      for (const parte of txt.split(',')) {
        const x = /^([ugoa]*)([+\-=])([rwx]*)$/.exec(parte);
        if (!x) return null;
        const quien = x[1] === '' || x[1].includes('a') ? 'ugo' : x[1];
        const bits = (x[3].includes('r') ? 4 : 0) | (x[3].includes('w') ? 2 : 0) | (x[3].includes('x') ? 1 : 0);
        for (const q of quien) {
          const sh = q === 'u' ? 6 : q === 'g' ? 3 : 0;
          if (x[2] === '+') m |= bits << sh;
          else if (x[2] === '-') m &= ~(bits << sh);
          else m = (m & ~(7 << sh)) | (bits << sh);
        }
      }
      return m & 0o777;
    }

    cmd_chmod(args) {
      let rec = false;
      const r = [];
      for (const a of args) { if (a === '-R') rec = true; else r.push(a); }
      if (r.length < 2) { this.err(r.length ? `chmod: falta un operando después de '${r[0]}'` : 'chmod: falta un operando'); return ''; }
      const modo = r[0];
      if (this.modoNuevo(0o644, modo) === null) { this.err(`chmod: modo inválido: '${modo}'`); return ''; }
      for (const p of r.slice(1)) {
        const n = this.nodo(this.ruta(p));
        if (!n) { this.err(`chmod: no se puede acceder a '${p}': ${E.noexiste}`); continue; }
        if (this.eu !== 'root' && n.owner !== this.eu) { this.err(`chmod: cambiando los permisos de '${p}': ${E.noperm}`); continue; }
        this.recursivo(n, rec, (x) => { x.mode = this.modoNuevo(x.mode, modo); });
      }
      return '';
    }

    cmd_chown(args) {
      let rec = false;
      const r = [];
      for (const a of args) { if (a === '-R') rec = true; else r.push(a); }
      if (r.length < 2) { this.err(r.length ? `chown: falta un operando después de '${r[0]}'` : 'chown: falta un operando'); return ''; }
      const [spec, ...ps] = r;
      const [u, g] = spec.split(':');
      if (u && !USUARIOS[u]) { this.err(`chown: usuario inválido: «${spec}»`); return ''; }
      if (g && !GRUPOS.includes(g)) { this.err(`chown: grupo inválido: «${spec}»`); return ''; }
      for (const p of ps) {
        const n = this.nodo(this.ruta(p));
        if (!n) { this.err(`chown: no se puede acceder a '${p}': ${E.noexiste}`); continue; }
        if (this.eu !== 'root') { this.err(`chown: cambiando el propietario de '${p}': ${E.noperm}`); continue; }
        this.recursivo(n, rec, (x) => { if (u) x.owner = u; if (g) x.group = g; });
      }
      return '';
    }

    cmd_chgrp(args) {
      let rec = false;
      const r = [];
      for (const a of args) { if (a === '-R') rec = true; else r.push(a); }
      if (r.length < 2) { this.err(r.length ? `chgrp: falta un operando después de '${r[0]}'` : 'chgrp: falta un operando'); return ''; }
      const [g, ...ps] = r;
      if (!GRUPOS.includes(g)) { this.err(`chgrp: grupo inválido: «${g}»`); return ''; }
      for (const p of ps) {
        const n = this.nodo(this.ruta(p));
        if (!n) { this.err(`chgrp: no se puede acceder a '${p}': ${E.noexiste}`); continue; }
        if (this.eu !== 'root' && (n.owner !== this.eu || !USUARIOS[this.eu].grupos.includes(g))) { this.err(`chgrp: cambiando el grupo de '${p}': ${E.noperm}`); continue; }
        this.recursivo(n, rec, (x) => { x.group = g; });
      }
      return '';
    }

    cmd_sudo(args, io) {
      if (!args.length) { this.err('uso: sudo ORDEN [ARGUMENTO]...'); return ''; }
      this.sudo = true;
      try { return this.correr(args, io.stdin, io.tty); } finally { this.sudo = false; }
    }

    cmd_whoami() { return this.eu + '\n'; }
    cmd_id() {
      const u = this.eu, d = USUARIOS[u];
      return `uid=${d.uid}(${u}) gid=${GID[d.grupos[0]]}(${d.grupos[0]}) grupos=${d.grupos.map((g) => GID[g] + '(' + g + ')').join(',')}\n`;
    }
    cmd_hostname() { return 'linuxpath\n'; }
    cmd_uname(args) {
      if (args.includes('-a')) return 'Linux linuxpath 6.8.0-simulado #1 SMP x86_64 GNU/Linux\n';
      if (args.includes('-r')) return '6.8.0-simulado\n';
      return 'Linux\n';
    }
    cmd_date() {
      const d = new Date();
      return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}\n`;
    }
    cmd_clear() { this.limpiar = true; return ''; }
    cmd_exit() { return 'Esta es una terminal de práctica: no hay sesión que cerrar. Usa clear para limpiar la pantalla.\n'; }

    cmd_history(args) {
      if (args[0] === '-c') { this.history = []; return ''; }
      let h = this.history.map((c, i) => [i + 1, c]);
      if (/^\d+$/.test(args[0] || '')) h = h.slice(-parseInt(args[0], 10));
      return h.map(([i, c]) => String(i).padStart(5) + '  ' + c).join('\n') + (h.length ? '\n' : '');
    }

    cmd_help() {
      return 'Comandos disponibles (usa «man COMANDO» para ver cómo se usa):\n\n'
        + Object.keys(AYUDA).sort().map((n) => '  ' + n.padEnd(9) + AYUDA[n][1].split(';')[0]).join('\n')
        + '\n\nAtajos: Tab completa, ↑ y ↓ recorren el historial, Ctrl+L limpia la pantalla.\nPuedes encadenar comandos con | y guardar la salida con > o >>.\n';
    }

    cmd_man(args) {
      if (!args.length) { this.err('¿Qué página de manual desea?'); return ''; }
      const a = AYUDA[args[0]];
      if (!a) { this.err(`No hay ninguna entrada de manual para ${args[0]}`); return ''; }
      let s = `NOMBRE\n       ${args[0]} - ${a[1]}\n\nSINOPSIS\n       ${a[0]}\n`;
      if (a[2]) s += '\nOPCIONES\n' + a[2].map((x) => { const [k, d] = x.split('|'); return '       ' + k.padEnd(10) + d; }).join('\n') + '\n';
      return s;
    }

    cmd_ps(args) {
      const completo = /[aux]/.test(args.join('').replace(/-/g, ''));
      if (!completo) {
        const lista = [...this.procs.filter((p) => p.tty === 'pts/0'), { pid: 3001, cmd: 'ps', tty: 'pts/0' }];
        return 'PID'.padStart(7) + ' ' + 'TTY'.padEnd(8) + ' ' + 'TIME'.padStart(8) + ' CMD\n'
          + lista.map((p) => String(p.pid).padStart(7) + ' ' + p.tty.padEnd(8) + ' 00:00:00 ' + p.cmd.split(' ')[0]).join('\n') + '\n';
      }
      const lista = [...this.procs, { pid: 3002, user: this.eu, cmd: 'ps aux', cpu: 0.0, mem: 0.1, tty: 'pts/0' }];
      return 'USER'.padEnd(8) + ' ' + 'PID'.padStart(6) + ' %CPU %MEM TTY      COMMAND\n'
        + lista.map((p) => p.user.padEnd(8) + ' ' + String(p.pid).padStart(6) + ' ' + p.cpu.toFixed(1).padStart(4) + ' ' + p.mem.toFixed(1).padStart(4) + ' ' + p.tty.padEnd(8) + ' ' + p.cmd).join('\n') + '\n';
    }

    cmd_kill(args) {
      const pids = args.filter((a) => !/^-(\d+|[A-Za-z]+)$/.test(a));
      if (!pids.length) { this.err('kill: uso: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... o kill -l [sigspec]'); return ''; }
      for (const p of pids) {
        if (!/^\d+$/.test(p)) { this.err(`kill: ${p}: los argumentos deben ser IDs de procesos o trabajos`); continue; }
        const i = this.procs.findIndex((x) => x.pid === +p);
        if (i < 0) { this.err(`kill: (${p}) - No existe el proceso`); continue; }
        const pr = this.procs[i];
        if (pr.user !== this.eu && this.eu !== 'root') { this.err(`kill: (${p}) - ${E.noperm}`); continue; }
        if (pr.pid === 1204) { this.err('kill: ese es el proceso de esta terminal (bash); aquí no se puede terminar'); continue; }
        this.procs.splice(i, 1);
      }
      return '';
    }

    cmd_ping(args) {
      let n = 4;
      const r = [];
      for (let i = 0; i < args.length; i++) { if (args[i] === '-c') n = Math.min(Math.max(parseInt(args[++i], 10) || 4, 1), 10); else r.push(args[i]); }
      if (!r.length) { this.err('ping: falta la dirección de destino'); this.st = 2; return ''; }
      const h = r[0];
      const HOSTS = { localhost: '127.0.0.1', '127.0.0.1': '127.0.0.1', 'example.com': '93.184.216.34', 'google.com': '142.250.78.14', 'linuxpath.dev': '203.0.113.10' };
      const ip = HOSTS[h] || (/^\d+\.\d+\.\d+\.\d+$/.test(h) ? h : null);
      if (!ip) { this.err(`ping: ${h}: Fallo temporal en la resolución de nombres`); this.st = 2; return ''; }
      const local = ip === '127.0.0.1';
      const ts = Array.from({ length: n }, (_, i) => (local ? 0.04 + i * 0.01 : 12 + ((i * 7 + h.length * 3) % 15) + (i % 2 ? 0.3 : 0.7)));
      const f = (x) => x.toFixed(local ? 3 : 1);
      return `PING ${h} (${ip}) 56(84) bytes of data.\n`
        + ts.map((t, i) => `64 bytes from ${ip}: icmp_seq=${i + 1} ttl=${local ? 64 : 57} time=${f(t)} ms`).join('\n')
        + `\n\n--- ${h} estadísticas de ping ---\n${n} paquetes transmitidos, ${n} recibidos, 0% de pérdida de paquetes\n`
        + `rtt min/avg/max = ${f(Math.min(...ts))}/${f(ts.reduce((a, b) => a + b, 0) / n)}/${f(Math.max(...ts))} ms\n`;
    }
  }

  Shell.AYUDA = AYUDA;
  if (typeof module !== 'undefined' && module.exports) module.exports = Shell;
  else global_.LinuxShell = Shell;
})(typeof window !== 'undefined' ? window : globalThis);
