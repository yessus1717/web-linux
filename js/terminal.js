/* Terminal de la página principal: reproduce lecciones de ejemplo en bucle.
   Es una demostración visual: no ejecuta ni interpreta comandos reales.
   Para añadir una lección, agrega un objeto al arreglo LECCIONES. */
(() => {
  const terminal = document.getElementById('terminal');
  const cuerpo = document.getElementById('terminal-demo');
  const titulo = document.getElementById('terminal-titulo');
  const botonPausa = document.getElementById('terminal-pausa');
  if (!terminal || !cuerpo || !titulo || !botonPausa) return;

  // Si la persona prefiere menos movimiento, se queda la versión estática del HTML.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const LECCIONES = [
    {
      titulo: '~/linuxpath/archivos',
      objetivo: 'crea la carpeta proyectos y entra en ella.',
      pasos: [
        { cmd: 'mkdir proyectos' },
        { cmd: 'cd proyectos' },
        { cmd: 'pwd', salida: ['/home/ana/proyectos'] },
      ],
      ok: 'Correcto. mkdir crea la carpeta, cd te mueve dentro y pwd confirma dónde estás.',
    },
    {
      titulo: '~/linuxpath/permisos',
      objetivo: 'haz que backup.sh se pueda ejecutar.',
      pasos: [
        { cmd: 'ls -l backup.sh', salida: ['-rw-r--r-- 1 ana ana 214 nov 5 10:20 backup.sh'] },
        { cmd: 'chmod +x backup.sh' },
        { cmd: 'ls -l backup.sh', salida: ['-rwxr-xr-x 1 ana ana 214 nov 5 10:20 backup.sh'] },
      ],
      ok: 'Correcto. chmod +x añade el permiso de ejecución y las x de la salida lo confirman.',
    },
    {
      titulo: '~/linuxpath/buscar',
      objetivo: 'encuentra los errores registrados en servidor.log.',
      pasos: [
        { cmd: 'grep -n error servidor.log', salida: ['14:error: conexión rechazada', '37:error: disco casi lleno'] },
        { cmd: 'grep -c error servidor.log', salida: ['2'] },
      ],
      ok: 'Correcto. grep busca el texto, -n muestra el número de línea y -c cuenta las coincidencias.',
    },
  ];

  let pausado = false;

  const cursor = document.createElement('span');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');

  // Espera y, si la animación está en pausa, sigue esperando hasta reanudar.
  const dormir = async (ms) => {
    await new Promise((resolver) => setTimeout(resolver, ms));
    while (pausado) await new Promise((resolver) => setTimeout(resolver, 150));
  };

  const linea = (clase, texto = '') => {
    const p = document.createElement('p');
    if (clase) p.className = clase;
    p.textContent = texto;
    cuerpo.append(p);
    return p;
  };

  const lineaDeComando = () => {
    const p = document.createElement('p');
    const ps = document.createElement('span');
    ps.className = 'ps';
    ps.textContent = '$';
    const cmd = document.createElement('span');
    p.append(ps, ' ', cmd, cursor);
    cuerpo.append(p);
    return cmd;
  };

  const escribir = async (destino, texto) => {
    for (const letra of texto) {
      destino.textContent += letra;
      await dormir(letra === ' ' ? 90 : 40 + Math.random() * 45);
    }
  };

  const reproducir = async (leccion) => {
    cuerpo.replaceChildren();
    titulo.textContent = leccion.titulo;
    linea('t-meta', `Objetivo: ${leccion.objetivo}`);
    await dormir(800);

    for (const paso of leccion.pasos) {
      const cmd = lineaDeComando();
      await dormir(400);
      await escribir(cmd, paso.cmd);
      await dormir(450);
      cursor.remove();
      for (const texto of paso.salida ?? []) linea('', texto);
      await dormir(800);
    }

    linea('t-ok', leccion.ok);
    await dormir(600);
    lineaDeComando(); // prompt final con el cursor parpadeando
    await dormir(4000);
  };

  // Control para pausar: una animación que se repite sola necesita poder detenerse.
  botonPausa.hidden = false;
  botonPausa.addEventListener('click', () => {
    pausado = !pausado;
    botonPausa.setAttribute('aria-pressed', String(pausado));
    botonPausa.textContent = pausado ? 'Reanudar' : 'Pausar';
    terminal.toggleAttribute('data-pausa', pausado);
  });

  (async () => {
    for (let i = 0; ; i = (i + 1) % LECCIONES.length) {
      await reproducir(LECCIONES[i]);
    }
  })();
})();
