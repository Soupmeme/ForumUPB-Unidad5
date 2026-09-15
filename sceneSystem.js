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
    this._buildStations();
    this._buildThread();
  }

  // World z of a station index.
  stationZ(i) {
    return config.hall.startZ - i * config.hall.stationGap;
  }

  // Center of a station's floating particle cloud (above the plinth).
  cloudCenter(i) {
    const z = this.stationZ(i);
    return new THREE.Vector3(0, this.floorY(z) + this.plinthHeight + 1.6, z);
  }

  // Camera stand + look target for a station. The look point sits between the
  // label panel (below) and the particle cloud (above) so both are framed.
  stationView(i) {
    const z = this.stationZ(i);
    const standZ = z + config.camera.standBack;
    const pos = new THREE.Vector3(0, this.floorY(standZ) + config.camera.eyeHeight, standZ);
    const look = new THREE.Vector3(0, this.floorY(z) + 2.5, z + 0.6);
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

  _buildStations() {
    this.plinthHeight = 2.2;
    this.labels = []; // per-station unlit text planes; text set via setLabel()
    const plinthMat = new THREE.MeshStandardMaterial({ color: P.architecture, roughness: 0.8, metalness: 0.05 });
    const frameMat = new THREE.MeshStandardMaterial({ color: P.placardFrame, roughness: 0.55, metalness: 0.35 });

    for (let i = 0; i < this.count; i++) {
      const z = this.stationZ(i);
      const fy = this.floorY(z);

      // Plinth: the plinth the exhibit (particle cloud) sits on.
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, this.plinthHeight, 1.4),
        plinthMat,
      );
      plinth.position.set(0, fy + this.plinthHeight / 2, z);
      this.group.add(plinth);

      // Label panel: a standing interpretive panel that CARRIES the client's
      // words as real in-world text (decision D3, revised). Bronze frame is
      // lit; the text plane is unlit so lighting cannot reduce contrast.
      const panel = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 0.14), frameMat);
      const textPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 2.4),
        new THREE.MeshBasicMaterial({ color: 0x0d1116 }),
      );
      textPlane.position.z = 0.08;
      panel.add(frame, textPlane);
      panel.position.set(0, fy + 1.5, z + 1.25);
      panel.rotation.x = -0.12; // lean the top back so it faces the raised camera
      this.group.add(panel);
      this.labels.push(textPlane);
    }
  }

  // Apply a baked text texture to a station's label (called from main.js,
  // which owns the script data). Keeps script text out of this file.
  setLabel(i, texture) {
    const m = this.labels[i].material;
    m.map = texture;
    m.color.set(0xffffff);
    m.needsUpdate = true;
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
