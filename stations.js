// stations.js
// The client's script, as data. One object per beat, in the fixed order.
// This file never touches rendering code (decision D4): it only declares WHAT
// each moment says and, abstractly, what it MEANS.
//
// Text is stored as segments so the HUD can render emphasis exactly as the
// client wrote it: { t: "words", em: true } renders bold. Words, order and
// emphasis are verbatim from "TED TALK BRASIL.docx". Only whitespace between
// sentences is normalized for legibility (decision D8).
//
// `state` selects a per-state render handler in particleEngine.js. For the
// shell every station uses "placeholder" (one generic handler); the real
// per-station states are authored iteratively with Kiwi afterward. `intensity`
// (provisional) drives the placeholder cloud's energy so the data->render path
// is demonstrable end to end. `accent` biases the cloud between the two
// generational colors (0 = elder/amber, 1 = young/jade).

export const stations = [
  {
    slide: 1,
    state: 'twin-reach',
    intensity: 0.6,
    accent: 0.05,
    handle: '@centrodeeventosupb',
    text: [
      { t: 'RELEVO GENERACIONAL', em: true },
      { t: ': LA VENTAJA QUE NADIE ESTÁ APROVECHANDO', em: false },
    ],
  },
  {
    slide: 2,
    state: 'auditorium-lattice',
    intensity: 0.30,
    accent: 0.15,
    photo: 1,
    photoCaption: 'Fotografía de una ceremonia de grados en Fórum',
    text: [
      { t: '¿un gran auditorio solo para hacer grados?', em: false },
    ],
  },
  {
    slide: 3,
    state: 'opens-to-world',
    intensity: 0.5,
    accent: 0.2,
    text: [
      { t: 'Los eventos no llegaron a la Universidad. ', em: false },
      { t: 'La Universidad decidió encontrarse con el mundo', em: true },
      { t: '.', em: false },
    ],
  },
  {
    slide: 4,
    state: 'triad-forces',
    intensity: 0.6,
    accent: 0.35,
    photo: 2,
    text: [
      { t: 'Academia + Industria + Ciudad', em: false },
    ],
  },
  {
    slide: 5,
    state: 'impact-radiates',
    intensity: 0.65,
    accent: 0.4,
    photo: 3,
    text: [
      { t: 'Los eventos nunca fueron el objetivo. ', em: false },
      { t: 'El impacto sí', em: true },
      { t: '.', em: false },
    ],
  },
  {
    slide: 6,
    state: 'community-huddle',
    intensity: 0.7,
    accent: 0.45,
    text: [
      { t: 'Un evento trae personas. Una ', em: false },
      { t: 'comunidad', em: true },
      { t: ' trae ', em: false },
      { t: 'transformación', em: true },
      { t: '.', em: false },
    ],
  },
  {
    slide: 7,
    state: 'placeholder',
    intensity: 0.6,
    accent: 0.5,
    text: [
      { t: 'El talento crece a la velocidad de la ', em: false },
      { t: 'confianza', em: true },
      { t: '.', em: false },
    ],
  },
  {
    slide: 8,
    state: 'placeholder',
    intensity: 0.7,
    accent: 0.6,
    photo: 4,
    text: [
      { t: 'La ', em: false },
      { t: 'experiencia', em: true },
      { t: ' construye el ', em: false },
      { t: 'camino', em: true },
      { t: '. Las nuevas generaciones descubren ', em: false },
      { t: 'nuevas rutas', em: true },
      { t: '.', em: false },
    ],
  },
  {
    slide: 9,
    state: 'placeholder',
    intensity: 0.75,
    accent: 0.5,
    text: [
      { t: 'Una visión. ', em: false },
      { t: 'Dos generaciones.', em: true },
    ],
  },
  {
    slide: 10,
    state: 'placeholder',
    intensity: 0.9,
    accent: 0.5,
    text: [
      { t: 'El ', em: false },
      { t: 'crecimiento', em: true },
      { t: ' no ocurre cuando una generación reemplaza a otra. Ocurre cuando', em: false },
      { t: ' trabajan juntas.', em: true },
    ],
  },
  {
    slide: 11,
    state: 'placeholder',
    intensity: 0.8,
    accent: 0.8,
    text: [
      { t: 'Los jóvenes no son el futuro. Son el ', em: false },
      { t: 'presente', em: true },
      { t: ' que muchas organizaciones aún no ven.', em: false },
    ],
  },
  {
    slide: 12,
    state: 'placeholder',
    intensity: 1.0,
    accent: 0.9,
    photo: 5,
    text: [
      { t: 'El ', em: false },
      { t: 'futuro', em: true },
      { t: ' no se hereda. ', em: false },
      { t: 'Se construye', em: true },
      { t: '.', em: false },
    ],
  },
  {
    slide: 13,
    state: 'placeholder',
    intensity: 0.85,
    accent: 1.0,
    photo: 6,
    isClosing: true,
    text: [
      { t: 'QR con memorias (para móvil)', em: false },
      { t: 'QR redes @centrodeeventosupb', em: false },
    ],
  },
];
