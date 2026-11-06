# Plan de contenido nuevo para LinuxPath

Lecciones, ejercicios y herramientas que faltan · noviembre de 2026

## Cómo leer este plan

Hoy el curso tiene 5 unidades, 30 lecciones y 484 pasos. Cada unidad sigue el mismo molde: cuatro lecciones de contenido, un repaso y un desafío final. Este plan respeta ese molde y propone qué añadir, dónde y con qué ejercicios. Los números de tarjetas son estimaciones basadas en las lecciones actuales, que tienen entre 10 y 28.

## Resumen y prioridad

| # | Contenido | Dónde va | Lecciones nuevas | Simulador nuevo | Prioridad |
| --- | --- | --- | --- | --- | --- |
| 1 | Cómo conseguir Linux | Unidad 1 | 1 | No | Alta |
| 2 | Editores: nano y vim | Unidad 6 (nueva) | 2 | Sí, esfuerzo alto | Alta |
| 3 | Software, sudo y usuarios | Unidad 8 (nueva) | 3 | Sí, medio | Alta |
| 4 | Scripts de bash y cron | Unidad 7 (nueva) | 5 | Sí, alto | Alta |
| 5 | Servicios y registros | Unidad 8 | 2 | Sí, medio | Alta |
| 6 | Comprimir y respaldar | Unidad 2 | 1 | Sí, bajo | Media |
| 7 | Enlaces y disco | Unidad 8 | 1 | Sí, bajo | Media |
| 8 | Variables de entorno, PATH y bashrc | Unidad 6 | 1 | Sí, bajo | Media |
| 9 | Más redes | Unidad 5 | 3 | Sí, bajo | Media |
| 10 | Chuleta y glosario | Página nueva | — | No | Alta, y es la más barata |
| 11 | Escenarios de práctica | Sección nueva | — | Reutiliza lo anterior | Media |

La prioridad no es el orden de trabajo: los editores son importantes pero caros de construir. El orden sugerido está al final.

## Mapa del curso con lo nuevo

- **Unidad 1, Fundamentos:** se añade «Cómo conseguir Linux».
- **Unidad 2, Terminal:** se añade «Comprimir y respaldar».
- **Unidad 3, Archivos y permisos:** sin cambios.
- **Unidad 4, Procesos:** sin cambios. Los servicios van en la Unidad 8 porque dependen de sudo y de paquetes.
- **Unidad 5, Redes:** se añaden 3 lecciones.
- **Unidad 6 (nueva), Entorno y edición:** variables y PATH, nano, vim, repaso y desafío final.
- **Unidad 7 (nueva), Scripts:** primer script, variables y argumentos, condicionales, bucles, cron, repaso y desafío final.
- **Unidad 8 (nueva), Administración:** paquetes, sudo, usuarios, servicios, registros, enlaces y disco, repaso y desafío final.

## 1. Cómo conseguir Linux

**Para qué:** la lección «¿Qué es Linux?» explica qué es, pero no dice cómo tenerlo. Es la duda más común de un principiante y, sin respuesta, se queda practicando solo en el simulador.

**Dónde:** Unidad 1, justo después de «¿Qué es Linux?». Una lección de unas 12 tarjetas, casi todas de concepto y elección. No necesita simulador nuevo.

**Contenido:**

- Cuatro caminos: WSL en Windows, máquina virtual, USB en vivo e instalación junto a Windows o en lugar de él.
- Cuándo conviene cada uno, según riesgo, esfuerzo y rendimiento.
- Qué distribución elegir para empezar, retomando Ubuntu, Debian, Fedora y Mint de la lección 1.
- Qué verás la primera vez: el escritorio, cómo encontrar la terminal y qué es el prompt.
- Advertencia de respaldo antes de tocar particiones.

**Ejercicios:** elección («tienes Windows y no quieres tocar tu disco, ¿qué usas?»), unir parejas (camino con cuándo conviene) y ordenar los pasos para crear una máquina virtual.

**Ojo:** los pasos y comandos de instalación cambian con las versiones. Hay que verificarlos contra la documentación oficial antes de publicar.

## 2. Editores de texto: nano y vim

**Para qué:** editar un archivo de configuración es lo primero que traba a quien practica en un servidor real, y «cómo salgo de vim» es un clásico.

**Dónde:** Unidad 6, lecciones 2 y 3.

**Lección «nano»** (unas 15 tarjetas):

- Abrir o crear un archivo y escribir.
- Guardar con Ctrl+O y salir con Ctrl+X.
- Buscar con Ctrl+W, y cortar y pegar líneas.
- Leer la barra de atajos de la parte de abajo.

**Lección «vim mínimo»** (unas 20 tarjetas):

- Modo normal frente a modo insertar, con `i` y `Esc`.
- Guardar y salir: `:w`, `:q`, `:wq` y `:q!`.
- Editar: `dd`, `yy`, `p` y buscar con `/texto`.
- El objetivo es sobrevivir y hacer una edición, no dominar vim.

**Ejercicios:** elección y unir parejas (atajo con acción), un tipo nuevo «secuencia de teclas» («entra en modo insertar, escribe, guarda y sal») y `type-command` para `nano notas.txt` y `vim config.txt`.

**Simulador:** un editor simulado dentro de la terminal. Para nano, una pantalla sencilla con su barra de atajos; para vim, solo los modos y los comandos de arriba. El esfuerzo es alto. La alternativa barata es resolverlo solo con el tipo «secuencia de teclas», sin editor simulado.

## 3. Software, sudo y usuarios

**Dónde:** Unidad 8, lecciones 1 a 3.

**Lección «Gestor de paquetes»** (unas 18 tarjetas):

- Qué es un gestor de paquetes y qué es un repositorio.
- `apt update` frente a `apt upgrade`, además de `install`, `remove`, `search` y `show`.
- Tabla de equivalencias entre Debian y Ubuntu (`apt`) y Fedora (`dnf`).
- Mención de snap y flatpak.

**Lección «sudo y root»** (unas 15 tarjetas):

- Por qué no se trabaja como root.
- `sudo`, `su`, `whoami` e `id`.
- El archivo sudoers, solo como concepto.
- El riesgo de un `sudo rm -rf` mal escrito.

**Lección «Usuarios y grupos»** (unas 18 tarjetas):

- `adduser` o `useradd`, `passwd`, `usermod -aG`, `userdel` y `groups`.
- Qué contiene `/etc/passwd`.
- Se apoya en la Unidad 3, donde ya se explican propietarios y grupos.

**Ejercicios:** `type-command`, `order` con fichas señuelo (por ejemplo `update` frente a `upgrade`), elección sobre riesgos y unir parejas (comando con lo que hace).

**Desafío final:** un `multi-step-terminal` con la historia «prepara un equipo: instala htop, crea el usuario ana y dale permisos de administrador».

**Simulador:** `apt` con un catálogo fijo de paquetes, y `adduser`, `passwd`, `usermod`, `groups` e `id`.

## 4. Scripts de bash y cron

**Para qué:** tu terminal ya ejecuta `./backup.sh`, pero ninguna lección enseña cómo se escribe un script. Es el paso natural después de pipes y redirecciones.

**Dónde:** Unidad 7, con cinco lecciones, repaso y desafío final.

**Lecciones:**

1. **Tu primer script** (unas 15 tarjetas): `#!/bin/bash`, crearlo, `chmod +x`, ejecutarlo con `./` y comentarios.
2. **Variables y argumentos** (unas 18): `$NOMBRE`, `$1`, `$#`, comillas, `$(comando)` y `read`.
3. **Condicionales** (unas 18): `if [ ]`, `-f`, `-d`, `-eq`, `&&`, `||`, códigos de salida y `$?`.
4. **Bucles** (unas 15): `for`, `while` y recorrer archivos.
5. **Automatizar con cron** (unas 15): `crontab -e`, los cinco campos, ejemplos como «cada día a las 3:00» y dónde mirar el resultado.

**Ejercicios:** completar los huecos de un script (tipo nuevo `fill-blank`), ordenar las líneas de un script con `order`, `predict-output` («qué imprime este script») y elección sobre los cinco campos de cron.

**Desafío final:** escribir un script de respaldo que comprime una carpeta y se programa con cron. Necesita antes la lección de comprimir y respaldar (sección 6).

**Simulador:** esta es la parte difícil. Interpretar bash de verdad, con variables, `if` y `for`, es mucho trabajo. Recomendación: no interpretarlo. Validar los scripts por patrón y apoyarse en `fill-blank`, `order` y `predict-output` con la salida ya escrita. Más adelante se puede añadir la ejecución de scripts muy simples, solo con `echo` y variables.

## 5. Servicios y registros

**Para qué:** la unidad de procesos enseña `ps`, `top` y `kill`, pero no cómo se administra algo que corre siempre, que es lo que más se hace en trabajo real.

**Dónde:** Unidad 8, lecciones 4 y 5.

**Lección «Servicios con systemd»** (unas 18 tarjetas):

- Qué es un servicio.
- `systemctl status`, `start`, `stop` y `restart`.
- La diferencia entre `start` y `enable`, y qué hace `disable`.
- Leer el estado: `active`, `failed`.

**Lección «Leer registros»** (unas 18 tarjetas):

- La carpeta `/var/log`.
- `journalctl -u servicio`, con `-f` y `--since`.
- `tail -f` y `grep` sobre registros.
- Cómo leer un error para encontrar la causa.

**Ejercicios:** un `multi-step-terminal` con historia («el servicio nginx está caído: mira su estado, lee el registro y reinícialo»), elección sobre `start` frente a `enable` y `order`.

**Simulador:** servicios falsos (nginx, ssh, cron) con estados, `systemctl`, `journalctl` con registros precargados y un `tail -f` simulado.

## 6. Comprimir y respaldar

**Dónde:** Unidad 2, una lección nueva antes del repaso (unas 18 tarjetas).

**Contenido:**

- `tar -czf`, `-xzf` y `-tf`, leyendo las letras como una frase: crear, comprimir, archivo.
- `gzip` y `gunzip`, `zip` y `unzip`.
- `cp -r`.
- `rsync -av` y `--dry-run`.
- Caso práctico: respaldar la carpeta de un proyecto.

**Ejercicios:** `order` con las banderas de `tar`, elección («qué hace `-x`»), `type-command` y un `multi-step`: respalda, comprueba el contenido y restaura.

**Simulador:** `tar`, `gzip` y `zip` crean archivos en el sistema simulado, `tar -tf` los lista y `rsync` devuelve una salida fija.

## 7. Enlaces y disco

**Dónde:** Unidad 8, lección 6 (unas 16 tarjetas).

**Contenido:**

- Enlaces simbólicos frente a duros: `ln -s`, `readlink` y la flecha `->` de `ls -l`.
- Espacio en disco: `df -h`, `du -sh` y `ls -lh`.
- `lsblk`, la idea de montar un disco y qué es `/dev`.

**Ejercicio estrella:** «¿qué ocupa tanto espacio?», resuelto con `du` y `find`.

**Simulador:** `ln`, `df`, `du` y `lsblk` con tamaños inventados pero coherentes con el sistema de archivos simulado.

## 8. Variables de entorno, PATH y bashrc

**Dónde:** Unidad 6, lección 1 (unas 18 tarjetas). Va antes de los scripts porque las variables se usan en todo lo demás.

**Contenido:**

- `echo $HOME`, `env` y `export`.
- Qué es `PATH` y para qué sirve `which`.
- Por qué se escribe `./script` y no solo `script`.
- `alias`, `~/.bashrc` y `source`.

**Ejercicios:** elección («por qué falla `mi-script`»), `type-command` y un `multi-step` (crea un alias y úsalo).

**Simulador:** `export`, `env`, `alias`, `which`, `source` y variables dentro de `echo`.

## 9. Más redes

**Dónde:** Unidad 5, tres lecciones nuevas antes del repaso.

**Lección «Interfaces y puertos»** (unas 15 tarjetas): `ip a`, `ip route`, `hostname` y `ss -tulpn`. Qué es un puerto abierto y cómo saber quién lo usa.

**Lección «Copiar por red y claves SSH»** (unas 18 tarjetas): `scp`, `rsync` sobre SSH, `ssh-keygen` y `ssh-copy-id`. Por qué las claves son mejores que la contraseña y por qué la clave privada no se comparte nunca.

**Lección «Firewall básico»** (unas 12 tarjetas): `ufw status`, `allow`, `deny` y `enable`. Qué se abre y qué no. Regla de oro: no te bloquees a ti mismo por SSH.

**Simulador:** salidas simuladas de `ip`, `ss`, `scp`, `ssh-keygen` y `ufw`.

## 10. Chuleta y glosario

**Qué es:** una página nueva, `chuleta.html`, de consulta rápida para volver a un comando sin repetir la lección.

**Contenido:**

- Comandos agrupados por tema (navegación, archivos, permisos, procesos, redes y los nuevos), cada uno con una línea de explicación, un ejemplo y el enlace a la lección donde se aprende.
- Botón de copiar y buscador.
- Un glosario de términos: kernel, shell, PID, root, distribución y similares.

**Cómo armarla:** casi todo ya existe. En el JSON de ejercicios, los `type-command` tienen `command` y `prompt`, así que se puede generar un borrador con un script y revisarlo a mano.

**Opcional:** marcar favoritos, guardados en Supabase junto al progreso.

**Esfuerzo:** bajo. Es la más barata de las once y sirve tanto a quien empieza como a quien vuelve a consultar.

## 11. Escenarios de práctica (misiones)

**Qué son:** situaciones con una historia corta y de 8 a 15 pasos en una sola sesión de terminal (`multi-step-terminal`), sin decirte qué comando usar. Cada misión se desbloquea al terminar la unidad que corresponde.

**Ideas:**

- **El servidor no responde:** procesos, `systemctl` y `journalctl`. Tras las unidades 4 y 8.
- **No puedo ejecutar el script:** `ls -l` y `chmod`. Unidad 3.
- **El disco está lleno:** `df`, `du`, `find` y borrar. Unidad 8.
- **Encuentra el error en el registro:** `grep`, `tail` y pipes. Unidad 2.
- **Da de alta a una persona nueva en el equipo:** usuarios, grupos y permisos. Unidad 8.
- **Respaldo automático:** `tar`, un script y `cron`. Unidad 7.
- **No hay conexión:** `ping`, `ip a`, `ss` y `curl`. Unidad 5.

**Recompensa:** una insignia por misión, guardada junto al progreso en Supabase.

## Cambios en el simulador

La terminal de práctica ya muestra ejemplos con `ls`, `tree`, `cd`, `mkdir`, `echo` con redirecciones, `grep`, `cat`, `wc`, `find`, `chmod`, `chown`, `sudo`, `ps` y `man`. Lo que sigue hay que confirmarlo contra `js/shell-motor.js` (49 KB), que no he revisado todavía.

| Fase | Comandos o piezas | Esfuerzo |
| --- | --- | --- |
| A | `tar`, `gzip`, `zip`, `unzip`, `ln`, `readlink`, `df`, `du`, `lsblk`, `export`, `env`, `alias`, `which`, `source`, `ip`, `hostname`, `ss`, `whoami`, `id` | Bajo |
| B | `apt`, `adduser`, `passwd`, `usermod`, `groups`, `systemctl`, `journalctl`, `tail -f`, `ufw`, `scp`, `ssh-keygen`, `crontab` | Medio |
| C | Editor `nano`, editor `vim`, ejecución de scripts de bash | Alto |

**Tipos de ejercicio nuevos:** `fill-blank` (completar un script) y `key-sequence` (teclas dentro de un editor). Los demás tipos ya existen.

## Orden de trabajo sugerido

1. **Fase 1, sin simulador nuevo:** «Cómo conseguir Linux», la chuleta y glosario, y la teoría de sudo, usuarios y paquetes como tarjetas de concepto y elección.
2. **Fase 2, comandos de la fase A:** lecciones de comprimir y respaldar, variables y PATH, enlaces y disco, y más redes.
3. **Fase 3, comandos de la fase B:** paquetes, usuarios, servicios y registros practicados en la terminal, y las primeras misiones.
4. **Fase 4, lo más costoso:** scripts con `fill-blank` y cron, y por último los editores. Aunque los editores son de prioridad alta, se puede publicar antes la lección teórica y dejar el editor simulado para el final.

## Pendiente de verificar

- Qué comandos soporta ya `js/shell-motor.js`.
- Cómo se definen las lecciones en `js/ejercicios.js` y en el JSON de ejercicios, que no he leído, para que las nuevas usen el mismo formato.
- Los comandos y salidas contra versiones actuales de Ubuntu y Debian antes de publicar.
- Todos los conteos de tarjetas son estimaciones.
