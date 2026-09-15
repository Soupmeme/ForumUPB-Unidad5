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

## Lo que NO se importa del referente (recordatorio permanente)
La espiral como ancla estable, la metáfora de órbita/comunidad, los nombres y valores de los parámetros de comportamiento del profesor (spiral/network/architecture/archive/stability), el formato de lienzo 2D a sangre completa, y la paleta cian/rojo/magenta ligada al branding de ese evento.

## Pendiente de autoría por estación (iterativo, con Kiwi)
El shell usa un manejador de partículas genérico ("placeholder") en las 13 estaciones, variando solo la intensidad para demostrar el ruteo de datos de punta a punta. El significado real de cada estación (su `state`, sus parámetros y su sistema de partículas propio) se autora estación por estación DESPUÉS de que el shell funcione completo. Vocabulario de parámetros propuesto para esa fase (a confirmar/revisar por Kiwi): cohesion, dispersion, flow, convergence, emergence.
