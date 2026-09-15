// sceneSystem.js
// Builds the museum shell: the ascending straight hall (decision D1), one
// pillar + placard anchor per station, lighting, and the migrating-particle
// thread that ties the stations into one structure (decision D2).
//
// It knows nothing about the script text. It exposes, per station, where the
// visitor stands, where to look, and where a station's particle cloud floats.

import * as THREE from 'three';
import { config } from './config.js';

const P = config.palette;

// Floor height as a function of z. Station i sits at z = startZ - i*gap and
// rises by risePerStation each step, so the floor is a straight ascending ramp.
function makeFloorY() {
  const slope = config.hall.risePerStation / config.hall.stationGap;
  return (z) => (config.hall.startZ - z) * slope;
}

// Build a flat quad (two triangles) from four corner points, with a color.
function quad(a, b, c, d, material) {
  const g = new THREE.BufferGeometry();
  const verts = new Float32Array([
    a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z,
    a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z,
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}

export class HallScene {
  constructor(scene, stationCount) {
    this.scene = scene;
    this.count = stationCount;
    this.floorY = makeFloorY();
    this.group = new THREE.Group();
    scene.add(this.group);

    scene.background = new THREE.Color(P.background);
    scene.fog = new THREE.Fog(P.fog, config.hall.stationGap * 2.2, config.hall.stationGap * (stationCount + 2));

    this._buildLights();
    this._buildHall();
    this._buildPillars();
    this._buildThread();
  }

  // World z of a station index.
  stationZ(i) {
    return config.hall.startZ - i * config.hall.stationGap;
  }

  // Center of a station's floating particle cloud (top of its pillar).
  cloudCenter(i) {
    const z = this.stationZ(i);
    return new THREE.Vector3(0, this.floorY(z) + this.pillarHeight + 1.4, z);
  }

  // Camera stand + look target for a station.
  stationView(i) {
    const z = this.stationZ(i);
    const standZ = z + config.camera.standBack;
    const pos = new THREE.Vector3(0, this.floorY(standZ) + config.camera.eyeHeight, standZ);
    const look = this.cloudCenter(i);
    return { pos, look };
  }

  _buildLights() {
    const hemi = new THREE.HemisphereLight(P.lightKey, P.lightFill, 0.85);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(P.lightKey, 1.1);
    key.position.set(6, 14, 8);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(P.lightFill, 0.35);
    fill.position.set(-8, 6, -10);
    this.scene.add(fill);
  }

  _buildHall() {
    const hw = config.hall.width / 2;
    const zNear = this.stationZ(0) + config.camera.standBack + 4;
    const zFar = this.stationZ(this.count - 1) - 8;
    const y = (z) => this.floorY(z);

    const floorMat = new THREE.MeshStandardMaterial({ color: P.architecture, roughness: 0.95, metalness: 0.0 });
    const wallMat = new THREE.MeshStandardMaterial({ color: P.architecture, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });

    // Floor ramp, matching floorY exactly at both ends.
    const floor = quad(
      new THREE.Vector3(-hw, y(zNear), zNear),
      new THREE.Vector3(hw, y(zNear), zNear),
      new THREE.Vector3(hw, y(zFar), zFar),
      new THREE.Vector3(-hw, y(zFar), zFar),
      floorMat,
    );
    this.group.add(floor);

    // Two side walls (low opacity, so the hall reads without boxing in the view).
    const wh = config.hall.wallHeight;
    for (const sx of [-hw, hw]) {
      const wall = quad(
        new THREE.Vector3(sx, y(zNear), zNear),
        new THREE.Vector3(sx, y(zNear) + wh, zNear),
        new THREE.Vector3(sx, y(zFar) + wh, zFar),
        new THREE.Vector3(sx, y(zFar), zFar),
        wallMat,
      );
      this.group.add(wall);
    }
  }

  _buildPillars() {
    this.pillarHeight = 3.2;
    const pillarMat = new THREE.MeshStandardMaterial({ color: P.architecture, roughness: 0.8, metalness: 0.05 });
    const frameMat = new THREE.MeshStandardMaterial({ color: P.placardFrame, roughness: 0.6, metalness: 0.3 });
    const placardMat = new THREE.MeshStandardMaterial({ color: 0x141a20, roughness: 0.5, metalness: 0.1 });

    for (let i = 0; i < this.count; i++) {
      const z = this.stationZ(i);
      const fy = this.floorY(z);

      // Pillar body.
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, this.pillarHeight, 1.2),
        pillarMat,
      );
      pillar.position.set(0, fy + this.pillarHeight / 2, z);
      this.group.add(pillar);

      // Placard: a tilted slab on the visitor-facing side of the pillar, a
      // pure visual anchor. The readable text is the HUD (decision D3).
      const placardGroup = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 0.06), placardMat);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.2, 0.04), frameMat);
      frame.position.z = -0.02;
      placardGroup.add(frame, slab);
      placardGroup.position.set(0, fy + 1.55, z + 0.66);
      placardGroup.rotation.x = -0.32; // tilt up toward the visitor
      this.group.add(placardGroup);
    }
  }

  _buildThread() {
    const n = config.thread.particles;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    this.threadPhase = new Float32Array(n);
    this.threadOffset = new Float32Array(n);

    const zNear = this.stationZ(0) + config.camera.standBack;
    const zFar = this.stationZ(this.count - 1) - 4;
    this.threadZNear = zNear;
    this.threadZFar = zFar;

    for (let i = 0; i < n; i++) {
      this.threadPhase[i] = Math.random();          // 0..1 along the hall
      this.threadOffset[i] = Math.random() * Math.PI * 2;
      this._placeThread(i, pos, col);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      size: config.thread.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.thread = new THREE.Points(g, m);
    this.scene.add(this.thread);

    this._elderColor = new THREE.Color(P.accentElder);
    this._youngColor = new THREE.Color(P.accentYoung);
  }

  _placeThread(i, pos, col) {
    const t = this.threadPhase[i];
    const z = this.threadZNear + (this.threadZFar - this.threadZNear) * t;
    const wobble = Math.sin(this.threadOffset[i] + t * 10) * config.thread.jitter;
    pos[i * 3 + 0] = wobble;
    pos[i * 3 + 1] = this.floorY(z) + config.thread.height + Math.cos(this.threadOffset[i] + t * 8) * 0.15;
    pos[i * 3 + 2] = z;
    // Color hands off from elder (near) to young (far): the relevo, as flow.
    const c = new THREE.Color().lerpColors(this._elderColor || new THREE.Color(P.accentElder), this._youngColor || new THREE.Color(P.accentYoung), t);
    col[i * 3 + 0] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }

  update(dt) {
    if (!this.thread) return;
    const pos = this.thread.geometry.attributes.position.array;
    const col = this.thread.geometry.attributes.color.array;
    const span = Math.abs(this.threadZFar - this.threadZNear);
    const advance = (config.thread.speed / span) * dt;
    for (let i = 0; i < config.thread.particles; i++) {
      this.threadPhase[i] += advance;      // flow from near toward far (forward/up)
      if (this.threadPhase[i] > 1) this.threadPhase[i] -= 1;
      this._placeThread(i, pos, col);
    }
    this.thread.geometry.attributes.position.needsUpdate = true;
    this.thread.geometry.attributes.color.needsUpdate = true;
  }
}
