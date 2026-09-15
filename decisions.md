# Bitácora de decisiones — Unidad 5, "El Museo del Relevo"

Running log of real structural and narrative decisions plus their rationale. One entry per decision. Mirrors the DECISIONES_SISTEMA_VISUAL.md convention from the referente. Kiwi owns the creative calls; this file records them.

## Metáfora rectora

Un recorrido en primera persona por un museo. La cámara es el visitante. Cada uno de los 13 momentos del guion del cliente es una estación a lo largo de un pasillo. En cada estación hay un pilar con una placa (las palabras exactas del cliente) y, sobre el pilar, un sistema de partículas que expresa el significado de ese momento.

La relación central NO es orbital (partículas sostenidas alrededor de un centro fijo, como en el referente ForumTEDTALK) sino procesional: el significado se acumula a medida que se camina la secuencia, estación tras estación. El relevo generacional se cuenta como avance físico por un espacio, no como una red que orbita.

## Decisiones bloqueadas (2026-09-14 / 2026-09-15)

### D1 — Forma de la planta: pasillo recto ascendente
El pasillo sube a medida que se avanza. El ascenso físico mapea "el crecimiento" (Slide 10) y "el futuro se construye" (Slide 12). Se evita deliberadamente cualquier planta circular o en espiral: eso reintroduciría en 3D justamente el recurso (la espiral ancla) que este proyecto NO debe importar del referente.

### D2 — Hilo conductor entre estaciones: partículas migrantes
Un flujo continuo de partículas recorre el pasillo de estación en estación. Encarna físicamente el relevo generacional como algo que fluye y se transmite, no como 13 dioramas aislados. Esto responde directamente al criterio de "una estructura de elementos relacionados". El flujo transita de un acento cálido (experiencia) a uno frío (nuevas generaciones) a lo largo del recorrido.

### D3 — Texto de las placas: capa HUD en espacio de pantalla (SUPERADA por D3-rev)
Versión inicial: el texto se dibujaba como una capa HTML/CSS en la esquina inferior, sincronizada con la estación activa, para garantizar legibilidad (criterio 1) sin arriesgar texto 3D. El pilar y la placa quedaban como meras anclas visuales.

### D3-rev — El texto vive EN la placa, como texto del mundo 3D
Kiwi señaló la incoherencia de la versión inicial: si la placa es el dispositivo del museo para sostener las palabras, tener las palabras en una esquina tipo diapositiva (a) deja la placa como un prop vacío y (b) reimporta justo la lectura de "PowerPoint con fondo 3D" que el concepto quiere evitar.

El dato que cambia el cálculo: la navegación es por saltos discretos, así que cada estación se ve desde una pose de cámara conocida y fija (distancia y ángulo controlados). La razón que justificaba el HUD (incertidumbre sobre la distancia/ángulo de lectura) casi desaparece.

Decisión: las palabras exactas del cliente se hornean como textura de canvas sobre la placa de cada estación (panel interpretivo tipo museo). El plano del texto es MeshBasicMaterial (sin iluminación) con fondo oscuro horneado, para que la luz de la escena nunca reduzca el contraste (criterio 1). El marco de bronce sí recibe luz. El tamaño de fuente se reduce automáticamente para textos largos.

Excepciones que siguen en pantalla (no son "texto de diapositiva", son función o navegación):
- Los códigos QR del cierre (Slide 13): un QR sobre una placa inclinada a distancia no se puede escanear con el teléfono del público, así que se mantienen como elemento de pantalla, grande y de frente.
- El cromo de navegación: contador de estación, barra de progreso, pista de controles y panel de ayuda.

Módulos: `placardText.js` (segmentos -> textura, sin saber de qué estación se trata) y `HallScene.setLabel(i, textura)`; `main.js` conecta datos y geometría. El texto del guion sigue fuera de `sceneSystem.js` (se respeta D4).

### D4 — Arquitectura del motor: un motor compartido + manejadores por estado
Un solo motor parametrizado lee 13 objetos de datos (uno por estación) y un despachador de "manejadores" por nombre de estado decide cómo se recolocan las partículas en cada momento. El contenido (texto del guion + parámetros de "significado") queda totalmente desacoplado del código de render. Esta separación es lo que obliga mecánicamente a cumplir la regla "todo cambio debe significar algo": no se puede añadir un efecto sin decidir primero a qué parámetro nombrado pertenece.

### D5 — Stack: Three.js, vendorizado localmente
Three.js r160 se guarda en `vendor/three.module.min.js` (no se usa CDN en tiempo de presentación) para conservar la capacidad de correr sin conexión. Se sirve con un servidor estático local para desarrollo (los módulos ES no cargan desde file:// por CORS). Ver `README` de arranque.

### D6 — Props modelados directamente como primitivas (por ahora)
Pilares y placas se modelan como primitivas simples de Three.js. La herramienta img2threejs queda como posible pase de pulido posterior sobre props concretos (pilar, marco de placa, luminaria), no para el shell (piso/paredes/pasillo/iluminación), que se modela directo.

### D7 — Idioma: español, el del material del cliente
El guion del cliente (`TED TALK BRASIL.docx`) está en español. Se construye en español. El toggle ES/PT del referente era una decisión suya (la charla fue en Brasil) y NO se importa.

### D8 — Normalización mínima de espacios
El guion original tiene, en algunos momentos, dos frases pegadas sin espacio (p. ej. "personas.Una"). Se añade el espacio normal entre frases para legibilidad. NINGUNA palabra ni el orden ni el énfasis (negritas) se alteran; solo el espacio en blanco entre oraciones.

### D10 — El hilo conductor se vuelve una helice doble que late (dos venas laterales)
Kiwi pidio darle mas vuelo al hilo que conecta las estaciones: una helice en espiral que pulsa a intervalos (como un latido / una vena que lleva la sangre) para significar que el sentido se transmite de una estacion a la siguiente.

Distincion con el referente (importante para Actividad 03): su espiral es un ANCLA estatica en un centro fijo alrededor del cual orbitan las particulas (relacion orbital, sentido = estabilidad). Esta helice es lo contrario: un CONDUCTO que viaja por el eje procesional y empuja latidos hacia adelante (relacion de transmision, sentido = relevo que se lleva onward). Una ancla frente a una vena. No se reimporta el recurso: se contrasta con el.

Restriccion de geometria descubierta al implementar: como la camara siempre mira por el eje del pasillo, una helice central se ve de frente (escorzada, se lee como una mancha) y ademas compite con la placa y el cubo de particulas del centro. Se probaron alturas y radios; el centro nunca lee bien. Solucion: sacar la vena del eje central y llevarla a las PAREDES. Dos venas, una por pared, que se ven a lo largo (en escorzo lateral, no de frente), siempre visibles flanqueando la placa y alejandose hacia el fondo. Bonus narrativo: dos venas = dos generaciones que acompañan el camino a ambos lados.

El latido es una gaussiana viajera en el parametro a lo largo del pasillo: donde pasa el pulso, la vena se ensancha (swell) y brilla hacia un blanco calido. Los pulsos avanzan hacia adelante (hacia la siguiente estacion) a intervalos regulares. Todo es ajustable en `config.thread` (radius, wallOffset, height, turns, pulseWavelength, pulseSpeed, pulseWidth, swell).

### D9 — Tipografia: Space Grotesk (grotesca moderna), vendorizada
Kiwi pidio una tipografia acorde a una expo academica/de industria; la sans por defecto del navegador se veia demasiado simple. Direccion elegida: grotesca moderna, todo en una sola familia para mantener coherencia. Se usa Space Grotesk (fuente variable, peso 300 a 700) en placas y cromo. Se guarda localmente en `fonts/` (subconjunto latino, cubre acentos y ¿) para conservar el modo sin conexion. El canvas de las placas espera a que la fuente cargue (`ensureFonts`) antes de hornear las texturas, si no usaria una fuente de reemplazo. Peso normal 400 (el 300 quedaba muy delgado a distancia), enfasis 700 en ambar.

### D11 — Estacion 1 autorada: una mano que alcanza una masa de potencial latente
Concepto de la tesis ("Relevo generacional: la ventaja que nadie esta aprovechando"): dos masas de particulas distintas, una mayor (ambar) y una joven (jade), cada una latiendo por su cuenta, cuyos bordes internos se alcanzan muy suavemente a traves de un vacio y luego se retiran. Nunca se tocan: la conexion es real pero aun no se hace (la ventaja que nadie toma). Dos generaciones a punto de encontrarse.

Camino hasta aqui (bitacora honesta):
- Primero se probo el concepto "una mano que alcanza una masa": mano procedural (no leia como mano), luego un modelo real low-poly (GLB, CC-BY). Se le dio un intento honesto, pero no convencia. Kiwi decidio descartar la mano por completo y reestructurar la estacion.
- Se ELIMINO todo lo de la mano: `hand.js`, el GLB, y los cargadores GLTFLoader/BufferGeometryUtils vendorizados. La estacion 1 vuelve a ser puramente particulas (mejor encaje con el brief de sistemas de particulas).

Implementacion actual:
- Estado del motor `twin-reach` en `particleEngine.js`: el pool de particulas se parte en dos mitades (mayor a la izquierda, joven a la derecha), separadas por un vacio. Cada masa respira (senos desfasados) y rota suave. Las particulas de la cara interna se estiran hacia el centro segun un `reach` lento (seno) y luego se relajan, aclarando apenas hacia un blanco calido donde se acercan; el tiron se mantiene bajo para que quede un vacio (nunca se tocan).
- Composicion (ajuste previo de Kiwi que se conserva): la placa es mas chica y esta mas abajo, como etiqueta DEBAJO del exhibit; las masas quedan claramente arriba, sobre la estacion.

### D12 — Herramienta: img2threejs instalado, pero autoria directa para la mano
Se instalo Python 3.12 e img2threejs (la herramienta que menciona el handoff). Corre de punta a punta aqui: se autoro una especificacion completa de la mano (palma, dedos, pulgar, material de piel, evidencia PBR, iluminacion) que PASO la validacion estricta y genero una fabrica de Three.js. Pero img2threejs construye pase por pase (blockout -> estructura -> forma -> material -> iluminacion) y cada pase esta bloqueado detras de un bucle de revision (render + hoja comparativa + diferencia interior + puntaje de vision + revision registrada). Llegar a una mano terminada exige recorrer ese circuito varias veces, y emite TypeScript que hay que empaquetar para nuestro proyecto de JS plano. Kiwi eligio, con ese costo a la vista, que yo autorara la mano directamente en Three.js reutilizando todo el analisis. La herramienta queda instalada por si se quiere para props mas simples (un marco, una luminaria) mas adelante.

### D14 — Hilo conductor: las venas bajan a la altura del piso (ajustada a 2.0)
Kiwi senalo que las venas helicoidales de las paredes (D10) a veces se perdian dentro de la masa de particulas de cada estacion, al compartir casi la misma altura. Se baja el eje de las venas de 3.0 a 1.05 unidades sobre la linea de piso (`config.thread.height`), lejos de la altura de las masas de las estaciones (~3.5). Luego Kiwi noto que, al girar y latir, a esa altura (1.05) podian parecer atravesar la placa desde la perspectiva de la camara. Se sube a 2.0: suficientemente bajo para no competir con la masa de la estacion, suficientemente alto para librar el borde superior de la placa.

### D15 — Flechas arriba/abajo: arriba avanza, abajo vuelve
Kiwi senalo que la asociacion estaba invertida (abajo avanzaba, arriba volvia). Se corrige en `main.js`: ArrowUp/PageUp avanzan junto con Espacio/ArrowRight; ArrowDown/PageDown vuelven junto con ArrowLeft. El texto de ayuda en pantalla no menciona arriba/abajo (solo Espacio/flechas laterales), asi que no necesito actualizarlo.

### D16 — Los puentes ya no se tocan: cada lado alcanza por su cuenta y se queda corto
Kiwi noto que el "puente" anterior era una sola linea entre una particula de cada masa: aunque ambos extremos se acercaban, la linea siempre conectaba un lado con el otro por completo. La lectura que Kiwi busca es otra: en esta etapa del discurso, ninguna generacion sabe todavia que puede alcanzar a la otra, asi que las lineas deben tratar de llegar y quedarse cortas, sin tocarse.

Se rehace en `particleEngine.js`: cada intento de puente ahora es un zarcillo INDEPENDIENTE que crece desde una sola particula (ancla) hacia el centro, con una distancia maxima fija (`maxTendril`) y ademas limitado a nunca pasar la linea central real. Los zarcillos de la masa mayor crecen hacia la derecha; los de la joven, hacia la izquierda; ninguno de los dos alcanza el medio, y no hay ninguna linea que una una particula de un lado con una del otro. El extremo (la punta que alcanza) brilla mas que el anclaje (que sigue siendo parte de la masa), reforzando que es un intento, no una conexion lograda.

## Lo que NO se importa del referente (recordatorio permanente)
La espiral como ancla estable, la metáfora de órbita/comunidad, los nombres y valores de los parámetros de comportamiento del profesor (spiral/network/architecture/archive/stability), el formato de lienzo 2D a sangre completa, y la paleta cian/rojo/magenta ligada al branding de ese evento.

## Estudio de tecnica de movimiento (proceso, no decision)
Se clono el repo del referente y se leyo `visualSystem.js`/`moments.js`/`main.js` completos, mas observacion en vivo (capturas a distintos intervalos por momento) para entender COMO liga movimiento a narrativa, no para copiar el resultado visual. Hallazgos completos y propuestas de aplicacion a nuestro vocabulario en `motion-study.md`. Resumen: el tejido conectivo (arcos entre pares fijos de particulas, no por proximidad) carga mas significado que los puntos solos; los dos "polos" generacionales del referente se diferencian por TEXTURA (dispersion vs. densidad) ademas de color; algunos momentos tienen una coreografia en tres actos (llegada / encuentro / asentamiento) usando ventanas de tiempo dentro del propio momento, no solo un ease continuo. Nada de esto son decisiones tomadas todavia — quedan propuestas para que Kiwi elija cuales aplicar.

### D13 — Estacion 1: se aplican las tecnicas del estudio de movimiento
Tras el estudio de `motion-study.md`, se rehace `twin-reach` en `particleEngine.js`:

- **Textura, no solo color** (tecnica #4): la masa mayor (ambar) es mas compacta, mas quieta, gira mas lento. La masa joven (jade) es mas dispersa, con turbulencia individual por particula (usa el array `phase` ya existente), gira mas rapido. La diferencia de caracter, no solo el color, es lo que ahora lee como "generacion".
- **Bonds explicitos** (tecnica #2), nueva capacidad general del motor: cada `StationSystem` gana un `LineSegments` opcional (`sys.bonds`), con rango de dibujo en 0 por defecto (no cuesta nada a los estados que no lo usan). `twin-reach` lo usa para tres tipos de vinculo con pares de indice FIJO (no por proximidad): una retícula densa y estable dentro de la masa mayor (estructura establecida), unos pocos vinculos sueltos y titilantes dentro de la masa joven (una forma aun en formacion), y un puñado de intentos de puente entre las dos masas que titilan y nunca llegan a una conexion solida (tecnica #5, la relacion como algo que se intenta, no una fusion de posiciones).
- **Ciclo en tres actos** (tecnica #6): el alcance ya no es un seno continuo. Es una envolvente triangular (`smoothstep` subiendo, `smoothstep` bajando) sobre un ciclo de 7.5s: construye tension, alcanza, se retira. Mueve tanto el estiramiento de las particulas internas como la visibilidad de los puentes.

### D17 — Estacion 2 autorada: una reticula rigida y encerrada en si misma
"¿Un gran auditorio solo para hacer grados?" es una pregunta con duda: un espacio reducido a una sola funcion, justo antes de que la siguiente estacion lo abra ("la Universidad decidio encontrarse con el mundo"). Kiwi eligio la lectura de una reticula rigida de un solo proposito: particulas en filas y columnas ordenadas (como butacas fijas), sin ningun vinculo que salga de su propio limite, casi sin movimiento. Alta cohesion, dispersion casi nula.

Implementacion (`auditorium-lattice` en `particleEngine.js`): las particulas se acomodan en una grilla 3D (columnas x filas x capas), sin la orbita organica de otras estaciones. Un cableado de bordes (`bonds`, capacidad general del motor, D4/D2) dibuja el contorno de la caja usando particulas reales de las esquinas, mas unas pocas lineas divisorias de fila (como filas de butacas) y de columna (como pasillos). Brillo sincronizado y uniforme para todas las particulas a la vez (un "zumbido" institucional, no el parpadeo individual de la estacion 1) -- todos alumbrados igual, sin individualidad. El color sigue tomando `accent` de `stations.js` (0.15, cerca del extremo ambar), para no romper el sistema de color ya establecido por el hilo conductor.

### D18 — Estacion 3 autorada: la caja se abre, de una vez, con calma
"La Universidad decidió encontrarse con el mundo" es la respuesta directa al encierro de la estacion 2. Kiwi eligio un tono medido y confiado (una decision firme, no una explosion) y que la estacion arranque con un eco del enrejado de la estacion 2, pero mas chico, para que no sea el centro de la escena.

Nueva capacidad general del motor: cada `StationSystem` gana un reloj propio (`sys.activeTime`) que se reinicia a 0 cada vez que la estacion se vuelve la activa (no en cada frame). Esto habilita, por primera vez, la tecnica #6 del estudio de movimiento: una secuencia en actos que se reproduce UNA VEZ por activacion, no un ciclo que respira para siempre.

Estado `opens-to-world`: Acto 1 (0-0.8s) la caja pequena (mitad del tamano de la de la estacion 2, misma logica de grilla) esta quieta. Acto 2 (0.8-3.6s) se abre con un `smoothstep` largo y sostenido: las particulas se despegan de sus posiciones de grilla hacia un campo abierto y disperso, mas ancho que el de cualquier otra estacion. El cableado de la caja se apaga a medida que se abre; en su lugar aparecen unos pocos vinculos nuevos, mas largos, que solo tienen sentido una vez que el espacio esta abierto. Acto 3 (3.6s en adelante) se mantiene abierto, con una deriva suave, sin retroceder nunca a la caja: es una transformacion, no una respiracion. Verificado que reingresar a la estacion reinicia la secuencia completa (no queda "atascada" abierta desde la primera visita).

### D19 — Sistema de color: tres actores, tres colores propios
Kiwi pidio que la generacion mayor, la generacion joven y el Forum/auditorio (la institucion misma) tengan cada uno un color propio, identificable durante todo el recorrido, no solo dentro de una estacion. Hasta ahora la estacion 2 y la estacion 3 tomaban prestado el degradado ambar-jade de las generaciones (via `sys.params.accent`), aunque ninguna de las dos es sobre generaciones -- son sobre el espacio/la institucion misma.

Se agrega un tercer color a la paleta: `accentInstitution` (indigo/violeta, `#8a7fd9`). Elegido triadicamente distinto de ambar (~46°) y jade (~167°): un violeta-azulado (~265°) que ademas queda lejos de los tonos prohibidos del referente (cian ~198°, rojo ~357°, magenta ~333°). Tres actores, tres colores:
- **Ambar** (`accentElder`): la generacion mayor.
- **Jade** (`accentYoung`): la generacion joven.
- **Indigo** (`accentInstitution`): el Forum/la Universidad como espacio/institucion, NO una generacion.

Se retroalimenta a las estaciones ya autoradas: la estacion 2 (`auditorium-lattice`) y la estacion 3 (`opens-to-world`, tanto la caja-eco como el campo abierto en el que se transforma) pasan de `lerp(elder,young,accent)` a usar `institution` de forma fija -- tiene sentido, ya que ambas son literalmente sobre el auditorio/la Universidad, no sobre las generaciones. El hilo conductor de las paredes (D2/D10) sigue en degradado ambar-jade sin cambios: es especificamente sobre el relevo generacional, no sobre la institucion. El manejador `placeholder` (estaciones aun sin autorar) se deja como esta por ahora; cada estacion futura adoptara el color del actor correcto (generacion, institucion, u otro que aparezca, como la triada academia/industria/ciudad de la estacion 4) al autorarse.

### D20 — Estacion 4 autorada: una triada, tres fuerzas iguales
"Academia + Industria + Ciudad" nombra tres fuerzas distintas explicitamente. Lectura estructural directa: tres racimos visiblemente separados (no una masa fusionada) unidos por vinculos que forman un triangulo -- la manera mas clara de mostrar "tres cosas que se vuelven una relacion" sin fundirlas.

Color (decision de Kiwi, sigue D19): Academia/Industria/Ciudad no vuelven a aparecer en el guion, asi que no necesitan un lugar permanente en el sistema de tres actores (mayor/joven/institucion). En vez de inventar colores nuevos, los tres racimos quedan dentro de la familia del indigo institucional: Academia (el vertice, arriba) en indigo puro; Industria (abajo-izquierda) en un tinte mas calido (matiz +0.035); Ciudad (abajo-derecha) en un tinte mas frio (matiz -0.035). El TRIANGULO que los une, en cambio, queda en indigo puro sin tinte -- la conexion misma le pertenece a la Universidad, que es quien sostiene unidas a las tres. Esto continua directamente el sentido de la estacion 3 (la Universidad decidio encontrarse con el mundo): esta estacion ES ese encuentro, nombrado.

Tratamiento igualitario deliberado: los tres racimos comparten exactamente el mismo radio, el mismo ritmo de respiracion (solo con una fase ligeramente distinta para que no respiren en perfecta sincronia), la misma textura interna -- ninguna jerarquia entre ellas. Es lo opuesto a la asimetria deliberada de la estacion 1 (mayor/joven difieren a proposito porque son generaciones distintas); aqui la igualdad de tratamiento ES la afirmacion estructural: tres socios equivalentes.

Implementacion (`triad-forces`): cada racimo usa la tecnica de "particula que mira hacia el vecino" (la misma de los zarcillos de la estacion 1, D16) para elegir el vertice real del triangulo en cada racimo -- el vinculo conecta particulas reales orientadas hacia el otro racimo, no puntos sinteticos. Cada racimo tambien tiene su propia reticula interna liviana (mismo conteo para las tres, D19-consistente).

### D21 — Estacion 4, dos ajustes: menos particulas visibles, colores mas distintos
Kiwi senalo dos problemas tras ver la estacion 4 en pantalla: (1) cada racimo tenia 120 particulas visibles, el mismo orden de magnitud que las masas de la estacion 1 (180 por lado), asi que sin querer comunicaba "otra generacion" en vez de "una fuerza mas chica"; (2) los tres tintes de indigo (variando solo el matiz en +-3.5°) se veian casi identicos en pantalla, aunque en teoria fueran "distintos".

Correcciones en `triad-forces`:
- Cada racimo ahora solo muestra 42 particulas (`sys._triadVisible`), el resto del grupo se deja en el pool pero se pinta en negro (invisible con blending aditivo) -- una chispa, no una masa. Los vinculos (el triangulo y la textura interna) se buscan solo dentro del subconjunto visible, para que ninguna linea termine en un punto invisible.
- Los tintes ahora se separan por matiz, saturacion Y luminosidad a la vez (no solo matiz): Industria sube matiz +7°, satura 1.3x, aclara 1.4x (un violeta-magenta mas vivo, "energico"); Ciudad baja matiz -6°, satura 0.6x, oscurece a 0.55x (un azul-violeta apagado, "acero, mas callado"). Academia se queda en el indigo puro sin modificar. La separacion en saturacion/luminosidad es lo que realmente distingue los colores en pantalla -- un cambio de matiz de pocos grados por si solo no bastaba.

### D22 — Estacion 5 autorada: converge, se desvanece, e irradia sin parar
"Los eventos nunca fueron el objetivo. El impacto sí." Kiwi pidio, en vez de que yo inventara una lectura propia desde cero, que examinara especificamente como el REFERENTE interpreto esta misma frase ("impacto") en su propio codigo, la misma disciplina que ya se aplico en `motion-study.md`.

Hallazgo: el estado "impact" del referente reutiliza sus PROPIOS anclajes de la triada de su momento anterior ("triad" = academia/industria/ciudad), ahora tirados hacia un centro compartido (`converging=true`), mas un overlay separado de anillos que se expanden hacia afuera desde ese punto (`drawImpactRings`). Es decir: la misma triada, convergiendo, y de esa convergencia irradia el impacto. Esa logica estructural -- no su implementacion en canvas 2D, ni sus colores -- se traduce a nuestro vocabulario.

Estado `impact-radiates`: un pequeno eco de la triada de la estacion 4 (mismo layout, mas chico) converge hacia el centro una sola vez (`sys.activeTime`, tecnica de D18) y luego se desvanece por completo -- "los eventos" tuvieron que pasar, pero no son el punto, asi que desaparecen una vez que cumplieron su funcion. En su lugar, y de ahi en adelante mientras la estacion siga activa, un emisor reciclado (cada particula tiene su propio ciclo de nacimiento-viaje-desvanecimiento, con fases escalonadas via `sys.phase` para que las emisiones se superpongan sin parar) hace que el impacto irradie continuamente hacia afuera -- a diferencia de "los eventos", que convergen una vez y se van, "el impacto" no termina. Unas pocas particulas llevan ademas una estela visible (un vinculo entre su posicion actual y su posicion un instante antes en su propio ciclo), mostrando la direccion del movimiento explicitamente. Color: indigo institucional puro, continuando el hilo de las estaciones 2-3-4 (el efecto que produce el trabajo de la Universidad).

## Pendiente de autoría por estación (iterativo, con Kiwi)
El shell usa un manejador de partículas genérico ("placeholder") en las 13 estaciones, variando solo la intensidad para demostrar el ruteo de datos de punta a punta. El significado real de cada estación (su `state`, sus parámetros y su sistema de partículas propio) se autora estación por estación DESPUÉS de que el shell funcione completo. Vocabulario de parámetros propuesto para esa fase (a confirmar/revisar por Kiwi): cohesion, dispersion, flow, convergence, emergence.
