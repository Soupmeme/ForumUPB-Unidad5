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
const hot = new THREE.Color(0xfff2d0);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (edge0, edge1, v) => {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
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
  }

  setActive(isActive) {
    this.target.energy = isActive ? this.station.intensity : config.station.idleIntensity;
    this.target.accent = this.station.accent ?? 0.5;
  }

  update(dt, elapsed) {
    // Ease params toward targets.
    const k = Math.min(1, dt * 2.5);
    this.params.energy += (this.target.energy - this.params.energy) * k;
    this.params.accent += (this.target.accent - this.params.accent) * k;

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
    const base = new THREE.Color().lerpColors(elder, young, sys.params.accent);
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
