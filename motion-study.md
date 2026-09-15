# Estudio de movimiento — ForumTEDTALK (referente)

Notas de investigacion sobre COMO el referente liga movimiento a narrativa, leyendo su codigo (`visualSystem.js`, `moments.js`, `main.js`) y observando el sitio en vivo en varios intervalos por momento. El objetivo es extraer tecnica reusable, no estilo visual. Todo lo listado en "Lo que NO se importa" en `decisions.md` sigue prohibido: esto es vocabulario tecnico, no una plantilla a calcar.

## Como esta armado (confirma lo que ya sabiamos, con detalle nuevo)

- `params` (spiral/network/architecture/archive/stability/intensity) se suaviza HACIA `target = moment.behavior` con un lerp exponencial simple, `transitionSpeed = 0.055` por frame a 60fps (asentamiento pleno en ~1-2s). Mismo patron que nuestro `particleEngine.js`, confirmado independientemente como buen diseno.
- `updateParticles()` despacha por `state` string, cada estado calcula su propio target de posicion por particula. Igual a nuestro dispatcher por `state`.
- `momentHash` (hash determinista del id del momento) siembra el pseudo-azar de cada estado, asi dos momentos con el MISMO handler producen geometria distinta sin datos de mas. Truco simple, no usado aun en el nuestro.
- Rol de particula estable por semilla (`p.seed % N`) en vez de azar por frame — asi un subconjunto de particulas es permanentemente "joven" o "experiencia" sin guardar estado aparte. Nuestro `twin-reach` ya usa la misma idea (`i < half`).

## Tecnicas nuevas, observadas en el codigo Y en vivo

### 1. Las particulas son ~20% del efecto; el tejido conectivo es el resto
La lectura de "estructura" no viene de los puntos sueltos — viene de capas dibujadas ADEMAS de las particulas: brillos radiales (gradient) en centros con nombre semantico, arcos/curvas Bezier entre pares de particulas especificos, "cuentas" viajando sobre curvas casi estaticas. Los puntos solos, sin esas capas, se ven dispersos y poco intencionales. Leccion: la relacion declarada necesita una representacion VISIBLE propia (una linea, un campo), no solo inferirse de donde quedan las particulas.

### 2. Los "bonds" (arcos entre pares) NO son por proximidad — son por indice fijo
`drawMatureBonds` conecta `particles[i*stride % len]` con `particles[i*stride + offset % len]`: pares deterministas y estables, no "las mas cercanas". La MISMA funcion, con solo 3 parametros (cuenta de bonds, cuanto se curva el arco hacia un centro compartido, radio de dispersion de las particulas), produce lecturas completamente distintas:

| Momento | Particulas | Bonds | Curvatura hacia el centro | Lectura |
|---|---|---|---|---|
| Comunidad | orbita compacta (radio chico) | 18 | fuerte (pull 0.28) | bola compacta, se abraza hacia un centro — "communidad" como abrazo |
| Confianza | orbita amplia (radio grande, crece con `momentTime`) | 34 | casi nula (pull 0.1) | red ancha, lineas casi rectas y largas que cruzan todo el campo — "confianza" como alcance directo, sin curvas que escondan nada |

Confirmado en vivo: comunidad se ve como un ovillo denso y redondo; confianza se ve como una red ancha, extendida, de lineas mas rectas. Mismo mecanismo, parametros distintos, significado opuesto. Esto es EXACTAMENTE lo que pide el brief: una relacion (aqui, el bond en si) cuya forma cambia con la intencion comunicativa.

### 3. Distancia-a-conexion tambien existe por separado, con una tabla de escala por estado
`drawConnections` (nearest-neighbor dentro de `maxDist`) es UNA funcion reusada en todos los estados, pero `maxDist` y el alpha se leen de una tabla `{estado: escala}` — asi "cuan conectado se siente todo" es un numero por estado, no codigo nuevo por estado. Aplicable directo a nuestro motor: una tabla `state -> connectionIntensity` en vez de logica repetida.

### 4. Los dos "polos" generacionales usan TEXTURA distinta, no solo color
Observado en vivo en "duality" (dos generaciones, el par mas cercano a nuestra estacion 1 actual): NO son dos masas simetricas con la misma forma en espejo. Son visualmente opuestas en caracter:
- **"young"**: pocas particulas visibles, orbitan sueltas y grandes, con turbulencia — se ve disperso, vivo, explorando.
- **"experience"**: red de puntos generados aparte (no las particulas reales) en anillo compacto, todos densamente interconectados — se ve establecido, estructurado, quieto.

Nuestro `twin-reach` actual usa dos masas simetricas (mismo conteo, mismo radio, solo color y sentido de giro distintos). La leccion del referente: la asimetria de TEXTURA (dispersion vs. densidad, quietud vs. movimiento) comunica "generacion" con mas fuerza que el color solo. Vale la pena diferenciar nuestras dos masas por comportamiento, no solo paleta — ver seccion de aplicacion abajo.

### 5. "Convergencia" no es "las particulas se juntan en un punto" — es que las CONEXIONES se extienden para unir dos zonas
En "trabajan juntas" (convergence), el codigo reusa duality + `drawMatureBonds` con `converged=true`: dibuja arcos horizontales que cruzan TODO el ancho, de una zona a la otra, en vez de mover las particulas a una posicion compartida. Confirmado en vivo: las dos texturas separadas (dispersa / densa) pasan a estar unidas por una franja continua de lineas que cruzan de lado a lado. La relacion (el puente) es lo que cambia; las posiciones apenas se mueven. Encaja perfecto con la regla del brief ("todo cambio debe poder explicarse en terminos de una relacion").

### 6. Coreografia en tres actos DENTRO de un mismo momento, usando `momentTime`
El estado "opening" no solo interpola hacia un target fijo — tiene una secuencia interna en tres fases, cada una activada por una ventana de `smoothstep` sobre `momentTime` (tiempo desde que el momento empezo, no el reloj global):
1. **Llegada** (`momentTime` 0.5-6.6s): particulas viajan desde fuera de cuadro o desde el centro, por una curva cuadratica, hacia un punto de encuentro.
2. **Encuentro** (superpuesto, 3.2-6.6s): las rutas se cruzan en un punto compartido, dejando un rastro tipo cometa.
3. **Asentamiento** (8.4-15.2s): desde el punto de encuentro, las particulas espiralan hacia su posicion final.

Confirmado en vivo con capturas en t=0, t=4s, t=12s: se ve literalmente pasar de puntos dispersos -> un rastro alargado convergiendo -> un anillo compacto final. Es una MICRO-narrativa de llegada, encuentro y asentamiento contada en un solo momento, no solo un ease continuo. Ninguno de nuestros estados hace esto todavia: todos easean continuamente hacia un target sin actos internos.

### 7. Texto vs. estructura corren en escalas de tiempo distintas, a proposito
El swap de texto es un corte rapido (140ms de espera + fade), independiente del morph de particulas que tarda 1-2s en asentar. La lectura: el discurso avanza en golpes (el texto cambia de inmediato), pero la estructura subyacente evoluciona (las particulas siguen mudando despues del corte). Nuestro cambio de estacion ya tiene esa asimetria de forma natural (el HUD/placa es instantaneo por estacion via texture bake; las particulas easean) — vale la pena mantenerla deliberada en vez de coincidencia.

## Aplicacion propuesta a nuestro vocabulario (cohesion / dispersion / flow / convergence / emergence)

Nada de esto se implementa todavia — son ideas para que Kiwi decida cuales entran:

1. **Diferenciar las dos masas de la Estacion 1 por textura, no solo color** (tecnica #4): la masa "mayor" mas densa/interconectada/quieta; la masa "joven" mas dispersa/suelta/con mas turbulencia. Ahora mismo son simetricas salvo el color.
2. **Usar bonds de indice fijo (no por proximidad) como representacion explicita de "relacion declarada"** (tecnica #2) para estados donde la relacion ES el punto (confianza, comunidad, trabajan-juntas cuando lleguen). Un arco visible entre dos particulas especificas es una relacion literal, mas fuerte que inferirla de posiciones.
3. **Tabla `state -> connectionIntensity`** (tecnica #3) para mantener el motor compartido (D4) disciplinado: un numero por estado en vez de logica nueva cada vez.
4. **Coreografia en tres actos usando el `elapsed` desde que la estacion se volvio activa** (tecnica #6), reservada para estaciones donde un arco de llegada/encuentro/asentamiento cuente algo (candidatos: slide 3 "la Universidad decidio encontrarse con el mundo", slide 9-10 "dos generaciones" / "trabajan juntas" si se vuelve a intentar esa idea, slide 13 cierre). Nuestro motor ya trackea `elapsed`; falta el patron de ventanas smoothstep por fase.
5. **Convergencia como puente de conexiones, no colision de masas** (tecnica #5): si mas adelante autoramos una estacion de "trabajan juntas", vale la pena que el cambio sea "aparecen arcos que cruzan de una masa a la otra" en vez de mover las masas a un mismo punto.

Nada de esto toca paleta, la espiral, ni los parametros con nombre del profesor — es tecnica de como CONECTAR movimiento con intencion, aplicada a nuestros propios parametros y a nuestra propia arquitectura (museo procesional, D4).
