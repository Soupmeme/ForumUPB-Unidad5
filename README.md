# El Museo del Relevo

Presentación web generativa para la Unidad 5 (Simulación para Sistemas Interactivos, UPB). Un recorrido en primera persona por un museo: cada uno de los 13 momentos del guion del cliente es una estación en un pasillo ascendente, con un pilar, una placa (las palabras exactas del cliente) y un sistema de partículas que expresa el significado de ese momento.

El concepto, las decisiones y lo que se importa o no del referente están en [`decisions.md`](decisions.md). El brief completo está en [`unit5-handoff.md`](unit5-handoff.md).

## Correr

Los módulos ES no cargan abriendo `index.html` con doble clic (CORS en `file://`), así que se sirve por http con un servidor estático sin dependencias:

```bash
node server.mjs
```

Luego abrir http://localhost:5178. Three.js está vendorizado en `vendor/` (no necesita conexión).

## Controles

- **Espacio** o **&rarr;** : avanzar de estación
- **&larr;** : volver
- **F** : pantalla completa
- **H** : ayuda
- **R** : reiniciar
- Móvil: deslizar izquierda / derecha

## Arquitectura

Contenido y render están desacoplados (esa separación es lo que obliga a que todo cambio signifique algo):

- `stations.js` — el guion como datos: texto exacto por estación (con énfasis), y parámetros abstractos de significado. No toca código de render.
- `config.js` — solo números y paleta ("knobs"). Nada narrativo.
- `sceneSystem.js` — el shell del museo: pasillo ascendente, pilares, placas, iluminación y el hilo de partículas migrantes que conecta las estaciones.
- `particleEngine.js` — el motor compartido: un sistema de partículas por estación que suaviza sus parámetros hacia los objetivos del momento, con un despachador de manejadores por `state`.
- `main.js` — cableado del DOM: navegación, sincronización del HUD, bucle de animación.

## Estado

Shell funcional de punta a punta con arte de partículas genérico ("placeholder") en las 13 estaciones. La autoría del sistema de partículas propio de cada estación es la siguiente fase, iterativa.
