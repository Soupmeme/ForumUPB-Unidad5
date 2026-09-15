// config.js
// The "knobs" file. Tunable numbers and palette only. No narrative lives here.
// Anything that carries meaning about the discourse belongs in stations.js.

export const config = {
  // ---- Hall geometry (ascending straight hall, decision D1) ----
  hall: {
    stationGap: 14,        // world units between consecutive stations along -Z
    risePerStation: 1.6,   // how much the floor (and each station) rises per step
    width: 10,             // hall interior width
    wallHeight: 7,
    startZ: 0,             // z of station 0; stations recede toward -Z
  },

  // ---- Camera / navigation ----
  camera: {
    eyeHeight: 2.4,        // eye height above the local floor
    standBack: 7.5,        // how far in front of a pillar the visitor stands
    fov: 55,
    near: 0.1,
    far: 400,
    moveEase: 2.4,         // higher = snappier camera glide between stations
    lookEase: 3.0,
  },

  // ---- Station particle systems (shared engine, decision D4) ----
  station: {
    particles: 360,        // particles per station system
    cloudRadius: 1.9,      // base radius of a station's particle cloud
    pointSize: 0.075,
    idleIntensity: 0.22,   // energy of non-active stations (still visible, calmer)
  },

  // ---- Migrating-particle thread: a pulsing double helix (throughline, D2 / D10) ----
  // A directional conduit (a vein) that travels the processional axis and
  // pushes heartbeats forward, station to station. NOT the referente's static
  // spiral anchor: this one moves and carries, it does not hold a center.
  thread: {
    particles: 1800,
    strands: 2,            // two veins, one down each side wall (relevo: two generations flanking the path)
    radius: 0.7,           // coil radius of each wall vein
    wallOffset: 4.0,       // how far from center each vein runs (walls are at +/-5)
    height: 3.0,           // center height of each coil axis above the floor line
    turns: 14,             // total helical turns across the whole hall
    flowSpeed: 0.02,       // gentle ambient drift along the hall (u/sec)
    spin: 0.14,            // slow rotation of the whole helix (rad/sec)
    pointSize: 0.075,
    // Heartbeat: bright swelling pulses that travel forward along the vein.
    pulseWavelength: 0.28, // distance between successive beats (fraction of hall)
    pulseSpeed: 0.17,      // how fast a beat travels forward (u/sec)
    pulseWidth: 0.05,      // sharpness of each beat (in u)
    swell: 0.85,           // how much the vein bulges at a beat
  },

  // ---- Palette (ours, decision: NOT the referente's cyan/red/magenta) ----
  // Warm bone architecture on a dark ground; two generational accents that
  // hand off along the hall (amber = experience, jade = new generations).
  palette: {
    background: 0x0e1116,
    fog: 0x0e1116,
    architecture: 0xe9e2d0, // bone stone for floor/walls/pillars
    placardFrame: 0x6e5a3a, // bronze
    accentElder: 0xf2b705,  // amber / gold
    accentYoung: 0x37b9a0,  // jade / teal
    lightKey: 0xfff4dd,
    lightFill: 0x9fb4c8,
  },

  // ---- Closing QR slide (content links, station 13) ----
  qr: {
    memories: 'https://www.instagram.com/centrodeeventosupb/',
    social: 'https://www.instagram.com/centrodeeventosupb/',
    handle: '@centrodeeventosupb',
  },

  // ---- Misc ----
  startLanguageNote: 'es', // client material is Spanish only (decision D7)
};
