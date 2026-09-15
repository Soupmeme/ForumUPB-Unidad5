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

## Lo que NO se importa del referente (recordatorio permanente)
La espiral como ancla estable, la metáfora de órbita/comunidad, los nombres y valores de los parámetros de comportamiento del profesor (spiral/network/architecture/archive/stability), el formato de lienzo 2D a sangre completa, y la paleta cian/rojo/magenta ligada al branding de ese evento.

## Pendiente de autoría por estación (iterativo, con Kiwi)
El shell usa un manejador de partículas genérico ("placeholder") en las 13 estaciones, variando solo la intensidad para demostrar el ruteo de datos de punta a punta. El significado real de cada estación (su `state`, sus parámetros y su sistema de partículas propio) se autora estación por estación DESPUÉS de que el shell funcione completo. Vocabulario de parámetros propuesto para esa fase (a confirmar/revisar por Kiwi): cohesion, dispersion, flow, convergence, emergence.
