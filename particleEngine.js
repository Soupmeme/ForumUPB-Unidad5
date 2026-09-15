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

  // Station 1: a soft mass of latent potential that slowly breathes, and where
  // the reaching hand enters (sys.reachPoint, world space), the nearest
  // particles lift toward the fingertips and brighten (potential being reached).
  'latent-reach'(sys, elapsed) {
    const pos = sys.points.geometry.attributes.position.array;
    const col = sys.points.geometry.attributes.color.array;
    const e = sys.params.energy;
    const breathe = 0.5 + 0.5 * Math.sin(elapsed * 1.05); // slow held-breath pulse
    const base = new THREE.Color().lerpColors(elder, young, sys.params.accent);
    const c = new THREE.Color();
    const rp = sys.reachPoint || null;
    const reachR = 1.0;
    const rot = elapsed * 0.08;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const cx = sys.center.x, cy = sys.center.y, cz = sys.center.z;

    for (let i = 0; i < sys.n; i++) {
      let dx = sys.baseDir[i * 3 + 0];
      const dy = sys.baseDir[i * 3 + 1];
      let dz = sys.baseDir[i * 3 + 2];
      const rx = dx * cs - dz * sn;
      const rz = dx * sn + dz * cs;
      const r = config.station.cloudRadius * sys.baseR[i] * (0.7 + 0.22 * breathe + e * 0.18);
      let px = cx + rx * r;
      let py = cy + dy * r;
      let pz = cz + rz * r;

      // Reach response: proximity to the fingertips pulls and brightens.
      let g = 0;
      if (rp) {
        const ddx = px - rp.x, ddy = py - rp.y, ddz = pz - rp.z;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
        g = Math.exp(-(dist / reachR) * (dist / reachR));
        const pull = g * 0.55;
        px += (rp.x - px) * pull;
        py += (rp.y - py) * pull;
        pz += (rp.z - pz) * pull;
      }
      pos[i * 3 + 0] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;

      c.copy(base).lerp(hot, g * 0.7);
      const b = 0.34 + 0.32 * breathe + g * 0.5;
      col[i * 3 + 0] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
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
