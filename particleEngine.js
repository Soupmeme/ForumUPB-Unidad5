// particleEngine.js
// The shared, parameterized render engine (decision D4). It holds one particle
// system per station and, each frame, eases each system's `params` toward the
// target values its station declared, then calls a handler chosen by the
// station's `state` string.
//
// SHELL STATUS: only the generic "placeholder" handler exists. Authoring a
// station's real meaning later means adding a handler here keyed on that
// station's `state`, and setting its parameters in stations.js. No visual
// behavior is added without first naming the parameter it belongs to.

import * as THREE from 'three';
import { config } from './config.js';

const elder = new THREE.Color(config.palette.accentElder);
const young = new THREE.Color(config.palette.accentYoung);
const institution = new THREE.Color(config.palette.accentInstitution);
const hot = new THREE.Color(0xfff2d0);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (edge0, edge1, v) => {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
// A point on a quadratic curve (lerp-of-lerps), for bonds that bow toward a
// shared point instead of running straight -- motion-study.md's own math.
const quadPoint = (a, c, b, t) => {
  const ac = a + (c - a) * t;
  const cb = c + (b - c) * t;
  return ac + (cb - ac) * t;
};

// One station's particle cloud: a fixed pool that reconfigures (it does not
// birth/die). Persistent particles read as transformation, which fits a
// museum exhibit that restates the same matter under a new meaning.
class StationSystem {
  constructor(scene, center, station) {
    this.center = center;
    this.station = station;
    this.n = config.station.particles;

    this.baseDir = new Float32Array(this.n * 3);
    this.baseR = new Float32Array(this.n);
    this.phase = new Float32Array(this.n);
    for (let i = 0; i < this.n; i++) {
      // Uniform-ish direction on a sphere.
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      this.baseDir[i * 3 + 0] = s * Math.cos(th);
      this.baseDir[i * 3 + 1] = u;
      this.baseDir[i * 3 + 2] = s * Math.sin(th);
      this.baseR[i] = 0.4 + Math.random() * 0.6;
      this.phase[i] = Math.random() * Math.PI * 2;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.n * 3), 3));
    const m = new THREE.PointsMaterial({
      size: config.station.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, m);
    scene.add(this.points);

    // Optional connective "bonds": explicit relationship lines between fixed
    // particle pairs, not inferred from proximity (motion-study.md #2). A
    // general capability every state may opt into; states that don't use it
    // leave the draw range at 0, so nothing renders and nothing costs extra.
    const bondsMax = config.station.bondsMax;
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bondsMax * 2 * 3), 3));
    bg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(bondsMax * 2 * 3), 3));
    bg.setDrawRange(0, 0);
    const bm = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.bonds = new THREE.LineSegments(bg, bm);
    scene.add(this.bonds);

    // Eased params (the "knobs" that move toward each moment's targets).
    this.params = { energy: config.station.idleIntensity, accent: station.accent ?? 0.5 };
    this.target = { energy: config.station.idleIntensity, accent: station.accent ?? 0.5 };

    // A per-station clock that resets each time this station BECOMES active
    // (motion-study.md #6). Lets a handler play a one-shot staged sequence
    // (arrival -> encounter -> settle) instead of only looping continuously.
    this.activeTime = 0;
    this._isActive = false;
  }

  setActive(isActive) {
    if (isActive && !this._isActive) this.activeTime = 0;
    this._isActive = isActive;
    this.target.energy = isActive ? this.station.intensity : config.station.idleIntensity;
    this.target.accent = this.station.accent ?? 0.5;
  }

  update(dt, elapsed) {
    // Ease params toward targets.
    const k = Math.min(1, dt * 2.5);
    this.params.energy += (this.target.energy - this.params.energy) * k;
    this.params.accent += (this.target.accent - this.params.accent) * k;
    if (this._isActive) this.activeTime += dt;

    const handler = handlers[this.station.state] || handlers.placeholder;
    handler(this, elapsed);

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
    this.bonds.geometry.attributes.position.needsUpdate = true;
    this.bonds.geometry.attributes.color.needsUpdate = true;
  }
}

// Dispatcher: state string -> reposition function. Add real states here as
// stations get authored. For now, everything routes to placeholder.
const handlers = {
  placeholder(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const e = sys.params.energy;
    const c = new THREE.Color().lerpColors(elder, young, sys.params.accent);
    const rot = elapsed * (0.15 + e * 0.4);
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;

    for (let i = 0; i < sys.n; i++) {
      let dx = sys.baseDir[i * 3 + 0];
      const dy = sys.baseDir[i * 3 + 1];
      let dz = sys.baseDir[i * 3 + 2];
      // Rotate around Y.
      const rx = dx * cs - dz * sn;
      const rz = dx * sn + dz * cs;
      const shimmer = Math.sin(elapsed * 2 + sys.phase[i]) * 0.08 * e;
      const r = config.station.cloudRadius * sys.baseR[i] * (0.55 + e * 0.9) + shimmer;
      pos[i * 3 + 0] = cx + rx * r;
      pos[i * 3 + 1] = cy + dy * r;
      pos[i * 3 + 2] = cz + rz * r;

      const b = 0.4 + e * 0.6;
      col[i * 3 + 0] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }
  },

  // Station 1 (the thesis): two distinct masses, an elder (amber) and a young
  // (jade), reaching toward each other across a gap and withdrawing. They
  // never touch: the connection is real but not yet made (the advantage
  // nobody takes). Informed by motion-study.md:
  //  - the two sides differ in TEXTURE, not just color (#4): elder is
  //    denser, tighter, quieter (settled); young is sparser, wider, more
  //    turbulent (still finding its shape).
  //  - explicit "bonds" (#2/#3): a dense fixed lattice inside the elder mass
  //    (established structure), a few loose bonds inside the young mass, and
  //    a handful of independent tendrils growing from each mass toward the
  //    middle -- each one capped short of the center, so the two sides are
  //    always visibly reaching, never touching (neither generation yet knows
  //    it could close that gap).
  //  - the reach is a three-act envelope (#6: build -> reach -> retreat)
  //    over a fixed cycle, not a continuous sine.
  'twin-reach'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const gapHalf = 1.75;
    const cr = config.station.cloudRadius * 0.5;
    const half = sys.n >> 1;
    const c = new THREE.Color();

    // One-time setup: which particles face the gap (for bridge attempts),
    // and the fixed relationship pairs -- computed once, reused every frame.
    if (!sys._twinSetup) {
      sys._twinSetup = true;
      const innermost = (from, to, side) => {
        const scored = [];
        for (let i = from; i < to; i++) scored.push([i, sys.baseDir[i * 3 + 0] * -side]);
        scored.sort((a, b) => b[1] - a[1]);
        return scored.slice(0, 10).map((p) => p[0]);
      };
      const innerLeft = innermost(0, half, -1);
      const innerRight = innermost(half, sys.n, 1);

      const pairs = [];
      const denseCount = 42, sparseCount = 9, tendrilsPerSide = 8;
      for (let k = 0; k < denseCount; k++) {
        const a = (k * 7) % half, b = (k * 7 + 17) % half;
        if (a !== b) pairs.push([a, b, 'elder']);
      }
      for (let k = 0; k < sparseCount; k++) {
        const span = sys.n - half;
        const a = half + (k * 13) % span, b = half + (k * 13 + 31) % span;
        if (a !== b) pairs.push([a, b, 'young']);
      }
      // Bridge attempts: independent tendrils, one per anchor, each growing
      // from ITS OWN mass toward the middle. Not a line between two particles
      // -- each stops on its own, so the two sides visibly never meet.
      for (let k = 0; k < tendrilsPerSide; k++) pairs.push([innerLeft[k % innerLeft.length], -1, 'bridge']);
      for (let k = 0; k < tendrilsPerSide; k++) pairs.push([innerRight[k % innerRight.length], 1, 'bridge']);
      sys._twinBonds = pairs;
      sys.bonds.geometry.setDrawRange(0, pairs.length * 2);
    }

    // Three-act cycle: build tension, reach toward the gap, retreat.
    const cycleDur = 7.5;
    const cyclePhase = ((elapsed % cycleDur) + cycleDur) % cycleDur / cycleDur;
    const rising = smoothstep(0.22, 0.46, cyclePhase);
    const falling = 1 - smoothstep(0.62, 0.94, cyclePhase);
    const reachEnvelope = Math.min(rising, falling);

    const breatheL = 0.5 + 0.5 * Math.sin(elapsed * 0.8);
    const breatheR = 0.5 + 0.5 * Math.sin(elapsed * 1.3 + 0.9);

    for (let i = 0; i < sys.n; i++) {
      const side = i < half ? -1 : 1;          // -1 = elder (left), +1 = young (right)
      const isElder = side < 0;
      const breathe = isElder ? breatheL : breatheR;
      const rot = elapsed * (isElder ? 0.06 : 0.17) * -side; // young turns faster, livelier
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const dx = sys.baseDir[i * 3 + 0];
      const dy = sys.baseDir[i * 3 + 1];
      const dz = sys.baseDir[i * 3 + 2];
      const rx = dx * cs - dz * sn;
      const rz = dx * sn + dz * cs;

      // Texture: elder tighter and calmer; young wider with individual
      // turbulence on top of the shared breathing.
      const spread = isElder ? 0.56 : 0.88;
      const breatheAmp = isElder ? 0.12 : 0.26;
      let r = cr * sys.baseR[i] * (spread + breatheAmp * breathe);
      if (!isElder) r += Math.sin(elapsed * 1.8 + sys.phase[i]) * 0.05;

      let px = cx + side * gapHalf + rx * r;
      let py = cy + dy * r + (isElder ? 0 : Math.sin(elapsed * 1.1 + sys.phase[i]) * 0.04);
      let pz = cz + rz * r;

      // Inner-facing particles stretch toward the gap during the reach act.
      const innerness = Math.max(0, rx * -side);
      const g = innerness * reachEnvelope;
      px += (cx - px) * (g * 0.32);

      pos[i * 3 + 0] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;

      c.copy(isElder ? elder : young).lerp(hot, g * 0.3);
      const flicker = isElder ? 1 : 0.85 + 0.15 * Math.sin(elapsed * 3 + sys.phase[i]);
      const b = (isElder ? 0.42 + 0.18 * breathe : 0.34 + 0.3 * breathe) * flicker + g * 0.22;
      col[i * 3 + 0] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }

    // Bonds: read this frame's already-updated particle positions.
    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    const maxTendril = 0.55; // how far a bridge attempt can grow -- well short of the middle
    for (let k = 0; k < sys._twinBonds.length; k++) {
      const [a, b, kind] = sys._twinBonds[k];
      const p0 = k * 6, p1 = k * 6 + 3;

      if (kind === 'bridge') {
        // A single tendril growing from ITS OWN particle toward the middle,
        // capped short of the true center -- never a line to the other side.
        const side = b; // repurposed: -1 (grows from elder) or 1 (grows from young)
        const ax = pos[a * 3 + 0], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
        const dirSign = -side; // elder reaches toward +x, young toward -x
        const avail = Math.max(0, (cx - ax) * dirSign);
        const travel = Math.min(reachEnvelope * maxTendril, avail);
        bpos[p0 + 0] = ax; bpos[p0 + 1] = ay; bpos[p0 + 2] = az;
        bpos[p1 + 0] = ax + dirSign * travel; bpos[p1 + 1] = ay; bpos[p1 + 2] = az;

        const flick = Math.max(0, Math.sin(elapsed * 2.6 + k * 1.7) - 0.35);
        const v = Math.min(0.42, reachEnvelope * flick * 1.7);
        c.copy(side < 0 ? elder : young).lerp(hot, 0.55);
        const br = c.r * v, bgc = c.g * v, bb = c.b * v;
        // Dim at the anchor (still part of the mass), brighter at the tip
        // (the reaching edge, glimpsed and gone).
        bcol[p0 + 0] = br * 0.35; bcol[p0 + 1] = bgc * 0.35; bcol[p0 + 2] = bb * 0.35;
        bcol[p1 + 0] = br; bcol[p1 + 1] = bgc; bcol[p1 + 2] = bb;
        continue;
      }

      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];

      let br, bgc, bb;
      if (kind === 'elder') {
        // A dense, quietly-present lattice: established, doesn't flicker.
        const v = 0.16 + 0.08 * breatheL;
        br = elder.r * v; bgc = elder.g * v; bb = elder.b * v;
      } else {
        // A few loose bonds that shimmer: still forming its own shape.
        const flick = 0.4 + 0.6 * Math.max(0, Math.sin(elapsed * 1.6 + k));
        const v = 0.1 + 0.14 * flick;
        br = young.r * v; bgc = young.g * v; bb = young.b * v;
      }
      bcol[p0 + 0] = br; bcol[p0 + 1] = bgc; bcol[p0 + 2] = bb;
      bcol[p1 + 0] = br; bcol[p1 + 1] = bgc; bcol[p1 + 2] = bb;
    }
  },

  // Station 2: "un gran auditorio solo para hacer grados?" -- a doubtful
  // question about a space reduced to one narrow use. The particles sit in a
  // rigid, orderly grid (rows and columns, like fixed seating), boxed by a
  // wireframe that marks its own boundary. High cohesion, near-zero
  // dispersion: nothing reaches past the edge, nothing leaves the block.
  // Almost no motion -- rigidity itself is the point. This is what the next
  // station's "decidio encontrarse con el mundo" breaks open.
  'auditorium-lattice'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;

    // One-time grid layout: rows/cols/layers close to sys.n, plus the fixed
    // real-particle indices used for the boundary wireframe and row/column
    // dividers. Computed once, reused every frame.
    if (!sys._latticeSetup) {
      sys._latticeSetup = true;
      const cols = 10, layers = 3;
      const rows = Math.max(2, Math.floor(sys.n / (cols * layers)));
      sys._lat = { cols, rows, layers };
      const idx = (u, v, w) => w * rows * cols + v * cols + u;

      const bonds = [];
      const uMax = cols - 1, vMax = rows - 1, wMax = layers - 1;
      // Box edges: the literal boundary of the space, nothing crosses it.
      for (const [v, w] of [[0, 0], [vMax, 0], [0, wMax], [vMax, wMax]]) bonds.push([idx(0, v, w), idx(uMax, v, w), 'edge']);
      for (const [u, w] of [[0, 0], [uMax, 0], [0, wMax], [uMax, wMax]]) bonds.push([idx(u, 0, w), idx(u, vMax, w), 'edge']);
      for (const [u, v] of [[0, 0], [uMax, 0], [0, vMax], [uMax, vMax]]) bonds.push([idx(u, v, 0), idx(u, v, wMax), 'edge']);
      // Row dividers (front and back face): the rows of fixed seating.
      for (const f of [0.25, 0.5, 0.75]) {
        const v = Math.round(vMax * f);
        bonds.push([idx(0, v, 0), idx(uMax, v, 0), 'row']);
        bonds.push([idx(0, v, wMax), idx(uMax, v, wMax), 'row']);
      }
      // A couple of aisle-like column dividers on the front face.
      for (const f of [0.33, 0.66]) {
        const u = Math.round(uMax * f);
        bonds.push([idx(u, 0, 0), idx(u, vMax, 0), 'row']);
      }
      sys._latticeBonds = bonds;
      sys.bonds.geometry.setDrawRange(0, bonds.length * 2);
    }

    const { cols, rows, layers } = sys._lat;
    const capacity = cols * rows * layers;
    const width = 2.2, height = 1.8, depth = 0.7;
    // This IS the institution (the auditorium itself), not a generation --
    // uses the institution color, not the elder/young gradient (D19).
    const base = institution;
    // A single slow, synchronized hum -- everyone lit the same way, unlike
    // station 1's individually-phased particles. Institutional, not alive.
    const hum = 0.92 + 0.08 * Math.sin(elapsed * 0.6);

    for (let i = 0; i < sys.n; i++) {
      const g = Math.min(i, capacity - 1);
      const u = g % cols;
      const v = Math.floor(g / cols) % rows;
      const w = Math.floor(g / (cols * rows)) % layers;

      const jitter = Math.sin(elapsed * 0.5 + sys.phase[i]) * 0.015; // barely alive
      const px = cx + (u / (cols - 1) - 0.5) * width + jitter;
      const py = cy + (v / (rows - 1) - 0.5) * height;
      const pz = cz + (layers > 1 ? (w / (layers - 1) - 0.5) * depth : 0) + jitter * 0.6;

      pos[i * 3 + 0] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;

      const b = (0.34 + e * 0.24) * hum;
      col[i * 3 + 0] = base.r * b;
      col[i * 3 + 1] = base.g * b;
      col[i * 3 + 2] = base.b * b;
    }

    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    for (let k = 0; k < sys._latticeBonds.length; k++) {
      const [a, b, kind] = sys._latticeBonds[k];
      const p0 = k * 6, p1 = k * 6 + 3;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      const v = (kind === 'edge' ? 0.3 : 0.16) * hum;
      bcol[p0 + 0] = base.r * v; bcol[p0 + 1] = base.g * v; bcol[p0 + 2] = base.b * v;
      bcol[p1 + 0] = base.r * v; bcol[p1 + 1] = base.g * v; bcol[p1 + 2] = base.b * v;
    }
  },

  // Station 3: "la Universidad decidio encontrarse con el mundo" -- the
  // direct answer to station 2's confinement. Plays ONCE per activation,
  // using sys.activeTime (motion-study.md #6): a small echo of station 2's
  // box (half its size, not the centerpiece here) sits still for a moment,
  // then steadily and confidently opens into a wide field that stays open --
  // a transformation, not a breathing loop. No retreat: the decision holds.
  'opens-to-world'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;

    if (!sys._openSetup) {
      sys._openSetup = true;
      const cols = 10, layers = 3;
      const rows = Math.max(2, Math.floor(sys.n / (cols * layers)));
      sys._openGrid = { cols, rows, layers };
      const idx = (u, v, w) => w * rows * cols + v * cols + u;
      const uMax = cols - 1, vMax = rows - 1, wMax = layers - 1;
      const edges = [];
      for (const [v, w] of [[0, 0], [vMax, 0], [0, wMax], [vMax, wMax]]) edges.push([idx(0, v, w), idx(uMax, v, w)]);
      for (const [u, w] of [[0, 0], [uMax, 0], [0, wMax], [uMax, wMax]]) edges.push([idx(u, 0, w), idx(u, vMax, w)]);
      for (const [u, v] of [[0, 0], [uMax, 0], [0, vMax], [uMax, vMax]]) edges.push([idx(u, v, 0), idx(u, v, wMax)]);
      sys._openEdges = edges;

      // A handful of connections that only make sense once the space is
      // open: longer, wider-reaching, fixed pairs spread across the pool.
      const openBonds = [];
      for (let k = 0; k < 10; k++) {
        const a = (k * 37) % sys.n, b = (k * 37 + 97) % sys.n;
        if (a !== b) openBonds.push([a, b]);
      }
      sys._openBonds = openBonds;
      sys.bonds.geometry.setDrawRange(0, (edges.length + openBonds.length) * 2);
    }

    const { cols, rows, layers } = sys._openGrid;
    // Act 1 (0-0.8s): the small box sits still. Act 2 (0.8-3.6s): it opens,
    // measured and steady, never rushed. Act 3 (3.6s+): holds open, for good.
    const openness = smoothstep(0.8, 3.6, sys.activeTime);

    const gw = 1.1, gh = 0.9, gd = 0.35; // half station 2's box: an echo, not the centerpiece
    // Still the institution (la Universidad), opening itself -- not yet the
    // generations meeting it. Stays institution-colored throughout (D19).
    const base = institution;
    const rot = elapsed * 0.05; // the open field drifts slowly, calmly
    const cs = Math.cos(rot), sn = Math.sin(rot);

    for (let i = 0; i < sys.n; i++) {
      const u = i % cols;
      const v = Math.floor(i / cols) % rows;
      const w = Math.floor(i / (cols * rows)) % layers;
      const gx = (u / (cols - 1) - 0.5) * gw;
      const gy = (v / (rows - 1) - 0.5) * gh;
      const gz = layers > 1 ? (w / (layers - 1) - 0.5) * gd : 0;

      // Open target: a wide, loosely drifting field -- reaching further out
      // than any other station's cloud, and settling there for good.
      const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
      const rx = dx * cs - dz * sn, rz = dx * sn + dz * cs;
      const orNoise = Math.sin(elapsed * 0.6 + sys.phase[i]) * 0.06;
      const orR = config.station.cloudRadius * sys.baseR[i] * 1.35 + orNoise;
      const ox = rx * orR, oy = dy * orR, oz = rz * orR;

      const px = cx + gx + (ox - gx) * openness;
      const py = cy + gy + (oy - gy) * openness;
      const pz = cz + gz + (oz - gz) * openness;
      pos[i * 3 + 0] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;

      const b = 0.32 + e * 0.3 + openness * 0.16;
      col[i * 3 + 0] = base.r * b;
      col[i * 3 + 1] = base.g * b;
      col[i * 3 + 2] = base.b * b;
    }

    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    let k = 0;
    for (const [a, b] of sys._openEdges) {
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      const v = 0.26 * (1 - openness); // the small cage fades as it opens
      bcol[p0 + 0] = base.r * v; bcol[p0 + 1] = base.g * v; bcol[p0 + 2] = base.b * v;
      bcol[p1 + 0] = base.r * v; bcol[p1 + 1] = base.g * v; bcol[p1 + 2] = base.b * v;
    }
    for (const [a, b] of sys._openBonds) {
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      const v = 0.14 * openness; // new connections, only possible once open
      bcol[p0 + 0] = base.r * v; bcol[p0 + 1] = base.g * v; bcol[p0 + 2] = base.b * v;
      bcol[p1 + 0] = base.r * v; bcol[p1 + 1] = base.g * v; bcol[p1 + 2] = base.b * v;
    }
  },

  // Station 4: "Academia + Industria + Ciudad" -- three named forces, plainly
  // a triad. Three distinct clusters (not a single merged mass), each with
  // its own anchor and its own subtle tint of institution-indigo, joined by
  // a triangle of bonds in the PURE institution color -- the connection
  // itself belongs to the University, which is what holds these three
  // together. All three clusters share the exact same motion character
  // (same radius, same breathing rhythm, same texture): equal treatment as
  // the structural statement that these are equal partners, deliberately
  // unlike station 1's asymmetric elder/young pair.
  'triad-forces'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;

    if (!sys._triadSetup) {
      sys._triadSetup = true;
      const groupSize = Math.floor(sys.n / 3);
      const ranges = [[0, groupSize], [groupSize, groupSize * 2], [groupSize * 2, sys.n]];
      sys._triadRanges = ranges;
      // Only a fraction of each cluster actually renders (the rest are
      // driven invisible below) -- a small spark of a few dozen points per
      // force, deliberately NOT the same weight as a generation's mass, so
      // the triad doesn't read as "two more generations plus one."
      sys._triadVisible = 42;

      const ax = 0.95, ay = 0.85;
      const anchors = [
        new THREE.Vector3(0, ay, 0),           // Academia: apex
        new THREE.Vector3(-ax, -ay * 0.55, 0), // Industria: lower-left
        new THREE.Vector3(ax, -ay * 0.55, 0),  // Ciudad: lower-right
      ];
      sys._triadAnchors = anchors;

      // Distinct tints of institution-indigo -- pushed on hue AND saturation
      // AND lightness together, not just a small hue nudge (which reads as
      // near-identical on a monitor). Industria: brighter, more saturated,
      // leaning magenta-violet ("energetic"). Ciudad: darker, more muted,
      // leaning blue ("steel, quieter"). Academia stays the pure anchor.
      const hsl = { h: 0, s: 0, l: 0 };
      institution.getHSL(hsl);
      const warm = new THREE.Color().setHSL(clamp01(hsl.h + 0.07), clamp01(hsl.s * 1.3), clamp01(hsl.l * 1.4));
      const cool = new THREE.Color().setHSL(clamp01(hsl.h - 0.06), clamp01(hsl.s * 0.6), clamp01(hsl.l * 0.55));
      sys._triadTints = [institution, warm, cool];

      // The particle in each cluster that faces a given neighbor, used to
      // anchor that pairwise bond -- the same "innermost" technique as
      // station 1's bridges, so the triangle connects real, chosen particles.
      // Searched only within the VISIBLE subset, so the bond always lands on
      // an actual spark, not an invisible point.
      const facing = (range, dir) => {
        let best = -1, bestScore = -Infinity;
        for (let i = range[0]; i < range[0] + sys._triadVisible; i++) {
          const score = sys.baseDir[i * 3 + 0] * dir.x + sys.baseDir[i * 3 + 1] * dir.y + sys.baseDir[i * 3 + 2] * dir.z;
          if (score > bestScore) { bestScore = score; best = i; }
        }
        return best;
      };
      const pairs = [[0, 1], [1, 2], [2, 0]];
      const triangle = pairs.map(([ia, ib]) => {
        const dirAB = anchors[ib].clone().sub(anchors[ia]).normalize();
        return [facing(ranges[ia], dirAB), facing(ranges[ib], dirAB.clone().negate())];
      });
      sys._triadTriangle = triangle;

      // A little internal texture per cluster: fixed-pair bonds, same
      // density for all three (equal treatment), within the visible subset.
      const internal = [];
      for (let g = 0; g < 3; g++) {
        const from = ranges[g][0];
        const span = sys._triadVisible;
        for (let k = 0; k < 12; k++) {
          const a = from + (k * 11) % span, b = from + (k * 11 + 23) % span;
          if (a !== b) internal.push([a, b, g]);
        }
      }
      sys._triadInternal = internal;
      sys.bonds.geometry.setDrawRange(0, (triangle.length + internal.length) * 2);
    }

    const ranges = sys._triadRanges, anchors = sys._triadAnchors, tints = sys._triadTints;
    const visible = sys._triadVisible;
    const clusterRadius = config.station.cloudRadius * 0.34;
    const rot = elapsed * 0.12; // one shared rotation -- same for every cluster
    const cs = Math.cos(rot), sn = Math.sin(rot);

    for (let g = 0; g < 3; g++) {
      const [from, to] = ranges[g];
      const anchor = anchors[g];
      const tint = tints[g];
      // Phase-offset slightly per cluster so the three don't breathe in
      // perfect unison (feels alive), but same amplitude and rhythm.
      const breathe = 0.5 + 0.5 * Math.sin(elapsed * 0.9 + g * 2.1);
      for (let i = from; i < to; i++) {
        const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
        const rx = dx * cs - dz * sn, rz = dx * sn + dz * cs;
        const r = clusterRadius * sys.baseR[i] * (0.7 + 0.25 * breathe + e * 0.1);
        pos[i * 3 + 0] = cx + anchor.x + rx * r;
        pos[i * 3 + 1] = cy + anchor.y + dy * r;
        pos[i * 3 + 2] = cz + anchor.z + rz * r;

        // Only the first `visible` particles of each cluster actually show:
        // the rest stay in the pool (bonds may still reference them) but
        // render at zero brightness, keeping the triad's footprint small.
        if (i - from < visible) {
          const b = 0.36 + e * 0.28 + breathe * 0.1;
          col[i * 3 + 0] = tint.r * b;
          col[i * 3 + 1] = tint.g * b;
          col[i * 3 + 2] = tint.b * b;
        } else {
          col[i * 3 + 0] = 0; col[i * 3 + 1] = 0; col[i * 3 + 2] = 0;
        }
      }
    }

    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    let k = 0;
    const pulse = 0.6 + 0.4 * Math.sin(elapsed * 0.7); // the three, breathing as one
    for (const [a, b] of sys._triadTriangle) {
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      const v = 0.3 + 0.14 * pulse; // solid and confident: this connection already exists
      bcol[p0 + 0] = institution.r * v; bcol[p0 + 1] = institution.g * v; bcol[p0 + 2] = institution.b * v;
      bcol[p1 + 0] = institution.r * v; bcol[p1 + 1] = institution.g * v; bcol[p1 + 2] = institution.b * v;
    }
    for (const [a, b, g] of sys._triadInternal) {
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      const tint = tints[g];
      const v = 0.14;
      bcol[p0 + 0] = tint.r * v; bcol[p0 + 1] = tint.g * v; bcol[p0 + 2] = tint.b * v;
      bcol[p1 + 0] = tint.r * v; bcol[p1 + 1] = tint.g * v; bcol[p1 + 2] = tint.b * v;
    }
  },

  // Station 5: "Los eventos nunca fueron el objetivo. El impacto si." --
  // studied from the referente's own "impact" state (motion-study.md):
  // it reuses its OWN triad anchors from its prior "triad" moment, pulled
  // inward toward a shared center, plus outward-radiating rings from that
  // point. Same structural idea here, in our vocabulary: a small echo of
  // station 4's triad (the "events") converges toward the center once
  // (sys.activeTime, D18's one-shot technique) and then fades -- it was
  // never the point. What replaces it, and keeps going for as long as the
  // station is active, is a continuous outward-radiating wave (a recycled
  // emitter: each particle has its own staggered birth-travel-fade cycle,
  // motion-study's "the connection is drawn, not implied" applied to a
  // trace of its own recent path rather than to another particle).
  'impact-radiates'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;
    const c = new THREE.Color();

    if (!sys._impactSetup) {
      sys._impactSetup = true;
      const echoPerGroup = 12;
      sys._impactEcho = [[0, echoPerGroup], [echoPerGroup, echoPerGroup * 2], [echoPerGroup * 2, echoPerGroup * 3]];
      const waveFrom = echoPerGroup * 3;
      sys._impactWaveRange = [waveFrom, sys.n];

      const ax = 0.55, ay = 0.5; // a smaller echo of station 4's triad layout
      sys._impactAnchors = [
        new THREE.Vector3(0, ay, 0),
        new THREE.Vector3(-ax, -ay * 0.55, 0),
        new THREE.Vector3(ax, -ay * 0.55, 0),
      ];

      // A few traveling particles get a visible trace of their own recent
      // path (a comet tail), showing direction and motion explicitly.
      const trails = [];
      const span = sys.n - waveFrom;
      for (let k = 0; k < 16; k++) trails.push(waveFrom + Math.floor((k / 16) * span));
      sys._impactTrails = trails;
      sys.bonds.geometry.setDrawRange(0, trails.length * 2);
    }

    // Paced slowly and with real separation between beats, so the causal
    // link (this point converged -> that's what bursts) survives a blink:
    // the triangle sits still and legible, THEN converges slowly, THEN
    // holds at the merged point for a moment before anything bursts, and
    // only much later -- well after the burst is already visible -- does
    // the origin point fade.
    const t = sys.activeTime;
    const converge = smoothstep(1.0, 4.6, t);        // sit, then pull inward, slowly
    const radiate = smoothstep(5.2, 8.0, t);          // a held pause, then the impact takes over
    const echoFade = 1 - smoothstep(6.5, 9.5, t);     // stays visible well into the burst, then fades

    // Echo: a small, understated convergence of the same three forces.
    for (let gi = 0; gi < 3; gi++) {
      const [from, to] = sys._impactEcho[gi];
      const anchor = sys._impactAnchors[gi];
      for (let i = from; i < to; i++) {
        const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
        const r = 0.18 * sys.baseR[i];
        const ax = cx + anchor.x * (1 - converge) + dx * r;
        const ay = cy + anchor.y * (1 - converge) + dy * r;
        const az = cz + anchor.z * (1 - converge) + dz * r;
        pos[i * 3 + 0] = ax; pos[i * 3 + 1] = ay; pos[i * 3 + 2] = az;
        const b = (0.3 + e * 0.2) * echoFade;
        col[i * 3 + 0] = institution.r * b;
        col[i * 3 + 1] = institution.g * b;
        col[i * 3 + 2] = institution.b * b;
      }
    }

    // Impact wave: a recycled emitter. Each particle owns a fixed radial
    // direction and a staggered phase, so births overlap continuously --
    // an ongoing shockwave, not a single pulse.
    const [waveFrom, waveTo] = sys._impactWaveRange;
    const maxR = config.station.cloudRadius * 1.05;
    const L = 3.0; // seconds per particle's birth-to-fade cycle
    const ageOf = (i) => {
      const phaseFrac = sys.phase[i] / (Math.PI * 2);
      return ((elapsed / L) + phaseFrac) % 1;
    };
    const radiusOf = (age) => maxR * Math.pow(age, 0.65);
    const envelopeOf = (age) => smoothstep(0, 0.08, age) * (1 - smoothstep(0.6, 1, age));

    for (let i = waveFrom; i < waveTo; i++) {
      const age = ageOf(i);
      const r = radiusOf(age);
      const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
      pos[i * 3 + 0] = cx + dx * r;
      pos[i * 3 + 1] = cy + dy * r;
      pos[i * 3 + 2] = cz + dz * r;

      const spark = smoothstep(0, 0.08, age) * (1 - smoothstep(0.08, 0.22, age));
      c.copy(institution).lerp(hot, spark * 0.6);
      const b = (0.3 + e * 0.3) * envelopeOf(age) * radiate;
      col[i * 3 + 0] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }

    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    const trailBack = 0.05; // fraction of lifespan the tail reaches back
    let k = 0;
    for (const i of sys._impactTrails) {
      const age = ageOf(i);
      const ageBack = Math.max(0, age - trailBack);
      const r = radiusOf(age), rBack = radiusOf(ageBack);
      const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = cx + dx * r; bpos[p0 + 1] = cy + dy * r; bpos[p0 + 2] = cz + dz * r;
      bpos[p1 + 0] = cx + dx * rBack; bpos[p1 + 1] = cy + dy * rBack; bpos[p1 + 2] = cz + dz * rBack;
      const v = 0.3 * envelopeOf(age) * radiate;
      bcol[p0 + 0] = institution.r * v; bcol[p0 + 1] = institution.g * v; bcol[p0 + 2] = institution.b * v;
      bcol[p1 + 0] = institution.r * v * 0.3; bcol[p1 + 1] = institution.g * v * 0.3; bcol[p1 + 2] = institution.b * v * 0.3;
    }
  },

  // Station 6, take two: "Un evento trae personas. Una comunidad trae
  // transformacion." Kiwi's own concept, replacing the single-blended-mass
  // version (which read as togetherness but not transformation): the elder
  // and young masses continuously exchange members THROUGH a third,
  // indeterminate middle space -- visualizing transformation as the direct
  // product of their interaction, not just their proximity. This DOES bring
  // the two-generation visual back (unlike the prior version's caution about
  // pre-empting station 9), because the point here is specifically the
  // MECHANISM of exchange, not the reveal that two generations exist.
  //
  // Every particle runs its own perpetual cycle: dwell with its home
  // generation, cross through the middle (changing color toward `hot` --
  // reused deliberately, since it already means "something new emerging" at
  // stations 1 and 5), dwell with the other generation, cross back. Colors
  // and positions are literally the same computation, so nothing is
  // decorative -- the crossing IS the transformation.
  'community-exchange'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;
    const c = new THREE.Color();

    if (!sys._exchangeSetup) {
      sys._exchangeSetup = true;
      const trailCount = 18;
      const trails = [];
      for (let k = 0; k < trailCount; k++) trails.push(Math.floor((k / trailCount) * sys.n));
      sys._exchangeTrails = trails;
      sys.bonds.geometry.setDrawRange(0, trails.length * 2);
    }

    const gapHalf = 1.6;
    const localR = config.station.cloudRadius * 0.34;
    const cycleLen = 9.0; // seconds for one full round trip: elder -> middle -> young -> middle -> elder

    // A position in [-1, 0, 1, 0] over one cycle, easing to a stop at each
    // waypoint (smoothstep has zero slope at both ends of each quarter) --
    // so particles genuinely DWELL at each generation and at the middle,
    // rather than just passing through at constant speed.
    const wave4 = (phaseFrac) => {
      const q = phaseFrac * 4;
      const qi = Math.floor(q) % 4;
      const qf = q - Math.floor(q);
      const waypoints = [-1, 0, 1, 0];
      const nextpoints = [0, 1, 0, -1];
      const local = smoothstep(0, 1, qf);
      return waypoints[qi] + (nextpoints[qi] - waypoints[qi]) * local;
    };
    const sidePosOf = (i, atTime) => {
      const phaseOffset = sys.phase[i] / (Math.PI * 2);
      const raw = (atTime / cycleLen) + phaseOffset;
      // Positive modulo: atTime can go negative (the trail looks slightly
      // back in time, elapsed - trailBack, which is negative for the first
      // instant after load) and JS's % does not wrap negatives into [0,1).
      const phaseFrac = ((raw % 1) + 1) % 1;
      return wave4(phaseFrac);
    };
    const colorAt = (sidePos, target) => {
      if (sidePos <= 0) target.copy(hot).lerp(elder, -sidePos);
      else target.copy(hot).lerp(young, sidePos);
    };

    for (let i = 0; i < sys.n; i++) {
      const sidePos = sidePosOf(i, elapsed);
      const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
      const r = localR * sys.baseR[i] * (0.75 + e * 0.15);
      pos[i * 3 + 0] = cx + sidePos * gapHalf + dx * r;
      pos[i * 3 + 1] = cy + dy * r;
      pos[i * 3 + 2] = cz + dz * r;

      colorAt(sidePos, c);
      const b = 0.36 + e * 0.3;
      col[i * 3 + 0] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }

    // A few particles carry a visible trail (station 5's technique): the
    // crossing reads as directed motion, not a random flicker between poles.
    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    const trailBack = 0.4; // seconds
    let k = 0;
    for (const i of sys._exchangeTrails) {
      const sidePos = sidePosOf(i, elapsed);
      const sidePosBack = sidePosOf(i, elapsed - trailBack);
      const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
      const r = localR * sys.baseR[i] * 0.85;
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = cx + sidePos * gapHalf + dx * r; bpos[p0 + 1] = cy + dy * r; bpos[p0 + 2] = cz + dz * r;
      bpos[p1 + 0] = cx + sidePosBack * gapHalf + dx * r; bpos[p1 + 1] = cy + dy * r; bpos[p1 + 2] = cz + dz * r;
      colorAt(sidePos, c);
      const v = 0.24;
      bcol[p0 + 0] = c.r * v; bcol[p0 + 1] = c.g * v; bcol[p0 + 2] = c.b * v;
      bcol[p1 + 0] = c.r * v * 0.25; bcol[p1 + 1] = c.g * v * 0.25; bcol[p1 + 2] = c.b * v * 0.25;
    }
  },

  // Station 7, take four: "El talento crece a la velocidad de la confianza."
  // D29 built the right END state (one shared, interwoven web) but nothing
  // actually happened -- Kiwi wants the ARRIVAL itself watched, or the
  // "growth" in the text has nothing to show for it. So this is now a real
  // one-shot animation (sys.activeTime, D18's technique): it STARTS as two
  // distinct, separate, organic masses -- elder left, young right, exactly
  // like station 1's opening image -- and each particle migrates from there
  // into its assigned spot in the single shared web, staggered per-particle
  // (motion-study.md's own device from station 5) so the reassembly cascades
  // rather than snapping all at once. The connecting threads are visible
  // throughout, stretching and pulling taut as the masses migrate -- the
  // weaving-together IS the transformation, not a cut between two states.
  // Once assembled, it settles into D29's shared tiny pulse.
  'trust-grows'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;
    const c = new THREE.Color();
    const c2 = new THREE.Color();

    if (!sys._trustSetup) {
      sys._trustSetup = true;
      const spokes = 30, shells = 12; // 30*12 = sys.n exactly -- one shared web
      sys._trustSpokes = spokes;
      sys._trustShells = shells;
      sys._trustSpokeGen = Array.from({ length: spokes }, (_, s) => s % 2); // alternating: 0=elder, 1=young
      sys._trustProgress = new Float32Array(sys.n); // written per-particle, read by the bonds pass
      const idx = (spoke, shell) => shell * spokes + spoke;

      const bonds = []; // [a, b] -- straight; color comes from each vertex's own spoke
      for (let s = 0; s < spokes; s++) bonds.push([idx(s, 0), idx(s, shells - 1)]);
      for (const ringShell of [3, 7, shells - 1]) {
        for (let s = 0; s < spokes; s++) bonds.push([idx(s, ringShell), idx((s + 1) % spokes, ringShell)]);
      }
      sys._trustBonds = bonds;
      sys.bonds.geometry.setDrawRange(0, bonds.length * 2);
    }

    const spokes = sys._trustSpokes, shells = sys._trustShells, spokeGen = sys._trustSpokeGen;
    const progressArr = sys._trustProgress;
    const baseRadius = config.station.cloudRadius * 0.5;
    const domeDepth = 0.5;
    const gapHalf = 1.6; // where the two starting masses sit, elder left / young right

    const rot = elapsed * 0.05;
    const heartbeat = 1 + 0.035 * Math.sin(elapsed * 1.1); // tiny, shared -- one structure, one pulse
    const pulse = 0.9 + 0.1 * Math.sin(elapsed * 1.1);

    // Color at a point along a spoke once assembled: fades from `hot` at the
    // hub (fully merged) to that spoke's own generation color at the rim.
    const colorAt = (spoke, shellFrac, out) => {
      const gen = spokeGen[spoke] === 0 ? elder : young;
      out.copy(hot).lerp(gen, shellFrac);
    };

    // Per-particle staggered arrival: hold as two masses briefly, then each
    // particle migrates on its own schedule (spread across ~3s of starts,
    // each taking ~1.8s), so the web assembles as a cascade, not a snap.
    const holdStart = 0.8, staggerWindow = 3.0, travelDur = 1.8;

    for (let i = 0; i < sys.n; i++) {
      const spoke = i % spokes, shell = Math.floor(i / spokes) % shells;
      const shellFrac = (shell + 1) / shells;
      const gen = spokeGen[spoke];

      const tStart = holdStart + (sys.phase[i] / (Math.PI * 2)) * staggerWindow;
      const progress = smoothstep(tStart, tStart + travelDur, sys.activeTime);
      progressArr[i] = progress;

      // End position: the ordered web spot.
      const rJit = 1 + (sys.baseR[i] - 0.7) * 0.06;
      const aJit = (sys.phase[i] - Math.PI) * 0.01;
      const angle = (spoke / spokes) * Math.PI * 2 + rot + aJit;
      const endR = baseRadius * shellFrac * heartbeat * rJit;
      const ex = cx + Math.cos(angle) * endR;
      const ey = cy + Math.sin(angle) * endR;
      const ez = cz + domeDepth * (1 - shellFrac);

      // Start position: a loose organic mass, elder left / young right --
      // the same two-generation image station 1 opened with.
      const side = gen === 0 ? -1 : 1;
      const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
      const cloudR = baseRadius * 0.85 * sys.baseR[i];
      const sx = cx + side * gapHalf + dx * cloudR;
      const sy = cy + dy * cloudR;
      const sz = cz + dz * cloudR;

      pos[i * 3 + 0] = sx + (ex - sx) * progress;
      pos[i * 3 + 1] = sy + (ey - sy) * progress;
      pos[i * 3 + 2] = sz + (ez - sz) * progress;

      // Color travels too: pure generation color while separate, blending
      // toward the merged hub gradient only as each particle arrives.
      c.copy(gen === 0 ? elder : young);
      colorAt(spoke, shellFrac, c2);
      c.lerp(c2, progress);
      const b = (0.32 + e * 0.28) * pulse;
      col[i * 3 + 0] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
    }

    // Threads stretch taut as the masses migrate -- dim while still
    // separate, brightening to full as both ends settle into place.
    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    let k = 0;
    for (const [a, b] of sys._trustBonds) {
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      const avgProgress = (progressArr[a] + progressArr[b]) / 2;
      const v = (0.05 + avgProgress * 0.31) * pulse;
      colorAt(a % spokes, (Math.floor(a / spokes) % shells + 1) / shells, c);
      bcol[p0 + 0] = c.r * v; bcol[p0 + 1] = c.g * v; bcol[p0 + 2] = c.b * v;
      colorAt(b % spokes, (Math.floor(b / spokes) % shells + 1) / shells, c);
      bcol[p1 + 0] = c.r * v; bcol[p1 + 1] = c.g * v; bcol[p1 + 2] = c.b * v;
    }
  },

  // Station 8: "La experiencia construye el camino. Las nuevas generaciones
  // descubren nuevas rutas." Studied from the referente's own "routes" state
  // (its moment id is literally "nuevas-rutas"): a handful of individually
  // seeded lanes, each a curved bezier from a wide point toward a shared
  // center, looping continuously with a bright traveling bead -- discrete,
  // legible paths, never one undifferentiated mass. We take that TECHNIQUE
  // (fixed lanes, curved travel, a traveling highlight) but invert the
  // geometry for our two clauses: one already-finished trunk path (elder --
  // "la experiencia" already built this, so it is simply whole and calm the
  // moment the station activates, nothing to watch it become) and several
  // new branches forking off real points on that trunk (young), each one
  // visibly growing outward when the station activates (sys.activeTime,
  // D18), staggered branch-to-branch and particle-to-particle along its own
  // length (motion-study's device, reused from stations 5-7) -- discovery as
  // something that visibly happens, not a finished state. Once a branch has
  // grown in, a traveling glow keeps sweeping along it on a loop: the
  // discovering doesn't stop, it keeps going for as long as the station holds.
  'path-branches'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;
    const c = new THREE.Color();
    const branchCount = 6;

    if (!sys._pathSetup) {
      sys._pathSetup = true;
      const trunkCount = 72;
      const perBranch = Math.floor((sys.n - trunkCount) / branchCount);
      sys._pathTrunkCount = trunkCount;
      sys._pathPerBranch = perBranch;

      // The trunk: a single winding curve across the cloud, already whole.
      const trunkPoint = (t) => new THREE.Vector3(
        (t - 0.5) * config.station.cloudRadius * 1.7,
        Math.sin(t * Math.PI * 1.6 + 0.4) * config.station.cloudRadius * 0.28,
        Math.cos(t * Math.PI * 1.1) * config.station.cloudRadius * 0.16,
      );
      sys._pathTrunkPoint = trunkPoint;

      // Branch points spread along the trunk, each with its own fixed
      // direction and reach -- new routes, each going somewhere the trunk
      // itself doesn't, forking from a real, chosen trunk particle.
      const branches = [];
      for (let b = 0; b < branchCount; b++) {
        const anchorT = 0.14 + (b / (branchCount - 1)) * 0.72;
        const anchorIdx = Math.round(anchorT * (trunkCount - 1));
        const anchorPos = trunkPoint(anchorIdx / (trunkCount - 1));
        const dirAngle = (b / branchCount) * Math.PI * 2 + (b % 2 === 0 ? 0.5 : -0.5);
        const updown = b % 2 === 0 ? 1 : -1;
        const dir = new THREE.Vector3(Math.sin(dirAngle) * 0.5, updown, Math.cos(dirAngle) * 0.6).normalize();
        const reach = config.station.cloudRadius * (0.45 + (b % 3) * 0.12);
        const tip = anchorPos.clone().addScaledVector(dir, reach);
        const control = anchorPos.clone().lerp(tip, 0.5).addScaledVector(
          new THREE.Vector3(dir.z, 0, -dir.x), config.station.cloudRadius * 0.3,
        );
        branches.push({ anchorIdx, anchorPos, control, tip, startIdx: trunkCount + b * perBranch });
      }
      sys._pathBranches = branches;

      // Bonds: the trunk itself, each branch's own thread, and one bond per
      // branch marking exactly where it forks -- a real, chosen relation,
      // not implied by nearby positions.
      const bonds = [];
      for (let i = 0; i + 2 < trunkCount; i += 2) bonds.push([i, i + 2, 'trunk']);
      // Branch stride is wider than the trunk's: 48 points on a curve this
      // short, drawn additively, overlap on screen and wash out toward white
      // well before any single point's own brightness would. Thinning both
      // the visible points AND their bonds down to every 3rd index (below)
      // is what actually fixes that, not a dimmer color.
      for (const br of branches) {
        for (let j = 0; j + 3 < perBranch; j += 3) bonds.push([br.startIdx + j, br.startIdx + j + 3, 'branch']);
        bonds.push([br.anchorIdx, br.startIdx, 'fork']);
      }
      sys._pathBonds = bonds;
      sys._pathProgress = new Float32Array(sys.n);
      sys.bonds.geometry.setDrawRange(0, bonds.length * 2);
    }

    const trunkCount = sys._pathTrunkCount, perBranch = sys._pathPerBranch;
    const branches = sys._pathBranches, trunkPoint = sys._pathTrunkPoint;
    const progressArr = sys._pathProgress;

    // The trunk: present in full the instant the station is active, calm
    // and barely moving -- it was already built, there's nothing to watch.
    for (let i = 0; i < trunkCount; i++) {
      const t = i / (trunkCount - 1);
      const p = trunkPoint(t);
      const wob = Math.sin(elapsed * 0.4 + sys.phase[i]) * 0.015;
      pos[i * 3 + 0] = cx + p.x;
      pos[i * 3 + 1] = cy + p.y + wob;
      pos[i * 3 + 2] = cz + p.z;
      const tb = 0.4 + e * 0.22;
      col[i * 3 + 0] = elder.r * tb;
      col[i * 3 + 1] = elder.g * tb;
      col[i * 3 + 2] = elder.b * tb;
      progressArr[i] = 1;
    }

    // Branches: each grows outward from its fork point once the station
    // activates, staggered branch-to-branch and, within a branch, particle
    // by particle -- so the extension itself is watched, not just its result.
    const branchStagger = 0.85, branchGrowSpan = 1.6, travelDur = 1.1, holdStart = 0.6;
    for (let bi = 0; bi < branches.length; bi++) {
      const br = branches[bi];
      const brStart = holdStart + bi * branchStagger;
      for (let j = 0; j < perBranch; j++) {
        const idx = br.startIdx + j;
        const frac = j / Math.max(1, perBranch - 1);
        const tStart = brStart + frac * branchGrowSpan;
        const progress = smoothstep(tStart, tStart + travelDur, sys.activeTime);
        progressArr[idx] = progress;

        const curveX = quadPoint(br.anchorPos.x, br.control.x, br.tip.x, frac);
        const curveY = quadPoint(br.anchorPos.y, br.control.y, br.tip.y, frac);
        const curveZ = quadPoint(br.anchorPos.z, br.control.z, br.tip.z, frac);
        pos[idx * 3 + 0] = cx + br.anchorPos.x + (curveX - br.anchorPos.x) * progress;
        pos[idx * 3 + 1] = cy + br.anchorPos.y + (curveY - br.anchorPos.y) * progress;
        pos[idx * 3 + 2] = cz + br.anchorPos.z + (curveZ - br.anchorPos.z) * progress;

        // Only every 3rd particle actually renders (position still updates
        // for all of them, so the bonds above -- which only connect those
        // same visible indices -- read as one continuous thread, not a
        // gappy one). The rest stay black: real points, invisible weight.
        if (j % 3 !== 0) { col[idx * 3 + 0] = 0; col[idx * 3 + 1] = 0; col[idx * 3 + 2] = 0; continue; }

        // A traveling glow keeps sweeping along each finished branch, on a
        // loop -- discovery that keeps happening, not a single finished trip.
        // Driven by sys.activeTime (not elapsed) so it freezes with the rest
        // of the station when left, and starts fresh again on reentry.
        const raw = sys.activeTime * 0.3 + bi * 0.31;
        const travelT = ((raw % 1) + 1) % 1;
        let d = Math.abs(frac - travelT);
        d = Math.min(d, 1 - d);
        const sweepGlow = Math.max(0, 1 - d * 7) * progress;
        const arrivalGlow = 1 - progress; // fresh and bright as it lands, settling to jade
        c.copy(young).lerp(hot, Math.max(sweepGlow, arrivalGlow) * 0.7);
        const bb = (0.28 + e * 0.26) * (0.4 + progress * 0.5);
        col[idx * 3 + 0] = c.r * bb;
        col[idx * 3 + 1] = c.g * bb;
        col[idx * 3 + 2] = c.b * bb;
      }
    }

    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    let k = 0;
    for (const [a, b, kind] of sys._pathBonds) {
      const p0 = k * 6, p1 = k * 6 + 3; k++;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];

      if (kind === 'trunk') {
        const v = 0.18 + e * 0.06;
        bcol[p0 + 0] = elder.r * v; bcol[p0 + 1] = elder.g * v; bcol[p0 + 2] = elder.b * v;
        bcol[p1 + 0] = elder.r * v; bcol[p1 + 1] = elder.g * v; bcol[p1 + 2] = elder.b * v;
      } else {
        // A fork bond runs elder-at-the-trunk to young-at-the-branch: the
        // color itself shows the handoff, vertex by vertex.
        const va = 0.06 + progressArr[a] * 0.16, vb = 0.06 + progressArr[b] * 0.16;
        c.copy(kind === 'fork' ? elder : young);
        bcol[p0 + 0] = c.r * va; bcol[p0 + 1] = c.g * va; bcol[p0 + 2] = c.b * va;
        c.copy(young);
        bcol[p1 + 0] = c.r * vb; bcol[p1 + 1] = c.g * vb; bcol[p1 + 2] = c.b * vb;
      }
    }
  },

  // Station 9: "Una vision. Dos generaciones." The referente's own closest
  // match is its "duality" state (moment id `vision-generaciones`), already
  // studied in motion-study.md (#4: the two generational poles differ in
  // TEXTURE, not just color -- reused here from twin-reach's own version of
  // that idea: elder dense/quiet, young sparse/turbulent). But this is a
  // different beat than station 1: no reaching, no withdrawing, no bridge
  // attempts, just two clearly distinct masses continuously and visibly in
  // relation to one another. That relation is real, not implied: both
  // masses co-orbit a shared, empty center (their positions come from ONE
  // shared angle, not two independent ones), and each mass stays subtly
  // elongated toward wherever the other currently is -- a quiet, continuous
  // act of facing, recomputed every frame from the other mass's live
  // position, not a fixed pose. No bonds cross between the two masses: the
  // relationship here IS the orbit and the facing, not a connecting line.
  'dual-orbit'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;
    const e = sys.params.energy;
    const half = sys.n >> 1;

    if (!sys._orbitSetup) {
      sys._orbitSetup = true;
      const pairs = [];
      const denseCount = 40, sparseCount = 10;
      for (let k = 0; k < denseCount; k++) {
        const a = (k * 7) % half, b = (k * 7 + 17) % half;
        if (a !== b) pairs.push([a, b, 'elder']);
      }
      for (let k = 0; k < sparseCount; k++) {
        const span = sys.n - half;
        const a = half + (k * 13) % span, b = half + (k * 13 + 31) % span;
        if (a !== b) pairs.push([a, b, 'young']);
      }
      sys._orbitBonds = pairs;
      sys.bonds.geometry.setDrawRange(0, pairs.length * 2);
    }

    // A single shared angle drives both anchors -- diametrically opposite,
    // always the same distance apart, sweeping the empty center between them.
    const orbitRadius = 1.5, orbitSpeed = 0.12;
    const theta = elapsed * orbitSpeed;
    const eax = Math.cos(theta) * orbitRadius, eaz = Math.sin(theta) * orbitRadius;
    const yax = -eax, yaz = -eaz;
    const elderAngle = Math.atan2(yaz - eaz, yax - eax); // elder facing young
    const youngAngle = elderAngle + Math.PI;             // young facing elder

    const cr = config.station.cloudRadius * 0.5;
    const breathe = 0.5 + 0.5 * Math.sin(elapsed * 0.7);

    const fillMass = (from, to, anchorX, anchorZ, facingAngle, isElder) => {
      const cs = Math.cos(facingAngle), sn = Math.sin(facingAngle);
      const spread = isElder ? 0.52 : 0.86;
      const faceStretch = isElder ? 0.12 : 0.24; // young leans in more visibly
      const breatheAmp = isElder ? 0.08 : 0.22;
      const tint = isElder ? elder : young;
      for (let i = from; i < to; i++) {
        const dx = sys.baseDir[i * 3 + 0], dy = sys.baseDir[i * 3 + 1], dz = sys.baseDir[i * 3 + 2];
        // Rotate into the facing-aligned frame, stretch along it, rotate back.
        const along = dx * cs + dz * sn;
        const across = -dx * sn + dz * cs;
        const along2 = along * (1 + faceStretch);
        const across2 = across * (1 - faceStretch * 0.4);
        const wx = along2 * cs - across2 * sn;
        const wz = along2 * sn + across2 * cs;

        const r = cr * sys.baseR[i] * (spread + breatheAmp * breathe);
        let px = cx + anchorX + wx * r;
        let py = cy + dy * r;
        let pz = cz + anchorZ + wz * r;
        if (!isElder) {
          px += Math.sin(elapsed * 1.7 + sys.phase[i]) * 0.05;
          py += Math.sin(elapsed * 1.3 + sys.phase[i] * 1.3) * 0.04;
        }
        pos[i * 3 + 0] = px; pos[i * 3 + 1] = py; pos[i * 3 + 2] = pz;

        const flicker = isElder ? 1 : 0.82 + 0.18 * Math.sin(elapsed * 2.6 + sys.phase[i]);
        const b = (isElder ? 0.4 + 0.14 * breathe : 0.32 + 0.24 * breathe) * flicker * (0.7 + e * 0.4);
        col[i * 3 + 0] = tint.r * b;
        col[i * 3 + 1] = tint.g * b;
        col[i * 3 + 2] = tint.b * b;
      }
    };

    fillMass(0, half, eax, eaz, elderAngle, true);
    fillMass(half, sys.n, yax, yaz, youngAngle, false);

    const bpos = sys.bonds.geometry.attributes.position.array;
    const bcol = sys.bonds.geometry.attributes.color.array;
    for (let k = 0; k < sys._orbitBonds.length; k++) {
      const [a, b, kind] = sys._orbitBonds[k];
      const p0 = k * 6, p1 = k * 6 + 3;
      bpos[p0 + 0] = pos[a * 3 + 0]; bpos[p0 + 1] = pos[a * 3 + 1]; bpos[p0 + 2] = pos[a * 3 + 2];
      bpos[p1 + 0] = pos[b * 3 + 0]; bpos[p1 + 1] = pos[b * 3 + 1]; bpos[p1 + 2] = pos[b * 3 + 2];
      let br, bgc, bb;
      if (kind === 'elder') {
        // A dense, quietly-present lattice: established, doesn't flicker.
        const v = 0.14 + 0.06 * breathe;
        br = elder.r * v; bgc = elder.g * v; bb = elder.b * v;
      } else {
        // A few loose bonds that shimmer: still finding its own shape.
        const flick = 0.4 + 0.6 * Math.max(0, Math.sin(elapsed * 1.9 + k));
        const v = 0.08 + 0.12 * flick;
        br = young.r * v; bgc = young.g * v; bb = young.b * v;
      }
      bcol[p0 + 0] = br; bcol[p0 + 1] = bgc; bcol[p0 + 2] = bb;
      bcol[p1 + 0] = br; bcol[p1 + 1] = bgc; bcol[p1 + 2] = bb;
    }
  },
};

export class ParticleEngine {
  constructor(scene, hall, stations) {
    this.systems = stations.map((st, i) => new StationSystem(scene, hall.cloudCenter(i), st));
    this.active = 0;
    this.setActiveStation(0);
  }

  setActiveStation(index) {
    this.active = index;
    this.systems.forEach((sys, i) => sys.setActive(i === index));
  }

  update(dt, elapsed) {
    for (const sys of this.systems) sys.update(dt, elapsed);
  }
}
