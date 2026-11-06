# LinuxPath — Ejercicios y cómo están hechos

Extraído de `linuxpath-prototipo.html`. Total: **484 pasos/ejercicios** en **5 unidades** y **30 lecciones**.

## 1. Cómo está construido el sistema

### Estructura de datos
- Cada lección es un array de objetos (`introLessonSteps`, `terminalLessonSteps`, … 30 arrays) con un campo `type` que decide cómo se dibuja y valida.
- `unitData` agrupa las lecciones por unidad: `{ title, icon, subtitle, lessons:[{ title, sub, status, icon, exercises, final?, intro? }] }`. Las lecciones "Desafío final" llevan `final: true` y un `intro`.
- `levels` define las 5 unidades del mapa (Fundamentos, Terminal, Permisos, Procesos, Redes) con su color.
- Hay un array `exercises` de 4 ejercicios genéricos que solo se usa como respaldo si una lección no define los suyos.
- Todo es JavaScript en un único HTML, sin framework. `renderExercise()` es un gran `if/else if` por `ex.type` que escribe HTML en `#lesson-body`.

### Reglas de juego (comunes)
- **Corazones**: empiezas con 5. Se pierde 1 al fallar un ejercicio de elección/orden/permisos/predicción. En los de escribir comando, el **primer fallo es gratis** y desde el segundo se pierde 1. Con 0 corazones se muestra la pantalla "sin corazones" (`refillAndRetry` los restaura a 5 y reinicia la lección).
- **XP**: +10 por ejercicio correcto (choice, order, build-permission, predict-output, match-pairs); +5 por cada comando correcto en type-command, autocomplete-command y cada paso de multi-step-terminal. Los ejercicios `concept` no dan XP.
- **Reintento**: un ejercicio fallado se vuelve a añadir al final de la cola (`state.sessionQueue.push`), así que hay que acertarlo para terminar la lección.
- **Pistas** (en ejercicios de escribir): desde el 3.er fallo sale la pista conceptual (`hint`, o `context` si no hay); desde el 6.º fallo muestra la primera letra del comando. Nunca revela el comando completo.
- **Validación de comandos**: se compara `input.trim().toLowerCase()` con `command.toLowerCase()` (igualdad exacta, sin evaluar nada real). En multi-step se acepta cualquiera de `acceptedCommands`.
- **Tab**: autocompleta la última palabra tecleada contra `tabCandidates`/`candidates`; si hay varias coincidencias, la segunda pulsación de Tab las lista.
- **Progreso**: al terminar la lección sube XP, actualiza la racha, marca la lección `done`, desbloquea la siguiente y guarda en `localStorage` (`linuxpath-progress-v1`) y en Supabase (tabla `user_progress`, con debounce de 600 ms).

### Tipos de ejercicio
| Tipo | Cantidad | Qué hace el usuario | Cómo se valida |
|---|---|---|---|
| `concept` | 175 | Lee una mini-conversación (burbujas Tú/terminal) y un texto, y pulsa "Entendido" | No se valida, no da XP |
| `type-command` | 107 | Escribe un comando en una mini-terminal | Igualdad con `command` (sin mayúsculas/espacios sobrantes) |
| `choice` | 130 | Toca una opción | `correctIdx`; responde al instante al tocar |
| `order` | 45 | Coloca "fichas" en orden para formar un comando | `JSON.stringify(orden) === JSON.stringify(correctOrder)`; hay fichas señuelo |
| `autocomplete-command` | 8 | Escribe el comando usando Tab para completar | Igual que type-command, con `candidates` para Tab |
| `multi-step-terminal` | 12 | Varios comandos seguidos en una sola sesión de terminal que conserva el historial | Cada paso contra `acceptedCommands` (o `command`) |
| `build-permission` | 1 | Activa 9 switches (r/w/x × usuario/grupo/otros) | El octal resultante debe igualar `correctOctal` |
| `predict-output` | 2 | Dado un chmod y la cadena "antes", rellena los 9 caracteres resultantes | Cadena igual a `correctAfter` |
| `match-pairs` | 4 | Une tarjetas izquierda-derecha (se mezclan al azar) | Todos los pares; los fallos no quitan corazón |

### Campos por tipo
- **concept**: `kicker, prompt, illustration[{who(svg), text, you}], body`
- **type-command**: `kicker, prompt, context, hint, command, tabCandidates[], output, successMsg`
- **choice**: `kicker, prompt, context, options[], correctIdx, explain`
- **order**: `kicker, prompt, context, chips[], correctOrder[], explain`
- **autocomplete-command**: `kicker, prompt, context, hint, candidates[], prefixTemplate, startPrefix, command, output, successMsg`
- **multi-step-terminal**: `kicker, prompt, context, successMsg, steps[{goal, command, acceptedCommands?, tabCandidates?, hint, output}]`
- **build-permission**: `kicker, prompt, context, correctOctal, explain`
- **predict-output**: `kicker, prompt, context, command, before, correctAfter, explain`
- **match-pairs**: `kicker, prompt, context, pairs[{left,right}], explain`

### Distribución por lección

| Unidad | Lección | Pasos | Detalle |
|---|---|---|---|
| 1. Fundamentos | ¿Qué es Linux? | 32 | concept: 16, type-command: 16 |
| 1. Fundamentos | La terminal | 24 | concept: 10, type-command: 3, choice: 8, order: 3 |
| 1. Fundamentos | Navegación | 17 | concept: 8, type-command: 2, choice: 4, order: 3 |
| 1. Fundamentos | Archivos | 19 | concept: 5, type-command: 5, order: 3, choice: 6 |
| 1. Fundamentos | Repaso | 20 | concept: 1, choice: 10, order: 6, type-command: 3 |
| 1. Fundamentos | Desafío final | 4 | type-command: 4 |
| 2. Terminal | Comandos encadenados | 22 | concept: 10, type-command: 6, choice: 4, order: 2 |
| 2. Terminal | Buscar archivos | 20 | concept: 8, type-command: 7, choice: 4, order: 1 |
| 2. Terminal | Buscar texto | 23 | concept: 10, type-command: 8, choice: 4, order: 1 |
| 2. Terminal | Historial y atajos | 28 | concept: 13, type-command: 5, choice: 7, order: 2, autocomplete-command: 1 |
| 2. Terminal | Repaso | 20 | choice: 10, order: 5, type-command: 5 |
| 2. Terminal | Desafío final | 4 | multi-step-terminal: 4 |
| 3. Archivos y permisos | Propietarios y grupos | 13 | concept: 7, type-command: 2, choice: 3, order: 1 |
| 3. Archivos y permisos | Permisos rwx | 21 | concept: 8, type-command: 2, choice: 8, order: 1, autocomplete-command: 1, multi-step-terminal: 1 |
| 3. Archivos y permisos | chmod | 21 | concept: 8, choice: 6, autocomplete-command: 3, order: 1, build-permission: 1, predict-output: 2 |
| 3. Archivos y permisos | chown y chgrp | 20 | concept: 8, choice: 6, autocomplete-command: 3, order: 2, multi-step-terminal: 1 |
| 3. Archivos y permisos | Repaso | 20 | concept: 1, choice: 12, type-command: 4, order: 3 |
| 3. Archivos y permisos | Desafío final | 2 | multi-step-terminal: 2 |
| 4. Procesos | ¿Qué es un proceso? | 17 | concept: 10, type-command: 2, choice: 4, order: 1 |
| 4. Procesos | Ver procesos | 20 | concept: 10, type-command: 6, choice: 3, order: 1 |
| 4. Procesos | Segundo plano | 13 | concept: 6, type-command: 4, choice: 2, order: 1 |
| 4. Procesos | Terminar procesos | 12 | concept: 6, type-command: 3, choice: 2, order: 1 |
| 4. Procesos | Repaso | 17 | concept: 1, choice: 9, type-command: 4, order: 3 |
| 4. Procesos | Desafío final | 2 | multi-step-terminal: 2 |
| 5. Redes | Conceptos de red | 17 | concept: 9, choice: 4, type-command: 2, match-pairs: 1, order: 1 |
| 5. Redes | ping y traceroute | 11 | concept: 6, type-command: 3, choice: 2 |
| 5. Redes | curl y wget | 9 | concept: 4, type-command: 3, match-pairs: 1, choice: 1 |
| 5. Redes | ssh básico | 17 | concept: 9, type-command: 4, choice: 2, match-pairs: 1, order: 1 |
| 5. Redes | Repaso | 17 | concept: 1, choice: 9, type-command: 4, order: 2, match-pairs: 1 |
| 5. Redes | Desafío final | 2 | multi-step-terminal: 2 |

## 2. Contenido completo de los ejercicios

---

## Unidad 1: Fundamentos
_Unidad 1 · Nivel 1_

### Lección 1: ¿Qué es Linux? — Conceptos básicos
32 pasos.

#### 1. [concept] ¿Qué es una terminal?
- **Kicker:** Antes de empezar
- **Tú:** `Oye compu, ¿qué hora es?`
- **Terminal:** `15:42`
- **Texto:** Una terminal es solo eso: una forma de hablarle a tu computadora escribiendo texto, en vez de hacer clic en iconos. Tú escribes una orden (un "comando"), ella te responde. Probemos el primero: "whoami", que te dice con qué usuario iniciaste sesión.

#### 2. [type-command] Escribe whoami y presiona Enter
- **Kicker:** Tu primer comando
- **Contexto:** "whoami" significa "quién soy yo". Te dice con qué usuario iniciaste sesión en el sistema.
- **Comando esperado:** `whoami`
- **Salida simulada:** `user`
- **Pista:** Es el comando que responde «¿con qué usuario inicié sesión?».
- **Tab candidates:** `whoami`
- **Mensaje de éxito:** ¡Eso es! Ya sabes quién eres para el sistema.

#### 3. [concept] ¿Dónde estás parado? El comando pwd
- **Kicker:** Un comando más
- **Tú:** `pwd`
- **Terminal:** `/home/user`
- **Texto:** "pwd" significa "print working directory". Te dice, sin moverte, en qué carpeta estás parado ahora mismo — como preguntar "¿dónde estoy?".

#### 4. [type-command] Escribe pwd y presiona Enter
- **Kicker:** Segundo comando
- **Contexto:** "pwd" te dice en qué carpeta estás parado ahora mismo.
- **Comando esperado:** `pwd`
- **Salida simulada:** `/home/user`
- **Pista:** Te dice, sin moverte, en qué carpeta estás parado ahora mismo.
- **Tab candidates:** `pwd`
- **Mensaje de éxito:** Perfecto. Ahora siempre podrás saber dónde estás parado.

#### 5. [concept] Mirar alrededor: el comando ls
- **Kicker:** Un comando más
- **Tú:** `ls`
- **Terminal:** `documentos  fotos  proyectos`
- **Texto:** "ls" lista lo que hay en tu carpeta actual, como abrir los ojos y mirar alrededor. Con whoami, pwd y ls ya puedes responder tres preguntas básicas: quién eres, dónde estás y qué hay cerca.

#### 6. [type-command] Escribe ls y presiona Enter
- **Kicker:** Tercer comando
- **Contexto:** "ls" lista lo que hay en tu carpeta actual.
- **Comando esperado:** `ls`
- **Salida simulada:** `documentos  fotos  proyectos`
- **Pista:** Muestra qué hay dentro de la carpeta en la que estás.
- **Tab candidates:** `ls`
- **Mensaje de éxito:** ¡Así es! Ya viste tu primera carpeta con archivos dentro.

#### 7. [concept] ¿Qué es una carpeta (directorio)?
- **Kicker:** Un paso más
- **Tú:** `mkdir proyectos`
- **Terminal:** `Carpeta 'proyectos' creada.`
- **Texto:** Una carpeta (o "directorio") es como un cajón: puede guardar archivos, y hasta otras carpetas dentro. Todo en Linux vive organizado dentro de carpetas, empezando por una carpeta raíz de la que cuelgan todas las demás.

#### 8. [type-command] Escribe mkdir proyectos y presiona Enter
- **Kicker:** Crear una carpeta
- **Contexto:** "mkdir" significa "make directory" (crear directorio). Le sigue el nombre que quieras ponerle.
- **Comando esperado:** `mkdir proyectos`
- **Salida simulada:** `Carpeta 'proyectos' creada.`
- **Pista:** (usa el contexto)
- **Tab candidates:** `mkdir`, `proyectos`
- **Mensaje de éxito:** Bien hecho. mkdir es el comando que usarás cada vez que quieras organizar cosas nuevas.

#### 9. [concept] Entrar a una carpeta: el comando cd
- **Kicker:** Un paso más
- **Tú:** `cd proyectos`
- **Terminal:** `(ahora estás dentro de "proyectos")`
- **Texto:** "cd" significa "change directory" (cambiar de directorio). Le sigue el nombre de la carpeta a la que quieres entrar. Si esa carpeta no existe en tu ubicación actual, la terminal te avisa con un error.

#### 10. [type-command] Escribe cd proyectos y presiona Enter
- **Kicker:** Entrar a una carpeta
- **Contexto:** "cd" te mueve dentro de la carpeta que le indiques.
- **Comando esperado:** `cd proyectos`
- **Salida simulada:** `(ahora estás dentro de "proyectos")`
- **Pista:** (usa el contexto)
- **Tab candidates:** `cd`, `proyectos`
- **Mensaje de éxito:** ¡Te moviste de carpeta! cd es como abrir una puerta y entrar.

#### 11. [concept] Volver atrás con cd ..
- **Kicker:** Un paso más
- **Tú:** `cd ..`
- **Terminal:** `(subiste un nivel)`
- **Texto:** Los dos puntos ".." siempre significan "la carpeta de arriba". Es la forma de retroceder un nivel sin escribir la ruta completa.

#### 12. [type-command] Escribe cd .. y presiona Enter
- **Kicker:** Volver atrás
- **Contexto:** Los dos puntos ".." te llevan un nivel hacia arriba.
- **Comando esperado:** `cd ..`
- **Salida simulada:** `(volviste a la carpeta anterior)`
- **Pista:** (usa el contexto)
- **Tab candidates:** `cd`, `..`
- **Mensaje de éxito:** Con cd .. siempre puedes subir un nivel, las veces que necesites.

#### 13. [concept] ¿Qué es un archivo?
- **Kicker:** Un paso más
- **Tú:** `touch notas.txt`
- **Terminal:** `Archivo 'notas.txt' creado.`
- **Texto:** Si una carpeta es un cajón, un archivo es lo que guardas dentro: un texto, una foto, un programa. En la terminal puedes crear, ver y editar archivos sin tocar el mouse.

#### 14. [type-command] Escribe touch notas.txt y presiona Enter
- **Kicker:** Crear un archivo
- **Contexto:** "touch" crea un archivo vacío con el nombre que le des. Es el punto de partida antes de escribir algo en él.
- **Comando esperado:** `touch notas.txt`
- **Salida simulada:** `Archivo 'notas.txt' creado (vacío).`
- **Pista:** (usa el contexto)
- **Tab candidates:** `touch`, `notas.txt`
- **Mensaje de éxito:** Ya existe el archivo. Todavía está vacío, pero ya es tuyo.

#### 15. [concept] Escribir en la pantalla: el comando echo
- **Kicker:** Un paso más
- **Tú:** `echo hola`
- **Terminal:** `hola`
- **Texto:** "echo" repite en pantalla el texto que le des. Sirve para probar cosas, mostrar mensajes, o confirmar que algo funciona como esperabas.

#### 16. [type-command] Escribe echo hola y presiona Enter
- **Kicker:** Escribir en la pantalla
- **Contexto:** "echo" repite en pantalla el texto que le des.
- **Comando esperado:** `echo hola`
- **Salida simulada:** `hola`
- **Pista:** (usa el contexto)
- **Tab candidates:** `echo`, `hola`
- **Mensaje de éxito:** Así de simple: echo repite exactamente lo que escribes después.

#### 17. [concept] Ver el contenido de un archivo: cat
- **Kicker:** Un paso más
- **Tú:** `cat notas.txt`
- **Terminal:** `(lo que tenga adentro)`
- **Texto:** "cat" muestra el contenido de un archivo en pantalla, sin necesidad de abrir ningún programa.

#### 18. [type-command] Escribe cat notas.txt y presiona Enter
- **Kicker:** Ver el contenido de un archivo
- **Contexto:** "cat" muestra el contenido de un archivo directamente en la terminal.
- **Comando esperado:** `cat notas.txt`
- **Salida simulada:** `(el archivo está vacío, por eso no se ve nada más)`
- **Pista:** (usa el contexto)
- **Tab candidates:** `cat`, `notas.txt`
- **Mensaje de éxito:** Si notas.txt tuviera texto dentro, cat te lo mostraría aquí mismo.

#### 19. [concept] Duplicar un archivo: el comando cp
- **Kicker:** Un paso más
- **Tú:** `cp notas.txt copia.txt`
- **Terminal:** `Copiado.`
- **Texto:** "cp" copia un archivo. El primer nombre es el original, el segundo es el nombre de la copia. El original queda intacto.

#### 20. [type-command] Escribe cp notas.txt copia.txt y presiona Enter
- **Kicker:** Copiar un archivo
- **Contexto:** "cp" copia un archivo dejando el original intacto.
- **Comando esperado:** `cp notas.txt copia.txt`
- **Salida simulada:** `Copiado: copia.txt`
- **Pista:** (usa el contexto)
- **Tab candidates:** `cp`, `notas.txt`, `copia.txt`
- **Mensaje de éxito:** notas.txt sigue existiendo intacto, y ahora también tienes copia.txt.

#### 21. [concept] Mover o renombrar: el comando mv
- **Kicker:** Un paso más
- **Tú:** `mv copia.txt archivo.txt`
- **Terminal:** `copia.txt ahora se llama archivo.txt`
- **Texto:** "mv" mueve un archivo de carpeta, o lo renombra si lo dejas en el mismo lugar con otro nombre. Es el mismo comando para las dos cosas.

#### 22. [type-command] Escribe mv copia.txt archivo.txt y presiona Enter
- **Kicker:** Mover o renombrar
- **Contexto:** "mv" mueve o renombra un archivo, según cómo lo uses.
- **Comando esperado:** `mv copia.txt archivo.txt`
- **Salida simulada:** `copia.txt ahora se llama archivo.txt`
- **Pista:** (usa el contexto)
- **Tab candidates:** `mv`, `copia.txt`, `archivo.txt`
- **Mensaje de éxito:** mv sirve tanto para mover como para renombrar — es el mismo comando para las dos cosas.

#### 23. [concept] Borrar un archivo: el comando rm
- **Kicker:** Un paso más
- **Tú:** `rm archivo.txt`
- **Terminal:** `archivo.txt eliminado.`
- **Texto:** "rm" borra un archivo. Ojo: en la terminal no hay papelera de reciclaje, así que se borra de verdad — piénsalo dos veces antes de usarlo.

#### 24. [type-command] Escribe rm archivo.txt y presiona Enter
- **Kicker:** Borrar un archivo
- **Contexto:** "rm" borra un archivo de forma permanente, sin papelera.
- **Comando esperado:** `rm archivo.txt`
- **Salida simulada:** `archivo.txt eliminado.`
- **Pista:** (usa el contexto)
- **Tab candidates:** `rm`, `archivo.txt`
- **Mensaje de éxito:** Listo. Por eso siempre conviene pensarlo dos veces antes de usar rm.

#### 25. [concept] Limpiar la pantalla: el comando clear
- **Kicker:** Últimos comandos
- **Tú:** `clear`
- **Terminal:** ``
- **Texto:** Cuando la pantalla se llena de texto, "clear" la limpia. No borra archivos ni nada real, solo limpia la vista.

#### 26. [type-command] Escribe clear y presiona Enter
- **Kicker:** Limpiar la pantalla
- **Contexto:** "clear" borra todo el texto visible en la terminal, sin tocar tus archivos.
- **Comando esperado:** `clear`
- **Salida simulada:** `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4L10 14"/><path d="M4 20l3.5-3.5a3 3 0 014.2 0L13 18"/><path d="M9 15l-5 5"/><path d="M13 5l6 6"/></svg> (la pantalla ahora está limpia)`
- **Pista:** (usa el contexto)
- **Tab candidates:** `clear`
- **Mensaje de éxito:** Nada que temer: clear solo ordena tu vista, tus archivos siguen intactos.

#### 27. [concept] Pedir ayuda: el comando man
- **Kicker:** Últimos comandos
- **Tú:** `man ls`
- **Terminal:** `LS(1) — Lista el contenido de un directorio...`
- **Texto:** Si algún día olvidas cómo funciona un comando, "man" (de "manual") te muestra sus instrucciones, ahí mismo en la terminal.

#### 28. [type-command] Escribe man ls y presiona Enter
- **Kicker:** Pedir ayuda
- **Contexto:** "man" te muestra las instrucciones de cualquier comando.
- **Comando esperado:** `man ls`
- **Salida simulada:** `LS(1) — Lista el contenido de un directorio. Uso: ls [opciones] [ruta]`
- **Pista:** (usa el contexto)
- **Tab candidates:** `man`, `ls`
- **Mensaje de éxito:** Cuando olvides cómo se usa un comando, man siempre tiene la respuesta.

#### 29. [concept] La fecha y hora: el comando date
- **Kicker:** Últimos comandos
- **Tú:** `date`
- **Terminal:** `sáb 30 ago 2026 12:00:00`
- **Texto:** "date" muestra la fecha y hora actuales del sistema. Corto y directo, sin nada que memorizar para lo básico.

#### 30. [type-command] Escribe date y presiona Enter
- **Kicker:** La fecha y hora
- **Contexto:** "date" muestra la fecha y hora actuales del sistema.
- **Comando esperado:** `date`
- **Salida simulada:** `sáb 30 ago 2026 12:00:00`
- **Pista:** (usa el contexto)
- **Tab candidates:** `date`
- **Mensaje de éxito:** Corto y directo: date siempre te dice qué día es.

#### 31. [concept] Tu historial: el comando history
- **Kicker:** Últimos comandos
- **Tú:** `history`
- **Terminal:** `1  whoami
2  pwd
3  ls...`
- **Texto:** "history" muestra la lista de comandos que has escrito antes en esta sesión, numerados. Muy útil para no repetir algo que ya hiciste.

#### 32. [type-command] Escribe history y presiona Enter
- **Kicker:** Tu historial
- **Contexto:** "history" muestra la lista de comandos que has escrito antes.
- **Comando esperado:** `history`
- **Salida simulada:** `1  whoami
2  pwd
3  ls
4  mkdir proyectos
5  cd proyectos
...`
- **Pista:** (usa el contexto)
- **Tab candidates:** `history`
- **Mensaje de éxito:** ¡Completaste todos los comandos fundamentales! Ya tienes las bases para moverte en cualquier terminal Linux.

### Lección 2: La terminal — Tu herramienta principal
24 pasos.

#### 1. [concept] El prompt: tu punto de partida
- **Kicker:** Repaso rápido
- **Terminal:** `user@maquina:~$`
- **Tú:** `(aquí escribes tú)`
- **Texto:** Ese texto que aparece antes de donde escribes se llama "prompt". Suele mostrar tu usuario, el nombre de la máquina y la carpeta actual, terminando en $ (usuario normal) o # (superusuario/root).

#### 2. [type-command] Escribe whoami y presiona Enter
- **Kicker:** Practica
- **Contexto:** Un buen hábito al entrar a una terminal nueva es confirmar con qué usuario estás trabajando.
- **Comando esperado:** `whoami`
- **Salida simulada:** `user`
- **Pista:** (usa el contexto)
- **Tab candidates:** `whoami`
- **Mensaje de éxito:** Siempre es buena idea saber con qué usuario estás operando.

#### 3. [concept] ¿Quién manda aquí?
- **Kicker:** El usuario root
- **Terminal:** `user@maquina:~$`
- **Terminal:** `root@maquina:~#`
- **Texto:** El símbolo final del prompt te delata: $ significa usuario normal, con permisos limitados. # significa que eres root, el superusuario, con poder total sobre el sistema. Con gran poder viene gran responsabilidad: como root puedes romper cosas que un usuario normal ni siquiera podría tocar.

#### 4. [choice] ¿Qué símbolo suele indicar que el prompt pertenece al usuario root (superusuario)?
- **Kicker:** Elige la respuesta
- **Contexto:** El símbolo final del prompt cambia según el tipo de usuario.
  - ▫️ $
  - ✅ #
  - ▫️ %
- **Explicación:** El símbolo # indica que estás operando como root, con permisos totales sobre el sistema.

#### 5. [concept] Autocompletar con Tab ⇥
- **Kicker:** Un atajo útil
- **Tú:** `cd proy[Tab]`
- **Terminal:** `cd proyectos/`
- **Texto:** La tecla Tab completa nombres de archivos y carpetas por ti. Escribe las primeras letras y presiona Tab: la terminal completa el resto si no hay ambigüedad. Ahorra muchísimo tiempo y evita errores de tipeo.

#### 6. [order] Quieres saber en qué carpeta estás parado ahora mismo. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Solo hace falta un comando, sin argumentos. Ojo: hay piezas de más que no necesitas usar.
- **Fichas:** `clear`  `pwd`  `whoami`  `cd`  `ls`
- **Orden correcto:** `pwd`
- **Explicación:** pwd, sin nada más, te imprime la ruta completa de tu carpeta actual. cd y ls son otros comandos, pero no responden "¿dónde estoy?".

#### 7. [concept] La flecha arriba es tu máquina del tiempo ↑
- **Kicker:** Rebobinar
- **Tú:** `[↑] [↑] [↑]`
- **Terminal:** `mkdir proyectos`
- **Texto:** La terminal recuerda todo lo que has escrito antes. Presiona la flecha arriba y verás reaparecer tu último comando; sigue presionando para ir más atrás en el tiempo. Así nunca tienes que reescribir algo que ya tipeaste.

#### 8. [choice] Estás escribiendo un comando largo y te equivocaste al principio. ¿Qué tecla usas para repetir el último comando sin volver a escribirlo todo?
- **Kicker:** Elige la respuesta
- **Contexto:** La terminal recuerda lo que has escrito antes.
  - ✅ Flecha arriba (↑)
  - ▫️ Ctrl+C
  - ▫️ Tab
- **Explicación:** La flecha arriba navega por el historial de comandos anteriores, así no tienes que reescribirlos.

#### 9. [concept] Cuando algo se "cuelga": Ctrl+C
- **Kicker:** El botón de pánico
- **Tú:** `ping google.com`
- **Terminal:** `(no para de imprimir...) [Ctrl+C]`
- **Texto:** Si un programa se queda corriendo sin parar o no responde, Ctrl+C envía una señal de interrupción y lo detiene ahí mismo. Es el botón de pánico universal de la terminal: siempre puedes recuperar el control.

#### 10. [choice] Un programa se quedó "colgado" en la terminal y no responde. ¿Qué combinación de teclas lo interrumpe?
- **Kicker:** Elige la respuesta
- **Contexto:** No todas las combinaciones con Ctrl sirven para lo mismo.
  - ▫️ Ctrl+Z
  - ✅ Ctrl+C
  - ▫️ Ctrl+D
- **Explicación:** Ctrl+C interrumpe (cancela) el comando o programa que se está ejecutando en ese momento.

#### 11. [type-command] Escribe clear y presiona Enter
- **Kicker:** Practica
- **Contexto:** Cuando la pantalla se llena de texto, puedes limpiarla sin perder ningún archivo real.
- **Comando esperado:** `clear`
- **Salida simulada:** `<svg class="icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4L10 14"/><path d="M4 20l3.5-3.5a3 3 0 014.2 0L13 18"/><path d="M9 15l-5 5"/><path d="M13 5l6 6"/></svg> (la pantalla ahora está limpia)`
- **Pista:** (usa el contexto)
- **Tab candidates:** `clear`
- **Mensaje de éxito:** clear solo limpia la vista, nunca borra archivos.

#### 12. [concept] La terminal tiene su propio manual
- **Kicker:** Pedir ayuda
- **Tú:** `man ls`
- **Terminal:** `LS(1) — Lista el contenido de un directorio...`
- **Texto:** Cuando olvides cómo se usa un comando, no hace falta buscar en internet: man (de "manual") te muestra las instrucciones oficiales, ahí mismo en la terminal. Para salir de esa pantalla de ayuda, solo presiona la tecla q (de "quit").

#### 13. [order] Quieres consultar el manual del comando ls. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Uno de estos comandos abre un manual de ayuda; el otro muestra el contenido de un archivo.
- **Fichas:** `pwd`  `cat`  `man`  `clear`  `ls`
- **Orden correcto:** `man` → `ls`
- **Explicación:** man ls abre el manual de uso del comando ls, con todas sus opciones. cat no tiene nada que ver con consultar manuales.

#### 14. [choice] Estás dentro del manual (man) de un comando y quieres salir. ¿Qué tecla presionas?
- **Kicker:** Elige la respuesta
- **Contexto:** El manual se muestra en un visor de texto de pantalla completa.
  - ▫️ Esc
  - ✅ q
  - ▫️ Ctrl+X
- **Explicación:** La tecla q (de "quit") cierra el visor del manual y te devuelve a la terminal.

#### 15. [concept] Terminal, shell y consola: no son lo mismo
- **Kicker:** Un dato curioso
- **Terminal:** `(la ventana que ves)`
- **Terminal:** `bash`
- **Texto:** La "terminal" es la ventana donde escribes. El "shell" (como bash o zsh) es el programa que realmente interpreta tus comandos y te responde. La terminal es solo el mensajero; el shell es quien entiende lo que dices.

#### 16. [choice] ¿Cuál de estos es un ejemplo de "shell", el programa que interpreta tus comandos?
- **Kicker:** Elige la respuesta
- **Contexto:** La terminal es la ventana; el shell es el intérprete que corre dentro de ella.
  - ▫️ GNOME Terminal
  - ✅ bash
  - ▫️ monitor
- **Explicación:** bash (Bourne Again SHell) es un shell: interpreta lo que escribes y ejecuta los comandos. GNOME Terminal es solo el programa que abre la ventana.

#### 17. [concept] Atajos para editar la línea de comandos
- **Kicker:** Muévete sin usar el mouse
- **Tú:** `[Ctrl+A] whoami`
- **Tú:** `whoami[Ctrl+E]`
- **Texto:** Ctrl+A mueve el cursor al inicio de la línea. Ctrl+E lo lleva al final. Ctrl+U borra todo lo que hay antes del cursor. Son atajos heredados de los editores de texto clásicos y funcionan en la mayoría de las terminales Linux.

#### 18. [choice] ¿Qué combinación de teclas mueve el cursor al inicio de la línea actual?
- **Kicker:** Elige la respuesta
- **Contexto:** Estos atajos mueven el cursor o borran texto según su posición dentro de la línea actual.
  - ✅ Ctrl+A
  - ▫️ Ctrl+E
  - ▫️ Ctrl+U
- **Explicación:** Ctrl+A lleva el cursor al inicio de la línea, sin borrar nada de lo escrito.

#### 19. [choice] Escribiste un comando largo y quieres borrar todo antes de volver a empezar. ¿Qué atajo usas?
- **Kicker:** Elige la respuesta
- **Contexto:** No todos estos atajos hacen lo mismo con el texto que ya escribiste.
  - ▫️ Ctrl+C
  - ✅ Ctrl+U
  - ▫️ Ctrl+E
- **Explicación:** Ctrl+U borra todo el texto desde el cursor hasta el inicio de la línea, dejándote empezar de cero.

#### 20. [concept] Búsqueda inversa con Ctrl+R
- **Kicker:** Tu historial, buscable
- **Tú:** `[Ctrl+R] mkdir`
- **Terminal:** `(reverse-i-search): mkdir proyectos`
- **Texto:** Con muchos comandos en tu historial, subir con la flecha ↑ uno por uno se vuelve lento. Ctrl+R abre una búsqueda: escribe una palabra clave y la terminal te muestra el comando más reciente que la contiene.

#### 21. [choice] Quieres encontrar rápido un comando que escribiste hace rato sin subir con la flecha uno por uno. ¿Qué atajo usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Cada una de estas combinaciones hace algo distinto; solo una tiene que ver con tu historial de comandos.
  - ▫️ Ctrl+F
  - ✅ Ctrl+R
  - ▫️ Ctrl+S
- **Explicación:** Ctrl+R activa la búsqueda inversa en el historial: escribe parte del comando y la terminal lo encuentra por ti.

#### 22. [concept] Salir de la terminal
- **Kicker:** Para cerrar
- **Tú:** `exit`
- **Terminal:** `(la sesión se cierra)`
- **Texto:** Cuando termines de trabajar, puedes escribir exit para cerrar la sesión del shell, o usar el atajo Ctrl+D, que envía una señal de "fin de entrada" y hace exactamente lo mismo.

#### 23. [order] Terminaste de trabajar y quieres cerrar la sesión de la terminal. Ordena la pieza.
- **Kicker:** Ordena el comando
- **Contexto:** Solo hace falta una palabra, sin argumentos.
- **Fichas:** `salir`  `quit`  `exit`  `close`  `logout`
- **Orden correcto:** `exit`
- **Explicación:** exit cierra la sesión actual del shell. "salir" y "logout" no son comandos reales de bash para esto.

#### 24. [type-command] Escribe history y presiona Enter
- **Kicker:** Practica
- **Contexto:** history te muestra la lista completa de comandos que has escrito en esta sesión, numerados.
- **Comando esperado:** `history`
- **Salida simulada:** `1  whoami
2  clear
3  man ls`
- **Pista:** (usa el contexto)
- **Tab candidates:** `history`
- **Mensaje de éxito:** Con history puedes revisar (y hasta reutilizar) cualquier comando que hayas escrito antes.

### Lección 3: Navegación — pwd, ls, cd
17 pasos.

#### 1. [concept] El árbol de carpetas
- **Kicker:** Teoría
- **Tú:** `pwd`
- **Terminal:** `/home/user/proyectos`
- **Texto:** En Linux todo cuelga de una carpeta raíz llamada "/". Desde ahí se ramifican todas las demás carpetas, como las ramas de un árbol. Una ruta como /home/user/proyectos describe el camino exacto desde la raíz hasta esa carpeta.

#### 2. [type-command] Escribe pwd y presiona Enter
- **Kicker:** Practica
- **Contexto:** Antes de movernos, confirmemos dónde estás parado ahora mismo.
- **Comando esperado:** `pwd`
- **Salida simulada:** `/home/user`
- **Pista:** (usa el contexto)
- **Tab candidates:** `pwd`
- **Mensaje de éxito:** Perfecto, ya sabes tu punto de partida.

#### 3. [concept] Rutas absolutas vs. relativas
- **Kicker:** Teoría
- **Tú:** `/home/user/fotos`
- **Tú:** `fotos`
- **Texto:** Una ruta absoluta empieza siempre desde la raíz "/" y funciona sin importar dónde estés parado. Una ruta relativa parte de tu ubicación actual: si ya estás en /home/user, con solo escribir "fotos" llegas al mismo lugar.

#### 4. [choice] ¿Cuál de estas es una ruta "absoluta" (empieza desde la raíz del sistema)?
- **Kicker:** Elige la respuesta
- **Contexto:** Recuerda la diferencia entre partir siempre desde el mismo lugar y partir desde donde estás parado ahora mismo.
  - ▫️ proyectos/notas.txt
  - ✅ /home/user/proyectos
  - ▫️ ../proyectos
- **Explicación:** /home/user/proyectos empieza en la raíz "/", por eso es una ruta absoluta: funciona sin importar dónde estés parado.

#### 5. [concept] Moverte entre carpetas con cd
- **Kicker:** Teoría
- **Tú:** `cd documentos`
- **Terminal:** `(ahora estás dentro de "documentos")`
- **Texto:** "cd" significa "change directory" (cambiar de directorio). Le sigue el nombre de la carpeta a la que quieres entrar. Si esa carpeta no existe en tu ubicación actual, la terminal te lo hará saber con un error.

#### 6. [order] Quieres entrar a la carpeta documentos. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Uno de estos comandos te mueve de carpeta; el otro solo te muestra qué hay alrededor sin moverte.
- **Fichas:** `pwd`  `ls`  `cd`  `carpeta`  `documentos`
- **Orden correcto:** `cd` → `documentos`
- **Explicación:** cd documentos te mueve dentro de esa carpeta. ls solo lista contenido, no te mueve de lugar.

#### 7. [concept] Subir un nivel con ..
- **Kicker:** Teoría
- **Tú:** `cd ..`
- **Terminal:** `(subiste un nivel)`
- **Texto:** Los dos puntos ".." siempre representan la carpeta inmediatamente superior a la actual. cd .. te mueve un nivel hacia arriba en el árbol, sin importar en qué carpeta estés parado.

#### 8. [choice] Estás en /home/user/proyectos y quieres volver directo a /home/user. ¿Qué comando usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Cada símbolo especial de una ruta significa algo distinto: no todos apuntan al mismo lugar.
  - ✅ cd ..
  - ▫️ cd ~
  - ▫️ cd /
- **Explicación:** cd .. sube exactamente un nivel en el árbol de carpetas, de proyectos a user.

#### 9. [concept] Ir directo a tu carpeta personal con ~
- **Kicker:** Teoría
- **Tú:** `cd ~`
- **Terminal:** `/home/user`
- **Texto:** El símbolo ~ (virgulilla) es un atajo que siempre representa tu carpeta personal (home). Sin importar en qué parte del árbol estés, cd ~ te lleva de un solo salto de regreso a casa.

#### 10. [choice] Sin importar dónde estés, ¿qué comando te lleva directo a tu carpeta personal (home)?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cuál de estos comandos te lleva siempre al mismo lugar, sin importar dónde estés parado.
  - ▫️ cd .
  - ✅ cd ~
  - ▫️ cd ..
- **Explicación:** El símbolo ~ (virgulilla) siempre representa tu carpeta personal, sin importar en qué carpeta estés.

#### 11. [concept] Volver a la carpeta anterior con cd -
- **Kicker:** Teoría
- **Tú:** `cd -`
- **Terminal:** `/home/user/proyectos`
- **Texto:** cd - te devuelve exactamente a la carpeta en la que estabas antes de tu último cambio de directorio. Es útil para saltar de un lado a otro entre dos carpetas sin escribir la ruta completa cada vez.

#### 12. [order] Quieres volver a la carpeta en la que estabas antes de tu último movimiento. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es un atajo de cd con un solo símbolo, sin nombre de carpeta.
- **Fichas:** `atras`  `cd`  `..`  `-`  `~`
- **Orden correcto:** `cd` → `-`
- **Explicación:** cd - te devuelve a la carpeta anterior. ~ te lleva a tu carpeta personal, no a la anterior.

#### 13. [concept] Ver antes de moverte: ls
- **Kicker:** Teoría
- **Tú:** `ls`
- **Terminal:** `documentos  fotos  proyectos`
- **Texto:** "ls" lista lo que hay en tu carpeta actual. Es el comando que usarás constantemente para saber qué hay a tu alrededor antes de decidir hacia dónde moverte con cd.

#### 14. [type-command] Escribe ls y presiona Enter
- **Kicker:** Practica
- **Contexto:** ls lista el contenido de la carpeta donde estás parado ahora mismo.
- **Comando esperado:** `ls`
- **Salida simulada:** `documentos  fotos  proyectos`
- **Pista:** (usa el contexto)
- **Tab candidates:** `ls`
- **Mensaje de éxito:** Así puedes ver qué hay a tu alrededor antes de moverte.

#### 15. [concept] Opciones de ls: -a y -l
- **Kicker:** Teoría
- **Tú:** `ls -a`
- **Terminal:** `. .. .bashrc documentos fotos`
- **Texto:** Las opciones cambian cómo ls muestra la información. -a incluye los archivos ocultos (los que empiezan con punto). -l cambia el formato a una lista vertical con detalles como tamaño y fecha.

#### 16. [order] Quieres listar los archivos ocultos incluidos. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Los archivos ocultos en Linux son los que empiezan con un punto, y ls no los muestra por defecto.
- **Fichas:** `-h`  `ls`  `-l`  `cd`  `-a`
- **Orden correcto:** `ls` → `-a`
- **Explicación:** ls -a muestra absolutamente todo, incluidos los archivos ocultos como .bashrc. -l es otra opción válida de ls, pero muestra detalles, no ocultos.

#### 17. [choice] ¿Qué opción de ls muestra los archivos con detalles como tamaño y fecha?
- **Kicker:** Elige la respuesta
- **Contexto:** Esta opción cambia el formato de salida a una lista vertical con más información.
  - ✅ ls -l
  - ▫️ ls -x
  - ▫️ ls -v
- **Explicación:** ls -l usa el formato "largo": permisos, propietario, tamaño y fecha de modificación de cada archivo.

### Lección 4: Archivos — crear y organizar
19 pasos.

#### 1. [concept] Crear, copiar, mover, borrar
- **Kicker:** Repaso
- **Tú:** `touch informe.txt`
- **Terminal:** `Archivo 'informe.txt' creado.`
- **Texto:** Ya viste touch, cp, mv y rm en la primera lección. Ahora vamos a combinarlos y afinar los detalles: cómo copiar carpetas completas, cómo evitar borrados accidentales y cómo ver el contenido de un archivo rápidamente.

#### 2. [type-command] Escribe touch notas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** touch crea un archivo vacío con el nombre indicado.
- **Comando esperado:** `touch notas.txt`
- **Salida simulada:** `Archivo 'notas.txt' creado (vacío).`
- **Pista:** (usa el contexto)
- **Tab candidates:** `touch`, `notas.txt`
- **Mensaje de éxito:** Archivo creado y listo para usarse.

#### 3. [order] Quieres copiar notas.txt como respaldo.txt. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Uno de estos comandos deja el archivo original intacto y crea uno nuevo; el otro lo habría movido o renombrado.
- **Fichas:** `rm`  `mv`  `cp`  `original.txt`  `notas.txt`  `respaldo.txt`
- **Orden correcto:** `cp` → `notas.txt` → `respaldo.txt`
- **Explicación:** cp notas.txt respaldo.txt deja intacto el original y crea una copia con el segundo nombre. mv habría movido o renombrado el archivo, no lo habría copiado.

#### 4. [choice] Quieres copiar una carpeta completa (con todo su contenido dentro), no solo un archivo. ¿Qué opción necesita cp?
- **Kicker:** Elige la respuesta
- **Contexto:** Por defecto, cp no copia carpetas a menos que se lo indiques explícitamente.
  - ✅ cp -r
  - ▫️ cp -a
  - ▫️ cp -f
- **Explicación:** cp -r (recursivo) copia una carpeta y todo lo que hay dentro de ella, subcarpetas incluidas.

#### 5. [concept] Borrar una carpeta vacía: rmdir
- **Kicker:** Un paso más
- **Tú:** `rmdir vacia`
- **Terminal:** `Carpeta 'vacia' eliminada.`
- **Texto:** "rmdir" (remove directory) borra una carpeta, pero solo si está completamente vacía. Si tiene algo adentro, se niega y te avisa con un error — así evitas borrar contenido sin darte cuenta. Para carpetas con archivos dentro, sigues necesitando rm -r.

#### 6. [type-command] Escribe rmdir vacia y presiona Enter
- **Kicker:** Practica
- **Contexto:** rmdir borra una carpeta llamada "vacia", siempre y cuando no tenga nada dentro.
- **Comando esperado:** `rmdir vacia`
- **Salida simulada:** `Carpeta 'vacia' eliminada.`
- **Pista:** (usa el contexto)
- **Tab candidates:** `rmdir`, `vacia`
- **Mensaje de éxito:** Justo por ser tan estricto, rmdir es una forma segura de limpiar carpetas que ya no usas.

#### 7. [choice] ¿Qué pasa si usas rmdir sobre una carpeta que tiene archivos adentro?
- **Kicker:** Elige la respuesta
- **Contexto:** rmdir y rm -r no se comportan igual frente a una carpeta con contenido.
  - ▫️ Se borra igual, junto con todo su contenido
  - ✅ Da error: rmdir solo borra carpetas vacías
  - ▫️ Borra solo el primer archivo que encuentra
- **Explicación:** rmdir se niega a borrar si la carpeta no está vacía. Para borrar una carpeta con contenido hace falta rm -r.

#### 8. [type-command] Escribe mv notas.txt archivo.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** mv puede renombrar un archivo si lo "mueves" al mismo lugar con otro nombre.
- **Comando esperado:** `mv notas.txt archivo.txt`
- **Salida simulada:** `notas.txt ahora se llama archivo.txt`
- **Pista:** (usa el contexto)
- **Tab candidates:** `mv`, `notas.txt`, `archivo.txt`
- **Mensaje de éxito:** mv sirve tanto para mover como para renombrar.

#### 9. [choice] ¿Por qué hay que tener especial cuidado con el comando rm?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué pasa después de borrar algo con rm.
  - ▫️ Porque pide confirmación siempre
  - ✅ Porque no existe una papelera de reciclaje: se borra de forma permanente
  - ▫️ Porque solo funciona con archivos de texto
- **Explicación:** A diferencia de un entorno gráfico, rm borra directamente y sin papelera. No hay "deshacer" por defecto.

#### 10. [order] Quieres borrar una carpeta llamada temporal junto con todo su contenido. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Borrar una carpeta que tiene cosas adentro no funciona igual que borrar un solo archivo.
- **Fichas:** `rmdir`  `-f`  `rm`  `permanente`  `temporal`  `-r`
- **Orden correcto:** `rm` → `-r` → `temporal`
- **Explicación:** rm -r temporal borra la carpeta "temporal" y todo lo que contiene, de forma recursiva. -f fuerza el borrado sin preguntar, pero no es lo que se pidió aquí.

#### 11. [concept] Crear varias carpetas de un solo golpe: mkdir -p
- **Kicker:** Un paso más
- **Tú:** `mkdir -p reportes/enero`
- **Terminal:** `Carpetas creadas.`
- **Texto:** Normalmente mkdir solo crea una carpeta a la vez, y falla si la carpeta "padre" todavía no existe. La opción -p (de "parents") le dice a mkdir que cree también todas las carpetas intermedias que hagan falta, en un solo comando.

#### 12. [order] Quieres crear la carpeta enero dentro de reportes, aunque reportes todavía no exista, en un solo comando. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Hace falta una opción especial para que mkdir cree también la carpeta intermedia que falta.
- **Fichas:** `-r`  `touch`  `mkdir`  `reportes/enero`  `-p`
- **Orden correcto:** `mkdir` → `-p` → `reportes/enero`
- **Explicación:** mkdir -p reportes/enero crea "reportes" y, dentro, "enero", en un solo paso. Sin -p, mkdir habría fallado porque "reportes" no existía todavía.

#### 13. [type-command] Escribe cat archivo.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** cat muestra el contenido de un archivo directamente en la terminal.
- **Comando esperado:** `cat archivo.txt`
- **Salida simulada:** `(el archivo está vacío, por eso no se ve nada más)`
- **Pista:** (usa el contexto)
- **Tab candidates:** `cat`, `archivo.txt`
- **Mensaje de éxito:** cat es la forma más rápida de asomarte al contenido de un archivo pequeño.

#### 14. [choice] ¿Qué comando usarías para ver solo las primeras 10 líneas de un archivo muy largo?
- **Kicker:** Elige la respuesta
- **Contexto:** Existe un comando pensado justo para esto, distinto de cat.
  - ✅ head
  - ▫️ top
  - ▫️ first
- **Explicación:** head muestra las primeras líneas de un archivo (10 por defecto), ideal para archivos largos.

#### 15. [concept] El comodín *: trabajar con varios archivos a la vez
- **Kicker:** Un paso más
- **Tú:** `ls *.txt`
- **Terminal:** `notas.txt  tareas.txt`
- **Texto:** El asterisco * es un comodín: representa "cualquier cosa". *.txt significa "cualquier nombre que termine en .txt", y foto* significa "cualquier nombre que empiece con foto". Sirve con casi cualquier comando (ls, rm, cp) para operar sobre varios archivos sin escribirlos uno por uno.

#### 16. [choice] Tienes los archivos informe.txt, informe.csv y foto.png en tu carpeta. ¿Qué comando lista únicamente los que terminan en .txt?
- **Kicker:** Elige la respuesta
- **Contexto:** El comodín * puede colocarse antes de una parte fija del nombre.
  - ✅ ls *.txt
  - ▫️ ls informe
  - ▫️ ls .txt
- **Explicación:** ls *.txt le dice a ls que muestre cualquier archivo, sin importar su nombre, siempre que termine en ".txt".

#### 17. [choice] Tienes foto1.png, foto2.png y receta.png. ¿A cuáles de ellos coincide el patrón foto*?
- **Kicker:** Elige la respuesta
- **Contexto:** El comodín también puede ir al final de una parte fija del nombre.
  - ▫️ Solo a un archivo llamado exactamente "foto"
  - ✅ A foto1.png y foto2.png, pero no a receta.png
  - ▫️ A los tres archivos por igual
- **Explicación:** foto* coincide con cualquier nombre que empiece con "foto", sin importar lo que venga después. receta.png no empieza con "foto", así que queda fuera.

#### 18. [concept] Ver el final de un archivo: tail
- **Kicker:** Un paso más
- **Tú:** `tail registro.txt`
- **Terminal:** `(las últimas líneas del archivo)`
- **Texto:** Si "head" te muestra el principio de un archivo, "tail" (cola) te muestra el final — por defecto, las últimas 10 líneas. Es muy usado con archivos que van creciendo con el tiempo, como registros de actividad, para ver lo más reciente sin leer todo el archivo completo.

#### 19. [type-command] Escribe tail archivo.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** tail muestra las últimas líneas de un archivo, al contrario que head.
- **Comando esperado:** `tail archivo.txt`
- **Salida simulada:** `(el archivo está vacío, por eso no se ve nada más)`
- **Pista:** (usa el contexto)
- **Tab candidates:** `tail`, `archivo.txt`
- **Mensaje de éxito:** head y tail son un buen par: uno mira el principio, el otro el final.

### Lección 5: Repaso — Pon todo en práctica
20 pasos.

#### 1. [concept] Todo lo que aprendiste en Fundamentos
- **Kicker:** Repaso final
- **Terminal:** `whoami · pwd · ls · cd · mkdir`
- **Terminal:** `touch · cat · cp · mv · rm`
- **Texto:** Antes de pasar al siguiente nivel, vamos a repasar mezclado todo lo que ya sabes: identidad y ubicación, navegación entre carpetas, y manejo de archivos. Si te trabas en algo, vuelve a la lección correspondiente.

#### 2. [choice] ¿Qué comando te dice con qué usuario iniciaste sesión?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en la primera lección: identidad dentro del sistema.
  - ✅ whoami
  - ▫️ pwd
  - ▫️ ls
- **Explicación:** whoami responde literalmente "¿quién soy yo?" mostrando tu nombre de usuario actual.

#### 3. [order] Quieres crear una carpeta llamada backups. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Recuerda el comando para crear directorios.
- **Fichas:** `cp`  `touch`  `mkdir`  `carpeta`  `backups`
- **Orden correcto:** `mkdir` → `backups`
- **Explicación:** mkdir backups crea una nueva carpeta llamada "backups". touch crea archivos, no carpetas.

#### 4. [type-command] Escribe pwd y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** Confirma en qué carpeta estás antes de seguir moviéndote.
- **Comando esperado:** `pwd`
- **Salida simulada:** `/home/user`
- **Pista:** (usa el contexto)
- **Tab candidates:** `pwd`
- **Mensaje de éxito:** Siempre puedes preguntarle a la terminal dónde estás parado.

#### 5. [choice] Estás en /home/user/proyectos y quieres subir un nivel. ¿Qué comando usas?
- **Kicker:** Repaso mezclado
- **Contexto:** Recuerda qué representa cada símbolo especial cuando te mueves entre carpetas.
  - ✅ cd ..
  - ▫️ cd proyectos
  - ▫️ cd /
- **Explicación:** cd .. te mueve un nivel hacia arriba en el árbol de carpetas, sin importar dónde estés.

#### 6. [order] Quieres copiar el archivo tarea.txt como tarea_copia.txt. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Uno de estos comandos crea una copia dejando el original donde está; el otro lo habría renombrado o movido.
- **Fichas:** `rm`  `mv`  `cp`  `backup.txt`  `tarea.txt`  `tarea_copia.txt`
- **Orden correcto:** `cp` → `tarea.txt` → `tarea_copia.txt`
- **Explicación:** cp tarea.txt tarea_copia.txt crea una copia idéntica con el nuevo nombre. mv habría renombrado el original en vez de copiarlo.

#### 7. [choice] ¿Qué comando borra un archivo de forma permanente, sin papelera de reciclaje?
- **Kicker:** Repaso mezclado
- **Contexto:** Este es el comando que hay que usar con más cuidado.
  - ▫️ delete
  - ✅ rm
  - ▫️ erase
- **Explicación:** rm elimina archivos de forma directa y permanente. No hay forma de deshacerlo por defecto.

#### 8. [type-command] Escribe ls y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** Comprueba qué hay en tu carpeta actual antes de terminar el repaso.
- **Comando esperado:** `ls`
- **Salida simulada:** `documentos  fotos  proyectos`
- **Pista:** (usa el contexto)
- **Tab candidates:** `ls`
- **Mensaje de éxito:** ¡Vas muy bien! Sigamos repasando un poco más.

#### 9. [choice] ¿Qué comando crea un archivo vacío nuevo?
- **Kicker:** Repaso mezclado
- **Contexto:** Uno de estos tres comandos trabaja con archivos; los otros dos hacen otra cosa.
  - ✅ touch
  - ▫️ mkdir
  - ▫️ cat
- **Explicación:** touch crea un archivo vacío con el nombre indicado. mkdir crea carpetas y cat muestra contenido, no crea nada.

#### 10. [order] Quieres saber la fecha y hora actuales del sistema. Ordena la pieza.
- **Kicker:** Repaso mezclado
- **Contexto:** Solo hace falta una palabra, sin argumentos.
- **Fichas:** `hora`  `time`  `now`  `clock`  `date`
- **Orden correcto:** `date`
- **Explicación:** date muestra la fecha y hora actuales del sistema. "time" y "clock" no son el comando correcto para esto.

#### 11. [type-command] Escribe echo hola y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** Este comando repite en pantalla el texto que le sigue.
- **Comando esperado:** `echo hola`
- **Salida simulada:** `hola`
- **Pista:** (usa el contexto)
- **Tab candidates:** `echo`, `hola`
- **Mensaje de éxito:** echo repite exactamente lo que escribes después.

#### 12. [choice] ¿Qué símbolo del prompt suele indicar que estás operando como root (superusuario)?
- **Kicker:** Repaso mezclado
- **Contexto:** El símbolo final del prompt cambia según el tipo de usuario.
  - ▫️ $
  - ✅ #
  - ▫️ %
- **Explicación:** El símbolo # indica que estás operando como root, con permisos totales sobre el sistema.

#### 13. [choice] Un programa se quedó colgado en la terminal y no responde. ¿Qué combinación de teclas lo interrumpe?
- **Kicker:** Repaso mezclado
- **Contexto:** No todas las combinaciones con Ctrl sirven para lo mismo.
  - ▫️ Ctrl+Z
  - ✅ Ctrl+C
  - ▫️ Ctrl+D
- **Explicación:** Ctrl+C interrumpe (cancela) el comando o programa que se está ejecutando en ese momento.

#### 14. [order] Terminaste de trabajar y quieres cerrar la sesión de la terminal. Ordena la pieza.
- **Kicker:** Repaso mezclado
- **Contexto:** Solo hace falta una palabra, sin argumentos.
- **Fichas:** `bye`  `salir`  `quit`  `exit`  `logout`
- **Orden correcto:** `exit`
- **Explicación:** exit cierra la sesión actual del shell. "salir" y "logout" no son comandos reales de bash para esto.

#### 15. [choice] Sin importar en qué carpeta estés, ¿qué comando te lleva directo a tu carpeta personal (home)?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en cuál de estos comandos te lleva siempre al mismo lugar.
  - ▫️ cd .
  - ✅ cd ~
  - ▫️ cd ..
- **Explicación:** El símbolo ~ siempre representa tu carpeta personal, sin importar en qué carpeta estés parado.

#### 16. [order] Quieres volver a la carpeta en la que estabas antes de tu último cambio de directorio. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Es un atajo de cd con un solo símbolo, sin nombre de carpeta.
- **Fichas:** `atras`  `cd`  `..`  `-`  `~`
- **Orden correcto:** `cd` → `-`
- **Explicación:** cd - te devuelve a la carpeta anterior. ~ te lleva a tu carpeta personal, no a la anterior.

#### 17. [choice] ¿Qué opción de ls muestra los archivos con detalles como tamaño y fecha?
- **Kicker:** Repaso mezclado
- **Contexto:** Esta opción cambia el formato de salida a una lista vertical con más información.
  - ✅ ls -l
  - ▫️ ls -x
  - ▫️ ls -v
- **Explicación:** ls -l usa el formato "largo": permisos, propietario, tamaño y fecha de modificación de cada archivo.

#### 18. [choice] Quieres copiar una carpeta completa, con todo su contenido dentro. ¿Qué opción necesita cp?
- **Kicker:** Repaso mezclado
- **Contexto:** Por defecto, cp no copia carpetas a menos que se lo indiques explícitamente.
  - ✅ cp -r
  - ▫️ cp -a
  - ▫️ cp -f
- **Explicación:** cp -r (recursivo) copia una carpeta y todo lo que hay dentro de ella, subcarpetas incluidas.

#### 19. [order] Quieres borrar una carpeta llamada temporal junto con todo su contenido. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Borrar una carpeta que tiene cosas adentro no funciona igual que borrar un solo archivo.
- **Fichas:** `borrar`  `-f`  `rmdir`  `rm`  `temporal`  `-r`
- **Orden correcto:** `rm` → `-r` → `temporal`
- **Explicación:** rm -r temporal borra la carpeta "temporal" y todo lo que contiene, de forma recursiva. -f fuerza el borrado sin preguntar, pero no es lo que se pidió aquí.

#### 20. [choice] ¿Qué comando muestra solo las últimas líneas de un archivo?
- **Kicker:** Repaso mezclado
- **Contexto:** Existe un comando pensado justo para esto, distinto de cat.
  - ✅ tail
  - ▫️ head
  - ▫️ top
- **Explicación:** tail muestra las últimas líneas de un archivo, al contrario que head, que muestra las primeras.

### Lección 6: Desafío final — Resuélvelo por tu cuenta (Desafío final)
> Sin pistas paso a paso: combina todo lo que aprendiste en esta unidad para resolver una tarea real, con solo el objetivo final como guía.

4 pasos.

#### 1. [type-command] Tienes una carpeta llamada documentos y quieres guardar una copia de seguridad completa, con todo su contenido, antes de reinstalar tu sistema. La copia debe llamarse documentos_backup. Nadie te va a decir qué comando usar: resuélvelo con lo que ya sabes.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Vas a necesitar combinar un comando que ya conoces con una opción que también viste antes, para que copie carpetas completas y no solo archivos sueltos.
- **Comando esperado:** `cp -r documentos documentos_backup`
- **Salida simulada:** `documentos_backup creada con una copia completa de documentos.`
- **Pista:** Es el mismo comando que usaste para copiar archivos, pero con una opción extra para que también copie carpetas completas.
- **Tab candidates:** `cp`, `-r`, `documentos`, `documentos_backup`
- **Mensaje de éxito:** ¡Lo lograste! Combinaste todo lo que aprendiste en Fundamentos para resolver una tarea real, sin que nadie te dijera el comando exacto.

#### 2. [type-command] El archivo borrador.txt en realidad es la versión que vas a entregar. Quieres que se llame version_final.txt, sin crear una copia nueva.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** No hace falta copiar nada: hay un comando que cambia el nombre de un archivo directamente.
- **Comando esperado:** `mv borrador.txt version_final.txt`
- **Salida simulada:** `borrador.txt ahora se llama version_final.txt`
- **Pista:** Es el mismo comando que usarías para mover un archivo de carpeta, solo que aquí lo dejas en el mismo lugar con otro nombre.
- **Tab candidates:** `mv`, `borrador.txt`, `version_final.txt`
- **Mensaje de éxito:** ¡Exacto! mv sirve tanto para mover como para renombrar, sin necesidad de copiar nada.

#### 3. [type-command] Tu carpeta actual tiene una mezcla de archivos .txt y .log. Quieres ver en pantalla únicamente los que terminan en .log, sin que aparezca ningún otro.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Existe un símbolo que actúa como comodín y representa "cualquier cosa" dentro de un nombre de archivo.
- **Comando esperado:** `ls *.log`
- **Salida simulada:** `error.log  sistema.log`
- **Pista:** Combina el comando que lista archivos con un comodín que represente cualquier nombre, siempre que termine en ".log".
- **Tab candidates:** `ls`, `*.log`
- **Mensaje de éxito:** ¡Perfecto! El comodín * te dejó filtrar justo los archivos que buscabas.

#### 4. [type-command] Terminaste de usar una carpeta llamada temporal que todavía tiene varios archivos adentro, y quieres eliminarla por completo, contenido incluido, en un solo comando.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Recuerda que hay un comando que se niega a borrar carpetas si no están vacías, así que necesitas otro.
- **Comando esperado:** `rm -r temporal`
- **Salida simulada:** `Carpeta 'temporal' y todo su contenido eliminados.`
- **Pista:** Es el comando para borrar archivos, con una opción extra que también borra carpetas y todo lo que tengan dentro.
- **Tab candidates:** `rm`, `-r`, `temporal`
- **Mensaje de éxito:** ¡Bien! rm -r es la forma de borrar una carpeta completa, incluso si no está vacía.

---

## Unidad 2: Terminal
_Unidad 2 · Nivel 2_

### Lección 1: Comandos encadenados — pipes y redirecciones (|, >, >>)
22 pasos.

#### 1. [concept] Guardar la salida de un comando: la redirección >
- **Kicker:** Teoría
- **Tú:** `echo "hola mundo" > saludo.txt`
- **Terminal:** `(nada aparece en pantalla: todo fue a parar al archivo)`
- **Texto:** Hasta ahora, todo lo que producen tus comandos aparece en pantalla. El símbolo > cambia eso: en vez de mostrar el resultado, lo guarda dentro de un archivo. Si el archivo no existe, se crea; si ya existe, su contenido anterior se pierde por completo.

#### 2. [type-command] Escribe echo "hola mundo" > saludo.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** El símbolo > redirige la salida del comando hacia un archivo, en vez de mostrarla en pantalla.
- **Comando esperado:** `echo "hola mundo" > saludo.txt`
- **Salida simulada:** `saludo.txt creado con el texto: hola mundo`
- **Pista:** Es el mismo echo que ya conoces, seguido del símbolo > y el nombre del archivo donde quieres guardar el resultado.
- **Tab candidates:** `echo`, `hola mundo`, `>`, `saludo.txt`
- **Mensaje de éxito:** ¡Así es! Ese texto ahora vive dentro de saludo.txt, no en la pantalla.

#### 3. [concept] > sobrescribe sin preguntar
- **Kicker:** Cuidado
- **Tú:** `echo "version 2" > notas.txt`
- **Terminal:** `(notas.txt ahora solo contiene "version 2")`
- **Texto:** El símbolo > no avisa ni pide confirmación: si el archivo ya tenía contenido, lo reemplaza por completo con la nueva salida. Es una herramienta poderosa, pero conviene usarla con cuidado para no perder información sin darte cuenta.

#### 4. [choice] Tienes un archivo notas.txt con varias líneas importantes. Si ejecutas echo "hola" > notas.txt, ¿qué pasa con el contenido anterior?
- **Kicker:** Elige la respuesta
- **Contexto:** Recuerda cómo se comporta el símbolo > frente a un archivo que ya existe.
  - ▫️ Se agrega "hola" al final, sin tocar lo anterior
  - ✅ El contenido anterior se pierde por completo; el archivo solo queda con "hola"
  - ▫️ La terminal pregunta antes de sobrescribir
- **Explicación:** > siempre sobrescribe el archivo completo con la nueva salida, sin avisar ni pedir confirmación.

#### 5. [concept] Añadir sin borrar: la redirección >>
- **Kicker:** Teoría
- **Tú:** `echo "otra linea" >> saludo.txt`
- **Terminal:** `(se agregó al final, sin borrar lo que ya había)`
- **Texto:** Cuando quieres agregar contenido a un archivo sin perder lo que ya tenía, usas >> (dos símbolos de "mayor que" seguidos). En vez de sobrescribir, añade la nueva salida al final del archivo.

#### 6. [type-command] Escribe echo "otra linea" >> saludo.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** >> añade el texto al final del archivo, sin borrar lo que ya había dentro.
- **Comando esperado:** `echo "otra linea" >> saludo.txt`
- **Salida simulada:** `Se agregó "otra linea" al final de saludo.txt`
- **Pista:** Es el mismo echo de antes, pero con dos símbolos > seguidos en vez de uno solo.
- **Tab candidates:** `echo`, `otra linea`, `>>`, `saludo.txt`
- **Mensaje de éxito:** ¡Perfecto! saludo.txt ahora tiene dos líneas, sin haber perdido la primera.

#### 7. [concept] Revisar el archivo con cat
- **Kicker:** Confirmar el resultado
- **Tú:** `cat saludo.txt`
- **Terminal:** `hola mundo / otra linea`
- **Texto:** Ya conoces cat de la unidad de Fundamentos: muestra el contenido completo de un archivo en pantalla. Es la forma más rápida de confirmar que tus redirecciones hicieron lo que esperabas.

#### 8. [type-command] Escribe cat saludo.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** Confirma que saludo.txt tiene ambas líneas: la que creaste con > y la que agregaste con >>.
- **Comando esperado:** `cat saludo.txt`
- **Salida simulada:** `hola mundo
otra linea`
- **Pista:** (usa el contexto)
- **Tab candidates:** `cat`, `saludo.txt`
- **Mensaje de éxito:** Ahí están las dos líneas: > creó la primera, >> agregó la segunda sin borrarla.

#### 9. [concept] Conectar comandos: el pipe |
- **Kicker:** Teoría
- **Tú:** `cat saludo.txt | head`
- **Terminal:** `(la salida de cat se convierte en la entrada de head)`
- **Texto:** El símbolo | (pipe, se lee "tubería") conecta dos comandos: toma la salida del primero y se la entrega como entrada al segundo, en vez de mostrarla en pantalla. Es como pasar un balde de agua de una mano a otra sin derramar nada.

#### 10. [type-command] Escribe cat saludo.txt | head y presiona Enter
- **Kicker:** Practica
- **Contexto:** El pipe envía la salida de cat directamente a head, que muestra las primeras líneas de lo que recibe.
- **Comando esperado:** `cat saludo.txt | head`
- **Salida simulada:** `hola mundo
otra linea`
- **Pista:** Es el comando cat que ya conoces, seguido del símbolo | y el comando head.
- **Tab candidates:** `cat`, `saludo.txt`, `|`, `head`
- **Mensaje de éxito:** ¡Eso es un pipe funcionando! head mostró justo lo que cat le entregó.

#### 11. [concept] Ordenar líneas de texto: sort
- **Kicker:** Un comando nuevo
- **Tú:** `ls | sort`
- **Terminal:** `documentos, fotos, proyectos (en orden alfabético)`
- **Texto:** "sort" ordena alfabéticamente las líneas de texto que recibe. Casi nunca se usa solo: su verdadero valor aparece cuando lo combinas con un pipe para ordenar la salida de otro comando.

#### 12. [order] Quieres ver el contenido de tu carpeta actual, pero ordenado alfabéticamente. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas conectar el comando que lista archivos con el que ordena texto, usando un pipe entre ambos.
- **Fichas:** `sort`  `ls`  `|`  `cat`  `grep`
- **Orden correcto:** `ls` → `|` → `sort`
- **Explicación:** ls | sort primero lista el contenido de la carpeta y luego lo pasa a sort para ordenarlo alfabéticamente.

#### 13. [concept] Contar líneas: wc -l
- **Kicker:** Otro comando nuevo
- **Tú:** `history | wc -l`
- **Terminal:** `7`
- **Texto:** "wc" (word count) cuenta palabras, líneas o caracteres. Con la opción -l cuenta específicamente cuántas líneas recibió. Combinado con un pipe, es una forma rápida de saber "cuántas cosas hay" sin contarlas a mano.

#### 14. [type-command] Escribe history | wc -l y presiona Enter
- **Kicker:** Practica
- **Contexto:** El pipe envía tu historial de comandos a wc -l, que cuenta cuántas líneas (comandos) contiene.
- **Comando esperado:** `history | wc -l`
- **Salida simulada:** `7`
- **Pista:** Es el comando history que ya conoces, seguido del símbolo | y wc -l.
- **Tab candidates:** `history`, `|`, `wc`, `-l`
- **Mensaje de éxito:** wc -l te dio el número exacto de comandos en tu historial, sin que tuvieras que contarlos.

#### 15. [concept] Encadenar más de dos comandos
- **Kicker:** Un paso más
- **Tú:** `history | sort | head`
- **Terminal:** `(las primeras líneas del historial, ya ordenado)`
- **Texto:** Los pipes se pueden encadenar tantas veces como haga falta: la salida de cada comando alimenta al siguiente. history | sort | head primero ordena tu historial alfabéticamente, y luego muestra solo las primeras líneas de ese resultado ya ordenado.

#### 16. [order] Quieres ordenar tu historial de comandos y luego ver solo las primeras líneas del resultado. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Vas a necesitar dos pipes: uno para pasar el historial a sort, y otro para pasar ese resultado a head.
- **Fichas:** `tail`  `history`  `|`  `sort`  `|`  `head`  `grep`
- **Orden correcto:** `history` → `|` → `sort` → `|` → `head`
- **Explicación:** history | sort | head encadena tres comandos: primero se ordena el historial, y el resultado ordenado se le pasa a head para ver solo las primeras líneas.

#### 17. [concept] Pipe + redirección: guardar el resultado en un archivo
- **Kicker:** Combinar todo
- **Tú:** `history | sort > historial_ordenado.txt`
- **Terminal:** `(nada en pantalla: el resultado ordenado quedó guardado en el archivo)`
- **Texto:** Puedes combinar pipes y redirecciones en un mismo comando: primero encadenas comandos con |, y al final usas > (o >>) para guardar el resultado final en un archivo, en vez de mostrarlo en pantalla.

#### 18. [type-command] Escribe history | sort > historial_ordenado.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** Primero se ordena el historial con sort, y el resultado final se guarda en historial_ordenado.txt en vez de mostrarse en pantalla.
- **Comando esperado:** `history | sort > historial_ordenado.txt`
- **Salida simulada:** `historial_ordenado.txt creado con el historial ordenado alfabéticamente.`
- **Pista:** Combina history, un pipe, sort, y termina con > seguido del nombre del archivo.
- **Tab candidates:** `history`, `|`, `sort`, `>`, `historial_ordenado.txt`
- **Mensaje de éxito:** ¡Excelente! Combinaste un pipe y una redirección en un mismo comando.

#### 19. [concept] Tres símbolos, tres trabajos distintos
- **Kicker:** Resumen
- **Terminal:** `|  conecta la salida de un comando con la entrada de otro`
- **Terminal:** `>  guarda en un archivo, borrando lo anterior · >>  guarda, sin borrar`
- **Texto:** Repasemos: | conecta la salida de un comando con la entrada de otro. > guarda la salida en un archivo, borrando lo que había antes. >> guarda la salida en un archivo, agregándola al final sin borrar nada.

#### 20. [choice] ¿Cuál de estos símbolos conecta la salida de un comando como entrada del siguiente?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en el símbolo que "pasa" información de un comando a otro.
  - ▫️ >
  - ✅ |
  - ▫️ >>
- **Explicación:** El pipe | conecta dos comandos: la salida del primero se convierte en la entrada del segundo.

#### 21. [choice] ¿Qué símbolo sobrescribe por completo el contenido de un archivo?
- **Kicker:** Elige la respuesta
- **Contexto:** Este símbolo no avisa antes de reemplazar lo que ya había.
  - ▫️ >>
  - ✅ >
  - ▫️ |
- **Explicación:** > reemplaza todo el contenido del archivo con la nueva salida, sin conservar lo anterior.

#### 22. [choice] ¿Qué símbolo agrega contenido al final de un archivo sin borrar lo que ya había?
- **Kicker:** Elige la respuesta
- **Contexto:** Este símbolo son dos caracteres iguales seguidos.
  - ▫️ >
  - ▫️ |
  - ✅ >>
- **Explicación:** >> añade la nueva salida al final del archivo, conservando todo el contenido anterior.

### Lección 2: Buscar archivos — find y locate
20 pasos.

#### 1. [concept] ¿Por qué necesitas buscar archivos?
- **Kicker:** Teoría
- **Tú:** `¿Dónde guardé informe_final.txt?`
- **Terminal:** `(podría estar en cualquiera de cientos de carpetas)`
- **Texto:** A medida que trabajas en Linux, terminas con archivos repartidos en muchas carpetas distintas. Navegar carpeta por carpeta con ls y cd para encontrar uno solo es lento. Para eso existen comandos dedicados a buscar: find y locate.

#### 2. [concept] find: buscar recorriendo carpetas en tiempo real
- **Kicker:** Teoría
- **Tú:** `find . -name "informe_final.txt"`
- **Terminal:** `./documentos/informe_final.txt`
- **Texto:** "find" busca archivos y carpetas recorriendo el sistema de archivos en el momento, carpeta por carpeta. El punto (.) le dice "empieza a buscar desde aquí, en la carpeta actual". La opción -name indica el nombre exacto que buscas.

#### 3. [type-command] Escribe find . -name "informe_final.txt" y presiona Enter
- **Kicker:** Practica
- **Contexto:** find . -name busca, a partir de la carpeta actual, un archivo con ese nombre exacto.
- **Comando esperado:** `find . -name "informe_final.txt"`
- **Salida simulada:** `./documentos/informe_final.txt`
- **Pista:** Es find, luego un punto para "desde aquí", luego -name y el nombre del archivo entre comillas.
- **Tab candidates:** `find`, `.`, `-name`, `informe_final.txt`
- **Mensaje de éxito:** ¡Encontrado! find recorrió las carpetas hasta dar con el archivo.

#### 4. [concept] ¿Dónde empieza a buscar find?
- **Kicker:** Un detalle importante
- **Tú:** `find /home -name "fotos.zip"`
- **Terminal:** `/home/user/descargas/fotos.zip`
- **Texto:** El primer argumento de find es siempre la carpeta donde empieza a buscar. No tiene que ser la carpeta actual: puedes darle una ruta específica, como /home, y find revisará esa carpeta y todas las que están dentro de ella.

#### 5. [type-command] Escribe find /home -name "fotos.zip" y presiona Enter
- **Kicker:** Practica
- **Contexto:** find busca dentro de /home y todas sus subcarpetas, un archivo llamado fotos.zip.
- **Comando esperado:** `find /home -name "fotos.zip"`
- **Salida simulada:** `/home/user/descargas/fotos.zip`
- **Pista:** Es find, seguido de la ruta /home, luego -name y el nombre del archivo.
- **Tab candidates:** `find`, `/home`, `-name`, `fotos.zip`
- **Mensaje de éxito:** Así es: cambiar la carpeta inicial cambia dónde busca find, sin cambiar el resto del comando.

#### 6. [choice] En find /home -name "notas.txt", ¿qué parte le dice a find dónde empezar a buscar?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en el primer argumento que recibe find, antes de -name.
  - ▫️ -name
  - ✅ /home
  - ▫️ "notas.txt"
- **Explicación:** El primer argumento de find (aquí, /home) es siempre la carpeta desde donde empieza la búsqueda.

#### 7. [concept] Buscar por tipo: archivos o carpetas
- **Kicker:** Teoría
- **Tú:** `find . -type d`
- **Terminal:** `./documentos / ./fotos / ./proyectos`
- **Texto:** La opción -type filtra por tipo de elemento. -type d busca solo directorios (carpetas). -type f busca solo archivos regulares, dejando fuera las carpetas. Es útil cuando sabes que buscas específicamente una carpeta o específicamente un archivo.

#### 8. [type-command] Escribe find . -type d y presiona Enter
- **Kicker:** Practica
- **Contexto:** -type d le dice a find que muestre solo carpetas, ignorando los archivos.
- **Comando esperado:** `find . -type d`
- **Salida simulada:** `./documentos
./fotos
./proyectos`
- **Pista:** Es find, un punto, y luego -type seguido de la letra d (de "directory").
- **Tab candidates:** `find`, `.`, `-type`, `d`
- **Mensaje de éxito:** ¡Exacto! Solo aparecieron carpetas, ningún archivo suelto.

#### 9. [type-command] Escribe find . -type f y presiona Enter
- **Kicker:** Practica
- **Contexto:** -type f le dice a find que muestre solo archivos, dejando fuera las carpetas.
- **Comando esperado:** `find . -type f`
- **Salida simulada:** `./documentos/informe_final.txt
./fotos/vacaciones.jpg`
- **Pista:** Es el mismo comando anterior, pero cambiando la d por una f (de "file").
- **Tab candidates:** `find`, `.`, `-type`, `f`
- **Mensaje de éxito:** Perfecto: ahora solo ves archivos, sin ninguna carpeta en la lista.

#### 10. [concept] Comodines: buscar por patrón, no por nombre exacto
- **Kicker:** Teoría
- **Tú:** `find . -name "*.txt"`
- **Terminal:** `./notas.txt / ./documentos/informe_final.txt`
- **Texto:** No siempre sabes el nombre exacto del archivo, pero sí su extensión o parte del nombre. El asterisco (*) es un comodín: representa "cualquier cosa". "*.txt" encuentra cualquier archivo que termine en .txt, sin importar cómo empiece su nombre.

#### 11. [type-command] Escribe find . -name "*.txt" y presiona Enter
- **Kicker:** Practica
- **Contexto:** El comodín * encuentra cualquier archivo terminado en .txt, sin importar el resto del nombre.
- **Comando esperado:** `find . -name "*.txt"`
- **Salida simulada:** `./notas.txt
./documentos/informe_final.txt`
- **Pista:** Es find, un punto, -name, y entre comillas un asterisco seguido de .txt.
- **Tab candidates:** `find`, `.`, `-name`, `*.txt`
- **Mensaje de éxito:** ¡Así se usan los comodines! Encontraste todos los .txt sin conocer sus nombres completos.

#### 12. [choice] ¿Qué encuentra el comando find . -name "*.jpg"?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué representa el asterisco dentro del patrón.
  - ▫️ Solo un archivo llamado exactamente *.jpg
  - ✅ Cualquier archivo que termine en .jpg, sin importar el resto del nombre
  - ▫️ Todas las carpetas, sin importar su extensión
- **Explicación:** El asterisco (*) es un comodín que representa "cualquier texto", así que "*.jpg" encuentra cualquier archivo que termine en .jpg.

#### 13. [concept] locate: búsqueda instantánea con un índice
- **Kicker:** Otro comando
- **Tú:** `locate informe_final.txt`
- **Terminal:** `/home/user/documentos/informe_final.txt (respuesta instantánea)`
- **Texto:** "locate" busca de forma muy distinta a find: en vez de recorrer carpetas en el momento, consulta un índice (una base de datos) que el sistema actualiza periódicamente con la ubicación de todos los archivos. Por eso es casi instantáneo, incluso en discos con millones de archivos.

#### 14. [type-command] Escribe locate informe_final.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** locate consulta su índice interno y devuelve la ubicación al instante, sin recorrer carpetas.
- **Comando esperado:** `locate informe_final.txt`
- **Salida simulada:** `/home/user/documentos/informe_final.txt`
- **Pista:** Es simplemente locate seguido del nombre del archivo, sin necesidad de indicar dónde buscar.
- **Tab candidates:** `locate`, `informe_final.txt`
- **Mensaje de éxito:** ¡Casi sin esperar! Esa es la ventaja principal de locate frente a find.

#### 15. [concept] El índice de locate puede quedar desactualizado
- **Kicker:** La otra cara de locate
- **Tú:** `locate archivo_creado_hace_2_minutos.txt`
- **Terminal:** `(sin resultados: el índice todavía no se actualizó)`
- **Texto:** Como locate depende de un índice que se actualiza cada cierto tiempo (normalmente una vez al día), un archivo recién creado puede no aparecer todavía en los resultados. find, en cambio, siempre ve el estado real y actual de las carpetas, aunque tarde un poco más.

#### 16. [choice] Acabas de crear un archivo hace unos segundos y necesitas encontrarlo ya. ¿Qué comando es más confiable en este caso?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cuál de los dos comandos ve el estado real del sistema en este momento, y cuál depende de un índice.
  - ▫️ locate, porque es más rápido
  - ✅ find, porque revisa las carpetas en tiempo real
  - ▫️ Cualquiera de los dos da exactamente el mismo resultado
- **Explicación:** find recorre las carpetas en el momento, así que siempre ve archivos recién creados. locate depende de un índice que puede no haberse actualizado todavía.

#### 17. [order] Quieres buscar, dentro de la carpeta actual, todos los archivos que terminen en .log. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas find, indicar que empiece en la carpeta actual, y luego el patrón con el comodín correcto.
- **Fichas:** `-type`  `find`  `.`  `-name`  `"*.log"`
- **Orden correcto:** `find` → `.` → `-name` → `"*.log"`
- **Explicación:** find . -name "*.log" busca desde la carpeta actual cualquier archivo que termine en .log, gracias al comodín *.

#### 18. [concept] find y locate, cada uno para su momento
- **Kicker:** Resumen
- **Terminal:** `find: exacto y actualizado, pero más lento en discos grandes`
- **Terminal:** `locate: instantáneo, pero puede no ver lo más reciente`
- **Texto:** Repasemos: find recorre carpetas en tiempo real, admite filtros como -type y -name, y siempre refleja el estado actual del sistema. locate consulta un índice precalculado, por lo que es mucho más rápido, pero puede no incluir archivos creados muy recientemente.

#### 19. [type-command] Escribe find /home -type d -name "proyectos" y presiona Enter
- **Kicker:** Practica
- **Contexto:** Combinas -type d (solo carpetas) con -name (nombre específico) para buscar la carpeta "proyectos" dentro de /home.
- **Comando esperado:** `find /home -type d -name "proyectos"`
- **Salida simulada:** `/home/user/proyectos`
- **Pista:** Es find, la ruta /home, luego -type d, y por último -name con el nombre entre comillas.
- **Tab candidates:** `find`, `/home`, `-type`, `d`, `-name`, `proyectos`
- **Mensaje de éxito:** ¡Muy bien! Combinaste dos filtros de find en un mismo comando, algo muy común en el día a día.

#### 20. [choice] ¿Qué hace exactamente find /home -type d -name "proyectos"?
- **Kicker:** Elige la respuesta
- **Contexto:** Fíjate en qué filtra -type d y qué filtra -name en este mismo comando.
  - ▫️ Busca cualquier archivo o carpeta llamado "proyectos" en todo el sistema
  - ✅ Busca, dentro de /home, solo carpetas (no archivos) llamadas exactamente "proyectos"
  - ▫️ Crea una nueva carpeta llamada "proyectos" dentro de /home
- **Explicación:** -type d limita la búsqueda a carpetas, -name "proyectos" exige ese nombre exacto, y /home es donde find empieza a buscar.

### Lección 3: Buscar texto — grep y expresiones básicas
23 pasos.

#### 1. [concept] ¿Por qué buscar texto dentro de archivos?
- **Kicker:** Teoría
- **Tú:** `¿En qué archivo mencioné "presupuesto"?`
- **Terminal:** `(podría estar dentro de cualquiera de tus archivos de texto)`
- **Texto:** find y locate te ayudan a encontrar archivos por su nombre, pero no miran dentro de ellos. Cuando necesitas saber qué archivos contienen una palabra o frase específica, el comando indicado es grep.

#### 2. [concept] grep: buscar una palabra dentro de un archivo
- **Kicker:** Teoría
- **Tú:** `grep "presupuesto" notas.txt`
- **Terminal:** `El presupuesto de este mes es de 500 dólares`
- **Texto:** "grep" busca un texto dentro de un archivo y muestra cada línea completa donde aparece. Se usa así: grep "lo que buscas" nombre_del_archivo. Si el texto tiene espacios, va entre comillas.

#### 3. [type-command] Escribe grep "presupuesto" notas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** grep busca la palabra "presupuesto" dentro de notas.txt y muestra la línea completa donde aparece.
- **Comando esperado:** `grep "presupuesto" notas.txt`
- **Salida simulada:** `El presupuesto de este mes es de 500 dólares`
- **Pista:** Es grep, luego la palabra entre comillas, y por último el nombre del archivo.
- **Tab candidates:** `grep`, `presupuesto`, `notas.txt`
- **Mensaje de éxito:** ¡Eso es! grep te mostró la línea exacta donde aparece la palabra.

#### 4. [concept] grep no distingue mayúsculas de minúsculas... a menos que se lo digas
- **Kicker:** Un detalle importante
- **Tú:** `grep "Presupuesto" notas.txt`
- **Terminal:** `(sin resultados: notas.txt tiene "presupuesto" en minúscula)`
- **Texto:** Por defecto, grep es sensible a mayúsculas y minúsculas: "Presupuesto" y "presupuesto" son palabras distintas para grep. Si escribes la palabra con una mayúscula que no coincide exactamente, no encontrará la línea.

#### 5. [concept] La opción -i: ignorar mayúsculas y minúsculas
- **Kicker:** Teoría
- **Tú:** `grep -i "Presupuesto" notas.txt`
- **Terminal:** `El presupuesto de este mes es de 500 dólares`
- **Texto:** La opción -i (de "ignore case") le dice a grep que ignore la diferencia entre mayúsculas y minúsculas. Así, "Presupuesto", "presupuesto" y "PRESUPUESTO" se consideran la misma palabra.

#### 6. [type-command] Escribe grep -i "Presupuesto" notas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** -i hace que grep ignore mayúsculas y minúsculas al comparar el texto.
- **Comando esperado:** `grep -i "presupuesto" notas.txt`
- **Salida simulada:** `El presupuesto de este mes es de 500 dólares`
- **Pista:** Es grep, luego -i, luego la palabra entre comillas y el nombre del archivo.
- **Tab candidates:** `grep`, `-i`, `presupuesto`, `notas.txt`
- **Mensaje de éxito:** ¡Perfecto! Con -i, grep encontró la línea sin importar cómo escribiste la palabra.

#### 7. [choice] Un archivo config.txt contiene la palabra "ERROR" en mayúsculas. Ejecutas grep "error" config.txt (en minúscula, sin -i). ¿Qué pasa?
- **Kicker:** Elige la respuesta
- **Contexto:** Recuerda que, por defecto, grep distingue entre mayúsculas y minúsculas.
  - ▫️ Encuentra la línea igual, sin problema
  - ✅ No encuentra nada, porque "error" y "ERROR" son distintos sin -i
  - ▫️ Da un error y no se ejecuta
- **Explicación:** Sin la opción -i, grep distingue mayúsculas de minúsculas, así que "error" no coincide con "ERROR".

#### 8. [concept] Buscar en varios archivos a la vez
- **Kicker:** Teoría
- **Tú:** `grep "TODO" tareas.txt notas.txt`
- **Terminal:** `tareas.txt:TODO revisar el informe / notas.txt:TODO llamar al cliente`
- **Texto:** grep puede recibir más de un archivo a la vez, simplemente escribiendo sus nombres uno tras otro. Cuando busca en varios archivos, antepone el nombre del archivo a cada línea encontrada, para que sepas de dónde viene cada resultado.

#### 9. [type-command] Escribe grep "TODO" tareas.txt notas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** grep busca "TODO" en ambos archivos y muestra el nombre del archivo junto a cada línea encontrada.
- **Comando esperado:** `grep "todo" tareas.txt notas.txt`
- **Salida simulada:** `tareas.txt:TODO revisar el informe
notas.txt:TODO llamar al cliente`
- **Pista:** Es grep, la palabra entre comillas, y luego los dos nombres de archivo separados por un espacio.
- **Tab candidates:** `grep`, `todo`, `tareas.txt`, `notas.txt`
- **Mensaje de éxito:** ¡Así es! grep revisó ambos archivos y te dijo en cuál apareció cada coincidencia.

#### 10. [concept] La opción -r: buscar en carpetas completas
- **Kicker:** Teoría
- **Tú:** `grep -r "TODO" .`
- **Terminal:** `./tareas.txt:TODO revisar el informe / ./proyectos/plan.txt:TODO definir fecha`
- **Texto:** Cuando no sabes en qué archivo está el texto que buscas, -r (de "recursive") le dice a grep que revise una carpeta completa, entrando también en sus subcarpetas, en vez de indicarle archivos uno por uno.

#### 11. [type-command] Escribe grep -r "TODO" . y presiona Enter
- **Kicker:** Practica
- **Contexto:** -r hace que grep busque "TODO" en todos los archivos dentro de la carpeta actual y sus subcarpetas.
- **Comando esperado:** `grep -r "todo" .`
- **Salida simulada:** `./tareas.txt:TODO revisar el informe
./proyectos/plan.txt:TODO definir fecha`
- **Pista:** Es grep, luego -r, luego la palabra entre comillas, y por último un punto para "desde aquí".
- **Tab candidates:** `grep`, `-r`, `todo`, `.`
- **Mensaje de éxito:** ¡Excelente! -r convirtió a grep en una búsqueda que recorre toda la carpeta, no solo un archivo.

#### 12. [choice] Quieres buscar la palabra "clave" en todos los archivos de tu carpeta de proyectos, incluyendo sus subcarpetas, sin tener que nombrar cada archivo. ¿Qué opción de grep usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en la opción que hace que grep entre a las subcarpetas por sí solo.
  - ▫️ -i
  - ✅ -r
  - ▫️ -l
- **Explicación:** -r (recursive) hace que grep revise una carpeta completa, incluyendo todas sus subcarpetas, sin tener que listar cada archivo.

#### 13. [concept] La opción -n: mostrar el número de línea
- **Kicker:** Teoría
- **Tú:** `grep -n "presupuesto" notas.txt`
- **Terminal:** `4:El presupuesto de este mes es de 500 dólares`
- **Texto:** Cuando encuentras una coincidencia, a veces necesitas saber exactamente en qué línea del archivo está, por ejemplo para abrirlo en un editor y saltar directo ahí. La opción -n antepone el número de línea a cada resultado.

#### 14. [type-command] Escribe grep -n "presupuesto" notas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** -n muestra el número de línea donde aparece cada coincidencia, antes del texto encontrado.
- **Comando esperado:** `grep -n "presupuesto" notas.txt`
- **Salida simulada:** `4:El presupuesto de este mes es de 500 dólares`
- **Pista:** Es grep, luego -n, luego la palabra entre comillas y el nombre del archivo.
- **Tab candidates:** `grep`, `-n`, `presupuesto`, `notas.txt`
- **Mensaje de éxito:** ¡Así es! El "4:" al inicio te dice que la coincidencia está en la línea 4 del archivo.

#### 15. [concept] La opción -v: mostrar las líneas que NO coinciden
- **Kicker:** Teoría
- **Tú:** `grep -v "completado" tareas.txt`
- **Terminal:** `TODO revisar el informe
TODO llamar al cliente`
- **Texto:** A veces lo que necesitas es lo contrario: ver todas las líneas que NO contienen cierta palabra. La opción -v (de "invert") invierte el filtro de grep, mostrando solo las líneas donde el texto NO aparece.

#### 16. [type-command] Escribe grep -v "completado" tareas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** -v invierte la búsqueda: muestra las líneas que NO contienen la palabra "completado".
- **Comando esperado:** `grep -v "completado" tareas.txt`
- **Salida simulada:** `TODO revisar el informe
TODO llamar al cliente`
- **Pista:** Es grep, luego -v, luego la palabra entre comillas y el nombre del archivo.
- **Tab candidates:** `grep`, `-v`, `completado`, `tareas.txt`
- **Mensaje de éxito:** ¡Correcto! -v te mostró justo lo opuesto: las líneas donde esa palabra no aparece.

#### 17. [choice] Tienes un archivo log.txt con muchas líneas, y quieres ver todas las que NO contienen la palabra "ok". ¿Qué comando usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en la opción de grep que invierte el resultado de la búsqueda.
  - ▫️ grep "ok" log.txt
  - ✅ grep -v "ok" log.txt
  - ▫️ grep -i "ok" log.txt
- **Explicación:** -v invierte el filtro de grep: en vez de mostrar las líneas que coinciden, muestra las que no coinciden.

#### 18. [concept] grep + pipe: filtrar la salida de otro comando
- **Kicker:** Combinar todo
- **Tú:** `history | grep "cd"`
- **Terminal:** `cd documentos
cd proyectos`
- **Texto:** grep no solo busca dentro de archivos: también puede filtrar la salida de otro comando si la conectas con un pipe. history | grep "cd" muestra solo las líneas de tu historial que contienen "cd", en vez de todo el historial completo.

#### 19. [type-command] Escribe history | grep "cd" y presiona Enter
- **Kicker:** Practica
- **Contexto:** El pipe envía tu historial completo a grep, que se queda solo con las líneas que contienen "cd".
- **Comando esperado:** `history | grep "cd"`
- **Salida simulada:** `cd documentos
cd proyectos`
- **Pista:** Es history, seguido del símbolo |, seguido de grep y la palabra entre comillas.
- **Tab candidates:** `history`, `|`, `grep`, `cd`
- **Mensaje de éxito:** ¡Eso es! Combinaste un pipe con grep para filtrar justo lo que necesitabas ver.

#### 20. [order] Quieres buscar la palabra "error" dentro de todos los archivos de la carpeta actual y sus subcarpetas, sin importar mayúsculas o minúsculas. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas grep con dos opciones combinadas: una para ignorar mayúsculas y otra para revisar subcarpetas.
- **Fichas:** `-v`  `grep`  `-ri`  `"error"`  `.`
- **Orden correcto:** `grep` → `-ri` → `"error"` → `.`
- **Explicación:** grep -ri "error" . combina -r (subcarpetas) e -i (ignorar mayúsculas) para buscar "error" en toda la carpeta actual, sin importar cómo esté escrito.

#### 21. [concept] grep y sus opciones más usadas
- **Kicker:** Resumen
- **Terminal:** `-i ignora mayúsculas · -r busca en subcarpetas`
- **Terminal:** `-n muestra el número de línea · -v invierte el resultado`
- **Texto:** Repasemos: grep busca texto dentro de archivos. -i ignora mayúsculas y minúsculas. -r busca dentro de una carpeta completa, incluyendo subcarpetas. -n muestra el número de línea de cada coincidencia. -v invierte el filtro, mostrando lo que NO coincide. Todas estas opciones se pueden combinar entre sí.

#### 22. [type-command] Escribe grep -rn "TODO" . y presiona Enter
- **Kicker:** Practica
- **Contexto:** Combinas -r (subcarpetas) con -n (número de línea) para encontrar cada "TODO" en todo el proyecto, junto con su línea exacta.
- **Comando esperado:** `grep -rn "todo" .`
- **Salida simulada:** `./tareas.txt:1:TODO revisar el informe
./proyectos/plan.txt:3:TODO definir fecha`
- **Pista:** Es grep, luego -rn (las dos opciones juntas), luego la palabra entre comillas, y por último un punto.
- **Tab candidates:** `grep`, `-rn`, `todo`, `.`
- **Mensaje de éxito:** ¡Muy bien! Combinaste dos opciones de grep en un mismo comando, algo muy común en el trabajo real.

#### 23. [choice] ¿Qué hace exactamente el comando grep -rn "TODO" .?
- **Kicker:** Elige la respuesta
- **Contexto:** Fíjate en qué aporta -r y qué aporta -n dentro de este mismo comando.
  - ▫️ Busca "TODO" solo en el archivo actual, mostrando el número de línea
  - ✅ Busca "TODO" en toda la carpeta actual y subcarpetas, mostrando el número de línea de cada coincidencia
  - ▫️ Reemplaza la palabra "TODO" por otra en todos los archivos
- **Explicación:** -r hace que grep revise la carpeta actual y sus subcarpetas, y -n antepone el número de línea a cada coincidencia encontrada.

### Lección 4: Historial y atajos — history, Ctrl+R, autocompletado
28 pasos.

#### 1. [concept] ¿Por qué importa el historial de comandos?
- **Kicker:** Teoría
- **Tú:** `Ese comando larguísimo que escribí ayer... ¿cómo era?`
- **Terminal:** `(la terminal ya lo guardó por ti)`
- **Texto:** Cada comando que ejecutas en la terminal queda guardado en un historial. Esto evita que tengas que memorizar o volver a escribir comandos largos, y te permite repetir, buscar o corregir cosas que ya hiciste antes.

#### 2. [concept] history: ver todo lo que has escrito
- **Kicker:** Teoría
- **Tú:** `history`
- **Terminal:** `1  pwd
2  ls
3  cd documentos`
- **Texto:** "history" muestra la lista completa de comandos que has escrito en esta sesión, cada uno con un número delante. Ese número es importante: te va a servir para repetir comandos sin volver a escribirlos.

#### 3. [type-command] Escribe history y presiona Enter
- **Kicker:** Practica
- **Contexto:** "history" lista, numerados, todos los comandos que has ejecutado antes.
- **Comando esperado:** `history`
- **Salida simulada:** `1  pwd
2  ls
3  cd documentos`
- **Pista:** Es solo la palabra history, sin nada más.
- **Tab candidates:** `history`
- **Mensaje de éxito:** ¡Bien! Ahora tienes a la vista todo lo que has escrito en esta sesión.

#### 4. [concept] !! : repetir el último comando
- **Kicker:** Teoría
- **Tú:** `ls -l`
- **Tú:** `!!`
- **Terminal:** `(vuelve a ejecutar ls -l)`
- **Texto:** Escribir dos signos de exclamación seguidos (!!) le dice a la terminal "ejecuta otra vez el último comando que corrí". Es un atajo muy usado, por ejemplo, cuando olvidas escribir sudo antes de un comando y quieres repetirlo con permisos de administrador: sudo !!

#### 5. [type-command] Ya escribiste ls -l antes. Ahora escribe !! y presiona Enter para repetirlo
- **Kicker:** Practica
- **Contexto:** !! vuelve a ejecutar el último comando que corriste, sin necesidad de reescribirlo.
- **Comando esperado:** `!!`
- **Salida simulada:** `(repite: ls -l)`
- **Pista:** Son solo dos signos de exclamación seguidos: !!
- **Tab candidates:** `!!`
- **Mensaje de éxito:** ¡Exacto! !! te ahorró volver a escribir el comando completo.

#### 6. [concept] !n : repetir un comando por su número
- **Kicker:** Teoría
- **Terminal:** `1  pwd
2  ls
3  cd documentos`
- **Tú:** `!2`
- **Terminal:** `(vuelve a ejecutar ls, el comando número 2)`
- **Texto:** Si necesitas repetir un comando que no fue el último, puedes usar ! seguido del número que le corresponde en el historial. Por ejemplo, !2 repite el comando número 2, sin importar cuántos comandos hayas escrito después.

#### 7. [type-command] Tu historial muestra que el comando número 2 fue "ls". Escribe !2 para repetirlo
- **Kicker:** Practica
- **Contexto:** !2 busca el comando número 2 en tu historial y lo vuelve a ejecutar tal cual.
- **Comando esperado:** `!2`
- **Salida simulada:** `(repite: ls)`
- **Pista:** Es el signo ! seguido directamente del número, sin espacio: !2
- **Tab candidates:** `!2`
- **Mensaje de éxito:** ¡Perfecto! Repetiste un comando anterior solo con su número de historial.

#### 8. [choice] Tu historial muestra que el comando número 5 fue "cd proyectos". ¿Qué escribes para repetirlo?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cómo se referencia un comando del historial por su número.
  - ▫️ history 5
  - ✅ !5
  - ▫️ #5
- **Explicación:** !5 le dice a la terminal que repita el comando número 5 de tu historial, sin tener que volver a escribirlo.

#### 9. [concept] history + grep: buscar un comando específico
- **Kicker:** Combinar todo
- **Tú:** `history | grep "cd"`
- **Terminal:** `3  cd documentos
7  cd proyectos`
- **Texto:** Cuando tu historial ya tiene decenas de comandos, revisarlo entero es lento. Puedes enviar la salida de history a grep con un pipe para quedarte solo con las líneas que contienen la palabra que buscas.

#### 10. [type-command] Escribe history | grep "cd" y presiona Enter
- **Kicker:** Practica
- **Contexto:** El pipe envía tu historial completo a grep, que se queda solo con las líneas que contienen "cd".
- **Comando esperado:** `history | grep "cd"`
- **Salida simulada:** `3  cd documentos
7  cd proyectos`
- **Pista:** Es history, seguido del símbolo |, seguido de grep y la palabra entre comillas.
- **Tab candidates:** `history`, `|`, `grep`, `cd`
- **Mensaje de éxito:** ¡Eso es! Combinaste history con grep para encontrar justo lo que buscabas.

#### 11. [concept] Flecha arriba y abajo: navegar el historial
- **Kicker:** Atajos de teclado
- **Terminal:** `↑ muestra el comando anterior · ↓ muestra el siguiente`
- **Texto:** La flecha arriba (↑) hace aparecer, uno por uno, los comandos anteriores que ya ejecutaste, sin necesidad de escribir history. La flecha abajo (↓) te mueve en dirección contraria, hacia comandos más recientes. Es el atajo más usado para repetir algo que hiciste hace poco.

#### 12. [choice] Quieres que vuelva a aparecer en la línea de comandos el último comando que escribiste, para editarlo antes de ejecutarlo de nuevo. ¿Qué usas?
- **Kicker:** Elige la respuesta
- **Contexto:** No quieres ejecutar el comando directo (como haría !!), sino verlo escrito para poder cambiarlo primero.
  - ✅ Presionar la flecha arriba ↑
  - ▫️ Escribir history
  - ▫️ Presionar Ctrl+C
- **Explicación:** La flecha arriba trae el último comando a la línea actual para que puedas editarlo antes de presionar Enter, algo que !! no permite porque ejecuta directo.

#### 13. [concept] Ctrl+R: búsqueda inversa en el historial
- **Kicker:** Atajos de teclado
- **Terminal:** `(bck-i-search): doc`
- **Terminal:** `cd documentos`
- **Texto:** Con muchos comandos en tu historial, subir con ↑ uno por uno se vuelve lento. Ctrl+R abre una búsqueda inversa: escribe una palabra clave y la terminal te muestra, en tiempo real, el comando más reciente que la contiene. Presiona Ctrl+R otra vez para ver la coincidencia anterior a esa.

#### 14. [choice] Tu historial tiene más de 100 comandos y buscas uno que empezaba con "docker". ¿Cuál es la forma más rápida de encontrarlo?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en el atajo diseñado específicamente para buscar dentro del historial por palabra clave.
  - ▫️ Presionar ↑ hasta encontrarlo
  - ✅ Presionar Ctrl+R y escribir "docker"
  - ▫️ Escribir history y leer la lista entera
- **Explicación:** Ctrl+R activa la búsqueda inversa en el historial: escribes parte del comando y la terminal salta directo a la coincidencia más reciente.

#### 15. [order] Quieres encontrar rápidamente un comando llamado "backup.sh" que escribiste hace rato. Ordena la secuencia de acciones.
- **Kicker:** Ordena los pasos
- **Contexto:** Primero activas la búsqueda, y luego escribes la palabra clave que buscas.
- **Fichas:** `Escribir "backup"`  `Presionar Ctrl+R`  `Presionar Ctrl+A`  `Presionar Enter`
- **Orden correcto:** `Presionar Ctrl+R` → `Escribir "backup"` → `Presionar Enter`
- **Explicación:** Ctrl+R abre la búsqueda inversa, escribir "backup" filtra el historial en tiempo real, y Enter ejecuta el comando encontrado.

#### 16. [concept] Ctrl+A y Ctrl+E: moverte dentro de la línea
- **Kicker:** Atajos de teclado
- **Terminal:** `Ctrl+A → inicio de la línea · Ctrl+E → final de la línea`
- **Texto:** Cuando escribes un comando largo y necesitas corregir algo al principio, no hace falta mantener presionada la flecha izquierda. Ctrl+A mueve el cursor directo al inicio de la línea, y Ctrl+E lo lleva directo al final. Son atajos heredados de los editores de texto clásicos y funcionan en la mayoría de terminales Linux.

#### 17. [choice] Escribiste un comando largo y necesitas ir al inicio de la línea para corregirlo. ¿Qué combinación presionas?
- **Kicker:** Elige la respuesta
- **Contexto:** Ctrl+A mueve el cursor al inicio de la línea actual, sin borrar nada.
  - ✅ Ctrl+A
  - ▫️ Ctrl+E
  - ▫️ Ctrl+U
- **Explicación:** Ctrl+A te ahorra tener que mantener presionada la flecha izquierda: mueve el cursor directo al inicio de la línea, sin borrar nada.

#### 18. [concept] Ctrl+U y Ctrl+K: borrar de un tirón
- **Kicker:** Atajos de teclado
- **Terminal:** `Ctrl+U → borra desde el cursor hacia el inicio`
- **Terminal:** `Ctrl+K → borra desde el cursor hacia el final`
- **Texto:** En vez de presionar Retroceso muchas veces, Ctrl+U borra todo el texto que hay entre el inicio de la línea y donde está el cursor. Ctrl+K hace lo opuesto: borra todo el texto desde el cursor hasta el final de la línea. Muy útiles para descartar un comando mal escrito de un solo golpe.

#### 19. [choice] Escribiste un comando larguísimo, te diste cuenta de que está mal, y quieres borrarlo por completo de un solo golpe (el cursor está al final de la línea). ¿Qué usas?
- **Kicker:** Elige la respuesta
- **Contexto:** El cursor está al final del texto, así que necesitas borrar hacia atrás, hasta el inicio.
  - ▫️ Ctrl+K
  - ✅ Ctrl+U
  - ▫️ Ctrl+E
- **Explicación:** Ctrl+U borra todo el texto desde el cursor hacia el inicio de la línea. Como el cursor estaba al final, esto borra el comando completo.

#### 20. [concept] Ctrl+C y Ctrl+L: interrumpir y limpiar pantalla
- **Kicker:** Atajos de teclado
- **Terminal:** `Ctrl+C → detiene el comando que se está ejecutando`
- **Terminal:** `Ctrl+L → limpia la pantalla (como el comando clear)`
- **Texto:** Ctrl+C envía una señal de interrupción al programa que se está ejecutando en ese momento, deteniéndolo (por ejemplo, si un comando se quedó colgado o entró en un bucle infinito). Ctrl+L limpia visualmente la pantalla de la terminal, igual que el comando clear, pero sin necesidad de escribirlo.

#### 21. [choice] Ejecutaste un comando por error y se quedó corriendo sin parar, sin devolverte el control de la terminal. ¿Qué haces?
- **Kicker:** Elige la respuesta
- **Contexto:** Necesitas detener el programa que está corriendo ahora mismo, no limpiar la pantalla ni borrar texto.
  - ▫️ Ctrl+L
  - ✅ Ctrl+C
  - ▫️ Ctrl+U
- **Explicación:** Ctrl+C interrumpe y detiene el comando que se está ejecutando en este momento, devolviéndote el control de la terminal.

#### 22. [concept] Tab: autocompletado
- **Kicker:** Atajos de teclado
- **Tú:** `cd doc[Tab]`
- **Terminal:** `cd documentos`
- **Texto:** La tecla Tab completa automáticamente nombres de archivos, carpetas o comandos mientras escribes, si hay una única opción que coincide con lo que llevas escrito. Esto evita errores de tipeo y ahorra tener que escribir nombres largos completos. Si hay varias opciones posibles, presionar Tab dos veces muestra la lista de coincidencias.

#### 23. [autocomplete-command] Tu carpeta actual tiene estas subcarpetas: documentos, descargas, descargas-antiguas, imagenes y musica. Escribe cd documentos
- **Kicker:** Practica
- **Contexto:** "cd" te mueve a la carpeta que le indiques, usando su nombre completo.
- **Prefijo sugerido:** `doc` (plantilla: `cd {prefix}`)
- **Candidatos Tab:** `documentos`, `descargas`, `descargas-antiguas`, `imagenes`, `musica`
- **Comando esperado:** `cd documentos`
- **Salida simulada:** `cd documentos`
- **Pista:** Termina de escribir el nombre completo de la carpeta.
- **Mensaje de éxito:** ¡Así es! documentos era la única carpeta que empezaba con doc.

#### 24. [concept] history -c: borrar el historial
- **Kicker:** Teoría
- **Tú:** `history -c`
- **Terminal:** `(el historial de esta sesión queda vacío)`
- **Texto:** A veces necesitas borrar tu historial de comandos, por ejemplo si escribiste algo sensible por error. La opción -c (de "clear") borra todo el historial de la sesión actual. Es distinto a solo cerrar la terminal: -c lo elimina de forma explícita.

#### 25. [type-command] Escribe history -c y presiona Enter
- **Kicker:** Practica
- **Contexto:** -c borra por completo el historial de comandos de la sesión actual.
- **Comando esperado:** `history -c`
- **Salida simulada:** `(historial vaciado)`
- **Pista:** Es history, seguido de -c.
- **Tab candidates:** `history`, `-c`
- **Mensaje de éxito:** ¡Perfecto! Tu historial de esta sesión ha quedado completamente vacío.

#### 26. [order] Quieres ver cuántos comandos tiene tu historial en total, sin leerlos todos uno por uno. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas enviar tu historial, con un pipe, a un comando que cuente líneas.
- **Fichas:** `history`  `wc -l`  `|`  `grep`  `sort`
- **Orden correcto:** `history` → `|` → `wc -l`
- **Explicación:** history | wc -l envía tu historial a wc -l, que cuenta cuántas líneas (comandos) contiene, dándote el total exacto.

#### 27. [concept] Historial y atajos: lo esencial
- **Kicker:** Resumen
- **Terminal:** `history lista · !! repite el último · !n repite por número`
- **Terminal:** `↑↓ navegan · Ctrl+R busca · Ctrl+A/E/U/K/C/L editan y controlan`
- **Texto:** Repasemos: history muestra tu historial numerado. !! repite el último comando y !n repite el comando número n. Las flechas ↑↓ navegan el historial, y Ctrl+R lo busca por palabra clave. Ctrl+A y Ctrl+E mueven el cursor al inicio o final de la línea; Ctrl+U y Ctrl+K borran hacia atrás o hacia adelante. Ctrl+C interrumpe un comando y Ctrl+L limpia la pantalla. Tab autocompleta nombres. Juntos, estos atajos son los que más tiempo te ahorran usando la terminal todos los días.

#### 28. [choice] Quieres repetir el comando "sudo apt update" que ejecutaste hace un momento, pero sin volver a escribirlo entero. ¿Qué opción NO te serviría para esto?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa cuál de estas opciones no tiene nada que ver con repetir un comando anterior.
  - ▫️ Presionar la flecha arriba ↑ hasta encontrarlo
  - ▫️ Escribir !! si fue el último comando
  - ✅ Presionar Ctrl+L
- **Explicación:** Ctrl+L solo limpia la pantalla; no repite ni recupera ningún comando anterior. Para eso sirven ↑, !! o Ctrl+R.

### Lección 5: Repaso — Pon todo en práctica
20 pasos.

#### 1. [choice] ¿Qué símbolo usarías para guardar la salida de un comando en un archivo, sobrescribiendo cualquier contenido anterior?
- **Kicker:** Repaso mezclado
- **Contexto:** Recuerda las redirecciones que viste en la primera lección de esta unidad.
  - ✅ >
  - ▫️ >>
  - ▫️ |
- **Explicación:** > guarda la salida en un archivo, reemplazando por completo lo que tenía antes.

#### 2. [order] Quieres agregar el contenido de nuevo.txt al final de historial.txt, sin borrar lo que ya tenía. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Existe una redirección especial para añadir sin sobrescribir.
- **Fichas:** `cat`  `nuevo.txt`  `>`  `>>`  `historial.txt`
- **Orden correcto:** `cat` → `nuevo.txt` → `>>` → `historial.txt`
- **Explicación:** >> agrega el contenido al final de historial.txt sin borrar lo que ya tenía; > lo habría sobrescrito por completo.

#### 3. [type-command] Escribe ls | sort y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** El pipe conecta la salida de ls con la entrada de sort, para ordenar alfabéticamente.
- **Comando esperado:** `ls | sort`
- **Salida simulada:** `documentos
fotos
proyectos`
- **Pista:** Es el comando que lista archivos, seguido del símbolo | y sort.
- **Tab candidates:** `ls`, `|`, `sort`
- **Mensaje de éxito:** El pipe conecta la salida de un comando con la entrada del siguiente.

#### 4. [choice] ¿Qué opción de find busca solo carpetas, dejando fuera los archivos?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en cómo find filtra por tipo de elemento.
  - ▫️ -name
  - ✅ -type d
  - ▫️ -type f
- **Explicación:** -type d limita los resultados de find a directorios (carpetas), sin mostrar archivos.

#### 5. [order] Quieres buscar, desde la carpeta actual, cualquier archivo que termine en .log. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Necesitas find, indicar dónde empezar a buscar, y el patrón con comodín.
- **Fichas:** `grep`  `find`  `.`  `-name`  `"*.log"`
- **Orden correcto:** `find` → `.` → `-name` → `"*.log"`
- **Explicación:** find . -name "*.log" busca desde la carpeta actual cualquier archivo terminado en .log.

#### 6. [choice] Acabas de crear un archivo hace unos segundos y necesitas encontrarlo ya. ¿Qué comando es más confiable en este caso?
- **Kicker:** Repaso mezclado
- **Contexto:** Uno de los dos comandos de búsqueda depende de un índice que se actualiza cada cierto tiempo.
  - ▫️ locate
  - ✅ find
  - ▫️ Cualquiera de los dos da el mismo resultado
- **Explicación:** find recorre las carpetas en tiempo real, así que siempre ve archivos recién creados. locate depende de un índice que puede no haberse actualizado todavía.

#### 7. [type-command] Escribe grep -i "error" registro.txt y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** -i le dice a grep que ignore mayúsculas y minúsculas al comparar el texto.
- **Comando esperado:** `grep -i "error" registro.txt`
- **Salida simulada:** `Error de conexión detectado`
- **Pista:** Es grep, luego -i, luego la palabra entre comillas y el nombre del archivo.
- **Tab candidates:** `grep`, `-i`, `error`, `registro.txt`
- **Mensaje de éxito:** Con -i, grep encontró la línea sin importar cómo estaba escrita la palabra.

#### 8. [choice] ¿Qué opción de grep hace que la búsqueda incluya también las subcarpetas?
- **Kicker:** Repaso mezclado
- **Contexto:** Por defecto, grep solo busca en el archivo o archivos que le indiques directamente.
  - ✅ -r
  - ▫️ -i
  - ▫️ -v
- **Explicación:** -r (recursive) hace que grep revise una carpeta completa, incluidas todas sus subcarpetas.

#### 9. [order] Quieres ver todas las líneas de tareas.txt que NO contienen la palabra "hecho". Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Existe una opción de grep que invierte el resultado de la búsqueda.
- **Fichas:** `grep`  `-r`  `-v`  `"hecho"`  `tareas.txt`
- **Orden correcto:** `grep` → `-v` → `"hecho"` → `tareas.txt`
- **Explicación:** -v invierte el filtro de grep, mostrando solo las líneas donde el texto NO aparece.

#### 10. [choice] ¿Qué combinación repite el último comando que ejecutaste, sin volver a escribirlo?
- **Kicker:** Repaso mezclado
- **Contexto:** Son dos signos de exclamación iguales, seguidos.
  - ✅ !!
  - ▫️ !1
  - ▫️ Ctrl+R
- **Explicación:** !! repite exactamente el último comando que ejecutaste en la terminal.

#### 11. [type-command] Escribe history | grep "cd" y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** El pipe envía tu historial completo a grep, que se queda solo con las líneas que contienen "cd".
- **Comando esperado:** `history | grep "cd"`
- **Salida simulada:** `3  cd documentos
7  cd proyectos`
- **Pista:** Es history, seguido del símbolo |, seguido de grep y la palabra entre comillas.
- **Tab candidates:** `history`, `|`, `grep`, `cd`
- **Mensaje de éxito:** Combinar history con grep es una forma rápida de encontrar comandos anteriores.

#### 12. [choice] Quieres encontrar rápido un comando que escribiste hace rato, sin subir con la flecha uno por uno. ¿Qué atajo usas?
- **Kicker:** Repaso mezclado
- **Contexto:** Este atajo abre una búsqueda en tiempo real dentro de tu historial.
  - ✅ Ctrl+R
  - ▫️ Ctrl+L
  - ▫️ Ctrl+U
- **Explicación:** Ctrl+R activa la búsqueda inversa en el historial de comandos.

#### 13. [order] Quieres contar cuántos comandos tiene tu historial en total, sin leerlos uno por uno. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Necesitas enviar tu historial, con un pipe, a un comando que cuente líneas.
- **Fichas:** `history`  `sort`  `|`  `wc -l`  `grep`
- **Orden correcto:** `history` → `|` → `wc -l`
- **Explicación:** history | wc -l cuenta cuántas líneas (comandos) tiene tu historial.

#### 14. [choice] Escribiste un comando largo y quieres borrarlo por completo con el cursor al final de la línea. ¿Qué usas?
- **Kicker:** Repaso mezclado
- **Contexto:** Necesitas borrar hacia atrás, desde el cursor hasta el inicio de la línea.
  - ▫️ Ctrl+K
  - ✅ Ctrl+U
  - ▫️ Ctrl+E
- **Explicación:** Ctrl+U borra todo el texto desde el cursor hasta el inicio de la línea.

#### 15. [type-command] Escribe find /home -type f -name "*.txt" y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** Combinas -type f (solo archivos) con -name (patrón de nombre) para buscar dentro de /home.
- **Comando esperado:** `find /home -type f -name "*.txt"`
- **Salida simulada:** `/home/user/notas.txt
/home/user/documentos/informe.txt`
- **Pista:** Es find, la ruta /home, luego -type f, y por último -name con el patrón entre comillas.
- **Tab candidates:** `find`, `/home`, `-type`, `f`, `-name`, `*.txt`
- **Mensaje de éxito:** Combinaste dos filtros de find en un mismo comando, algo muy común en el día a día.

#### 16. [choice] Un programa se quedó corriendo sin parar en tu terminal y no responde. ¿Qué combinación de teclas lo detiene?
- **Kicker:** Repaso mezclado
- **Contexto:** Es el botón de pánico universal de la terminal.
  - ✅ Ctrl+C
  - ▫️ Ctrl+L
  - ▫️ Ctrl+A
- **Explicación:** Ctrl+C envía una señal de interrupción y detiene el programa que se está ejecutando.

#### 17. [order] Quieres ordenar tu historial de comandos y guardar el resultado en un archivo llamado orden.txt, sin mostrarlo en pantalla. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Vas a combinar un pipe para ordenar y una redirección para guardar el resultado.
- **Fichas:** `history`  `|`  `sort`  `>`  `orden.txt`  `>>`
- **Orden correcto:** `history` → `|` → `sort` → `>` → `orden.txt`
- **Explicación:** history | sort > orden.txt ordena el historial y guarda el resultado en orden.txt, sin mostrarlo en pantalla.

#### 18. [choice] Tienes los archivos plan.txt, plan.csv y foto.png en tu carpeta. ¿Qué comando lista únicamente los que empiezan con "plan"?
- **Kicker:** Repaso mezclado
- **Contexto:** El comodín * puede colocarse después de una parte fija del nombre.
  - ✅ ls plan*
  - ▫️ ls *.plan
  - ▫️ ls plan
- **Explicación:** plan* coincide con cualquier nombre que empiece con "plan", sin importar la extensión que tenga después.

#### 19. [type-command] Escribe grep -rn "TODO" . y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** Combinas -r (subcarpetas) con -n (número de línea) para encontrar cada TODO en todo el proyecto.
- **Comando esperado:** `grep -rn "todo" .`
- **Salida simulada:** `./tareas.txt:1:TODO revisar el informe
./proyectos/plan.txt:3:TODO definir fecha`
- **Pista:** Es grep, luego -rn (las dos opciones juntas), luego la palabra entre comillas, y por último un punto.
- **Tab candidates:** `grep`, `-rn`, `todo`, `.`
- **Mensaje de éxito:** Combinaste dos opciones de grep en un mismo comando, algo muy común en el trabajo real.

#### 20. [choice] ¿Qué tecla completa automáticamente nombres de archivos o carpetas mientras escribes?
- **Kicker:** Repaso mezclado
- **Contexto:** Ahorra tiempo y evita errores de tipeo.
  - ✅ Tab
  - ▫️ Ctrl+E
  - ▫️ Ctrl+D
- **Explicación:** Tab autocompleta nombres de archivos, carpetas o comandos si hay una única coincidencia posible.

### Lección 6: Desafío final — Resuélvelo por tu cuenta (Desafío final)
> Una sola sesión de terminal, sin instrucciones sueltas: encadena los comandos que aprendiste para completar una tarea real de principio a fin.

4 pasos.

#### 1. [multi-step-terminal] Vas a ordenar una carpeta de reportes usando una sola sesión de terminal. Cada paso depende de lo que hagas en el anterior, así que presta atención a lo que ya escribiste.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** No hay pasos sueltos: es la misma terminal de principio a fin, igual que en la vida real.
  1. **Meta:** Primero, confirma en qué carpeta estás parado antes de mover nada.
     - Comando: `pwd`
     - Salida: `/home/user/reportes`
     - Pista: Es el comando que muestra la ruta completa de la carpeta actual, sin argumentos.
     - Tab: `pwd`
  2. **Meta:** Ahora lista el contenido de /home/user/reportes para ver con qué estás trabajando.
     - Comando: `ls`
     - Salida: `archivo  enero.txt  febrero.txt  marzo.txt  notas.tmp`
     - Pista: El mismo comando de siempre para ver el contenido de la carpeta actual.
     - Tab: `ls`
  3. **Meta:** Entra a la carpeta archivo que acabas de ver en el listado.
     - Comando: `cd archivo`
     - Salida: `Ahora estás en /home/user/reportes/archivo`
     - Pista: El comando para moverte de carpeta, seguido del nombre de la carpeta destino.
     - Tab: `cd`, `archivo`, `enero.txt`, `febrero.txt`, `marzo.txt`, `notas.tmp`
  4. **Meta:** Sin salir de archivo, confirma que efectivamente cambiaste de ubicación.
     - Comando: `pwd`
     - Salida: `/home/user/reportes/archivo`
     - Pista: El mismo comando que usaste en el primer paso para ver la ruta actual.
     - Tab: `pwd`
- **Mensaje final:** ¡Sesión completa! Encadenaste varios comandos reales sin que nadie te dijera cuáles, uno construyendo sobre el resultado del anterior.

#### 2. [multi-step-terminal] Un compañero te dejó una carpeta llena de archivos de log mezclados. Vas a encontrar los que importan y quedarte solo con esos, todo en la misma sesión.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Recuerda combinar lo que sabes de comodines, redirecciones y limpieza de archivos.
  1. **Meta:** Estás en /home/user/logs. Muestra solo los archivos que terminan en .log, ignorando los demás.
     - Comando: `ls *.log`
     - Salida: `acceso.log  error.log  sistema.log`
     - Pista: El comando para listar archivos, combinado con el comodín que representa "cualquier nombre".
     - Tab: `ls`
  2. **Meta:** De esos archivos, busca las líneas que contienen la palabra "fallo" dentro de error.log.
     - Comando: `grep fallo error.log`
     - Salida: `02:14:09 fallo de conexión con la base de datos
03:41:22 fallo al guardar el archivo`
     - Pista: El comando que busca texto dentro de un archivo, seguido de la palabra a buscar y el nombre del archivo.
     - Tab: `grep`, `acceso.log`, `error.log`, `sistema.log`
  3. **Meta:** Guarda esas líneas encontradas dentro de un nuevo archivo llamado fallos.txt, sin mostrarlas en pantalla.
     - Comando: `grep fallo error.log > fallos.txt`
     - Salida: `fallos.txt creado con las líneas encontradas.`
     - Pista: El mismo comando de búsqueda del paso anterior, combinado con el símbolo que redirige la salida hacia un archivo nuevo.
     - Tab: `grep`, `error.log`, `acceso.log`, `sistema.log`
  4. **Meta:** Confirma que fallos.txt se creó correctamente y contiene lo esperado.
     - Comando: `cat fallos.txt`
     - Salida: `02:14:09 fallo de conexión con la base de datos
03:41:22 fallo al guardar el archivo`
     - Pista: El comando que muestra el contenido completo de un archivo en pantalla.
     - Tab: `cat`, `fallos.txt`, `error.log`, `sistema.log`, `acceso.log`
  5. **Meta:** Ya no necesitas error.log ni sistema.log, solo tu resumen. Bórralos en un solo comando.
     - Comando: `rm error.log sistema.log`
     - Salida: `error.log y sistema.log eliminados.`
     - Pista: El comando para borrar archivos, puede recibir más de un nombre de archivo a la vez, separados por espacio.
     - Tab: `rm`, `error.log`, `sistema.log`, `fallos.txt`, `acceso.log`
- **Mensaje final:** ¡Bien hecho! Filtraste, guardaste y limpiaste usando una secuencia real de comandos encadenados.

#### 3. [multi-step-terminal] Necesitas ubicar un archivo perdido en tu sistema y moverlo a donde corresponde, todo dentro de la misma sesión de terminal.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Vas a necesitar find para localizar y luego actuar sobre lo que encuentres.
  1. **Meta:** Busca en todo el sistema, a partir de /home, un archivo llamado factura.pdf.
     - Comando: `find /home -name factura.pdf`
     - Salida: `/home/user/descargas/factura.pdf`
     - Pista: El comando que busca archivos por nombre en un árbol de carpetas, junto con la opción que filtra por nombre exacto.
     - Tab: `find`, `factura.pdf`
  2. **Meta:** Confirma qué otros archivos hay en esa misma carpeta de descargas antes de mover nada.
     - Comando: `ls /home/user/descargas`
     - Salida: `factura.pdf  instalador.exe  imagen.png`
     - Pista: El comando para listar contenido, seguido de la ruta completa de la carpeta que quieres revisar.
     - Tab: `ls`
  3. **Meta:** Mueve factura.pdf a la carpeta /home/user/documentos.
     - Comando: `mv /home/user/descargas/factura.pdf /home/user/documentos`
     - Salida: `factura.pdf movido a /home/user/documentos`
     - Pista: El comando que mueve archivos, con la ruta de origen y luego la carpeta de destino.
     - Tab: `mv`, `factura.pdf`, `instalador.exe`, `imagen.png`
- **Mensaje final:** ¡Perfecto! find te ayudó a localizar el archivo y luego lo organizaste sin perder el hilo de la sesión.

#### 4. [multi-step-terminal] Estuviste escribiendo comandos toda la tarde y quieres repasar y reutilizar tu propio historial dentro de la misma sesión, sin volver a escribir todo desde cero.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** El historial no es solo para mirar atrás: también sirve para actuar más rápido.
  1. **Meta:** Antes de nada, revisa el historial completo de comandos que ejecutaste en esta sesión.
     - Comando: `history`
     - Salida: `1  cd proyectos
2  ls
3  mkdir backups
4  cp informe.txt backups/`
     - Pista: Un solo comando, sin argumentos, que muestra todo lo que escribiste antes.
     - Tab: `history`
  2. **Meta:** Confirma en qué carpeta terminaste después de todo ese trabajo.
     - Comando: `pwd`
     - Salida: `/home/user/proyectos`
     - Pista: El comando que muestra la ruta completa de la carpeta en la que estás parado.
     - Tab: `pwd`
  3. **Meta:** Repite el último comando que ejecutaste sin volver a escribirlo completo, usando el atajo de historial más directo.
     - Comando: `!!`
     - Salida: `cp informe.txt backups/
informe.txt copiado nuevamente a backups/`
     - Pista: Existe un atajo de dos caracteres que repite el último comando ejecutado, sin necesidad de escribirlo de nuevo.
     - Tab: 
- **Mensaje final:** ¡Excelente! Usaste tu propio historial para moverte más rápido, tal como lo harías en una terminal real.

---

## Unidad 3: Archivos y permisos
_Unidad 3 · Nivel 3_

### Lección 1: Propietarios y grupos — usuario, grupo, otros
13 pasos.

#### 1. [concept] Todo archivo tiene un dueño
- **Kicker:** Teoría
- **Tú:** `ls -l notas.txt`
- **Terminal:** `-rw-r--r-- 1 user user 120 notas.txt`
- **Texto:** En Linux, cada archivo y cada carpeta pertenecen a alguien. Como es un sistema pensado para varias personas a la vez, necesita saber quién es el dueño de cada cosa, para decidir quién puede leerla, modificarla o ejecutarla. Esa información no es opcional: viaja pegada al archivo desde el momento en que se crea.

#### 2. [concept] Tres roles: usuario, grupo y otros
- **Kicker:** Teoría
- **Tú:** `usuario (tú)`
- **Terminal:** `grupo (tu equipo) / otros (el resto)`
- **Texto:** Linux organiza los permisos en tres roles distintos para cada archivo: el "usuario" (el dueño, normalmente quien lo creó), el "grupo" (un conjunto de usuarios que comparten cierto acceso, como un equipo de trabajo) y "otros" (cualquiera más en el sistema, fuera del dueño y su grupo). Cada uno de estos tres roles puede tener permisos distintos sobre el mismo archivo.

#### 3. [concept] ¿Por qué separar usuario, grupo y otros?
- **Kicker:** Teoría
- **Terminal:** `tú: lees y escribes`
- **Terminal:** `tu equipo: solo lee · el resto: nada`
- **Texto:** Esta separación existe porque no siempre quieres tratar a todos igual. Puede que tú necesites poder editar un archivo, tu equipo de trabajo solo necesite leerlo, y el resto de usuarios del sistema no deba verlo en absoluto. Sin esta división, tendrías que elegir entre "todos pueden todo" o "nadie puede nada" — Linux te da un punto intermedio mucho más útil.

#### 4. [type-command] Escribe ls -l notas.txt y presiona Enter
- **Kicker:** Practica
- **Contexto:** ls -l muestra el listado "largo": permisos, dueño, grupo, tamaño y fecha de cada archivo, en vez de solo el nombre.
- **Comando esperado:** `ls -l notas.txt`
- **Salida simulada:** `-rw-r--r-- 1 user user 120 notas.txt`
- **Pista:** Es el comando para listar archivos, con la opción -l (formato largo), seguido del nombre del archivo.
- **Tab candidates:** `ls`, `-l`, `notas.txt`
- **Mensaje de éxito:** Ahí está: user es el dueño y también el grupo de notas.txt, justo después de los permisos.

#### 5. [concept] Dueño y grupo, columna por columna
- **Kicker:** Leer la salida
- **Terminal:** `-rw-r--r-- 1 ana equipo 120 notas.txt`
- **Texto:** En la salida de ls -l, después de los permisos y un número, aparecen dos nombres seguidos: el primero es el usuario dueño del archivo (aquí, "ana"), y el segundo es el grupo al que pertenece (aquí, "equipo"). Estos dos nombres son justamente los que definen quién es "usuario" y quién es "grupo" para ese archivo en particular.

#### 6. [choice] Ejecutas ls -l y ves: -rw-r--r-- 1 ana equipo 340 informe.txt. ¿Quién es el dueño del archivo?
- **Kicker:** Elige la respuesta
- **Contexto:** El dueño y el grupo aparecen como dos nombres seguidos, justo después del número que sigue a los permisos.
  - ✅ ana
  - ▫️ equipo
  - ▫️ informe.txt
- **Explicación:** El primer nombre después de los permisos (ana) es siempre el usuario dueño del archivo. El segundo (equipo) es el grupo.

#### 7. [concept] ¿Y quiénes son "otros"?
- **Kicker:** Un paso más
- **Tú:** `ana (dueña) · equipo (grupo)`
- **Terminal:** `cualquier otra cuenta del sistema`
- **Texto:** "Otros" no aparece con un nombre en ls -l, porque no hace falta: es, por definición, todo el resto de cuentas del sistema que no son ni el dueño ni pertenecen al grupo del archivo. Es la categoría más amplia y, casi siempre, a la que menos permisos conviene darle.

#### 8. [concept] Un usuario puede estar en varios grupos
- **Kicker:** Teoría
- **Tú:** `groups`
- **Terminal:** `user equipo diseño sudo`
- **Texto:** Una cuenta de usuario no pertenece a un único grupo: puede formar parte de varios a la vez (por ejemplo, "equipo", "diseño" y "sudo" al mismo tiempo). El comando groups muestra a qué grupos pertenece el usuario actual. Cuando ese usuario crea un archivo, uno de esos grupos (normalmente el principal) queda asignado como grupo del archivo.

#### 9. [type-command] Escribe groups y presiona Enter
- **Kicker:** Practica
- **Contexto:** groups muestra todos los grupos a los que pertenece tu usuario, sin argumentos.
- **Comando esperado:** `groups`
- **Salida simulada:** `user equipo diseño`
- **Pista:** Es una sola palabra, sin nada más.
- **Tab candidates:** `groups`
- **Mensaje de éxito:** Así puedes ver de un vistazo todos los equipos a los que perteneces dentro del sistema.

#### 10. [choice] ¿Cuál de estas afirmaciones sobre usuario y grupo es correcta?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cómo se relacionan las cuentas de usuario con los grupos en Linux.
  - ▫️ Un usuario solo puede pertenecer a un grupo a la vez
  - ✅ Un usuario puede pertenecer a varios grupos al mismo tiempo
  - ▫️ Los grupos y los usuarios son exactamente lo mismo
- **Explicación:** Un usuario puede formar parte de varios grupos a la vez; el comando groups los lista todos.

#### 11. [order] Quieres ver el dueño y el grupo del archivo config.yml. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas el listado "largo" de ls, que incluye esa información, seguido del nombre del archivo.
- **Fichas:** `cat`  `ls`  `-l`  `config.yml`  `-a`
- **Orden correcto:** `ls` → `-l` → `config.yml`
- **Explicación:** ls -l config.yml muestra el listado largo de ese archivo, incluyendo su dueño y su grupo. -a solo agrega archivos ocultos, no detalles como el dueño.

#### 12. [concept] Usuario, grupo y otros: lo esencial
- **Kicker:** Resumen
- **Terminal:** `usuario: el dueño del archivo`
- **Terminal:** `grupo: un equipo · otros: todo el resto`
- **Texto:** Repasemos: cada archivo tiene un usuario dueño y un grupo asociado, visibles con ls -l. Los permisos se definen por separado para tres roles: el usuario, el grupo, y "otros" (el resto del sistema). Un usuario puede pertenecer a varios grupos, y groups te muestra a cuáles perteneces tú. Esta base es la que hace posible todo lo que viene después: permisos rwx, chmod, y cambiar dueños con chown.

#### 13. [choice] Un archivo del sistema pertenece al usuario root y al grupo admins. Tu cuenta no es root ni pertenece a admins. ¿Como qué rol te trata Linux frente a ese archivo?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en los tres roles posibles y cuál te queda si no eres el dueño ni perteneces al grupo.
  - ▫️ Usuario
  - ▫️ Grupo
  - ✅ Otros
- **Explicación:** Si no eres el dueño ni perteneces al grupo del archivo, Linux te trata como "otros" — la categoría más amplia y, normalmente, la más restringida.

### Lección 2: Permisos rwx — lectura, escritura, ejecución
21 pasos.

#### 1. [concept] Tres permisos: leer, escribir, ejecutar
- **Kicker:** Teoría
- **Terminal:** `r (leer) · w (escribir) · x (ejecutar)`
- **Terminal:** `rwxr-xr--`
- **Texto:** Ya sabes que cada archivo tiene un usuario, un grupo y "otros". Ahora toca ver qué puede hacer cada uno: existen solo tres permisos posibles. r (read) permite leer el contenido, w (write) permite modificarlo, y x (execute) permite ejecutarlo como programa o script. Estos tres permisos se asignan por separado a cada uno de los tres roles que ya conoces.

#### 2. [concept] El primer carácter: qué tipo de archivo es
- **Kicker:** Teoría
- **Terminal:** `- archivo · d carpeta · l enlace`
- **Texto:** Antes de leer los permisos en sí, fíjate en el primerísimo carácter de la cadena: no es un permiso, sino el tipo de elemento. Un guion (-) significa un archivo normal, una "d" significa una carpeta (directory), y una "l" significa un enlace simbólico (link), como un acceso directo que apunta a otro archivo. El resto de la cadena, los 9 caracteres siguientes, son los permisos propiamente dichos.

#### 3. [concept] Leer la cadena de permisos en ls -l
- **Kicker:** Teoría
- **Tú:** `ls -l script.sh`
- **Terminal:** `-rwxr-xr-- 1 ana equipo script.sh`
- **Texto:** Después del carácter de tipo, los 9 caracteres restantes se agrupan de tres en tres: los primeros tres son los permisos del usuario dueño, los siguientes tres los del grupo, y los últimos tres los de "otros". Siempre en el mismo orden dentro de cada grupo: r, w, x.

#### 4. [type-command] Escribe ls -l script.sh y presiona Enter
- **Kicker:** Practica
- **Contexto:** ls -l te muestra la cadena completa de permisos de ese archivo.
- **Comando esperado:** `ls -l script.sh`
- **Salida simulada:** `-rwxr-xr-- 1 ana equipo 512 script.sh`
- **Pista:** Es el mismo comando de la lección anterior, con el nombre de este archivo.
- **Tab candidates:** `ls`, `-l`, `script.sh`
- **Mensaje de éxito:** rwx para ana (usuario), r-x para equipo (grupo), r-- para el resto (otros).

#### 5. [concept] El guion "-" significa "sin ese permiso"
- **Kicker:** Un paso más
- **Terminal:** `r-x significa: lee y ejecuta, no escribe`
- **Texto:** Dentro de cada grupo de tres, cada posición es fija: la primera es r o -, la segunda w o -, la tercera x o -. Un guion en esa posición no significa "nada", significa específicamente "este rol no tiene ese permiso". Por eso r-x se lee siempre como "puede leer, no puede escribir, puede ejecutar" — nunca cambia el orden.

#### 6. [choice] Ves el permiso rw- para el grupo de un archivo. ¿Qué puede hacer ese grupo?
- **Kicker:** Elige la respuesta
- **Contexto:** Recuerda que el orden dentro de cada bloque de tres siempre es r, w, x.
  - ✅ Leer y escribir, pero no ejecutar
  - ▫️ Solo ejecutar
  - ▫️ Leer, escribir y ejecutar
- **Explicación:** rw- tiene r y w activos, y un guion en la posición de x. El grupo puede leer y escribir el archivo, pero no ejecutarlo.

#### 7. [concept] Dos combinaciones muy comunes
- **Kicker:** En la práctica
- **Terminal:** `rwxr-xr-x → un programa o script`
- **Terminal:** `rw-r--r-- → un documento normal`
- **Texto:** No hace falta memorizar combinaciones, pero dos aparecen todo el tiempo. rwxr-xr-x es típica de programas y scripts: el dueño puede leer, escribir y ejecutar, mientras que el grupo y "otros" solo pueden leer y ejecutar (no modificar). rw-r--r-- es típica de documentos normales: todos pueden leer, pero solo el dueño puede escribir, y nadie tiene x porque no tiene sentido "ejecutar" un documento de texto.

#### 8. [choice] Un script instalado en el sistema tiene permisos rwxr-xr-x. ¿Quiénes pueden ejecutarlo?
- **Kicker:** Elige la respuesta
- **Contexto:** Fíjate en la tercera posición de cada uno de los tres bloques.
  - ▫️ Solo el dueño
  - ▫️ El dueño y el grupo, pero no otros
  - ✅ El dueño, el grupo y otros: los tres tienen x
- **Explicación:** Los tres bloques (rwx, r-x, r-x) tienen la x activa en la última posición. Los tres roles pueden ejecutar el script, aunque solo el dueño puede modificarlo.

#### 9. [choice] notas.txt tiene permisos rw-r--r-- y notas.sh tiene rwxr-xr-x, pero ambos contienen exactamente el mismo texto. ¿Cuál es la diferencia real entre los dos?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué controla exactamente el permiso x, y qué no cambia por sí solo el contenido de un archivo.
  - ✅ notas.sh puede ejecutarse directamente como programa; notas.txt no
  - ▫️ No hay ninguna diferencia real entre ambos
  - ▫️ notas.txt ocupa menos espacio en disco que notas.sh
- **Explicación:** El contenido puede ser idéntico: lo que cambia es únicamente el permiso x. Con él activo, el sistema te deja ejecutar el archivo como un programa; sin él, solo puedes leerlo o editarlo como texto.

#### 10. [concept] En una carpeta, rwx significa otra cosa
- **Kicker:** Un paso más
- **Terminal:** `r: listar · w: crear o borrar dentro · x: entrar`
- **Texto:** Sobre una carpeta, los tres permisos cambian de sentido. r te deja listar los nombres que hay dentro (ls). w te deja crear, renombrar o borrar cosas dentro de ella. x te deja "entrar" a la carpeta con cd y acceder a lo que hay dentro, aunque ya sepas el nombre exacto. Sin x, ni siquiera puedes entrar, aunque tengas r.

#### 11. [choice] Una carpeta tiene permisos r-- para "otros" (sin x). ¿Qué pasa si alguien de "otros" intenta hacer cd a esa carpeta?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué permiso controla específicamente la posibilidad de entrar a una carpeta.
  - ▫️ Puede entrar sin problema, porque tiene r
  - ✅ No puede entrar: le falta x
  - ▫️ Puede entrar, pero no ver nada dentro
- **Explicación:** x es el permiso que controla si puedes "entrar" a una carpeta. Sin x, cd falla aunque tengas r — de hecho, con solo r tampoco podrías acceder al contenido de los archivos de adentro.

#### 12. [concept] r sin x en una carpeta: puedes ver nombres, no entrar
- **Kicker:** Un matiz importante
- **Terminal:** `r-- → ls funciona, cd no`
- **Texto:** r y x controlan cosas distintas en una carpeta, y puedes tener una sin la otra. Con solo r (sin x), ls te muestra los nombres de lo que hay dentro, pero no puedes entrar con cd ni abrir esos archivos por su ruta. Es como poder leer los títulos en el lomo de unos libros en una estantería cerrada con llave: ves qué hay, pero no puedes sacarlos.

#### 13. [choice] El grupo tiene permisos r-x (sin w) sobre una carpeta. ¿Puede alguien del grupo crear un archivo nuevo dentro de ella?
- **Kicker:** Elige la respuesta
- **Contexto:** Recuerda qué permiso controla específicamente la creación y el borrado de archivos dentro de una carpeta.
  - ▫️ Sí, porque tiene r
  - ✅ No: le falta w
  - ▫️ Sí, porque tiene x
- **Explicación:** w es el permiso que permite crear, renombrar o borrar archivos dentro de una carpeta. Con r-x el grupo puede listar el contenido y entrar, pero no modificar qué hay dentro.

#### 14. [order] Quieres ver los permisos de la propia carpeta proyectos (no de lo que hay dentro). Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** ls -l muestra el contenido de una carpeta; hace falta una opción distinta para ver los permisos de la carpeta como tal.
- **Fichas:** `-r`  `ls`  `-ld`  `proyectos`  `-a`
- **Orden correcto:** `ls` → `-ld` → `proyectos`
- **Explicación:** ls -ld proyectos muestra la línea de permisos de la carpeta "proyectos" en sí, en vez de listar los archivos que contiene. La "d" le indica a ls que trate el argumento como el objetivo final, no como una carpeta para explorar.

#### 15. [type-command] Escribe ls -ld proyectos y presiona Enter
- **Kicker:** Practica
- **Contexto:** La opción -d evita que ls entre a listar el contenido, y en cambio muestra los permisos de la carpeta misma.
- **Comando esperado:** `ls -ld proyectos`
- **Salida simulada:** `drwxr-x--- 1 ana equipo 4096 proyectos`
- **Pista:** Es ls, con -ld pegado, y el nombre de la carpeta.
- **Tab candidates:** `ls`, `-ld`, `proyectos`
- **Mensaje de éxito:** La "d" al inicio confirma que es una carpeta. rwx para ana, r-x para el grupo, --- para el resto: nadie más puede ni entrar ni ver qué hay dentro.

#### 16. [choice] Ves drwxr-x--- para la carpeta documentos. ¿Qué puede hacer "otros" con ella?
- **Kicker:** Elige la respuesta
- **Contexto:** Los últimos tres caracteres de la cadena son siempre los de "otros".
  - ✅ Nada: no tiene ningún permiso sobre la carpeta
  - ▫️ Solo leer su contenido
  - ▫️ Entrar y modificar archivos dentro
- **Explicación:** Los últimos tres caracteres son ---, sin r, w ni x. "Otros" no puede listar, modificar ni entrar a esa carpeta.

#### 17. [autocomplete-command] Tu carpeta tiene los archivos despliegue.sh, descarga.log y notas.txt. Escribe ls -l despliegue.sh
- **Kicker:** Practica
- **Contexto:** "ls -l" muestra los permisos y detalles de un archivo o carpeta.
- **Prefijo sugerido:** `desp` (plantilla: `ls -l {prefix}`)
- **Candidatos Tab:** `despliegue.sh`, `descarga.log`, `notas.txt`
- **Comando esperado:** `ls -l despliegue.sh`
- **Salida simulada:** `-rwxr-xr-- 1 ana equipo 890 despliegue.sh`
- **Pista:** Termina de escribir el nombre completo del archivo.
- **Mensaje de éxito:** Confirmaste que despliegue.sh sí tiene permiso de ejecución (x) para ana.

#### 18. [choice] Ejecutas ls -l y ves lrwxrwxrwx en vez de un guion o una "d" al inicio. ¿Qué tipo de elemento es?
- **Kicker:** Elige la respuesta
- **Contexto:** El primer carácter indica el tipo: guion para archivo, "d" para carpeta, y una tercera opción que ya viste.
  - ▫️ Un archivo normal muy permisivo
  - ✅ Un enlace simbólico (link) a otro archivo
  - ▫️ Una carpeta oculta
- **Explicación:** La "l" al inicio identifica un enlace simbólico: un acceso directo que apunta a otro archivo o carpeta, distinto de un archivo o una carpeta normal.

#### 19. [concept] rwx, en pocas palabras
- **Kicker:** Resumen
- **Terminal:** `archivo: r lee · w escribe · x ejecuta`
- **Terminal:** `carpeta: r lista · w crea/borra · x entra`
- **Texto:** Repasemos: el primer carácter dice si es archivo (-), carpeta (d) o enlace (l). Los 9 siguientes son tres bloques de rwx para usuario, grupo y otros. En archivos, r/w/x significan leer, escribir y ejecutar — rwxr-xr-x es típico de programas, rw-r--r-- de documentos. En carpetas cambian de sentido: r lista, w crea o borra, y x te deja entrar. Un guion siempre significa que ese permiso concreto no está activo, sin importar los demás.

#### 20. [multi-step-terminal] Vas a revisar los permisos tanto de una carpeta como de un archivo dentro de ella, en una sola sesión de terminal.
- **Kicker:** Ponlo en práctica
- **Contexto:** Es la misma terminal de principio a fin: lo que escribas en un paso afecta lo que ves en el siguiente.
  1. **Meta:** Primero, confirma en qué carpeta estás parado.
     - Comando: `pwd`
     - Salida: `/home/ana/proyecto`
     - Pista: El comando que imprime la ruta completa de tu ubicación actual, sin argumentos.
     - Tab: `pwd`
  2. **Meta:** Tu carpeta actual contiene una subcarpeta llamada scripts. Revisa los permisos de esa carpeta en sí, no de lo que hay dentro.
     - Comando: `ls -ld scripts`
     - Salida: `drwxr-xr-x 1 ana equipo 4096 scripts`
     - Pista: Necesitas la opción que muestra los permisos de la carpeta misma, seguida de su nombre.
     - Tab: `ls`, `scripts`
  3. **Meta:** Ahora entra a la carpeta scripts.
     - Comando: `cd scripts`
     - Salida: `Ahora estás en /home/ana/proyecto/scripts`
     - Pista: El comando para cambiar de carpeta, seguido del nombre de la carpeta destino.
     - Tab: `cd`, `scripts`
  4. **Meta:** Dentro de scripts hay un archivo llamado despliegue.sh. Revisa sus permisos.
     - Comando: `ls -l despliegue.sh`
     - Salida: `-rwxr-xr-- 1 ana equipo 890 despliegue.sh`
     - Pista: El mismo comando que usaste antes para ver los permisos de un archivo, con este nombre.
     - Tab: `ls`, `despliegue.sh`
- **Mensaje final:** ¡Sesión completa! Revisaste los permisos de una carpeta y de un archivo dentro de ella, usando los comandos justos para cada caso.

#### 21. [choice] Ejecutas ls -l y ves -rw-r--r-- para un archivo. ¿Puede el dueño ejecutarlo directamente como programa?
- **Kicker:** Elige la respuesta
- **Contexto:** Revisa el primer bloque de tres caracteres, que corresponde al usuario dueño.
  - ▫️ Sí, porque es el dueño
  - ✅ No: le falta el permiso x
  - ▫️ Sí, pero solo si también tiene w
- **Explicación:** El bloque del usuario es rw-, sin x. Ni siquiera el dueño puede ejecutarlo como programa hasta que se le añada el permiso de ejecución.

### Lección 3: chmod — notación numérica y simbólica
21 pasos.

#### 1. [concept] chmod: el comando que cambia permisos
- **Kicker:** Teoría
- **Terminal:** `chmod = change mode`
- **Terminal:** `cambia r, w, x de un archivo o carpeta`
- **Texto:** Ya sabes leer los permisos con ls -l. chmod (de "change mode") es el comando que te deja cambiarlos: darle o quitarle r, w o x a usuario, grupo u otros. Existen dos formas de decirle a chmod qué cambiar: la notación simbólica (con letras como u+x) y la notación numérica (con números como 755). Vamos a ver ambas, empezando por la simbólica.

#### 2. [concept] Sintaxis básica: chmod [a quién][+/-/=][qué] archivo
- **Kicker:** Teoría
- **Tú:** `chmod u+x script.sh`
- **Texto:** La notación simbólica se lee de un tirón: primero a quién afecta (u = usuario, g = grupo, o = otros, a = todos), después qué operación hace (+ agrega, - quita, = deja exactamente así), y por último qué permiso (r, w o x). chmod u+x script.sh significa: "al usuario, agrégale el permiso de ejecución". El resto de permisos que ya tenía el archivo no se toca.

#### 3. [choice] ¿Qué hace exactamente chmod g+w notas.txt?
- **Kicker:** Elige la respuesta
- **Contexto:** Recuerda el orden: a quién, qué operación, qué permiso.
  - ▫️ Le quita el permiso de escritura al grupo
  - ✅ Le agrega el permiso de escritura al grupo
  - ▫️ Le agrega escritura a todos: usuario, grupo y otros
- **Explicación:** g+w se lee "al grupo, agrégale escritura". Solo afecta el permiso w del grupo; los demás permisos (r, x, y los de usuario y otros) quedan igual.

#### 4. [autocomplete-command] despliegue.sh no tiene permiso de ejecución para el dueño. Tu carpeta también tiene despedida.txt y descarga.log. Escribe chmod u+x despliegue.sh
- **Kicker:** Practica
- **Contexto:** "chmod u+x" le agrega el permiso de ejecución al dueño del archivo.
- **Prefijo sugerido:** `desp` (plantilla: `chmod u+x {prefix}`)
- **Candidatos Tab:** `despliegue.sh`, `despedida.txt`, `descarga.log`
- **Comando esperado:** `chmod u+x despliegue.sh`
- **Salida simulada:** `permisos actualizados: -rw-r--r-- → -rwxr--r--`
- **Pista:** Termina de escribir el nombre completo del archivo.
- **Mensaje de éxito:** u+x agregó la x solo en el bloque del usuario. Grupo y otros no cambiaron.

#### 5. [concept] Quitar con -, y fijar exactamente con =
- **Kicker:** Un paso más
- **Terminal:** `chmod o-w archivo  → le quita w a otros`
- **Terminal:** `chmod g=rx archivo → el grupo queda con EXACTAMENTE r y x`
- **Texto:** - funciona igual que + pero al revés: quita el permiso indicado sin tocar los demás. = es distinto: no suma ni resta sobre lo que ya había, sino que fija el permiso final tal cual lo escribas. chmod g=rx significa "el grupo queda con r y x, y nada más" — si antes tenía w, se lo quita; si no tenía r o x, se los pone.

#### 6. [choice] Un archivo tiene rw-rw-rw-. Ejecutas chmod o=r archivo. ¿Cómo queda el bloque de "otros"?
- **Kicker:** Elige la respuesta
- **Contexto:** o=r fija el resultado final para otros, sin importar lo que tenía antes.
  - ▫️ rw- (igual que antes)
  - ✅ r-- (solo lectura)
  - ▫️ --- (sin ningún permiso)
- **Explicación:** o=r fija el permiso de "otros" en exactamente r--. Tenía w antes, pero = no suma sobre lo anterior: lo reemplaza por lo que escribas.

#### 7. [order] Quieres quitarle el permiso de escritura a "otros" sobre configuracion.env. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es la operación de quitar (-), aplicada solo a otros (o), sobre el permiso w.
- **Fichas:** `chmod`  `o-w`  `configuracion.env`  `u-w`  `g+w`
- **Orden correcto:** `chmod` → `o-w` → `configuracion.env`
- **Explicación:** chmod o-w configuracion.env le quita w únicamente al bloque de "otros". El resto de permisos, incluidos los de usuario y grupo, quedan intactos.

#### 8. [concept] La notación numérica: cada permiso vale un número
- **Kicker:** Teoría
- **Terminal:** `r = 4 · w = 2 · x = 1`
- **Texto:** La notación simbólica es precisa pero verbosa. La numérica (u octal) es más rápida: a cada permiso se le asigna un valor fijo — r vale 4, w vale 2, x vale 1 — y para un rol se suman los permisos activos. Un rol con r, w y x da 4+2+1 = 7. Un rol con solo r y x da 4+1 = 5. Un rol sin ningún permiso da 0.

#### 9. [choice] ¿Qué número representa un rol con permisos r y w, pero sin x?
- **Kicker:** Elige la respuesta
- **Contexto:** r vale 4, w vale 2, x vale 1. Suma solo los que están activos.
  - ▫️ 4
  - ▫️ 5
  - ✅ 6
- **Explicación:** r (4) + w (2) = 6. La x no está activa, así que no se suma su 1. rw- equivale siempre al número 6.

#### 10. [concept] Tres dígitos: usuario, grupo, otros
- **Kicker:** Un paso más
- **Tú:** `chmod 754 archivo`
- **Terminal:** `rwx (7) r-x (5) r-- (4)`
- **Texto:** chmod con números siempre usa tres dígitos seguidos: el primero para el usuario, el segundo para el grupo, el tercero para otros. chmod 754 archivo deja al usuario con rwx (7), al grupo con r-x (5) y a otros con r-- (4). A diferencia de + o -, un chmod numérico siempre fija los tres bloques completos de una vez, como si fuera un = para los tres roles a la vez.

#### 11. [choice] chmod 640 archivo. ¿Qué permisos tiene "otros"?
- **Kicker:** Elige la respuesta
- **Contexto:** El tercer dígito es siempre el de "otros". 0 significa ningún permiso activo.
  - ▫️ r-- (solo lectura)
  - ✅ --- (ningún permiso)
  - ▫️ rw- (lectura y escritura)
- **Explicación:** El tercer dígito es 0, y 0 = sin ningún permiso activo (ni r, ni w, ni x). "Otros" queda con ---.

#### 12. [autocomplete-command] Deja despliegue.sh con rwx para el usuario, r-x para el grupo y sin ningún permiso para otros. Tu carpeta también tiene desplazar.sh. Escribe chmod 750 despliegue.sh
- **Kicker:** Practica
- **Contexto:** 750 equivale a rwx para el usuario, r-x para el grupo y --- para otros.
- **Prefijo sugerido:** `desp` (plantilla: `chmod 750 {prefix}`)
- **Candidatos Tab:** `despliegue.sh`, `desplazar.sh`
- **Comando esperado:** `chmod 750 despliegue.sh`
- **Salida simulada:** `permisos actualizados: rwxr-x---`
- **Pista:** Termina de escribir el nombre completo del archivo.
- **Mensaje de éxito:** 7 (rwx) para el usuario, 5 (r-x) para el grupo, 0 (---) para otros.

#### 13. [concept] Combinaciones numéricas que verás todo el tiempo
- **Kicker:** En la práctica
- **Terminal:** `755 → programas y carpetas de trabajo`
- **Terminal:** `644 → documentos normales`
- **Terminal:** `700 → privado, solo el dueño`
- **Texto:** Tres combinaciones aparecen constantemente. 755 (rwxr-xr-x) es típica de scripts y carpetas: el dueño controla todo, el resto puede usar pero no modificar. 644 (rw-r--r--) es la de documentos normales: todos leen, solo el dueño escribe. 700 (rwx------) es completamente privada: nadie más que el dueño puede hacer absolutamente nada con el archivo.

#### 14. [choice] Tienes un archivo con datos personales y quieres que solo tú (el dueño) puedas leerlo, escribirlo y ejecutarlo, sin que nadie más tenga ningún acceso. ¿Qué número usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué dígito representa "todo para el dueño" y cuál representa "nada para el resto".
  - ▫️ 777
  - ✅ 700
  - ▫️ 744
- **Explicación:** 700 da rwx (7) al dueño y --- (0) tanto al grupo como a otros. Nadie más que tú puede leer, escribir ni ejecutar ese archivo.

#### 15. [build-permission] Configura los permisos para que quede como 754: rwx para el usuario, r-x para el grupo, r-- para otros
- **Kicker:** Constrúyelo
- **Contexto:** Activa o desactiva cada switch de r, w y x en la fila de cada rol. El número octal de cada fila se calcula solo.
- **Octal correcto:** `754`
- **Explicación:** 754 = rwx (7) para el usuario, r-x (5) para el grupo, r-- (4) para otros. Activar y desactivar switches es otra forma de llegar al mismo resultado que escribir el número directamente.

#### 16. [concept] -R: aplicar el cambio a toda una carpeta de una vez
- **Kicker:** Un paso más
- **Tú:** `chmod -R 644 proyectos/`
- **Texto:** Por defecto, chmod solo cambia el archivo o carpeta que le indiques, sin tocar lo que hay dentro. Con la opción -R (recursivo), el cambio se aplica a la carpeta Y a todo su contenido: subcarpetas y archivos, sin importar cuántos niveles de profundidad tengan. Es potente, pero también peligrosa: aplicarla sin pensar puede dejar carpetas sin el permiso x que necesitan para poder entrar en ellas.

#### 17. [choice] Ejecutas chmod -R 644 proyectos/, y proyectos/ contiene subcarpetas. ¿Qué problema puede causar esto?
- **Kicker:** Elige la respuesta
- **Contexto:** 644 no incluye el permiso x. Piensa en qué permiso necesita una carpeta para poder "entrarse" con cd.
  - ▫️ Ninguno, 644 es seguro para carpetas
  - ✅ Las subcarpetas quedan sin x, y nadie podrá entrar a ellas con cd
  - ▫️ Los archivos de adentro se vuelven ejecutables
- **Explicación:** 644 no tiene x en ningún bloque. Al aplicarlo recursivamente, las subcarpetas pierden el permiso de "entrar" (x), y ni siquiera el dueño podrá hacer cd hacia ellas hasta corregirlo.

#### 18. [autocomplete-command] Quieres que todo dentro de la carpeta scripts tenga permiso de ejecución para el grupo, de una sola vez. También existe una carpeta script-viejo. Escribe chmod -R g+x scripts
- **Kicker:** Practica
- **Contexto:** -R aplica el cambio a la carpeta y a todo lo que contiene, no solo a la carpeta en sí.
- **Prefijo sugerido:** `scri` (plantilla: `chmod -R g+x {prefix}`)
- **Candidatos Tab:** `scripts`, `script-viejo`
- **Comando esperado:** `chmod -R g+x scripts`
- **Salida simulada:** `permisos actualizados recursivamente en scripts/ y todo su contenido`
- **Pista:** Termina de escribir el nombre completo de la carpeta.
- **Mensaje de éxito:** -R hizo que g+x se aplicara a la carpeta scripts Y a todo lo que contiene, no solo a la carpeta en sí.

#### 19. [concept] Simbólica vs. numérica: dos caminos al mismo lugar
- **Kicker:** Resumen
- **Terminal:** `u+x, g-w, o=r → cambios puntuales`
- **Terminal:** `755, 644, 700 → fijar los tres bloques de una vez`
- **Texto:** La notación simbólica (u+x, g-w, o=r) es ideal cuando quieres tocar un solo permiso sin afectar el resto. La numérica (755, 644, 700) es más rápida cuando quieres fijar los tres bloques completos de una vez, como cuando configuras un archivo recién creado. r=4, w=2, x=1, y se suman por bloque. -R aplica cualquiera de las dos formas a una carpeta completa, con cuidado de no quitar la x que las subcarpetas necesitan.

#### 20. [predict-output] Un archivo tiene permisos rw-r--r--. Se ejecuta chmod u+x,o-r archivo. Construye la cadena resultante
- **Kicker:** Predice el resultado
- **Contexto:** Dos cambios en un solo comando, separados por coma: al usuario se le agrega x; a otros se le quita r. El grupo no se toca.
- **Comando mostrado:** `chmod u+x,o-r archivo`
- **Antes:** `rw-r--r--`  →  **Después correcto:** `rwxr-----`
- **Explicación:** u+x agrega x al usuario: rw- pasa a rwx. o-r quita r a otros: r-- pasa a ---. El grupo no aparece en el comando, así que r-- queda exactamente igual.

#### 21. [predict-output] Una carpeta tiene permisos rwxrwxrwx (777). Se ejecuta chmod 750 carpeta/. Construye la cadena resultante
- **Kicker:** Predice el resultado
- **Contexto:** chmod numérico fija los tres bloques completos, sin importar lo que tenían antes.
- **Comando mostrado:** `chmod 750 carpeta/`
- **Antes:** `rwxrwxrwx`  →  **Después correcto:** `rwxr-x---`
- **Explicación:** 750 fija: usuario en 7 (rwx), grupo en 5 (r-x), otros en 0 (---). No importa que antes todos tuvieran acceso total: el numérico reemplaza los tres bloques de una sola vez.

### Lección 4: chown y chgrp — cambiar propietario y grupo
20 pasos.

#### 1. [concept] chown: el comando que cambia el dueño
- **Kicker:** Teoría
- **Terminal:** `chown = change owner`
- **Terminal:** `le asigna un nuevo usuario dueño a un archivo o carpeta`
- **Texto:** Ya sabes que todo archivo tiene un dueño y un grupo, visibles con ls -l. chown (de "change owner") es el comando que te deja cambiar quién es el dueño: se lo puedes transferir a otro usuario del sistema. A diferencia de chmod, que cambia qué se puede hacer con el archivo, chown cambia de quién es.

#### 2. [concept] Sintaxis básica: chown nuevo_dueño archivo
- **Kicker:** Teoría
- **Tú:** `chown carlos informe.txt`
- **Texto:** El orden es simple: primero el nombre del nuevo dueño, después el archivo o carpeta. chown carlos informe.txt significa "informe.txt ahora le pertenece a carlos". El dueño anterior deja de serlo; los permisos rwx del archivo no cambian, solo cambia a quién pertenecen.

#### 3. [choice] ¿Qué hace exactamente chown carlos informe.txt?
- **Kicker:** Elige la respuesta
- **Contexto:** chown cambia quién es el dueño, no qué permisos tiene el archivo.
  - ▫️ Le da permiso de lectura a carlos
  - ✅ Convierte a carlos en el nuevo dueño del archivo
  - ▫️ Crea una copia del archivo para carlos
- **Explicación:** chown transfiere la propiedad del archivo a otro usuario. Los permisos rwx que ya tenía el archivo no se tocan.

#### 4. [autocomplete-command] informe.txt le pertenecía a ana, pero ahora carlos se hará cargo. Tu carpeta también tiene informe-viejo.txt e instrucciones.txt. Escribe sudo chown carlos informe.txt
- **Kicker:** Practica
- **Contexto:** chown le asigna un nuevo dueño a un archivo o carpeta.
- **Prefijo sugerido:** `info` (plantilla: `sudo chown carlos {prefix}`)
- **Candidatos Tab:** `informe.txt`, `informe-viejo.txt`, `instrucciones.txt`
- **Comando esperado:** `sudo chown carlos informe.txt`
- **Salida simulada:** `propietario actualizado: ana → carlos`
- **Pista:** Termina de escribir el nombre completo del archivo.
- **Mensaje de éxito:** Ahora carlos es el dueño de informe.txt. ana ya no aparece como propietaria.

#### 5. [concept] chown dueño:grupo archivo — cambia ambos de una vez
- **Kicker:** Un paso más
- **Tú:** `chown carlos:diseño informe.txt`
- **Texto:** chown también acepta dueño y grupo juntos, separados por dos puntos. chown carlos:diseño informe.txt hace dos cosas en un solo comando: pone a carlos como dueño Y pone a diseño como grupo. Es la forma más rápida cuando necesitas cambiar ambos datos a la vez.

#### 6. [choice] Ejecutas chown carlos:diseño informe.txt. ¿Qué cambia exactamente?
- **Kicker:** Elige la respuesta
- **Contexto:** Antes de los dos puntos va el dueño; después, el grupo.
  - ▫️ Solo cambia el dueño a carlos
  - ✅ Cambia el dueño a carlos y el grupo a diseño
  - ▫️ Cambia el grupo a carlos y el dueño a diseño
- **Explicación:** El nombre antes de los dos puntos es siempre el nuevo dueño; el que sigue después es el nuevo grupo. carlos:diseño pone a carlos como dueño y a diseño como grupo.

#### 7. [order] Quieres que backup.tar le pertenezca al usuario carlos y al grupo copias, en un solo comando. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas chown con dueño y grupo juntos, separados por dos puntos.
- **Fichas:** `chown`  `carlos:copias`  `backup.tar`  `chgrp`  `carlos`
- **Orden correcto:** `chown` → `carlos:copias` → `backup.tar`
- **Explicación:** chown carlos:copias backup.tar cambia el dueño a carlos y el grupo a copias en un solo paso. chgrp por sí solo no puede cambiar el dueño.

#### 8. [concept] chgrp: cambiar solo el grupo
- **Kicker:** Teoría
- **Tú:** `chgrp diseño logo.png`
- **Texto:** Cuando solo necesitas cambiar el grupo, sin tocar al dueño, existe un comando dedicado: chgrp (de "change group"). chgrp diseño logo.png deja a logo.png con el mismo dueño de siempre, pero ahora asociado al grupo diseño en vez del que tenía antes.

#### 9. [concept] chown :grupo archivo — la otra forma de cambiar solo el grupo
- **Kicker:** Un paso más
- **Tú:** `chown :diseño logo.png`
- **Texto:** chown también puede cambiar solo el grupo, si dejas el nombre del dueño vacío antes de los dos puntos. chown :diseño logo.png hace exactamente lo mismo que chgrp diseño logo.png: cambia el grupo y deja al dueño intacto. Son dos caminos al mismo resultado.

#### 10. [choice] ¿Cuál de estos comandos cambia SOLO el grupo de logo.png a diseño, sin tocar al dueño?
- **Kicker:** Elige la respuesta
- **Contexto:** Ten cuidado: uno de ellos en realidad intenta cambiar el dueño.
  - ▫️ chown diseño logo.png
  - ✅ chgrp diseño logo.png
  - ▫️ chmod diseño logo.png
- **Explicación:** chgrp diseño logo.png cambia únicamente el grupo. chown diseño logo.png es un error común: sin los dos puntos, chown interpreta "diseño" como el nuevo dueño, no como grupo. chmod ni siquiera trabaja con dueños o grupos.

#### 11. [autocomplete-command] La carpeta reportes debe pertenecer al grupo contabilidad en vez de equipo. También existe reportes-2023. Escribe sudo chgrp contabilidad reportes
- **Kicker:** Practica
- **Contexto:** chgrp cambia el grupo de un archivo o carpeta, sin tocar al dueño.
- **Prefijo sugerido:** `repor` (plantilla: `sudo chgrp contabilidad {prefix}`)
- **Candidatos Tab:** `reportes`, `reportes-2023`
- **Comando esperado:** `sudo chgrp contabilidad reportes`
- **Salida simulada:** `grupo actualizado: equipo → contabilidad`
- **Pista:** Termina de escribir el nombre completo de la carpeta.
- **Mensaje de éxito:** El dueño de reportes no cambió, solo su grupo.

#### 12. [concept] Por qué chown casi siempre pide sudo
- **Kicker:** Un paso más
- **Tú:** `chown carlos informe.txt`
- **Terminal:** `chown: changing ownership: Operation not permitted`
- **Texto:** Cualquiera puede regalar sus propios archivos a quien quiera, así que por seguridad Linux no lo permite: solo root puede cambiar el dueño de un archivo hacia otro usuario. Por eso casi todo comando chown va precedido de sudo. chgrp es un poco más flexible: si el archivo es tuyo y perteneces al grupo destino, a veces funciona sin sudo, pero también suele requerirlo en la práctica.

#### 13. [choice] Ejecutas chown carlos informe.txt sin sudo, y no eres root. ¿Qué pasa?
- **Kicker:** Elige la respuesta
- **Contexto:** Cambiar el dueño de un archivo hacia otra persona es una operación delicada.
  - ▫️ Funciona sin problema
  - ✅ Te da un error de permiso: no está permitido
  - ▫️ Cambia el grupo en vez del dueño
- **Explicación:** Solo root puede transferir un archivo a otro dueño. Un usuario normal sin sudo recibe un error de "Operation not permitted".

#### 14. [order] Necesitas privilegios de administrador para que sistema.log le pertenezca a root. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** chown por sí solo no alcanza si no eres root: hace falta anteponer el comando que eleva privilegios.
- **Fichas:** `sudo`  `chown`  `root`  `sistema.log`  `chmod`
- **Orden correcto:** `sudo` → `chown` → `root` → `sistema.log`
- **Explicación:** sudo chown root sistema.log eleva tus privilegios y luego transfiere el archivo a root. Sin sudo, la operación fallaría.

#### 15. [concept] -R: aplicar el cambio a toda una carpeta de una vez
- **Kicker:** Un paso más
- **Tú:** `sudo chown -R carlos:equipo proyecto/`
- **Texto:** Igual que chmod, chown y chgrp aceptan la opción -R (recursivo). Por defecto solo cambian el archivo o carpeta indicado, pero con -R el nuevo dueño y grupo se aplican a la carpeta Y a absolutamente todo lo que contiene, sin importar cuántos niveles de subcarpetas tenga.

#### 16. [choice] Ejecutas sudo chown -R carlos proyecto/, y proyecto/ contiene varias subcarpetas y archivos. ¿Qué pasa?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué significa "recursivo" para una carpeta con contenido adentro.
  - ▫️ Solo cambia el dueño de la carpeta proyecto, no de lo que contiene
  - ✅ El nuevo dueño se aplica a la carpeta y a todo lo que hay dentro
  - ▫️ Falla porque -R no existe para chown
- **Explicación:** -R hace que el cambio de dueño se propague a cada subcarpeta y archivo dentro de proyecto/, no solo a la carpeta en sí.

#### 17. [autocomplete-command] El proyecto entero (carpeta proyecto-web y todo su contenido) debe pasar a pertenecer a carlos y al grupo equipo. También existe una carpeta proyecto-viejo. Escribe sudo chown -R carlos:equipo proyecto-web
- **Kicker:** Practica
- **Contexto:** La opción -R aplica el nuevo dueño y grupo a la carpeta y a todo lo que contiene.
- **Prefijo sugerido:** `proyecto-w` (plantilla: `sudo chown -R carlos:equipo {prefix}`)
- **Candidatos Tab:** `proyecto-web`, `proyecto-viejo`
- **Comando esperado:** `sudo chown -R carlos:equipo proyecto-web`
- **Salida simulada:** `propietario y grupo actualizados recursivamente en proyecto-web/ y todo su contenido`
- **Pista:** Termina de escribir el nombre completo de la carpeta.
- **Mensaje de éxito:** carlos y equipo ahora son dueño y grupo de proyecto-web y de todo lo que hay dentro.

#### 18. [concept] chown y chgrp, en pocas palabras
- **Kicker:** Resumen
- **Terminal:** `chown usuario archivo → cambia el dueño`
- **Terminal:** `chown usuario:grupo archivo → cambia ambos`
- **Terminal:** `chgrp grupo archivo → cambia solo el grupo`
- **Texto:** Repasemos: chown cambia el dueño de un archivo, y con dueño:grupo puede cambiar ambos de una vez. chgrp (o chown :grupo) cambia solo el grupo, sin tocar al dueño. Casi siempre necesitas sudo, porque solo root puede transferir la propiedad de un archivo a otra persona. Y -R aplica cualquiera de estos cambios a una carpeta completa, junto con todo su contenido.

#### 19. [multi-step-terminal] Vas a traspasar un archivo de ana a carlos, y ajustar su grupo, todo en la misma sesión de terminal.
- **Kicker:** Ponlo en práctica
- **Contexto:** Es la misma terminal de principio a fin: lo que escribas en un paso afecta lo que ves en el siguiente.
  1. **Meta:** Primero, revisa quién es el dueño y el grupo actuales de contrato.pdf.
     - Comando: `ls -l contrato.pdf`
     - Salida: `-rw-r--r-- 1 ana equipo 220 contrato.pdf`
     - Pista: El comando de listado largo, seguido del nombre del archivo.
     - Tab: `ls`, `contrato.pdf`
  2. **Meta:** Cambia el dueño de contrato.pdf a carlos.
     - Comando: `sudo chown carlos contrato.pdf`
     - Salida: `propietario actualizado: ana → carlos`
     - Pista: El comando para cambiar dueño, elevando privilegios, seguido del nuevo usuario y el archivo.
     - Tab: `sudo`, `chown`, `carlos`, `contrato.pdf`
  3. **Meta:** Ahora cambia también su grupo a legal.
     - Comando: `sudo chgrp legal contrato.pdf`
     - Salida: `grupo actualizado: equipo → legal`
     - Pista: El comando que cambia solo el grupo, elevando privilegios.
     - Tab: `sudo`, `chgrp`, `legal`, `contrato.pdf`
  4. **Meta:** Confirma que el cambio se aplicó correctamente.
     - Comando: `ls -l contrato.pdf`
     - Salida: `-rw-r--r-- 1 carlos legal 220 contrato.pdf`
     - Pista: El mismo comando que usaste al principio.
     - Tab: `ls`, `contrato.pdf`
- **Mensaje final:** ¡Sesión completa! Cambiaste el dueño y el grupo de un archivo real, confirmando el resultado con ls -l.

#### 20. [choice] Quieres que backup.zip pase a pertenecer al usuario carlos, sin tocar su grupo actual. ¿Qué comando usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué comando afecta solo al dueño.
  - ▫️ chgrp carlos backup.zip
  - ✅ chown carlos backup.zip
  - ▫️ chown carlos: backup.zip
- **Explicación:** chown carlos backup.zip cambia únicamente el dueño. chown carlos: (con dos puntos y nada después) cambiaría el grupo al grupo principal de carlos, y chgrp no puede cambiar el dueño.

### Lección 5: Repaso — Pon todo en práctica
20 pasos.

#### 1. [concept] Todo lo que aprendiste en Archivos y permisos
- **Kicker:** Repaso final
- **Terminal:** `usuario · grupo · otros`
- **Terminal:** `rwx · chmod · chown · chgrp`
- **Texto:** Antes de pasar al siguiente nivel, vamos a repasar mezclado todo lo que ya sabes: propietarios y grupos, permisos rwx, cómo cambiarlos con chmod, y cómo cambiar el dueño o el grupo con chown y chgrp. Si te trabas en algo, vuelve a la lección correspondiente.

#### 2. [choice] Ejecutas ls -l y ves: -rw-r--r-- 1 ana equipo 340 informe.txt. ¿Quién es el dueño del archivo?
- **Kicker:** Repaso mezclado
- **Contexto:** El dueño y el grupo aparecen como dos nombres seguidos, justo después del número que sigue a los permisos.
  - ✅ ana
  - ▫️ equipo
  - ▫️ informe.txt
- **Explicación:** El primer nombre después de los permisos (ana) es siempre el usuario dueño del archivo. El segundo (equipo) es el grupo.

#### 3. [choice] Un archivo del sistema pertenece al usuario root y al grupo admins. Tu cuenta no es root ni pertenece a admins. ¿Como qué rol te trata Linux frente a ese archivo?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en los tres roles posibles y cuál te queda si no eres el dueño ni perteneces al grupo.
  - ▫️ Usuario
  - ▫️ Grupo
  - ✅ Otros
- **Explicación:** Si no eres el dueño ni perteneces al grupo del archivo, Linux te trata como "otros" — la categoría más amplia y, normalmente, la más restringida.

#### 4. [type-command] Escribe groups y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** groups muestra todos los grupos a los que pertenece tu usuario.
- **Comando esperado:** `groups`
- **Salida simulada:** `user equipo diseño`
- **Pista:** (usa el contexto)
- **Tab candidates:** `groups`
- **Mensaje de éxito:** Un usuario puede pertenecer a varios grupos a la vez.

#### 5. [choice] Ves el permiso rw- para el grupo de un archivo. ¿Qué puede hacer ese grupo?
- **Kicker:** Repaso mezclado
- **Contexto:** Recuerda que el orden dentro de cada bloque de tres siempre es r, w, x.
  - ✅ Leer y escribir, pero no ejecutar
  - ▫️ Solo ejecutar
  - ▫️ Leer, escribir y ejecutar
- **Explicación:** rw- tiene r y w activos, y un guion en la posición de x. El grupo puede leer y escribir el archivo, pero no ejecutarlo.

#### 6. [choice] Una carpeta tiene permisos r-- para "otros" (sin x). ¿Qué pasa si alguien de "otros" intenta hacer cd a esa carpeta?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué permiso controla específicamente la posibilidad de entrar a una carpeta.
  - ▫️ Puede entrar sin problema, porque tiene r
  - ✅ No puede entrar: le falta x
  - ▫️ Puede entrar, pero no ver nada dentro
- **Explicación:** x es el permiso que controla si puedes "entrar" a una carpeta. Sin x, cd falla aunque tengas r.

#### 7. [order] Quieres ver los permisos de la propia carpeta proyectos (no de lo que hay dentro). Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** ls -l muestra el contenido de una carpeta; hace falta una opción distinta para ver los permisos de la carpeta como tal.
- **Fichas:** `-r`  `ls`  `-ld`  `proyectos`  `-a`
- **Orden correcto:** `ls` → `-ld` → `proyectos`
- **Explicación:** ls -ld proyectos muestra la línea de permisos de la carpeta "proyectos" en sí, en vez de listar los archivos que contiene.

#### 8. [type-command] Escribe chmod u+x despliegue.sh y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** chmod u+x le agrega el permiso de ejecución al dueño del archivo, sin tocar los demás permisos.
- **Comando esperado:** `chmod u+x despliegue.sh`
- **Salida simulada:** `permisos actualizados: -rw-r--r-- → -rwxr--r--`
- **Pista:** (usa el contexto)
- **Tab candidates:** `chmod`, `u+x`, `despliegue.sh`
- **Mensaje de éxito:** u+x agregó la x solo en el bloque del usuario.

#### 9. [choice] Un archivo tiene rw-rw-rw-. Ejecutas chmod o=r archivo. ¿Cómo queda el bloque de "otros"?
- **Kicker:** Repaso mezclado
- **Contexto:** o=r fija el resultado final para otros, sin importar lo que tenía antes.
  - ▫️ rw- (igual que antes)
  - ✅ r-- (solo lectura)
  - ▫️ --- (sin ningún permiso)
- **Explicación:** o=r fija el permiso de "otros" en exactamente r--. El signo = no suma sobre lo anterior: lo reemplaza por lo que escribas.

#### 10. [choice] ¿Qué número representa un rol con permisos r y w, pero sin x?
- **Kicker:** Repaso mezclado
- **Contexto:** r vale 4, w vale 2, x vale 1. Suma solo los que están activos.
  - ▫️ 4
  - ▫️ 5
  - ✅ 6
- **Explicación:** r (4) + w (2) = 6. La x no está activa, así que no se suma su 1. rw- equivale siempre al número 6.

#### 11. [order] Quieres dejar un archivo con rwx para el usuario, r-x para el grupo y sin ningún permiso para otros, usando notación numérica. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** 7 es rwx, 5 es r-x, 0 es sin permisos. El orden siempre es usuario, grupo, otros.
- **Fichas:** `chmod`  `750`  `archivo`  `570`  `075`
- **Orden correcto:** `chmod` → `750` → `archivo`
- **Explicación:** chmod 750 archivo deja al usuario con rwx (7), al grupo con r-x (5) y a otros con --- (0).

#### 12. [choice] Ejecutas chmod -R 644 proyectos/, y proyectos/ contiene subcarpetas. ¿Qué problema puede causar esto?
- **Kicker:** Repaso mezclado
- **Contexto:** 644 no incluye el permiso x. Piensa en qué permiso necesita una carpeta para poder "entrarse" con cd.
  - ▫️ Ninguno, 644 es seguro para carpetas
  - ✅ Las subcarpetas quedan sin x, y nadie podrá entrar a ellas con cd
  - ▫️ Los archivos de adentro se vuelven ejecutables
- **Explicación:** 644 no tiene x en ningún bloque. Al aplicarlo recursivamente, las subcarpetas pierden el permiso de "entrar" (x).

#### 13. [type-command] Escribe sudo chown carlos informe.txt y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** chown le asigna un nuevo dueño a un archivo. Casi siempre necesita sudo.
- **Comando esperado:** `sudo chown carlos informe.txt`
- **Salida simulada:** `propietario actualizado: ana → carlos`
- **Pista:** (usa el contexto)
- **Tab candidates:** `sudo`, `chown`, `carlos`, `informe.txt`
- **Mensaje de éxito:** chown transfiere la propiedad del archivo a otro usuario, sin tocar sus permisos rwx.

#### 14. [choice] Ejecutas chown carlos:diseño informe.txt. ¿Qué cambia exactamente?
- **Kicker:** Repaso mezclado
- **Contexto:** Antes de los dos puntos va el dueño; después, el grupo.
  - ▫️ Solo cambia el dueño a carlos
  - ✅ Cambia el dueño a carlos y el grupo a diseño
  - ▫️ Cambia el grupo a carlos y el dueño a diseño
- **Explicación:** El nombre antes de los dos puntos es siempre el nuevo dueño; el que sigue después es el nuevo grupo.

#### 15. [choice] ¿Cuál de estos comandos cambia SOLO el grupo de logo.png a diseño, sin tocar al dueño?
- **Kicker:** Repaso mezclado
- **Contexto:** Ten cuidado: uno de ellos en realidad intenta cambiar el dueño.
  - ▫️ chown diseño logo.png
  - ✅ chgrp diseño logo.png
  - ▫️ chmod diseño logo.png
- **Explicación:** chgrp diseño logo.png cambia únicamente el grupo. chown diseño logo.png es un error común: sin los dos puntos, chown interpreta "diseño" como el nuevo dueño.

#### 16. [choice] Ejecutas chown carlos informe.txt sin sudo, y no eres root. ¿Qué pasa?
- **Kicker:** Repaso mezclado
- **Contexto:** Cambiar el dueño de un archivo hacia otra persona es una operación delicada.
  - ▫️ Funciona sin problema
  - ✅ Te da un error de permiso: no está permitido
  - ▫️ Cambia el grupo en vez del dueño
- **Explicación:** Solo root puede transferir un archivo a otro dueño. Un usuario normal sin sudo recibe un error de "Operation not permitted".

#### 17. [order] Necesitas privilegios de administrador para que backup.tar le pertenezca al usuario carlos y al grupo copias, en un solo comando. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** chown acepta dueño y grupo juntos, separados por dos puntos, y hace falta elevar privilegios.
- **Fichas:** `sudo`  `chown`  `carlos:copias`  `backup.tar`  `chgrp`
- **Orden correcto:** `sudo` → `chown` → `carlos:copias` → `backup.tar`
- **Explicación:** sudo chown carlos:copias backup.tar eleva tus privilegios y cambia dueño y grupo en un solo paso.

#### 18. [choice] Ejecutas sudo chown -R carlos proyecto/, y proyecto/ contiene varias subcarpetas y archivos. ¿Qué pasa?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué significa "recursivo" para una carpeta con contenido adentro.
  - ▫️ Solo cambia el dueño de la carpeta proyecto, no de lo que contiene
  - ✅ El nuevo dueño se aplica a la carpeta y a todo lo que hay dentro
  - ▫️ Falla porque -R no existe para chown
- **Explicación:** -R hace que el cambio de dueño se propague a cada subcarpeta y archivo dentro de proyecto/, no solo a la carpeta en sí.

#### 19. [type-command] Escribe ls -l script.sh y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** ls -l muestra la cadena completa de permisos, dueño y grupo de un archivo.
- **Comando esperado:** `ls -l script.sh`
- **Salida simulada:** `-rwxr-xr-- 1 ana equipo 512 script.sh`
- **Pista:** (usa el contexto)
- **Tab candidates:** `ls`, `-l`, `script.sh`
- **Mensaje de éxito:** rwx para ana (usuario), r-x para equipo (grupo), r-- para el resto (otros).

#### 20. [choice] Ejecutas ls -l y ves lrwxrwxrwx en vez de un guion o una "d" al inicio. ¿Qué tipo de elemento es?
- **Kicker:** Repaso mezclado
- **Contexto:** El primer carácter indica el tipo: guion para archivo, "d" para carpeta, y una tercera opción.
  - ▫️ Un archivo normal muy permisivo
  - ✅ Un enlace simbólico (link) a otro archivo
  - ▫️ Una carpeta oculta
- **Explicación:** La "l" al inicio identifica un enlace simbólico: un acceso directo que apunta a otro archivo o carpeta.

### Lección 6: Desafío final — Resuélvelo por tu cuenta (Desafío final)
> Sin pistas paso a paso: combina propietarios, permisos, chmod, chown y chgrp para resolver dos situaciones reales de principio a fin.

2 pasos.

#### 1. [multi-step-terminal] Heredaste un servidor de un compañero que ya no trabaja en el equipo. Vas a revisar un archivo de configuración y dejarlo con el dueño y los permisos correctos, todo en la misma sesión.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Vas a necesitar revisar el estado actual antes de cambiar nada, y combinar lo que sabes de propietarios y permisos.
  1. **Meta:** Primero revisa quién es el dueño actual y qué permisos tiene config.yml.
     - Comando: `ls -l config.yml`
     - Salida: `-rw-rw-rw- 1 martin devops 890 config.yml`
     - Pista: El comando que lista archivos con detalle, seguido del nombre del archivo.
     - Tab: `ls`, `config.yml`
  2. **Meta:** martin ya no trabaja aquí. Cambia el dueño del archivo a carlos, sin tocar el grupo por ahora.
     - Comando: `sudo chown carlos config.yml`
     - Salida: `propietario actualizado: martin → carlos`
     - Pista: El comando que cambia el dueño de un archivo, elevando privilegios porque no eres el dueño actual.
     - Tab: `sudo`, `chown`, `config.yml`
  3. **Meta:** El archivo también debería pertenecer al grupo "devops" en vez de a otro grupo. Confirma que ya es así o corrígelo.
     - Comando: `sudo chgrp devops config.yml`
     - Salida: `grupo actualizado: devops → devops (sin cambios)`
     - Pista: El comando que cambia únicamente el grupo de un archivo.
     - Tab: `sudo`, `chgrp`, `config.yml`
  4. **Meta:** rw-rw-rw- es demasiado abierto para un archivo de configuración. Déjalo en rwx para el dueño, r-x para el grupo, y nada para otros.
     - Comando: `chmod 750 config.yml`
     - Salida: `permisos actualizados: -rw-rw-rw- → -rwxr-x---`
     - Pista: El comando que cambia permisos con notación numérica: 7 para el dueño, 5 para el grupo, 0 para otros.
     - Tab: `chmod`, `config.yml`
  5. **Meta:** Confirma que todo quedó como esperabas antes de cerrar la sesión.
     - Comando: `ls -l config.yml`
     - Salida: `-rwxr-x--- 1 carlos devops 890 config.yml`
     - Pista: El mismo comando que usaste al principio para revisar dueño y permisos.
     - Tab: `ls`, `config.yml`
- **Mensaje final:** ¡Sesión completa! Diagnosticaste el problema y lo corregiste combinando chown y chmod sin que nadie te dijera los comandos exactos.

#### 2. [multi-step-terminal] Un script de despliegue nuevo no se ejecuta y varios compañeros del equipo necesitan poder correrlo. Vas a diagnosticar el problema y dejarlo funcionando para todo el equipo, sin abrirlo al resto del sistema.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Piensa en qué permiso falta para poder ejecutar un archivo, y en qué rol representa a tus compañeros de equipo.
  1. **Meta:** Antes de nada, revisa los permisos actuales de deploy.sh para entender por qué falla.
     - Comando: `ls -l deploy.sh`
     - Salida: `-rw-r----- 1 ana equipo 610 deploy.sh`
     - Pista: El comando que muestra permisos, dueño y grupo de un archivo.
     - Tab: `ls`, `deploy.sh`
  2. **Meta:** Confirma a qué grupo pertenece tu propio usuario, para asegurarte de que coincide con "equipo".
     - Comando: `groups`
     - Salida: `ana equipo`
     - Pista: El comando que lista los grupos a los que pertenece tu usuario, sin argumentos.
     - Tab: `groups`
  3. **Meta:** Al grupo le falta el permiso de ejecución. Agrégaselo sin tocar los permisos del dueño ni de otros.
     - Comando: `chmod g+x deploy.sh`
     - Salida: `permisos actualizados: -rw-r----- → -rw-r-x---`
     - Pista: El comando de permisos con notación simbólica: g de grupo, + para agregar, x de ejecución.
     - Tab: `chmod`, `deploy.sh`
  4. **Meta:** Verifica que el cambio se aplicó correctamente antes de avisarle al equipo.
     - Comando: `ls -l deploy.sh`
     - Salida: `-rw-r-x--- 1 ana equipo 610 deploy.sh`
     - Pista: El mismo comando que usaste al principio.
     - Tab: `ls`, `deploy.sh`
- **Mensaje final:** ¡Perfecto! Diagnosticaste el permiso que faltaba y lo corregiste para el grupo correcto, sin dejar el archivo abierto a cualquiera.

---

## Unidad 4: Procesos
_Unidad 4 · Nivel 4_

### Lección 1: ¿Qué es un proceso? — PID, procesos padre e hijo
17 pasos.

#### 1. [concept] ¿Qué es un proceso?
- **Kicker:** Antes de empezar
- **Tú:** `firefox`
- **Terminal:** `PID 4821 en ejecución`
- **Texto:** Cada vez que ejecutas un programa —abrir un navegador, correr un script, o incluso escribir un comando en la terminal— el sistema crea un "proceso": una instancia de ese programa corriendo en memoria, con sus propios recursos asignados (memoria, tiempo de CPU, archivos abiertos). Un mismo programa puede tener varios procesos a la vez; por ejemplo, cada pestaña de un navegador suele correr como un proceso distinto.

#### 2. [concept] El PID: la identificación de cada proceso
- **Kicker:** Teoría
- **Tú:** `ps`
- **Terminal:** `PID 1 init · PID 892 bash · PID 4821 firefox`
- **Texto:** Para que el sistema pueda distinguir un proceso de otro, cada uno recibe un número único mientras existe: el PID (Process ID). Ningún otro proceso activo comparte ese mismo número al mismo tiempo. En la próxima lección usarás comandos como ps y top para ver esos PIDs — primero vamos a ver de dónde sale el tuyo propio.

#### 3. [type-command] Escribe echo $$ y presiona Enter
- **Kicker:** Tu propio PID
- **Contexto:** "$$" es una variable especial de la terminal que siempre contiene el PID del proceso de la propia terminal (el shell) en el que estás escribiendo.
- **Comando esperado:** `echo $$`
- **Salida simulada:** `2417`
- **Pista:** Es el comando que repite texto en pantalla, seguido de dos signos de dólar pegados.
- **Tab candidates:** `echo`, `$$`
- **Mensaje de éxito:** Ese número (2417) es el PID del shell donde estás escribiendo ahora mismo: es literalmente un proceso, igual que cualquier programa.

#### 4. [concept] Procesos padre e hijo
- **Kicker:** Un paso más
- **Terminal:** `bash (PID 2417)`
- **Terminal:** `└─ firefox (PID 4821)`
- **Texto:** Ningún proceso aparece de la nada: siempre lo crea otro proceso ya en ejecución. Al que crea se le llama "proceso padre", y al recién creado, "proceso hijo". Por ejemplo, cuando escribes firefox en tu terminal, es la propia terminal (bash) la que se convierte en el padre del nuevo proceso de Firefox.

#### 5. [concept] PPID: el PID de tu padre
- **Kicker:** Teoría
- **Tú:** `echo $PPID`
- **Terminal:** `1204`
- **Texto:** Así como $$ te da tu propio PID, existe otra variable, $PPID (Parent PID), que te da el PID del proceso que te creó a ti: tu padre. Cada proceso hijo "recuerda" quién es su padre mientras ambos siguen vivos.

#### 6. [type-command] Escribe echo $PPID y presiona Enter
- **Kicker:** El PID de tu padre
- **Contexto:** $PPID contiene el PID del proceso que creó a tu shell actual: normalmente la terminal o la sesión que la abrió.
- **Comando esperado:** `echo $ppid`
- **Salida simulada:** `1204`
- **Pista:** Es el mismo comando que usaste antes, con $PPID en vez de $$.
- **Tab candidates:** `echo`, `$ppid`
- **Mensaje de éxito:** Ese 1204 es el PID del proceso que abrió esta terminal: su "padre".

#### 7. [concept] El árbol de procesos
- **Kicker:** Teoría
- **Terminal:** `PID 1 (init / systemd)`
- **Terminal:** `└─ ... └─ bash └─ firefox`
- **Texto:** Si sigues la cadena de padres hacia arriba, proceso tras proceso, siempre terminas llegando al mismo lugar: un único proceso raíz con PID 1 (normalmente llamado init o systemd), que el propio kernel arranca al encender el sistema. Todos los demás procesos descienden de él, formando una estructura de árbol con PID 1 en la raíz.

#### 8. [choice] ¿Qué identifica de forma única a un proceso mientras está en ejecución?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en el número que el sistema le asigna a cada proceso al crearlo.
  - ▫️ Su nombre de programa
  - ✅ Su PID
  - ▫️ Su usuario dueño
- **Explicación:** El PID (Process ID) es el número único que identifica a un proceso mientras existe; el nombre de programa o el usuario dueño pueden repetirse en varios procesos distintos a la vez.

#### 9. [choice] Abres el navegador escribiendo firefox en tu terminal. ¿Cómo se llama la relación entre la terminal y el proceso del navegador?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en quién crea a quién.
  - ▫️ La terminal es el proceso hijo del navegador
  - ▫️ El navegador es el proceso padre de la terminal
  - ✅ La terminal es el proceso padre del navegador
- **Explicación:** El proceso que crea a otro es su "padre"; como la terminal fue la que lanzó el navegador, la terminal es el padre y el navegador el hijo.

#### 10. [concept] Programa y proceso no son lo mismo
- **Kicker:** Un detalle importante
- **Terminal:** `firefox (el archivo, guardado en disco)`
- **Terminal:** `PID 4821, PID 4830, PID 4841... (tres pestañas abiertas)`
- **Texto:** Un "programa" es el archivo guardado en disco: código quieto, que no hace nada por sí solo hasta que lo ejecutas. Un "proceso" es lo que existe mientras ese programa corre en memoria, con su propio PID. Por eso puedes tener un solo programa Firefox instalado, y sin embargo varios procesos de Firefox corriendo a la vez —uno por cada pestaña o ventana que abras.

#### 11. [choice] Tienes instalado un solo programa de edición de fotos, pero lo abres tres veces para trabajar en tres imágenes distintas. ¿Qué es correcto?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en la diferencia entre el archivo instalado y lo que ocurre cada vez que lo ejecutas.
  - ▫️ Hay un solo proceso, porque es el mismo programa
  - ✅ Hay tres procesos distintos, cada uno con su propio PID
  - ▫️ Un programa nunca puede tener más de un proceso a la vez
- **Explicación:** Cada vez que ejecutas el programa se crea un proceso nuevo, con su propio PID y sus propios recursos. El programa (el archivo) es uno solo; los procesos que genera pueden ser varios al mismo tiempo.

#### 12. [concept] Un padre puede tener varios hijos
- **Kicker:** Un paso más
- **Terminal:** `bash (PID 2417)`
- **Terminal:** `├─ firefox (4821)  └─ nano (4902)`
- **Texto:** Nada impide que un mismo proceso padre cree varios procesos hijos, uno tras otro: si desde tu terminal abres firefox y luego, sin cerrarla, abres nano, ambos son hijos de esa misma terminal. En cambio, cada proceso hijo tiene siempre un único padre a la vez —nunca dos padres compartiendo un mismo hijo.

#### 13. [concept] Un proceso no siempre está "corriendo"
- **Kicker:** Teoría
- **Terminal:** `R: usando la CPU ahora mismo`
- **Terminal:** `S: dormido, esperando algo · T: pausado`
- **Texto:** Un proceso no pasa todo el tiempo usando la CPU. En un momento dado puede estar "corriendo" (R, running: activo en este instante), "dormido" (S, sleeping: esperando algo, como que termines de escribir o que llegue una respuesta de red) o "detenido" (T, stopped: pausado, sin avanzar hasta que algo lo reactive). El sistema va turnando la CPU entre los procesos que sí están listos para correr.

#### 14. [choice] Un editor de texto está abierto, pero lleva varios minutos sin que hagas nada: no está usando la CPU, solo espera a que escribas algo. ¿En qué estado está probablemente?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cuál de los tres estados describe "esperando a que ocurra algo", sin estar detenido a propósito ni usando la CPU en este instante.
  - ▫️ Corriendo (R)
  - ✅ Dormido (S)
  - ▫️ Detenido (T)
- **Explicación:** Un proceso que espera una entrada (como que escribas algo) sin consumir CPU mientras tanto está en estado dormido (S, sleeping) — muy distinto de estar detenido (T), que normalmente ocurre porque alguien lo pausó explícitamente.

#### 15. [concept] Procesos zombis y huérfanos
- **Kicker:** Un caso especial
- **Terminal:** `hijo termina, pero el padre no revisó el resultado todavía`
- **Terminal:** `proceso "zombi": ya terminó, pero sigue en la lista`
- **Texto:** Cuando un proceso hijo termina, deja un pequeño registro con su resultado final, a la espera de que su padre lo revise. Mientras eso no pase, ese hijo queda como proceso "zombi": ya no hace nada, pero todavía aparece en la lista de procesos. Y si en cambio es el padre el que muere antes que el hijo, ese hijo se vuelve "huérfano" — y el sistema se lo asigna automáticamente a PID 1, para que alguien siga siendo su responsable.

#### 16. [order] Quieres ver el PID del proceso que creó tu shell actual, es decir, su proceso padre. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es una variable especial de la terminal, distinta de la que muestra tu propio PID.
- **Fichas:** `echo`  `$$`  `$PPID`  `ps`  `whoami`
- **Orden correcto:** `echo` → `$PPID`
- **Explicación:** echo $PPID muestra el PID del proceso padre de tu shell actual. $$ es parecido, pero muestra tu propio PID, no el de tu padre.

#### 17. [concept] Procesos, PID y árbol: lo esencial
- **Kicker:** Resumen
- **Terminal:** `PID: identifica a cada proceso`
- **Terminal:** `padre → hijo, hasta llegar a PID 1`
- **Texto:** Repasemos: un proceso es una instancia de un programa en ejecución (no confundir con el programa, que es solo el archivo en disco), identificada con un PID único. Un mismo padre puede tener varios hijos, y todo proceso (salvo el primero) desciende de otro hasta llegar a PID 1, la raíz del árbol. Además, un proceso puede estar corriendo, dormido o detenido, y si un hijo termina o su padre muere antes de tiempo, puede quedar como zombi o huérfano. Con esta base ya puedes pasar a ver, en la siguiente lección, cómo listar todos estos procesos con ps y top.

### Lección 2: Ver procesos — ps y top
20 pasos.

#### 1. [concept] Ver los procesos con ps
- **Kicker:** Antes de empezar
- **Tú:** `ps`
- **Terminal:** `PID TTY TIME CMD`
- **Texto:** Ya sabes qué es un proceso y qué es un PID. Ahora toca verlos: el comando "ps" (process status) te muestra una foto instantánea de los procesos que existen en ese momento. Sin nada más, "ps" solo lista los procesos de tu terminal actual — es el punto de partida antes de mirar el sistema completo.

#### 2. [type-command] Escribe ps y presiona Enter
- **Kicker:** Tu primera foto de procesos
- **Contexto:** "ps" sin opciones muestra únicamente los procesos que pertenecen a tu terminal actual.
- **Comando esperado:** `ps`
- **Salida simulada:** `  PID TTY          TIME CMD
 2417 pts/0    00:00:00 bash
 5093 pts/0    00:00:00 ps`
- **Pista:** Son solo dos letras: la abreviatura de "process status".
- **Tab candidates:** `ps`
- **Mensaje de éxito:** Ahí están: tu shell (bash) y el propio "ps" ejecutándose, cada uno con su PID.

#### 3. [concept] Qué significa cada columna
- **Kicker:** Teoría
- **Terminal:** `PID · TTY · TIME · CMD`
- **Texto:** PID es el número del proceso. TTY es la terminal a la que está asociado. TIME es el tiempo de CPU que ha consumido (no el tiempo que lleva abierto). CMD es el nombre del comando que lo originó. Con solo "ps" ves muy poco: para ver todos los procesos del sistema, de todos los usuarios, necesitas opciones adicionales.

#### 4. [concept] ps aux: todos los procesos, de todos los usuarios
- **Kicker:** Un paso más
- **Tú:** `ps aux`
- **Terminal:** `USER PID %CPU %MEM ... COMMAND`
- **Texto:** "ps aux" combina tres opciones: "a" (procesos de todos los usuarios, no solo el tuyo), "u" (formato orientado al usuario, con más columnas) y "x" (incluye también procesos sin terminal asociada, como los servicios de fondo). Es probablemente la forma más usada de listar procesos.

#### 5. [type-command] Escribe ps aux y presiona Enter
- **Kicker:** Todos los procesos del sistema
- **Contexto:** "aux" combina tres opciones sin guion: todos los usuarios, formato detallado, y procesos sin terminal.
- **Comando esperado:** `ps aux`
- **Salida simulada:** `USER   PID %CPU %MEM    VSZ   RSS TTY  STAT START   TIME COMMAND
root     1  0.0  0.1  16932  1112 ?    Ss   09:03   0:01 /sbin/init
user  2417  0.0  0.2  21456  4820 pts/0 Ss  09:10   0:00 bash
user  4821  1.2  3.4 412300 68900 ?    Sl   09:15   0:42 firefox`
- **Pista:** Es "ps" seguido de las tres letras a, u y x pegadas.
- **Tab candidates:** `ps`, `aux`
- **Mensaje de éxito:** %CPU y %MEM te dicen cuánto está consumiendo cada proceso — clave para detectar cuál se está comiendo tus recursos.

#### 6. [choice] En la salida de "ps aux", ¿qué columna te dice cuánta memoria RAM está usando un proceso en este momento?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en las columnas orientadas a recursos que añade la opción "u".
  - ▫️ TTY
  - ✅ %MEM
  - ▫️ STAT
- **Explicación:** %MEM muestra el porcentaje de memoria RAM que usa el proceso; TTY indica la terminal asociada y STAT su estado (R, S, T, etc.).

#### 7. [concept] top: procesos en tiempo real
- **Kicker:** Otro ángulo
- **Terminal:** `ps: una sola foto`
- **Terminal:** `top: video en vivo`
- **Texto:** "ps" es una foto fija: se toma una vez y no cambia en pantalla. "top" en cambio abre una vista que se actualiza sola cada pocos segundos, mostrando los procesos que más CPU están usando en ese instante, arriba de todo — de ahí su nombre.

#### 8. [type-command] Escribe top y presiona Enter
- **Kicker:** Monitoreo en vivo
- **Contexto:** "top" abre una pantalla interactiva que se refresca sola; no hace falta volver a escribir el comando para ver datos nuevos.
- **Comando esperado:** `top`
- **Salida simulada:** `top - 15:42:07 up 2:31,  1 user,  load average: 0.34, 0.28, 0.19
Tasks: 118 total,   1 running, 117 sleeping
  PID USER   %CPU %MEM COMMAND
 4821 user   12.3  3.4 firefox
 2417 user    0.1  0.2 bash`
- **Pista:** Tres letras, el mismo nombre que usarías para decir "la parte de arriba".
- **Tab candidates:** `top`
- **Mensaje de éxito:** Mientras "top" siga abierto, esta lista se sigue actualizando sola. Para salir, presiona la tecla q.

#### 9. [concept] Salir de top y algunas teclas útiles
- **Kicker:** Teoría
- **Terminal:** `q → salir de top`
- **Terminal:** `Mayús+M → ordenar por memoria`
- **Texto:** "top" no es solo para mirar: es interactivo. La tecla q lo cierra y te devuelve la terminal normal. Mientras está abierto, Mayús+P ordena los procesos por uso de CPU (el orden por defecto) y Mayús+M los ordena por uso de memoria — útil cuando buscas qué proceso está agotando la RAM en vez del procesador.

#### 10. [choice] Quieres saber qué proceso está consumiendo más CPU justo ahora, y ver cómo cambia segundo a segundo. ¿Qué comando conviene más?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cuál de los dos actualiza la pantalla solo, sin que vuelvas a escribir nada.
  - ▫️ ps aux
  - ✅ top
  - ▫️ ps
- **Explicación:** "top" se actualiza automáticamente, ideal para monitorear en tiempo real. "ps" y "ps aux" son solo una foto del instante en que los ejecutas.

#### 11. [order] Quieres ver los procesos de todos los usuarios del sistema, con detalles de CPU y memoria, en una sola foto. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es "ps" seguido de tres letras pegadas, sin espacios ni guion.
- **Fichas:** `ps`  `aux`  `top`  `-l`  `whoami`
- **Orden correcto:** `ps` → `aux`
- **Explicación:** "ps aux" muestra todos los procesos del sistema con columnas de %CPU y %MEM incluidas; "top" en cambio abre una vista en vivo, no una sola foto.

#### 12. [concept] ps -ef: la variante que muestra el padre de cada proceso
- **Kicker:** Otra sintaxis
- **Tú:** `ps -ef`
- **Terminal:** `UID PID PPID ... CMD`
- **Texto:** Existe otra forma muy usada, con guion: "ps -ef". Hace básicamente lo mismo que "ps aux" (todos los procesos del sistema), pero con un formato distinto y una columna extra clave: PPID, el PID del proceso padre. Es la opción que conviene cuando quieres ver de un vistazo quién creó a quién, sin armar el árbol completo.

#### 13. [type-command] Escribe ps -ef y presiona Enter
- **Kicker:** Viendo los padres de cada proceso
- **Contexto:** La columna PPID te muestra directamente qué proceso es el padre de cada uno, sin tener que calcularlo tú.
- **Comando esperado:** `ps -ef`
- **Salida simulada:** `UID   PID  PPID  C STIME TTY      TIME CMD
root     1     0  0 09:03 ?    00:00:01 /sbin/init
user  2417     1  0 09:10 pts/0 00:00:00 bash
user  4821  2417  3 09:15 pts/0 00:00:42 firefox`
- **Pista:** Es "ps" seguido de guion, e, f.
- **Tab candidates:** `ps`, `-ef`
- **Mensaje de éxito:** Fíjate: el PPID de "firefox" es 2417, el mismo PID que "bash" — confirma que la terminal es su padre.

#### 14. [concept] Filtrar la lista con grep
- **Kicker:** Un paso más
- **Tú:** `ps aux | grep firefox`
- **Terminal:** `solo la(s) línea(s) que contienen "firefox"`
- **Texto:** "ps aux" en un sistema real puede mostrar cientos de líneas — buscar una a simple vista es incómodo. Ahí entra el pipe "|", que conecta la salida de un comando con la entrada de otro: "ps aux | grep firefox" primero lista todos los procesos y luego le pasa esa lista a "grep", que se queda solo con las líneas que contienen "firefox".

#### 15. [type-command] Escribe ps aux | grep firefox y presiona Enter
- **Kicker:** Buscar un proceso por nombre
- **Contexto:** El símbolo | (pipe) envía la salida de "ps aux" como entrada de "grep", que filtra por la palabra que le indiques.
- **Comando esperado:** `ps aux | grep firefox`
- **Salida simulada:** `user  4821  1.2  3.4 412300 68900 ?    Sl   09:15   0:42 firefox
user  5210  0.0  0.0   7488   840 pts/0 S+   09:22   0:00 grep --color=auto firefox`
- **Pista:** Es "ps aux", luego el símbolo de barra vertical, luego "grep" y el nombre a buscar.
- **Tab candidates:** `ps`, `aux`, `|`, `grep`, `firefox`
- **Mensaje de éxito:** Nota que hasta el propio comando "grep firefox" aparece en la lista: también es un proceso, aunque termina apenas se ejecuta.

#### 16. [choice] En la salida de "ps aux", ves un proceso con estado "Z" en la columna STAT. ¿Qué tipo de proceso es, según lo que ya viste sobre ciclo de vida?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en el proceso que ya terminó pero cuyo padre todavía no revisó su resultado final.
  - ✅ Un proceso zombi
  - ▫️ Un proceso huérfano
  - ▫️ Un proceso recién creado
- **Explicación:** El estado "Z" (zombie) identifica a un proceso que ya terminó pero sigue apareciendo en la lista porque su padre aún no ha leído su resultado final.

#### 17. [concept] pstree: el árbol de procesos, dibujado
- **Kicker:** Otro ángulo
- **Terminal:** `init─┬─bash───firefox`
- **Terminal:** `└─sshd`
- **Texto:** Reconstruir el árbol de padres e hijos a mano leyendo columnas PPID es tedioso. "pstree" hace ese trabajo por ti: dibuja directamente la jerarquía completa, desde PID 1 hasta el último proceso hijo, usando líneas para mostrar quién viene de quién.

#### 18. [type-command] Escribe pstree y presiona Enter
- **Kicker:** El árbol completo
- **Contexto:** "pstree" muestra en un solo vistazo la relación padre-hijo de todos los procesos, sin que tengas que cruzar columnas de PID y PPID.
- **Comando esperado:** `pstree`
- **Salida simulada:** `init─┬─bash───firefox
     ├─sshd
     └─cron`
- **Pista:** Es la unión de las palabras "ps" y "tree" (árbol, en inglés).
- **Tab candidates:** `pstree`
- **Mensaje de éxito:** Con un vistazo ves que init es el padre de todo, y que firefox depende de bash — la misma información que sacaste antes con $PPID, pero de un solo comando.

#### 19. [concept] htop: una alternativa más amigable a top
- **Kicker:** Un dato extra
- **Terminal:** `htop`
- **Texto:** No viene instalado por defecto en todas las distribuciones, pero vale la pena conocerlo: "htop" hace lo mismo que "top" (monitoreo en vivo), con colores, barras de uso de CPU y memoria, y la posibilidad de desplazarte con el mouse o las flechas. Si está disponible en tu sistema, suele ser más cómodo de leer que "top".

#### 20. [concept] Ver procesos: lo esencial
- **Kicker:** Resumen
- **Terminal:** `ps / ps aux / ps -ef: una foto fija`
- **Terminal:** `top / htop: una vista en vivo, se actualiza sola`
- **Texto:** Repasemos: "ps" sin opciones solo muestra los procesos de tu terminal; "ps aux" y "ps -ef" te dan una foto completa del sistema, con %CPU, %MEM o PPID según el formato. Puedes filtrar esa foto con "| grep" para encontrar un proceso por nombre, o pedirle a "pstree" que te dibuje la jerarquía completa de una vez. "top" (o "htop", si está disponible) en cambio es una vista interactiva que se actualiza sola y por defecto ordena por uso de CPU — perfecta para detectar en vivo qué proceso está consumiendo más recursos. Con esto ya sabes identificar, filtrar y observar procesos; en la siguiente lección aprenderás a manejarlos en segundo plano.

### Lección 3: Segundo plano — &, jobs, fg, bg
13 pasos.

#### 1. [concept] Un comando puede bloquear tu terminal
- **Kicker:** Antes de empezar
- **Tú:** `sleep 100`
- **Terminal:** `(la terminal queda ocupada 100 segundos...)`
- **Texto:** Hasta ahora, cada comando que escribiste corrió en "primer plano": la terminal queda ocupada esperando a que termine, sin dejarte escribir nada más. Eso funciona bien para comandos rápidos, pero es un problema si algo tarda minutos u horas. La solución es correrlo en "segundo plano", agregando un & al final del comando.

#### 2. [type-command] Escribe sleep 100 & y presiona Enter
- **Kicker:** Tu primer proceso en segundo plano
- **Contexto:** "sleep 100" simplemente espera 100 segundos sin hacer nada más — perfecto para practicar sin necesitar un programa real. El & al final lo manda a segundo plano.
- **Comando esperado:** `sleep 100 &`
- **Salida simulada:** `[1] 5320`
- **Pista:** Es "sleep", un espacio, el número 100, y el símbolo & pegado al final.
- **Tab candidates:** `sleep`, `100`, `&`
- **Mensaje de éxito:** La terminal te devolvió el control de inmediato: "[1]" es el número de trabajo, y 5320 es el PID de ese "sleep" corriendo de fondo.

#### 3. [concept] Qué es un "job" (trabajo)
- **Kicker:** Teoría
- **Terminal:** `[1] sleep 100 &`
- **Terminal:** `[2] ping google.com &`
- **Texto:** Además del PID, tu shell le asigna a cada comando en segundo plano un número de "job" (trabajo), empezando en 1 y subiendo por cada nuevo comando que mandes con &. Es un número propio de esa terminal, más corto y fácil de recordar que el PID, pensado para referirte a ese trabajo más adelante.

#### 4. [type-command] Escribe jobs y presiona Enter
- **Kicker:** Ver tus trabajos activos
- **Contexto:** "jobs" lista los trabajos en segundo plano (o pausados) de tu sesión actual, con su número y estado.
- **Comando esperado:** `jobs`
- **Salida simulada:** `[1]+  Running                 sleep 100 &`
- **Pista:** Es el plural de "job", en inglés.
- **Tab candidates:** `jobs`
- **Mensaje de éxito:** Ahí está tu trabajo [1], con estado "Running": sigue corriendo de fondo, sin ocupar tu terminal.

#### 5. [concept] Pausar un proceso en primer plano: Ctrl+Z
- **Kicker:** Un paso más
- **Tú:** `[Ctrl+Z]`
- **Terminal:** `[1]+  Stopped                 sleep 100`
- **Texto:** Si olvidaste el & y un comando ya está ocupando tu terminal en primer plano, no hace falta cancelarlo con Ctrl+C: Ctrl+Z lo pausa sin matarlo, dejándolo como trabajo detenido ("Stopped") y devolviéndote la terminal al instante.

#### 6. [choice] Presionas Ctrl+Z sobre un proceso que estaba corriendo en primer plano. Según los estados que ya conoces (R, S, T), ¿en cuál queda ahora?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en el estado que corresponde a "pausado, sin avanzar hasta que algo lo reactive".
  - ▫️ R (running)
  - ▫️ S (sleeping)
  - ✅ T (stopped)
- **Explicación:** Ctrl+Z deja al proceso en estado T (stopped): pausado por completo, ni corriendo ni esperando una entrada — solo se reactiva si le mandas bg o fg.

#### 7. [concept] bg: reanudar un trabajo, pero en segundo plano
- **Kicker:** Teoría
- **Tú:** `bg %1`
- **Terminal:** `[1]+ sleep 100 &`
- **Texto:** Un trabajo "Stopped" (por Ctrl+Z) no avanza hasta que le digas qué hacer. "bg" (background) lo reanuda, pero mandalo de vuelta a segundo plano, tal como si le hubieras puesto & desde el principio: la terminal queda libre y el trabajo sigue su curso.

#### 8. [type-command] Escribe bg %1 y presiona Enter
- **Kicker:** Reanudar de fondo
- **Contexto:** "%1" se refiere al trabajo número 1, el mismo número que viste con "jobs". Sin el % también funciona en muchos shells, pero %1 es más explícito.
- **Comando esperado:** `bg %1`
- **Salida simulada:** `[1]+ sleep 100 &`
- **Pista:** Es "bg", un espacio, y el símbolo % seguido del número de trabajo.
- **Tab candidates:** `bg`, `%1`
- **Mensaje de éxito:** El trabajo pasó de "Stopped" a correr de nuevo, esta vez en segundo plano — tu terminal sigue libre.

#### 9. [concept] fg: traer un trabajo de vuelta al primer plano
- **Kicker:** El otro lado de la moneda
- **Tú:** `fg %1`
- **Terminal:** `sleep 100 (terminal ocupada de nuevo)`
- **Texto:** "fg" (foreground) hace justo lo contrario a "bg": toma un trabajo —corriendo de fondo o detenido— y lo trae de vuelta al primer plano, ocupando tu terminal otra vez hasta que termine (o lo pauses de nuevo con Ctrl+Z).

#### 10. [type-command] Escribe fg %1 y presiona Enter
- **Kicker:** Volver al primer plano
- **Contexto:** Al traerlo a primer plano, la terminal vuelve a quedar ocupada por ese comando, igual que si nunca lo hubieras mandado a segundo plano.
- **Comando esperado:** `fg %1`
- **Salida simulada:** `sleep 100`
- **Pista:** Es "fg", un espacio, y el símbolo % seguido del número de trabajo.
- **Tab candidates:** `fg`, `%1`
- **Mensaje de éxito:** Ahora la terminal está ocupada de nuevo con "sleep 100", igual que si lo hubieras escrito sin & desde el inicio.

#### 11. [choice] Tienes un trabajo "Stopped" y quieres que siga corriendo, pero sin que ocupe tu terminal. ¿Qué comando usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cuál de los dos lo reanuda liberando la terminal, y cuál la vuelve a ocupar.
  - ▫️ fg %1
  - ✅ bg %1
  - ▫️ jobs %1
- **Explicación:** "bg %1" reanuda el trabajo detenido en segundo plano, dejando la terminal libre. "fg %1" también lo reanuda, pero ocupando la terminal.

#### 12. [order] Quieres traer de vuelta al primer plano el trabajo número 1. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es lo opuesto a mandar un trabajo a segundo plano.
- **Fichas:** `fg`  `%1`  `bg`  `jobs`  `&`
- **Orden correcto:** `fg` → `%1`
- **Explicación:** "fg %1" trae el trabajo número 1 al primer plano; "bg %1" haría lo contrario, mandarlo a segundo plano.

#### 13. [concept] Segundo plano: lo esencial
- **Kicker:** Resumen
- **Terminal:** `& al final: manda un comando de fondo`
- **Terminal:** `jobs / Ctrl+Z / bg / fg: manejarlo después`
- **Texto:** Repasemos: agregar & al final de un comando lo manda a correr en segundo plano, liberando tu terminal de inmediato, y el shell le asigna un número de trabajo que puedes consultar con "jobs". Si un comando ya quedó ocupando la terminal en primer plano, Ctrl+Z lo pausa (estado Stopped) sin matarlo. Desde ahí, "bg %n" lo reanuda de fondo y "fg %n" lo trae de vuelta al primer plano. Con estas cuatro piezas puedes correr varias tareas a la vez sin depender de múltiples terminales. En la siguiente lección verás cómo terminar procesos por completo con kill.

### Lección 4: Terminar procesos — kill y las señales comunes
12 pasos.

#### 1. [concept] Terminar un proceso: el comando kill
- **Kicker:** Antes de empezar
- **Tú:** `kill 5320`
- **Terminal:** `(el proceso con PID 5320 termina)`
- **Texto:** A pesar del nombre, "kill" no "mata" nada por la fuerza por defecto: envía una señal a un proceso, identificado por su PID. Esa señal es un mensaje del sistema que le pide (o le exige) al proceso que haga algo — normalmente, terminar. Lo que pasa después depende de qué señal mandes.

#### 2. [type-command] Escribe kill 5320 y presiona Enter
- **Kicker:** Pedir que termine
- **Contexto:** Sin especificar una señal, "kill" envía SIGTERM (señal 15): una petición educada para que el proceso termine por su cuenta.
- **Comando esperado:** `kill 5320`
- **Salida simulada:** `[1]+  Terminated              sleep 100`
- **Pista:** Es "kill", un espacio, y el PID del proceso.
- **Tab candidates:** `kill`, `5320`
- **Mensaje de éxito:** El proceso recibió SIGTERM y terminó por su cuenta — alcanzó a cerrar archivos abiertos y liberar recursos antes de irse.

#### 3. [concept] SIGTERM: una petición, no una orden
- **Kicker:** Teoría
- **Terminal:** `SIGTERM (15): "por favor, termina"`
- **Texto:** SIGTERM le avisa al proceso que debe terminar, pero le deja margen para reaccionar: puede guardar cambios pendientes, cerrar conexiones de red o limpiar archivos temporales antes de salir. Un programa bien hecho responde a SIGTERM cerrándose de forma ordenada. El problema es que un proceso trabado o mal programado puede ignorarla.

#### 4. [concept] SIGKILL: la señal que no se puede ignorar
- **Kicker:** Un paso más
- **Tú:** `kill -9 5320`
- **Terminal:** `SIGKILL (9): termina de inmediato, sin aviso`
- **Texto:** Cuando un proceso ignora SIGTERM (o está completamente trabado), existe SIGKILL, la señal número 9: el kernel termina el proceso de inmediato, sin darle oportunidad de reaccionar ni de limpiar nada. Se escribe agregando -9 (o -SIGKILL) después de "kill". Es el último recurso, no la primera opción.

#### 5. [type-command] Escribe kill -9 5320 y presiona Enter
- **Kicker:** Forzar la terminación
- **Contexto:** El -9 indica la señal SIGKILL. A diferencia de SIGTERM, un proceso no puede capturarla ni ignorarla: el kernel lo termina de una vez.
- **Comando esperado:** `kill -9 5320`
- **Salida simulada:** `[1]+  Killed                  sleep 100`
- **Pista:** Es "kill", un espacio, guion, el número 9, otro espacio, y el PID.
- **Tab candidates:** `kill`, `-9`, `5320`
- **Mensaje de éxito:** "Killed" en vez de "Terminated": el proceso no tuvo chance de reaccionar, simplemente dejó de existir.

#### 6. [choice] Un proceso lleva varios minutos sin responder a "kill" (SIGTERM) y sigue en la lista de "ps". ¿Qué conviene probar después?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en la señal que el proceso no puede ignorar ni capturar.
  - ▫️ Volver a mandar SIGTERM otra vez
  - ✅ kill -9 (SIGKILL)
  - ▫️ Esperar a que el sistema lo cierre solo
- **Explicación:** Si un proceso ignora SIGTERM, SIGKILL (-9) es la opción que garantiza que el kernel lo termine, ya que ningún proceso puede bloquear o ignorar esa señal.

#### 7. [concept] Terminar un job por su número, no por su PID
- **Kicker:** Otro ángulo
- **Tú:** `kill %1`
- **Terminal:** `[1]+  Terminated              sleep 100 &`
- **Texto:** Si el proceso lo mandaste tú mismo a segundo plano con &, no siempre hace falta buscar su PID: puedes usar el número de job que viste con "jobs", igual que hiciste con bg y fg. "kill %1" termina el trabajo 1, sin que tengas que consultar su PID primero.

#### 8. [concept] pkill: terminar por nombre, no por PID
- **Kicker:** Un paso más
- **Tú:** `pkill firefox`
- **Terminal:** `(todos los procesos llamados "firefox" terminan)`
- **Texto:** Buscar el PID a mano con "ps aux | grep" antes de cada "kill" es tedioso. "pkill" salta ese paso: le das el nombre del programa y termina, con SIGTERM, todos los procesos que coincidan con ese nombre — aunque haya varios (como varias pestañas de un mismo navegador).

#### 9. [type-command] Escribe pkill firefox y presiona Enter
- **Kicker:** Terminar por nombre
- **Contexto:** "pkill" busca procesos cuyo nombre coincida con lo que le pases y les manda la señal (SIGTERM por defecto) a todos a la vez.
- **Comando esperado:** `pkill firefox`
- **Salida simulada:** ``
- **Pista:** Es "pkill", un espacio, y el nombre del programa.
- **Tab candidates:** `pkill`, `firefox`
- **Mensaje de éxito:** "pkill" no imprime nada si tiene éxito: el silencio significa que encontró el proceso (o procesos) y les mandó la señal.

#### 10. [choice] Tienes tres pestañas de Firefox abiertas, cada una como un proceso distinto, y quieres cerrarlas todas de un solo comando sin buscar cada PID. ¿Qué usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en cuál de los comandos que viste identifica procesos por nombre en vez de por PID.
  - ▫️ kill 4821
  - ✅ pkill firefox
  - ▫️ jobs firefox
- **Explicación:** "pkill firefox" termina de una vez todos los procesos cuyo nombre coincide con "firefox", sin que tengas que buscar el PID de cada pestaña.

#### 11. [order] Un proceso con PID 5320 no responde a SIGTERM. Quieres forzar su terminación de inmediato. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es la señal que ningún proceso puede ignorar ni capturar.
- **Fichas:** `kill`  `-9`  `5320`  `pkill`  `-1`
- **Orden correcto:** `kill` → `-9` → `5320`
- **Explicación:** "kill -9 5320" envía SIGKILL al proceso 5320, forzándolo a terminar de inmediato sin darle oportunidad de reaccionar.

#### 12. [concept] Terminar procesos: lo esencial
- **Kicker:** Resumen
- **Terminal:** `kill PID: envía una señal (SIGTERM por defecto)`
- **Terminal:** `kill -9 PID / pkill nombre: forzar o terminar por nombre`
- **Texto:** Repasemos: "kill" no mata a la fuerza por defecto, envía SIGTERM, una petición de terminar de forma ordenada que el proceso puede capturar y manejar. Si eso no funciona, SIGKILL ("kill -9") fuerza la terminación de inmediato, sin que el proceso pueda evitarlo. También puedes terminar un trabajo de segundo plano con "kill %n", o saltarte la búsqueda de PID por completo con "pkill nombre", que termina todos los procesos que coincidan con ese nombre. Con esto cierras el ciclo completo: ya sabes qué es un proceso, cómo verlo, cómo manejarlo en segundo plano y cómo terminarlo cuando haga falta.

### Lección 5: Repaso — Pon todo en práctica
17 pasos.

#### 1. [concept] Todo lo que aprendiste en Procesos
- **Kicker:** Repaso final
- **Terminal:** `PID · PPID · árbol de procesos`
- **Terminal:** `ps · top · & · jobs · kill`
- **Texto:** Antes de pasar al siguiente nivel, vamos a repasar mezclado todo lo que ya sabes: qué es un proceso y su PID, cómo verlos con ps y top, cómo manejarlos en segundo plano con &, jobs, bg y fg, y cómo terminarlos con kill y pkill. Si te trabas en algo, vuelve a la lección correspondiente.

#### 2. [choice] Abres tres pestañas del mismo navegador. ¿Qué es correcto?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en la diferencia entre el programa instalado y lo que ocurre cada vez que lo ejecutas.
  - ▫️ Hay un solo proceso, porque es el mismo programa
  - ✅ Hay tres procesos distintos, cada uno con su propio PID
  - ▫️ El PID se comparte entre las tres pestañas
- **Explicación:** Cada ejecución crea un proceso nuevo con su propio PID, aunque el programa (el archivo) sea el mismo.

#### 3. [type-command] Escribe ps aux y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** ps aux muestra todos los procesos del sistema, con columnas de %CPU y %MEM incluidas.
- **Comando esperado:** `ps aux`
- **Salida simulada:** `USER   PID %CPU %MEM    VSZ   RSS TTY  STAT START   TIME COMMAND
user  2417  0.0  0.2  21456  4820 pts/0 Ss  09:10   0:00 bash
user  4821  1.2  3.4 412300 68900 ?    Sl   09:15   0:42 firefox`
- **Pista:** (usa el contexto)
- **Tab candidates:** `ps`, `aux`
- **Mensaje de éxito:** %CPU y %MEM te dicen cuánto está consumiendo cada proceso del sistema, no solo los de tu terminal.

#### 4. [choice] En "ps -ef", ves que el proceso firefox (PID 4821) tiene PPID 2417, el mismo PID que bash. ¿Qué significa eso?
- **Kicker:** Repaso mezclado
- **Contexto:** PPID siempre apunta al proceso que creó a otro.
  - ▫️ bash es el proceso hijo de firefox
  - ✅ bash es el proceso padre de firefox
  - ▫️ firefox y bash son el mismo proceso
- **Explicación:** El PPID de un proceso es el PID de su padre. Si el PPID de firefox coincide con el PID de bash, bash es quien lo creó: su padre.

#### 5. [choice] Un proceso lleva un rato sin usar la CPU, solo esperando a que llegue una respuesta de red. ¿En qué estado está, según la columna STAT?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en cuál de los tres estados corresponde a "esperando algo", sin estar pausado a propósito.
  - ▫️ R (running)
  - ✅ S (sleeping)
  - ▫️ T (stopped)
- **Explicación:** S (sleeping) es el estado de un proceso que espera algo —como una respuesta de red— sin consumir CPU mientras tanto.

#### 6. [order] Quieres ver los procesos del sistema junto con la columna PPID, para saber quién creó a quién. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Es la variante de ps que usa guion, distinta de "aux".
- **Fichas:** `ps`  `-ef`  `top`  `jobs`  `-9`
- **Orden correcto:** `ps` → `-ef`
- **Explicación:** "ps -ef" incluye la columna PPID; "ps aux" en cambio no la muestra directamente.

#### 7. [type-command] Escribe jobs y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** jobs lista los trabajos en segundo plano (o pausados) de tu sesión, con su número y estado.
- **Comando esperado:** `jobs`
- **Salida simulada:** `[1]+  Running                 sleep 100 &`
- **Pista:** (usa el contexto)
- **Tab candidates:** `jobs`
- **Mensaje de éxito:** El número entre corchetes es el número de trabajo, distinto y más corto que el PID.

#### 8. [choice] Escribes sleep 300 & en vez de sleep 300. ¿Qué cambia?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué le pasa a tu terminal justo después de presionar Enter.
  - ▫️ La terminal queda ocupada 300 segundos igual que sin &
  - ✅ La terminal se libera de inmediato y el comando sigue corriendo de fondo
  - ▫️ El comando se cancela apenas lo escribes
- **Explicación:** El & manda el comando a segundo plano: la terminal queda libre de inmediato mientras el proceso sigue corriendo.

#### 9. [choice] Presionas Ctrl+Z sobre un comando que estaba corriendo en primer plano. ¿En qué estado queda, y qué le pasa a tu terminal?
- **Kicker:** Repaso mezclado
- **Contexto:** Ctrl+Z no cancela el proceso, solo lo pausa.
  - ▫️ Queda "Running" y la terminal sigue ocupada
  - ✅ Queda "Stopped" y la terminal se libera
  - ▫️ El proceso termina por completo
- **Explicación:** Ctrl+Z pausa el proceso (estado Stopped, T) sin matarlo, y te devuelve el control de la terminal de inmediato.

#### 10. [order] Tienes el trabajo 1 en estado Stopped y quieres que siga corriendo, pero sin ocupar tu terminal. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Es lo contrario de traerlo de vuelta al primer plano.
- **Fichas:** `bg`  `%1`  `fg`  `kill`  `&`
- **Orden correcto:** `bg` → `%1`
- **Explicación:** "bg %1" reanuda el trabajo 1 en segundo plano, dejando la terminal libre.

#### 11. [choice] ¿Cuál es la diferencia entre fg %1 y bg %1?
- **Kicker:** Repaso mezclado
- **Contexto:** Ambos reanudan un trabajo detenido; la diferencia está en qué pasa con tu terminal.
  - ▫️ fg lo reanuda de fondo, bg lo trae al primer plano
  - ✅ fg lo trae al primer plano (ocupa la terminal), bg lo reanuda de fondo (la libera)
  - ▫️ No hay ninguna diferencia real
- **Explicación:** "fg" trae un trabajo al primer plano, ocupando la terminal; "bg" lo reanuda en segundo plano, dejándola libre.

#### 12. [type-command] Escribe kill 4821 y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** Sin especificar señal, kill envía SIGTERM: una petición de terminar de forma ordenada.
- **Comando esperado:** `kill 4821`
- **Salida simulada:** `[2]+  Terminated              firefox`
- **Pista:** (usa el contexto)
- **Tab candidates:** `kill`, `4821`
- **Mensaje de éxito:** SIGTERM le da al proceso la chance de cerrar limpio antes de terminar.

#### 13. [choice] Un proceso ignora SIGTERM y sigue apareciendo en ps. ¿Qué señal garantiza que el kernel lo termine, sin que el proceso pueda evitarlo?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en la señal que ningún proceso puede capturar ni ignorar.
  - ▫️ SIGTERM otra vez
  - ✅ SIGKILL (-9)
  - ▫️ SIGSTOP
- **Explicación:** SIGKILL (señal 9) no puede ser ignorada ni capturada: el kernel termina el proceso de inmediato.

#### 14. [order] Quieres forzar la terminación inmediata del proceso con PID 5320. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Es kill, seguido de la opción de la señal que no se puede ignorar.
- **Fichas:** `kill`  `-9`  `5320`  `pkill`  `bg`
- **Orden correcto:** `kill` → `-9` → `5320`
- **Explicación:** "kill -9 5320" envía SIGKILL al proceso 5320, forzándolo a terminar sin darle oportunidad de reaccionar.

#### 15. [choice] Tienes varias pestañas de Firefox abiertas y quieres cerrarlas todas sin buscar cada PID. ¿Qué comando usas?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en el comando que identifica procesos por nombre en vez de por PID.
  - ▫️ kill firefox
  - ✅ pkill firefox
  - ▫️ jobs firefox
- **Explicación:** "pkill firefox" termina todos los procesos cuyo nombre coincide con "firefox", sin necesidad de buscar cada PID.

#### 16. [type-command] Escribe pstree y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** pstree dibuja la jerarquía completa de padres e hijos, sin que tengas que cruzar columnas de PID y PPID.
- **Comando esperado:** `pstree`
- **Salida simulada:** `init─┬─bash───firefox
     └─cron`
- **Pista:** (usa el contexto)
- **Tab candidates:** `pstree`
- **Mensaje de éxito:** Es la misma información de padres e hijos que verías cruzando PID y PPID a mano, pero ya dibujada.

#### 17. [choice] Ves un proceso con estado Z (zombi) en ps aux. ¿Qué significa exactamente?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué falta que ocurra para que ese proceso desaparezca de la lista.
  - ✅ Ya terminó, pero su padre aún no revisó su resultado final
  - ▫️ Está a punto de crear un proceso hijo
  - ▫️ Está consumiendo el 100% de la CPU
- **Explicación:** Un proceso zombi ya terminó su ejecución, pero sigue en la lista porque su padre todavía no ha leído su código de salida.

### Lección 6: Desafío final — Resuélvelo por tu cuenta (Desafío final)
> Sin pistas paso a paso: combina lo que aprendiste sobre ver, manejar en segundo plano y terminar procesos para resolver dos situaciones reales de principio a fin.

2 pasos.

#### 1. [multi-step-terminal] Un proceso llamado backup.sh quedó colgado y está consumiendo casi toda la CPU del servidor. Vas a identificarlo y detenerlo, todo en la misma sesión de terminal.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** No hay pasos sueltos: primero necesitas encontrarlo antes de poder actuar sobre él.
  1. **Meta:** Antes de actuar, revisa la lista completa de procesos del sistema para ver cuál está consumiendo más CPU.
     - Comando: `ps aux`
     - Salida: `USER   PID %CPU %MEM    VSZ   RSS TTY  STAT START   TIME COMMAND
root     1  0.0  0.1  16932  1112 ?    Ss   09:03   0:01 /sbin/init
user  2417  0.0  0.2  21456  4820 pts/0 Ss  09:10   0:00 bash
user  6603 97.4  1.1  30512  9820 ?    R    10:02   4:12 backup.sh`
     - Pista: El comando que lista todos los procesos del sistema, con columnas de %CPU y %MEM incluidas.
     - Tab: `ps`, `aux`
  2. **Meta:** Ya viste el PID en la lista anterior. Pide, de forma ordenada, que ese proceso termine por su cuenta.
     - Comando: `kill 6603`
     - Salida: `(sin respuesta: el proceso sigue apareciendo con el mismo PID)`
     - Pista: El comando que envía una señal a un proceso identificándolo por su PID, sin especificar ninguna señal en particular.
     - Tab: `kill`, `6603`
  3. **Meta:** El proceso ignoró la petición anterior. Confirma que sigue corriendo antes de decidir qué hacer.
     - Comando: `ps aux | grep backup.sh`
     - Salida: `user  6603 97.6  1.1  30512  9820 ?    R    10:02   4:45 backup.sh
user  6702  0.0  0.0   7488   840 pts/0 S+   10:06   0:00 grep --color=auto backup.sh`
     - Pista: El comando para listar procesos, combinado con un filtro para quedarte solo con el nombre que buscas.
     - Tab: `ps`, `aux`, `grep`, `backup.sh`
  4. **Meta:** Ya que ignoró la petición ordinaria, fuerza su terminación inmediata sin darle más oportunidades de reaccionar.
     - Comando: `kill -9 6603`
     - Salida: `[1]+  Killed                  backup.sh`
     - Pista: El comando para terminar procesos, con la opción que envía la señal que ningún proceso puede ignorar.
     - Tab: `kill`, `-9`, `6603`
  5. **Meta:** Verifica que ya no queda ningún rastro de backup.sh corriendo.
     - Comando: `ps aux | grep backup.sh`
     - Salida: `user  6810  0.0  0.0   7488   840 pts/0 S+   10:08   0:00 grep --color=auto backup.sh`
     - Pista: El mismo comando que usaste para confirmar que seguía corriendo.
     - Tab: `ps`, `aux`, `grep`, `backup.sh`
- **Mensaje final:** ¡Resuelto! Encontraste el proceso problemático y escalaste a la señal correcta cuando la primera petición no funcionó, sin que nadie te dijera los comandos exactos.

#### 2. [multi-step-terminal] Sin darte cuenta, lanzaste el mismo script de sincronización varias veces en segundo plano y ahora compiten entre sí. Vas a revisar qué quedó corriendo y terminarlo todo de una sola vez, sin afectar el resto de tu sesión.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Vas a necesitar revisar tanto los trabajos de tu sesión como los procesos del sistema antes de actuar.
  1. **Meta:** Revisa qué trabajos quedaron corriendo en segundo plano dentro de tu sesión actual.
     - Comando: `jobs`
     - Salida: `[1]-  Running                 sync.sh &
[2]+  Running                 sync.sh &
[3]   Running                 sync.sh &`
     - Pista: El comando que lista los trabajos en segundo plano de tu sesión actual.
     - Tab: `jobs`
  2. **Meta:** Confirma cuántos procesos llamados sync.sh hay corriendo en todo el sistema, no solo en tu sesión.
     - Comando: `ps aux | grep sync.sh`
     - Salida: `user  7011  2.1  0.4  18320  3200 pts/0 S    11:14   0:02 sync.sh
user  7014  2.0  0.4  18320  3180 pts/0 S    11:14   0:02 sync.sh
user  7017  2.2  0.4  18320  3210 pts/0 S    11:14   0:02 sync.sh
user  7101  0.0  0.0   7488   840 pts/0 S+   11:16   0:00 grep --color=auto sync.sh`
     - Pista: El comando para listar todos los procesos del sistema, combinado con un filtro por nombre.
     - Tab: `ps`, `aux`, `grep`, `sync.sh`
  3. **Meta:** En vez de terminar cada PID por separado, termina de una sola vez todos los procesos que se llamen sync.sh.
     - Comando: `pkill sync.sh`
     - Salida: ``
     - Pista: El comando que termina procesos identificándolos por nombre en vez de por PID.
     - Tab: `pkill`, `sync.sh`
  4. **Meta:** Verifica que ya no queda ningún sync.sh corriendo, ni como trabajo de tu sesión ni como proceso del sistema.
     - Comando: `jobs`
     - Salida: `[1]-  Terminated              sync.sh
[2]+  Terminated              sync.sh
[3]   Terminated              sync.sh`
     - Pista: El mismo comando que usaste al principio para ver los trabajos de tu sesión.
     - Tab: `jobs`
- **Mensaje final:** ¡Perfecto! Revisaste tus trabajos en segundo plano y los procesos del sistema, y los terminaste todos de una sola vez sin buscar cada PID por separado.

---

## Unidad 5: Redes
_Unidad 5 · Nivel 5_

### Lección 1: Conceptos de red — IP, puertos, DNS básico
17 pasos.

#### 1. [concept] ¿Qué es una dirección IP?
- **Kicker:** Antes de empezar
- **Tú:** `¿Cómo te encuentro en la red?`
- **Terminal:** `192.168.1.24`
- **Texto:** Una dirección IP es como la dirección postal de un dispositivo dentro de una red: un número que lo identifica para que otros equipos sepan a dónde enviarle datos. Se escribe como cuatro números separados por puntos, por ejemplo 192.168.1.24.

#### 2. [concept] IP privada vs. IP pública
- **Kicker:** Un paso más
- **Terminal:** `Privada: 192.168.1.24 (solo tu red de casa)`
- **Terminal:** `Pública: 190.34.12.8 (tu casa vista desde internet)`
- **Texto:** Tu router te asigna una IP privada, válida solo dentro de tu red local (casa, oficina) — por eso muchos dispositivos distintos pueden tener una IP que empieza igual, como 192.168.x.x. Hacia afuera, tu proveedor de internet le asigna a tu router una IP pública, única en todo internet, que es la que ven los servidores con los que te conectas.

#### 3. [concept] Rangos reservados para IP privada
- **Kicker:** Un paso más
- **Terminal:** `192.168.0.0 – 192.168.255.255 → casa, oficina pequeña`
- **Terminal:** `10.0.0.0 – 10.255.255.255 → redes de empresas grandes`
- **Texto:** No cualquier número puede ser una IP privada: existen rangos reservados específicamente para eso, que nunca aparecen como IP pública en internet. Los más comunes son 192.168.0.0–192.168.255.255 (típico de routers domésticos) y 10.0.0.0–10.255.255.255 (frecuente en redes corporativas). Si ves una IP dentro de esos rangos, sabes que es privada sin necesidad de preguntar nada más.

#### 4. [choice] ¿Cuál de estas direcciones es típica de una red doméstica (privada)?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en los rangos reservados que acabas de ver.
  - ✅ 192.168.1.10
  - ▫️ 190.34.12.8
  - ▫️ 8.8.8.8
- **Explicación:** 192.168.1.10 cae dentro del rango reservado para redes privadas. Las otras dos son direcciones públicas, visibles desde cualquier parte de internet.

#### 5. [type-command] Escribe hostname -I y presiona Enter
- **Kicker:** Tu primer comando de red
- **Contexto:** "hostname -I" (con I mayúscula) muestra la IP privada que tiene asignada tu equipo dentro de la red local.
- **Comando esperado:** `hostname -I`
- **Salida simulada:** `192.168.1.24`
- **Pista:** Es el mismo comando "hostname" que ya conoces, con la opción -I.
- **Tab candidates:** `hostname`
- **Mensaje de éxito:** Esa es la IP privada de tu equipo ahora mismo, dentro de tu red local.

#### 6. [concept] El hostname: el nombre de tu equipo
- **Kicker:** Un paso más
- **Tú:** `hostname`
- **Terminal:** `linuxpath-pc`
- **Texto:** Además de una IP, cada equipo suele tener un "hostname": un nombre legible para las personas, como linuxpath-pc. Mientras que la IP puede cambiar cada vez que te conectas, el hostname suele mantenerse igual, y es más fácil de recordar que una fila de números. "hostname" sin ninguna opción muestra ese nombre; con -I, en cambio, muestra la IP.

#### 7. [type-command] Escribe hostname y presiona Enter (sin -I esta vez)
- **Kicker:** Practica
- **Contexto:** Sin ninguna opción, "hostname" muestra el nombre del equipo, no su IP.
- **Comando esperado:** `hostname`
- **Salida simulada:** `linuxpath-pc`
- **Pista:** Es el mismo comando anterior, pero sin la opción -I al final.
- **Tab candidates:** `hostname`
- **Mensaje de éxito:** Ese es el nombre de tu equipo. Compáralo con la IP que viste antes: uno es para las personas, el otro para la red.

#### 8. [concept] 127.0.0.1: la dirección de "mí mismo"
- **Kicker:** Un paso más
- **Tú:** `ping 127.0.0.1`
- **Terminal:** `siempre responde tu propio equipo`
- **Texto:** Existe una IP especial reservada para un solo propósito: 127.0.0.1, también conocida como "localhost". Sin importar en qué red estés conectado, esa dirección siempre apunta a tu propio equipo — nunca sale a la red real. Se usa muchísimo para probar programas o servicios que corren localmente, antes de exponerlos a otros equipos.

#### 9. [choice] Te conectas a la red de un café, y luego a la de tu casa. ¿A qué equipo apunta 127.0.0.1 (localhost) en cada caso?
- **Kicker:** Elige la respuesta
- **Contexto:** localhost no depende de la red a la que estés conectado.
  - ✅ Siempre al tuyo propio, sin importar la red
  - ▫️ Al router de la red en la que estés
  - ▫️ Al primer equipo que se conectó a esa red
- **Explicación:** 127.0.0.1 (localhost) siempre se refiere a tu propio equipo, sin importar a qué red te hayas conectado. Es una dirección que nunca sale hacia la red real.

#### 10. [concept] ¿Qué es un puerto?
- **Kicker:** Un paso más
- **Terminal:** `192.168.1.24:80 → servidor web`
- **Terminal:** `192.168.1.24:22 → acceso remoto (SSH)`
- **Texto:** Si la IP es la dirección del edificio, el puerto es el número de la puerta dentro de él: identifica a qué programa o servicio va dirigida la conexión. Un mismo equipo puede tener varios servicios corriendo a la vez, cada uno escuchando en su propio puerto — por ejemplo, el puerto 80 suele usarse para páginas web, y el 22 para conexiones SSH.

#### 11. [concept] Puertos conocidos que verás seguido
- **Kicker:** Un paso más
- **Terminal:** `22 → SSH · 53 → DNS`
- **Terminal:** `80 → HTTP · 443 → HTTPS`
- **Texto:** Existen miles de puertos posibles, pero un puñado se repite todo el tiempo porque están "reservados por convención" para servicios específicos: 22 para SSH (acceso remoto), 53 para DNS, 80 para páginas web sin cifrar (HTTP) y 443 para páginas web cifradas (HTTPS). Reconocerlos de memoria te va a ahorrar tiempo en las próximas lecciones.

#### 12. [match-pairs] Une cada puerto conocido con el servicio que suele usarlo
- **Kicker:** Relaciona cada par
- **Contexto:** Estos cuatro son los que vas a ver con más frecuencia.
  - `22` ↔ SSH (acceso remoto)
  - `53` ↔ DNS (traducción de nombres)
  - `80` ↔ HTTP (web sin cifrar)
  - `443` ↔ HTTPS (web cifrada)
- **Explicación:** 22 es SSH, 53 es DNS, 80 es HTTP y 443 es HTTPS. No son reglas obligatorias, pero casi todos los servicios respetan esta convención.

#### 13. [choice] Dos programas de tu equipo necesitan recibir conexiones de red al mismo tiempo. ¿Cómo se diferencian?
- **Kicker:** Elige la respuesta
- **Contexto:** La IP identifica el equipo, pero un equipo puede correr varios servicios de red a la vez.
  - ▫️ Cada uno usa una IP distinta
  - ✅ Cada uno escucha en un puerto distinto
  - ▫️ No es posible, solo uno puede usar la red
- **Explicación:** La IP identifica al equipo; el puerto identifica a qué programa dentro de ese equipo va dirigida la conexión. Por eso dos servicios pueden convivir en la misma IP si usan puertos distintos.

#### 14. [concept] ¿Qué es el DNS?
- **Kicker:** Un paso más
- **Tú:** `linuxpath.dev`
- **Terminal:** `→ 190.34.12.8`
- **Texto:** Nadie quiere memorizar números para visitar una página. El DNS (Domain Name System) es como una agenda de contactos gigante que traduce nombres fáciles de recordar, como linuxpath.dev, a la dirección IP real del servidor que los atiende. Cada vez que escribes una dirección web, tu equipo primero le pregunta al DNS "¿qué IP le corresponde a esto?" antes de conectarse.

#### 15. [choice] Escribes linuxpath.dev en el navegador. ¿Qué pasa primero, antes de que tu equipo se conecte al servidor?
- **Kicker:** Elige la respuesta
- **Contexto:** Los servidores se identifican por IP, no por nombre.
  - ▫️ El navegador adivina la IP
  - ✅ El DNS traduce el nombre a una IP
  - ▫️ Se conecta directo usando el nombre
- **Explicación:** El DNS traduce linuxpath.dev a su IP real (por ejemplo 190.34.12.8); recién con esa IP tu equipo puede establecer la conexión.

#### 16. [order] Quieres ver la IP privada de tu equipo dentro de la red local. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Es el mismo comando "hostname" que ya conoces, con la opción correcta — ojo, la mayúscula importa.
- **Fichas:** `hostname`  `-i`  `-I`  `whoami`  `ip`
- **Orden correcto:** `hostname` → `-I`
- **Explicación:** hostname -I (con I mayúscula) muestra la IP privada del equipo. hostname -i en minúscula no es la misma opción: en Linux, las mayúsculas y minúsculas en los comandos y sus opciones importan.

#### 17. [concept] Repaso rápido
- **Kicker:** Para cerrar
- **Terminal:** `IP: la dirección de un equipo · hostname: su nombre`
- **Terminal:** `Puerto: qué servicio recibe la conexión · 127.0.0.1: siempre tú mismo`
- **Terminal:** `DNS: traduce nombres fáciles a direcciones IP`
- **Texto:** Con estos conceptos ya tienes la base para entender cómo dos equipos se encuentran en una red: la IP (privada o pública) dice dónde está un equipo, el hostname es su nombre para las personas, el puerto dice a qué servicio va dirigida la conexión, 127.0.0.1 siempre apunta a tu propio equipo, y el DNS te ahorra tener que memorizar números. En las próximas lecciones vas a usar ping, curl y ssh — todos se apoyan en estos mismos conceptos.

### Lección 2: ping y traceroute — probar conectividad
11 pasos.

#### 1. [concept] ¿Para qué sirve ping?
- **Kicker:** Antes de empezar
- **Tú:** `¿Estás ahí?`
- **Terminal:** `¡Sí! respuesta en 14ms`
- **Texto:** "ping" envía un pequeño paquete de datos a otro equipo y espera la respuesta, como gritar "¿hay alguien ahí?" y medir cuánto tarda el eco en volver. Sirve para confirmar dos cosas: que el otro equipo está encendido y accesible, y qué tan rápida es la conexión hasta él.

#### 2. [type-command] Escribe ping -c 4 linuxpath.dev y presiona Enter
- **Kicker:** Probar conectividad
- **Contexto:** La opción -c 4 le dice a ping que envíe solo 4 paquetes y se detenga, en vez de seguir indefinidamente.
- **Comando esperado:** `ping -c 4 linuxpath.dev`
- **Salida simulada:** `PING linuxpath.dev (190.34.12.8): 56 data bytes
64 bytes from 190.34.12.8: icmp_seq=0 time=14.2 ms
64 bytes from 190.34.12.8: icmp_seq=1 time=13.8 ms
64 bytes from 190.34.12.8: icmp_seq=2 time=15.1 ms
64 bytes from 190.34.12.8: icmp_seq=3 time=14.0 ms

--- linuxpath.dev ping statistics ---
4 packets transmitted, 4 received, 0% packet loss`
- **Pista:** El comando que "llama" a otro equipo para comprobar que responde, con la opción para limitar cuántas veces.
- **Tab candidates:** `ping`, `-c`, `4`, `linuxpath.dev`
- **Mensaje de éxito:** Los 4 paquetes fueron y volvieron sin perderse (0% packet loss), con un tiempo de ida y vuelta de entre 13 y 15 milisegundos: la conexión está sana.

#### 3. [concept] Leer la salida de ping
- **Kicker:** Un paso más
- **Terminal:** `time=14.2 ms → qué tan rápido responde`
- **Terminal:** `0% packet loss → nada se perdió en el camino`
- **Texto:** Dos datos importan más que el resto: el tiempo ("time"), que te dice cuántos milisegundos tardó la ida y vuelta — mientras más bajo, mejor — y el porcentaje de paquetes perdidos ("packet loss"). Un 0% de pérdida es lo ideal; si empieza a subir, algo en el camino está fallando.

#### 4. [choice] Ejecutas ping hacia un servidor y ves "50% packet loss" en el resultado. ¿Qué significa?
- **Kicker:** Elige la respuesta
- **Contexto:** packet loss mide qué porcentaje de los paquetes enviados nunca recibieron respuesta.
  - ✅ La mitad de los paquetes se perdieron en el camino
  - ▫️ El servidor está funcionando al 50% de su capacidad
  - ▫️ La conexión es el doble de lenta de lo normal
- **Explicación:** packet loss es el porcentaje de paquetes que se enviaron pero nunca volvieron con respuesta. Un 50% indica una conexión inestable, con la mitad de los paquetes perdiéndose en el camino.

#### 5. [concept] ¿Qué hace traceroute?
- **Kicker:** Un paso más
- **Tú:** `¿Por dónde pasan mis datos?`
- **Terminal:** `1 router-casa → 2 isp-gw → 3 destino`
- **Texto:** ping te dice SI llegaste, pero no por dónde pasaste. "traceroute" muestra cada "salto" (router intermedio) que atraviesan tus datos antes de llegar al destino final, como un mapa de las paradas del viaje. Sirve para encontrar en qué punto exacto del camino se está frenando o cortándose una conexión lenta.

#### 6. [type-command] Escribe traceroute linuxpath.dev y presiona Enter
- **Kicker:** Ver la ruta de los paquetes
- **Contexto:** "traceroute" muestra cada router intermedio ("salto") por el que pasan tus datos antes de llegar al destino.
- **Comando esperado:** `traceroute linuxpath.dev`
- **Salida simulada:** `traceroute to linuxpath.dev (190.34.12.8), 30 hops max
 1  192.168.1.1        1.2 ms
 2  10.20.0.1           8.4 ms
 3  200.14.5.33         12.1 ms
 4  190.34.12.8         14.6 ms`
- **Pista:** El comando que traza ("trace") la ruta ("route") que siguen tus datos hasta el destino.
- **Tab candidates:** `traceroute`, `linuxpath.dev`
- **Mensaje de éxito:** Cuatro saltos hasta el destino: tu router, la puerta de enlace de tu proveedor, un punto intermedio, y por último el servidor de linuxpath.dev.

#### 7. [concept] ¿Qué es el TTL?
- **Kicker:** Un paso más
- **Terminal:** `ttl=54`
- **Tú:** `¿Por qué no sigue viajando para siempre?`
- **Texto:** Cada paquete que envía ping lleva un contador llamado TTL ("Time To Live"), que baja de a uno en cada router que atraviesa. Si llega a cero antes de alcanzar el destino, el paquete se descarta. Existe para que un paquete perdido en un bucle de red no viaje eternamente consumiendo recursos: en algún momento "se le acaba el tiempo" y desaparece.

#### 8. [type-command] Escribe ping -c 4 servidor-lento.local y presiona Enter
- **Kicker:** Diagnosticar un problema
- **Contexto:** Esta vez la conexión no está sana: vas a ver cómo se ve un ping con paquetes perdidos.
- **Comando esperado:** `ping -c 4 servidor-lento.local`
- **Salida simulada:** `PING servidor-lento.local (10.20.0.55): 56 data bytes
64 bytes from 10.20.0.55: icmp_seq=0 time=210.4 ms
Request timeout for icmp_seq=1
64 bytes from 10.20.0.55: icmp_seq=2 time=198.7 ms
Request timeout for icmp_seq=3

--- servidor-lento.local ping statistics ---
4 packets transmitted, 2 received, 50% packet loss`
- **Pista:** El mismo comando que ya usaste, apuntando a un host distinto.
- **Tab candidates:** `ping`, `-c`, `4`, `servidor-lento.local`
- **Mensaje de éxito:** Dos cosas están mal aquí: la mitad de los paquetes nunca volvió (50% packet loss) y los que sí volvieron tardaron más de 200ms, muy por encima de los 14ms que viste antes. Esta conexión tiene un problema real.

#### 9. [concept] Cuando un salto no responde
- **Kicker:** Un paso más
- **Terminal:** `3  * * *`
- **Terminal:** `4  190.34.12.8   16.2 ms`
- **Texto:** A veces, en la salida de traceroute vas a ver un salto marcado solo con asteriscos (* * *) en vez de una IP y un tiempo. Eso no siempre significa que la red esté rota ahí: muchos routers intermedios están configurados para no responder a este tipo de sondeos por seguridad, aunque sigan reenviando el tráfico con normalidad. Lo que realmente importa es si el último salto (el destino) responde.

#### 10. [choice] Necesitas saber si un servidor está caído, o si está arriba pero muy lento. ¿Qué comando usas primero?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué pregunta responde cada comando.
  - ▫️ traceroute, porque muestra más detalle
  - ✅ ping, porque confirma si responde y mide la latencia
  - ▫️ Cualquiera de los dos, dan la misma información
- **Explicación:** ping es el primer paso natural: con una sola ejecución sabes si el servidor responde y qué tan rápido lo hace. traceroute se usa después, solo si necesitas ver en qué punto exacto del camino se origina un problema.

#### 11. [concept] Repaso rápido
- **Kicker:** Para cerrar
- **Terminal:** `ping: ¿está ahí y qué tan rápido responde?`
- **Terminal:** `traceroute: ¿por dónde pasa el camino hasta él?`
- **Texto:** ping confirma que un equipo responde y mide la latencia; traceroute muestra la ruta completa, salto por salto. Usados juntos son las primeras herramientas para diagnosticar cualquier problema de conectividad: primero confirmas si llegas, y si algo anda mal, ves dónde exactamente se corta el camino.

### Lección 3: curl y wget — peticiones desde la terminal
9 pasos.

#### 1. [concept] ¿Qué es curl?
- **Kicker:** Antes de empezar
- **Tú:** `curl https://linuxpath.dev/api/status`
- **Terminal:** `{"status":"ok"}`
- **Texto:** "curl" le pide datos a una dirección web directamente desde la terminal, sin necesidad de abrir un navegador. Es la forma más rápida de probar si una página o un servicio responde, y qué responde exactamente.

#### 2. [type-command] Escribe curl https://linuxpath.dev/api/status y presiona Enter
- **Kicker:** Tu primera petición
- **Contexto:** "curl" seguido de una dirección hace una petición y muestra la respuesta directamente en la terminal.
- **Comando esperado:** `curl https://linuxpath.dev/api/status`
- **Salida simulada:** `{"status":"ok","uptime":"14d"}`
- **Pista:** El comando que pide datos a una dirección web, seguido de la dirección completa.
- **Tab candidates:** `curl`, `https://linuxpath.dev/api/status`
- **Mensaje de éxito:** El servidor respondió con un JSON: así lucen muchas respuestas de APIs modernas.

#### 3. [concept] ¿Qué es un código de estado HTTP?
- **Kicker:** Un paso más
- **Terminal:** `200 OK → todo bien`
- **Terminal:** `404 Not Found → no existe`
- **Texto:** Cada vez que pides algo a un servidor web, este responde con un número de tres cifras llamado código de estado, que resume qué pasó con la petición antes de mostrarte cualquier contenido. 200 significa que todo salió bien; hay muchos otros para distintas situaciones.

#### 4. [type-command] Escribe curl -I https://linuxpath.dev y presiona Enter
- **Kicker:** Ver el código de estado
- **Contexto:** La opción -I (mayúscula) pide solo las cabeceras de la respuesta, sin el contenido completo — ahí aparece el código de estado.
- **Comando esperado:** `curl -I https://linuxpath.dev`
- **Salida simulada:** `HTTP/2 200 
content-type: text/html
date: Tue, 15 Sep 2026 10:02:11 GMT`
- **Pista:** El mismo comando curl, con la opción para pedir solo cabeceras.
- **Tab candidates:** `curl`, `-I`, `https://linuxpath.dev`
- **Mensaje de éxito:** 200 en la primera línea: el servidor respondió sin problemas.

#### 5. [match-pairs] Une cada código de estado HTTP con lo que significa
- **Kicker:** Relaciona cada par
- **Contexto:** Estos son los códigos que vas a ver con más frecuencia al trabajar con curl.
  - `200 OK` ↔ La petición funcionó correctamente
  - `301` ↔ El recurso se movió a otra dirección
  - `404` ↔ El recurso pedido no existe
  - `500` ↔ Falló algo del lado del servidor
- **Explicación:** 200 es éxito, 301 es una redirección permanente, 404 es "no encontrado" y 500 es un error interno del servidor: memorizar estos cuatro te cubre la gran mayoría de los casos del día a día.

#### 6. [concept] ¿Qué es wget?
- **Kicker:** Un paso más
- **Tú:** `wget https://linuxpath.dev/logo.png`
- **Terminal:** `logo.png guardado (48 KB)`
- **Texto:** Mientras curl está pensado para mostrar la respuesta o trabajar con APIs, "wget" está pensado para descargar y guardar un archivo directamente en tu carpeta actual. Si quieres ver o procesar una respuesta, usas curl; si quieres el archivo completo guardado en disco, usas wget.

#### 7. [type-command] Escribe wget https://linuxpath.dev/logo.png y presiona Enter
- **Kicker:** Descargar un archivo
- **Contexto:** "wget" descarga el archivo de esa dirección y lo guarda en tu carpeta actual.
- **Comando esperado:** `wget https://linuxpath.dev/logo.png`
- **Salida simulada:** `Guardando en: 'logo.png'
logo.png          100%[===================>]  48.20K  --.-KB/s    in 0.03s
'logo.png' guardado [49356/49356]`
- **Pista:** El comando que descarga y guarda un archivo, seguido de su dirección.
- **Tab candidates:** `wget`, `https://linuxpath.dev/logo.png`
- **Mensaje de éxito:** El archivo ya está en tu carpeta actual, listo para usarse.

#### 8. [choice] Quieres descargar una imagen y guardarla como archivo en tu carpeta actual, sin procesar nada más. ¿Qué comando usas?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué hace cada comando por defecto: uno muestra, el otro guarda.
  - ▫️ curl, porque es más rápido
  - ✅ wget, porque está pensado para guardar archivos
  - ▫️ Cualquiera de los dos hace exactamente lo mismo
- **Explicación:** wget está diseñado específicamente para descargar y guardar archivos en disco. curl también puede guardar archivos con la opción -O, pero por defecto muestra la respuesta en pantalla.

#### 9. [concept] Repaso rápido
- **Kicker:** Para cerrar
- **Terminal:** `curl: pide y muestra (o procesa) una respuesta`
- **Terminal:** `wget: descarga y guarda un archivo`
- **Texto:** curl y wget cubren las dos necesidades más comunes al trabajar con la web desde la terminal: consultar una API o probar una conexión con curl, y descargar archivos con wget. Ambos son herramientas que vas a usar constantemente en scripts y automatizaciones.

### Lección 4: ssh básico — conectarte a otra máquina
17 pasos.

#### 1. [concept] ¿Qué es SSH?
- **Kicker:** Antes de empezar
- **Tú:** `Necesito trabajar en ese servidor`
- **Terminal:** `conexión cifrada establecida`
- **Texto:** SSH (Secure Shell) te deja abrir una terminal en otro equipo a través de la red, como si estuvieras sentado justo frente a él. A diferencia de conexiones antiguas como telnet, todo lo que viaja por SSH va cifrado: nadie que intercepte el tráfico puede leer tu contraseña ni lo que escribes.

#### 2. [concept] La sintaxis básica: usuario@host
- **Kicker:** Un paso más
- **Tú:** `ssh dev@servidor.linuxpath.dev`
- **Terminal:** `(ahora estás dentro del servidor remoto)`
- **Texto:** El comando ssh siempre sigue el mismo patrón: el nombre de usuario con el que quieres entrar, una arroba, y la dirección del servidor (un dominio o una IP). Si el usuario remoto se llama igual que tu usuario local, puedes omitirlo: ssh usa tu usuario actual por defecto.

#### 3. [type-command] Escribe ssh dev@servidor.linuxpath.dev y presiona Enter
- **Kicker:** Tu primera conexión
- **Contexto:** ssh usuario@host abre una sesión remota en ese servidor, pidiéndote autenticarte antes de dejarte entrar.
- **Comando esperado:** `ssh dev@servidor.linuxpath.dev`
- **Salida simulada:** `The authenticity of host 'servidor.linuxpath.dev (190.34.12.8)' can't be established.
ED25519 key fingerprint is SHA256:9fK2xQ...
Are you sure you want to continue connecting (yes/no)? yes
dev@servidor.linuxpath.dev's password: 
Last login: Mon Sep 14 09:12:03 2026 from 192.168.1.24
dev@servidor:~$`
- **Pista:** Es ssh, seguido del usuario, una arroba, y la dirección del servidor, todo junto y sin espacios.
- **Tab candidates:** `ssh`, `dev@servidor.linuxpath.dev`
- **Mensaje de éxito:** ¡Conectado! Ese último prompt, dev@servidor:~$, ya no es tu máquina: es la terminal del servidor remoto.

#### 4. [concept] La huella del servidor (fingerprint)
- **Kicker:** Un detalle importante
- **Terminal:** `The authenticity of host ... can't be established`
- **Tú:** `¿confías en este servidor?`
- **Texto:** La primera vez que te conectas a un servidor nuevo, SSH no tiene forma de saber si de verdad es quien dice ser, así que te muestra su "huella digital" (fingerprint) y te pregunta si confías en ella. Si respondes "yes", SSH la guarda en un archivo llamado known_hosts, y las próximas conexiones ya no vuelven a preguntar.

#### 5. [choice] Te conectas a un servidor al que ya te habías conectado antes, y esta vez SSH muestra una advertencia en mayúsculas de que la huella del servidor cambió, negándose a continuar. ¿Qué deberías hacer?
- **Kicker:** Elige la respuesta
- **Contexto:** SSH guarda la huella del servidor la primera vez justamente para detectar este tipo de cambios inesperados.
  - ▫️ Confirmar igual con "yes": es solo una advertencia menor
  - ✅ Detenerte e investigar por qué cambió antes de continuar
  - ▫️ Desinstalar y reinstalar SSH
- **Explicación:** Una huella que cambia sin explicación puede significar que alguien está interceptando la conexión. SSH se niega a continuar automáticamente como medida de protección; conviene confirmar por otro medio que el cambio es legítimo (por ejemplo, que el servidor se reinstaló) antes de seguir.

#### 6. [concept] Contraseña vs. llaves: dos formas de autenticarte
- **Kicker:** Un paso más
- **Terminal:** `contraseña: fácil de robar o adivinar`
- **Terminal:** `llave pública/privada: mucho más segura`
- **Texto:** SSH admite dos formas de autenticarte: con contraseña (la que escribiste recién), o con un par de llaves criptográficas — una privada que nunca sale de tu equipo, y una pública que compartes con el servidor. Las llaves son más seguras porque no viajan por la red ni se pueden adivinar por fuerza bruta, y además te dejan conectarte sin escribir contraseña cada vez.

#### 7. [type-command] Escribe ssh-keygen -t ed25519 y presiona Enter
- **Kicker:** Crear tu par de llaves
- **Contexto:** ssh-keygen genera un nuevo par de llaves. -t ed25519 indica el tipo de algoritmo a usar, uno de los más modernos y recomendados hoy en día.
- **Comando esperado:** `ssh-keygen -t ed25519`
- **Salida simulada:** `Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/dev/.ssh/id_ed25519): 
Your identification has been saved in /home/dev/.ssh/id_ed25519
Your public key has been saved in /home/dev/.ssh/id_ed25519.pub`
- **Pista:** Es ssh-keygen, seguido de -t y el nombre del algoritmo.
- **Tab candidates:** `ssh-keygen`, `-t`, `ed25519`
- **Mensaje de éxito:** Ya tienes tu par de llaves: una privada (id_ed25519) que nunca compartes, y una pública (id_ed25519.pub) que sí puedes entregar.

#### 8. [concept] Autorizar tu llave en el servidor: ssh-copy-id
- **Kicker:** Un paso más
- **Tú:** `ssh-copy-id dev@servidor.linuxpath.dev`
- **Terminal:** `llave pública añadida al servidor`
- **Texto:** Generar las llaves no basta: el servidor necesita conocer tu llave pública para reconocerte. ssh-copy-id hace justamente eso: copia tu llave pública al servidor y la agrega a su lista de llaves autorizadas, en un solo paso.

#### 9. [type-command] Escribe ssh-copy-id dev@servidor.linuxpath.dev y presiona Enter
- **Kicker:** Copiar tu llave al servidor
- **Contexto:** ssh-copy-id copia tu llave pública al servidor indicado y la deja lista para futuras conexiones.
- **Comando esperado:** `ssh-copy-id dev@servidor.linuxpath.dev`
- **Salida simulada:** `/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s)
Number of key(s) added: 1
Now try logging into the machine, with: "ssh 'dev@servidor.linuxpath.dev'"`
- **Pista:** Es ssh-copy-id, seguido del usuario, una arroba y la dirección del servidor, igual que con ssh.
- **Tab candidates:** `ssh-copy-id`, `dev@servidor.linuxpath.dev`
- **Mensaje de éxito:** A partir de ahora, ssh dev@servidor.linuxpath.dev te va a dejar entrar sin pedirte contraseña.

#### 10. [match-pairs] Une cada comando con lo que hace
- **Kicker:** Relaciona cada par
- **Contexto:** Los cuatro comandos que acabas de ver, resumidos en un solo lugar.
  - `ssh` ↔ Abre una sesión de terminal remota en otro equipo
  - `ssh-keygen` ↔ Genera un nuevo par de llaves pública/privada
  - `ssh-copy-id` ↔ Copia tu llave pública a un servidor remoto
  - `scp` ↔ Copia archivos entre equipos usando SSH
- **Explicación:** ssh conecta, ssh-keygen crea las llaves, ssh-copy-id las autoriza en el servidor, y scp copia archivos aprovechando esa misma conexión cifrada.

#### 11. [choice] Después de usar ssh-copy-id, ¿por qué ya no te pide contraseña al conectarte?
- **Kicker:** Elige la respuesta
- **Contexto:** Piensa en qué comprobó exactamente ssh-copy-id en el paso anterior.
  - ▫️ Porque SSH memorizó tu contraseña
  - ✅ Porque el servidor ya reconoce tu llave pública y puede verificar que tienes la privada
  - ▫️ Porque desactivaste la seguridad del servidor
- **Explicación:** El servidor guarda tu llave pública; al conectarte, SSH demuestra matemáticamente que tienes la llave privada correspondiente, sin que esta viaje nunca por la red. Eso reemplaza a la contraseña de forma más segura.

#### 12. [concept] Cuando el servidor usa otro puerto: -p
- **Kicker:** Un paso más
- **Tú:** `ssh -p 2222 dev@servidor.linuxpath.dev`
- **Texto:** Por defecto, SSH usa el puerto 22. Algunos servidores, por seguridad, corren SSH en otro puerto para reducir los intentos automáticos de acceso de bots. La opción -p (minúscula) le indica a ssh en qué puerto conectarse en vez del 22.

#### 13. [order] Quieres conectarte como usuario dev al servidor servidor.linuxpath.dev, que corre SSH en el puerto 2222 en vez del puerto por defecto. Ordena las piezas.
- **Kicker:** Ordena el comando
- **Contexto:** Necesitas la opción de puerto antes del destino, con el número correcto.
- **Fichas:** `-P`  `ssh`  `-p`  `2222`  `dev@servidor.linuxpath.dev`
- **Orden correcto:** `ssh` → `-p` → `2222` → `dev@servidor.linuxpath.dev`
- **Explicación:** ssh -p 2222 dev@servidor.linuxpath.dev le dice a ssh que use el puerto 2222 en vez del 22 por defecto. La opción es -p en minúscula: -P mayúscula es una opción distinta.

#### 14. [concept] Copiar archivos con scp
- **Kicker:** Un paso más
- **Tú:** `scp informe.txt dev@servidor.linuxpath.dev:~/`
- **Terminal:** `informe.txt copiado al servidor`
- **Texto:** scp (secure copy) usa la misma conexión cifrada de SSH, pero en vez de abrirte una terminal, copia archivos entre tu equipo y el servidor. La sintaxis se parece a cp: origen y luego destino, salvo que el lado remoto lleva usuario@host: delante de la ruta.

#### 15. [type-command] Escribe scp informe.txt dev@servidor.linuxpath.dev:~/ y presiona Enter
- **Kicker:** Copiar un archivo al servidor
- **Contexto:** scp copia informe.txt desde tu equipo hacia la carpeta personal (~/) del usuario dev en el servidor.
- **Comando esperado:** `scp informe.txt dev@servidor.linuxpath.dev:~/`
- **Salida simulada:** `informe.txt                                  100%   12KB   3.1MB/s   00:00`
- **Pista:** Es scp, el archivo local, y luego usuario@host: seguido de la ruta destino, sin espacio antes de los dos puntos.
- **Tab candidates:** `scp`, `informe.txt`, `dev@servidor.linuxpath.dev:~/`
- **Mensaje de éxito:** ¡Listo! informe.txt ahora vive también en el servidor remoto, copiado de forma cifrada.

#### 16. [concept] Salir de la sesión remota
- **Kicker:** Para cerrar
- **Tú:** `exit`
- **Terminal:** `(sesión remota cerrada, de vuelta en tu equipo)`
- **Texto:** Cuando termines de trabajar en el servidor remoto, exit — el mismo comando que ya conoces — cierra la sesión SSH y te devuelve a la terminal de tu propio equipo. El prompt vuelve a mostrar tu usuario y tu máquina locales en vez de los del servidor.

#### 17. [concept] Repaso rápido
- **Kicker:** Para cerrar
- **Terminal:** `ssh usuario@host abre una terminal remota cifrada`
- **Terminal:** `scp copia archivos usando esa misma conexión`
- **Texto:** Repasemos: ssh usuario@host abre una sesión de terminal cifrada en otro equipo, autenticándote con contraseña o con un par de llaves (más seguras y sin necesidad de escribir contraseña, gracias a ssh-keygen y ssh-copy-id). -p cambia el puerto si el servidor no usa el 22 por defecto. scp usa esa misma conexión para copiar archivos entre equipos, y exit cierra la sesión devolviéndote a tu terminal local.

### Lección 5: Repaso — Pon todo en práctica
17 pasos.

#### 1. [concept] Todo lo que aprendiste en Redes
- **Kicker:** Repaso final
- **Terminal:** `IP · puertos · DNS · ping · traceroute`
- **Terminal:** `curl · wget · ssh · scp`
- **Texto:** Antes de pasar al siguiente nivel, vamos a repasar mezclado todo lo que ya sabes: qué es una IP, un puerto y el DNS, cómo probar conectividad con ping y traceroute, cómo pedir y descargar datos con curl y wget, y cómo conectarte a otro equipo con ssh. Si te trabas en algo, vuelve a la lección correspondiente.

#### 2. [choice] ¿Qué identifica exactamente una dirección IP?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué distingue a un equipo del resto de la red.
  - ✅ Un equipo dentro de una red
  - ▫️ Un archivo específico dentro de un equipo
  - ▫️ El nombre de dominio de una página web
- **Explicación:** Una IP identifica a un equipo dentro de una red, como su dirección postal. El DNS es el que traduce nombres de dominio a esa IP.

#### 3. [type-command] Escribe hostname -I y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** hostname -I (con I mayúscula) muestra la IP privada asignada a tu equipo en la red local.
- **Comando esperado:** `hostname -I`
- **Salida simulada:** `192.168.1.24`
- **Pista:** (usa el contexto)
- **Tab candidates:** `hostname`, `-I`
- **Mensaje de éxito:** Esa IP privada solo es válida dentro de tu red local, no en todo internet.

#### 4. [choice] Dos servicios corren al mismo tiempo en el mismo equipo, con la misma IP. ¿Cómo sabe la red a cuál va dirigida cada conexión?
- **Kicker:** Repaso mezclado
- **Contexto:** La IP identifica al equipo, pero no alcanza para diferenciar servicios dentro de él.
  - ▫️ Cada uno usa una IP distinta
  - ✅ Cada uno escucha en un puerto distinto
  - ▫️ Se turnan para usar la red
- **Explicación:** El puerto identifica a qué servicio dentro del equipo va dirigida la conexión, como el número de una puerta dentro de un edificio.

#### 5. [choice] Escribes linuxpath.dev en el navegador. ¿Qué ocurre primero, antes de que tu equipo se conecte al servidor?
- **Kicker:** Repaso mezclado
- **Contexto:** Los servidores se identifican por IP, no por nombre.
  - ✅ El DNS traduce el nombre a una IP
  - ▫️ El navegador se conecta directo usando el nombre
  - ▫️ El servidor te asigna una IP privada
- **Explicación:** El DNS traduce linuxpath.dev a su IP real; recién con esa IP tu equipo puede establecer la conexión.

#### 6. [type-command] Escribe ping -c 4 linuxpath.dev y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** -c 4 le dice a ping que envíe solo 4 paquetes y se detenga.
- **Comando esperado:** `ping -c 4 linuxpath.dev`
- **Salida simulada:** `PING linuxpath.dev (190.34.12.8): 56 data bytes
64 bytes from 190.34.12.8: icmp_seq=0 time=14.2 ms
64 bytes from 190.34.12.8: icmp_seq=1 time=13.8 ms
64 bytes from 190.34.12.8: icmp_seq=2 time=15.1 ms
64 bytes from 190.34.12.8: icmp_seq=3 time=14.0 ms

--- linuxpath.dev ping statistics ---
4 packets transmitted, 4 received, 0% packet loss`
- **Pista:** (usa el contexto)
- **Tab candidates:** `ping`, `-c`, `4`, `linuxpath.dev`
- **Mensaje de éxito:** 0% packet loss y tiempos parejos: la conexión está sana.

#### 7. [choice] Un ping muestra "50% packet loss". ¿Qué significa?
- **Kicker:** Repaso mezclado
- **Contexto:** packet loss mide qué porcentaje de paquetes nunca volvió con respuesta.
  - ▫️ La conexión es el doble de lenta de lo normal
  - ✅ La mitad de los paquetes se perdieron en el camino
  - ▫️ El servidor está apagado
- **Explicación:** packet loss es el porcentaje de paquetes enviados que nunca recibieron respuesta. 50% indica una conexión inestable.

#### 8. [order] Quieres ver, salto por salto, la ruta que siguen tus datos hasta linuxpath.dev. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Uno de estos comandos confirma solo si el destino responde; el otro muestra el camino completo.
- **Fichas:** `ping`  `traceroute`  `-c`  `linuxpath.dev`  `curl`
- **Orden correcto:** `traceroute` → `linuxpath.dev`
- **Explicación:** traceroute linuxpath.dev muestra cada router intermedio hasta el destino. ping solo confirma si el destino responde, sin mostrar la ruta.

#### 9. [choice] Necesitas saber si un servidor está caído o si está arriba pero muy lento. ¿Qué comando usas primero?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué pregunta responde cada comando con una sola ejecución.
  - ▫️ traceroute, porque muestra más detalle
  - ✅ ping, porque confirma si responde y mide la latencia
  - ▫️ ssh, porque te conecta directo
- **Explicación:** ping es el primer paso natural: con una sola ejecución sabes si el servidor responde y qué tan rápido lo hace.

#### 10. [type-command] Escribe curl https://linuxpath.dev/api/status y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** curl le pide datos a una dirección web y muestra la respuesta directamente en la terminal.
- **Comando esperado:** `curl https://linuxpath.dev/api/status`
- **Salida simulada:** `{"status":"ok","uptime":"14d"}`
- **Pista:** (usa el contexto)
- **Tab candidates:** `curl`, `https://linuxpath.dev/api/status`
- **Mensaje de éxito:** Así lucen muchas respuestas de APIs modernas: un JSON directo en la terminal.

#### 11. [match-pairs] Une cada código de estado HTTP con lo que significa
- **Kicker:** Repaso mezclado
- **Contexto:** Los cuatro códigos más comunes al trabajar con curl.
  - `200 OK` ↔ La petición funcionó correctamente
  - `301` ↔ El recurso se movió a otra dirección
  - `404` ↔ El recurso pedido no existe
  - `500` ↔ Falló algo del lado del servidor
- **Explicación:** 200 es éxito, 301 es una redirección, 404 es "no encontrado" y 500 es un error del servidor.

#### 12. [choice] Quieres descargar una imagen y guardarla como archivo en tu carpeta actual, sin procesar nada más. ¿Qué comando usas?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué hace cada comando por defecto: uno muestra, el otro guarda.
  - ▫️ curl, porque es más rápido
  - ✅ wget, porque está pensado para guardar archivos
  - ▫️ ping, porque confirma que el archivo existe
- **Explicación:** wget está diseñado específicamente para descargar y guardar archivos en disco.

#### 13. [type-command] Escribe ssh dev@servidor.linuxpath.dev y presiona Enter
- **Kicker:** Repaso mezclado
- **Contexto:** ssh usuario@host abre una sesión de terminal remota, cifrando todo lo que viaja por la red.
- **Comando esperado:** `ssh dev@servidor.linuxpath.dev`
- **Salida simulada:** `dev@servidor.linuxpath.dev's password: 
Last login: Mon Sep 14 09:12:03 2026 from 192.168.1.24
dev@servidor:~$`
- **Pista:** (usa el contexto)
- **Tab candidates:** `ssh`, `dev@servidor.linuxpath.dev`
- **Mensaje de éxito:** Ese nuevo prompt, dev@servidor:~$, ya no es tu máquina: es la terminal del servidor remoto.

#### 14. [choice] Te conectas a un servidor al que ya te habías conectado antes, y SSH se niega a continuar porque su huella (fingerprint) cambió. ¿Qué deberías hacer?
- **Kicker:** Repaso mezclado
- **Contexto:** SSH guarda la huella la primera vez justamente para detectar este tipo de cambios.
  - ▫️ Confirmar igual con "yes": es solo una advertencia menor
  - ✅ Detenerte e investigar por qué cambió antes de continuar
  - ▫️ Desinstalar y reinstalar SSH
- **Explicación:** Una huella que cambia sin explicación puede significar que alguien está interceptando la conexión; conviene investigar antes de continuar.

#### 15. [choice] ¿Por qué conectarte con llaves (ssh-keygen + ssh-copy-id) es más seguro que con contraseña?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en qué información viaja por la red en cada caso.
  - ✅ Porque la llave privada nunca viaja por la red
  - ▫️ Porque las llaves son más cortas que una contraseña
  - ▫️ No hay ninguna diferencia real de seguridad
- **Explicación:** Con llaves, la privada nunca sale de tu equipo: SSH demuestra que la tienes sin enviarla, algo que una contraseña no puede garantizar.

#### 16. [order] Quieres conectarte como dev a servidor.linuxpath.dev, que corre SSH en el puerto 2222 en vez del puerto por defecto. Ordena las piezas.
- **Kicker:** Repaso mezclado
- **Contexto:** Necesitas la opción de puerto antes del destino, con el número correcto.
- **Fichas:** `ssh`  `-P`  `-p`  `2222`  `dev@servidor.linuxpath.dev`
- **Orden correcto:** `ssh` → `-p` → `2222` → `dev@servidor.linuxpath.dev`
- **Explicación:** ssh -p 2222 dev@servidor.linuxpath.dev usa el puerto 2222 en vez del 22 por defecto. La opción es -p minúscula.

#### 17. [choice] Ya tienes una sesión SSH abierta y quieres copiar un archivo local al servidor, sin abrir una segunda conexión aparte. ¿Qué comando usas?
- **Kicker:** Repaso mezclado
- **Contexto:** Piensa en el comando que reutiliza la misma conexión cifrada de SSH, pero para copiar archivos en vez de abrir una terminal.
  - ▫️ curl
  - ✅ scp
  - ▫️ wget
- **Explicación:** scp (secure copy) usa la misma conexión cifrada de SSH para copiar archivos entre equipos, con una sintaxis parecida a cp.

### Lección 6: Desafío final — Resuélvelo por tu cuenta (Desafío final)
> Sin pistas paso a paso: combina conceptos de red, ping y traceroute, curl y wget, y ssh para resolver dos situaciones reales de principio a fin.

2 pasos.

#### 1. [multi-step-terminal] Los usuarios reportan que api.linuxpath.dev "no carga bien". Vas a diagnosticar qué está pasando exactamente, combinando lo que aprendiste sobre conectividad y peticiones HTTP, todo en la misma sesión de terminal.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** No hay pasos sueltos: cada comando te da una pista de qué revisar a continuación.
  1. **Meta:** Antes de nada, confirma si api.linuxpath.dev responde y qué tan rápido lo hace.
     - Comando: `ping -c 4 api.linuxpath.dev`
     - Salida: `PING api.linuxpath.dev (190.34.12.20): 56 data bytes
64 bytes from 190.34.12.20: icmp_seq=0 time=420.6 ms
64 bytes from 190.34.12.20: icmp_seq=1 time=398.2 ms
64 bytes from 190.34.12.20: icmp_seq=2 time=411.9 ms
64 bytes from 190.34.12.20: icmp_seq=3 time=405.1 ms

--- api.linuxpath.dev ping statistics ---
4 packets transmitted, 4 received, 0% packet loss`
     - Pista: El comando que confirma si un equipo responde y mide cuánto tarda, limitando la cantidad de paquetes con una opción.
     - Tab: `ping`, `-c`, `4`, `api.linuxpath.dev`
  2. **Meta:** El servidor responde, pero con más de 400ms — muy por encima de los ~14ms normales. Revisa el código de estado que entrega su endpoint /status, sin descargar el contenido completo.
     - Comando: `curl -I https://api.linuxpath.dev/status`
     - Salida: `HTTP/2 500 
content-type: application/json
date: Tue, 15 Sep 2026 10:14:02 GMT`
     - Pista: El mismo comando que usarías para pedir datos a una dirección web, con la opción que pide solo cabeceras.
     - Tab: `curl`, `-I`, `https://api.linuxpath.dev/status`
  3. **Meta:** Un 500 significa que el problema es del servidor, no tuyo — pero antes de descartarlo del todo, confirma que la ruta hasta él está sana.
     - Comando: `traceroute api.linuxpath.dev`
     - Salida: `traceroute to api.linuxpath.dev (190.34.12.20), 30 hops max
 1  192.168.1.1        1.1 ms
 2  10.20.0.1           8.6 ms
 3  200.14.5.33         12.4 ms
 4  190.34.12.20        14.9 ms`
     - Pista: El comando que muestra cada salto (router intermedio) por el que pasan tus datos hasta el destino.
     - Tab: `traceroute`, `api.linuxpath.dev`
  4. **Meta:** La ruta llega bien y rápido hasta el servidor: el problema es del servidor mismo, no de la red. Descarga el registro de errores que el equipo de backend dejó disponible para diagnosticarlo.
     - Comando: `wget https://api.linuxpath.dev/errors.log`
     - Salida: `Guardando en: 'errors.log'
errors.log        100%[===================>]  8.40K  --.-KB/s    in 0.01s
'errors.log' guardado [8600/8600]`
     - Pista: El comando pensado para descargar y guardar un archivo, no solo mostrarlo en pantalla.
     - Tab: `wget`, `https://api.linuxpath.dev/errors.log`
- **Mensaje final:** ¡Diagnóstico completo! Con ping, curl, traceroute y wget lograste ubicar el problema del lado del servidor y conseguir el registro de errores, sin que nadie te dijera qué comando usar en cada paso.

#### 2. [multi-step-terminal] Necesitas desplegar un archivo de configuración en deploy.linuxpath.dev, un servidor nuevo para ti que corre SSH en el puerto 2222 en vez del puerto por defecto. Vas a dejarlo listo para conectarte sin contraseña y copiar el archivo, todo en la misma sesión.
- **Kicker:** Sin instrucciones, solo la meta
- **Contexto:** Vas a necesitar generar tus llaves, autorizarlas en el puerto correcto, confirmar el acceso y copiar el archivo — cada comando ajustando el puerto donde corresponda.
  1. **Meta:** Antes de nada, genera tu propio par de llaves SSH para no depender de contraseña en este servidor.
     - Comando: `ssh-keygen -t ed25519`
     - Salida: `Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/dev/.ssh/id_ed25519): 
Your identification has been saved in /home/dev/.ssh/id_ed25519
Your public key has been saved in /home/dev/.ssh/id_ed25519.pub`
     - Pista: El comando que genera un nuevo par de llaves, con la opción que indica el algoritmo a usar.
     - Tab: `ssh-keygen`, `-t`, `ed25519`
  2. **Meta:** El servidor deploy.linuxpath.dev corre SSH en el puerto 2222. Copia tu llave pública para que te reconozca, indicando ese puerto.
     - Comando: `ssh-copy-id -p 2222 dev@deploy.linuxpath.dev`
     - Salida: `/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s)
Number of key(s) added: 1
Now try logging into the machine, with: "ssh -p 2222 'dev@deploy.linuxpath.dev'"`
     - Pista: El comando que copia tu llave pública al servidor, con la misma opción de puerto que usarías con ssh.
     - Tab: `ssh-copy-id`, `-p`, `2222`, `dev@deploy.linuxpath.dev`
  3. **Meta:** Confirma que ya puedes entrar sin que te pida contraseña, usando el puerto correcto.
     - Comando: `ssh -p 2222 dev@deploy.linuxpath.dev`
     - Salida: `Last login: Mon Sep 14 10:02:11 2026 from 192.168.1.24
dev@deploy:~$`
     - Pista: El comando que abre una sesión remota, con la opción -p (minúscula) y el puerto.
     - Tab: `ssh`, `-p`, `2222`, `dev@deploy.linuxpath.dev`
  4. **Meta:** Ya autorizado, copia config.yml a la carpeta personal del servidor. Ojo: scp usa una opción de puerto distinta a la de ssh.
     - Comando: `scp -P 2222 config.yml dev@deploy.linuxpath.dev:~/`
     - Salida: `config.yml                                    100%   4KB   2.1MB/s   00:00`
     - Pista: El comando que copia archivos usando la conexión de SSH — su opción de puerto es -P en mayúscula, a diferencia de ssh que usa -p en minúscula.
     - Tab: `scp`, `-P`, `2222`, `config.yml`, `dev@deploy.linuxpath.dev:~/`
- **Mensaje final:** ¡Despliegue completo! Generaste tus llaves, las autorizaste en el puerto correcto, confirmaste el acceso sin contraseña y copiaste el archivo — combinando ssh-keygen, ssh-copy-id, ssh y scp sin que nadie te dijera los comandos exactos.
