// sceneSystem.js
// Builds the museum shell: the ascending straight hall (decision D1), one
// pillar + placard anchor per station, lighting, and the migrating-particle
// thread that ties the stations into one structure (decision D2).
//
// It knows nothing about the script text. It exposes, per station, where the
// visitor stands, where to look, and where a station's particle cloud floats.

import * as THREE from 'three';
import { config } from './config.js';
import { createColumnModel } from './columnModel.js';

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
    this._buildWallLights();
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
    return new THREE.Vector3(0, this.floorY(z) + this.plinthHeight + 1.3, z);
  }

  // Camera stand + look target for a station. The look point sits between the
  // label panel (below) and the particle cloud (above) so both are framed.
  stationView(i) {
    const z = this.stationZ(i);
    const standZ = z + config.camera.standBack;
    const pos = new THREE.Vector3(0, this.floorY(standZ) + config.camera.eyeHeight, standZ);
    const look = new THREE.Vector3(0, this.floorY(z) + 2.7, z + 0.6);
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

  // Simple rectangular wall sconces: a bright core plane plus a softer
  // additive-blended glow plane behind it, repeated along both walls at a
  // fixed spacing. Purely decorative filler for the long empty corridor --
  // not a real light source (no PointLights; a bare emissive rectangle
  // reads as "lit" cheaply and every instance shares one of two draw calls
  // via InstancedMesh instead of one mesh pair per sconce).
  _buildWallLights() {
    const hw = config.hall.width / 2;
    const zNear = this.stationZ(0) + config.camera.standBack + 4;
    const zFar = this.stationZ(this.count - 1) - 8;
    const y = (z) => this.floorY(z);
    const spacing = 7; // half a station gap

    const spots = [];
    for (const sx of [-hw, hw]) {
      const inward = sx > 0 ? -1 : 1;
      for (let z = zNear; z >= zFar; z -= spacing) {
        spots.push({ x: sx, ly: y(z) + 3.3, z, faceRotY: sx > 0 ? -Math.PI / 2 : Math.PI / 2, inward });
      }
    }

    const coreGeo = new THREE.PlaneGeometry(0.5, 1.1);
    const glowGeo = new THREE.PlaneGeometry(1.15, 2.0);
    const coreMat = new THREE.MeshBasicMaterial({ color: P.lightKey });
    const glowMat = new THREE.MeshBasicMaterial({
      color: P.lightKey, transparent: true, opacity: 0.3,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });

    const core = new THREE.InstancedMesh(coreGeo, coreMat, spots.length);
    const glow = new THREE.InstancedMesh(glowGeo, glowMat, spots.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    spots.forEach((s, i) => {
      q.setFromAxisAngle(upAxis, s.faceRotY);
      m.compose(new THREE.Vector3(s.x + s.inward * 0.03, s.ly, s.z), q, scale);
      core.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(s.x + s.inward * 0.02, s.ly, s.z), q, scale);
      glow.setMatrixAt(i, m);
    });
    core.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    this.group.add(core, glow);
  }

  _buildStations() {
    this.plinthHeight = 2.2;
    this.labels = []; // per-station unlit text planes; text set via setLabel()
    const frameMat = new THREE.MeshStandardMaterial({ color: P.placardFrame, roughness: 0.55, metalness: 0.35 });

    for (let i = 0; i < this.count; i++) {
      const z = this.stationZ(i);
      const fy = this.floorY(z);

      // Pillar: a reconstructed classical column (img2threejs, decision
      // D36) the exhibit's particle cloud floats above. Built to a fixed
      // 2.2-unit total height matching this.plinthHeight exactly, so it
      // drops in at the same base position the old plain box plinth used.
      const pillar = createColumnModel();
      pillar.position.set(0, fy, z);
      this.group.add(pillar);

      // Label panel: a standing interpretive panel that CARRIES the client's
      // words as real in-world text (decision D3, revised). Bronze frame is
      // lit; the text plane is unlit so lighting cannot reduce contrast.
      const panel = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.0, 0.14), frameMat);
      const textPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.25, 1.8),
        new THREE.MeshBasicMaterial({ color: 0x0d1116 }),
      );
      textPlane.position.z = 0.08;
      panel.add(frame, textPlane);
      // A smaller label that sits low in front, UNDER the exhibit on the plinth.
      panel.position.set(0, fy + 1.15, z + 1.35);
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
    this.threadU0 = new Float32Array(n);     // base position along the hall (0..1)
    this.threadStrand = new Float32Array(n); // which helix filament
    this.threadRJit = new Float32Array(n);   // per-particle radius variation

    // Start the vein a little ahead of the first station (never at the camera,
    // or near-end particles render on top of the lens) and end past the last.
    this.threadZNear = this.stationZ(0) + 3;
    this.threadZFar = this.stationZ(this.count - 1) - 4;

    for (let i = 0; i < n; i++) {
      this.threadU0[i] = i / n + (Math.random() - 0.5) * (1 / n);
      this.threadStrand[i] = i % config.thread.strands;
      this.threadRJit[i] = 0.82 + Math.random() * 0.18;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const m = new THREE.PointsMaterial({
      size: config.thread.pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.thread = new THREE.Points(g, m);
    this.scene.add(this.thread);

    this._elderColor = new THREE.Color(P.accentElder);
    this._youngColor = new THREE.Color(P.accentYoung);
    this._hot = new THREE.Color(0xfff2d0);
    this._tmpColor = new THREE.Color();
    this._placeThreadAll(0);
  }

  // Heartbeat strength at hall-position u and time t: distance to the nearest
  // forward-travelling pulse, shaped into a sharp gaussian.
  _pulseGain(u, t) {
    const wl = config.thread.pulseWavelength;
    let m = ((u - t * config.thread.pulseSpeed) % wl + wl) % wl;
    const d = Math.min(m, wl - m);
    const x = d / config.thread.pulseWidth;
    return Math.exp(-x * x);
  }

  _placeThreadAll(t) {
    const pos = this.thread.geometry.attributes.position.array;
    const col = this.thread.geometry.attributes.color.array;
    const T = config.thread;
    const spanZ = this.threadZFar - this.threadZNear;
    for (let i = 0; i < T.particles; i++) {
      let u = this.threadU0[i] + T.flowSpeed * t;
      u -= Math.floor(u);                         // wrap to 0..1
      const z = this.threadZNear + spanZ * u;
      const axisY = this.floorY(z) + T.height;

      const g = this._pulseGain(u, t);            // 0..1 heartbeat
      const r = T.radius * this.threadRJit[i] * (1 + g * T.swell);
      const side = this.threadStrand[i] < 1 ? -1 : 1; // strand 0 -> left wall, 1 -> right
      const angle = u * T.turns * Math.PI * 2 + T.spin * t;

      pos[i * 3 + 0] = side * T.wallOffset + Math.cos(angle) * r;
      pos[i * 3 + 1] = axisY + Math.sin(angle) * r;
      pos[i * 3 + 2] = z;

      // Elder -> young gradient along the hall (relevo as flow), brightening
      // to a hot near-white where a beat passes.
      this._tmpColor.lerpColors(this._elderColor, this._youngColor, u);
      this._tmpColor.lerp(this._hot, g * 0.65);
      const b = 0.42 + g * 0.58;
      col[i * 3 + 0] = this._tmpColor.r * b;
      col[i * 3 + 1] = this._tmpColor.g * b;
      col[i * 3 + 2] = this._tmpColor.b * b;
    }
    this.thread.geometry.attributes.position.needsUpdate = true;
    this.thread.geometry.attributes.color.needsUpdate = true;
  }

  update(dt, elapsed) {
    if (!this.thread) return;
    this._placeThreadAll(elapsed);
  }
}
