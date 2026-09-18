// columnModel.js
// Procedural Composite-order column (img2threejs reconstruction, decisions.md
// D36), replacing the plain box plinth every station stood its particle
// cloud on. One shared factory, instanced (same geometry, new transform)
// across all 13 stations from sceneSystem.js -- so it is built once here as
// a single merged, vertex-colored, static BufferGeometry: no rig, no
// per-part transforms at runtime (the reference object is a static
// architectural fixture, not an animated one), which also keeps the whole
// column to ONE draw call per instance instead of one per named part.
//
// Reconstructed from a single reference photo (pillar_ref.png, not vendored
// in the repo -- see decisions.md D36 for the full img2threejs pipeline
// trail: image analysis, detail inventory, ObjectSculptSpec, PBR extraction).
// Color is re-hosted on the project's own architecture palette rather than
// the reference photo's exact tones (D19's stone/bone palette), and no
// texture files are loaded -- all shading variation is per-vertex color
// baked at geometry-build time, matching the project's no-external-asset,
// no-build-step constraint.

import * as THREE from 'three';

const STONE = new THREE.Color(0xe9e2d0);
const STONE_DARK = new THREE.Color(0xcbbfa0);
const STONE_LIGHT = new THREE.Color(0xfffbf2);
// A bolder shadow tint for the capital's carved ornament (volutes, leaves) --
// STONE_DARK alone reads too close to STONE at the real ~7.5-unit station
// viewing distance, where thin detail needs real contrast, not just relief,
// to stay legible (D36 follow-up: Kiwi found the capital read as a plain,
// undecorated "back" from the actual in-game camera).
const STONE_SHADOW = new THREE.Color(0x9c8a66);

// ---- geometry helpers -------------------------------------------------

// A left/right pair must be a MIRROR (negate one axis only), never a
// rotated copy -- rotation preserves handedness, reflection doesn't.
// Mirroring also inverts triangle winding, so it must be flipped back or
// the mirrored half lights as though lit from behind (img2threejs's own
// documented chirality rule, applied here to the volute-left/volute-right
// pair even though this is an object, not a character).
function mirrorGeometryX(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, -pos.getX(i));
    if (nrm) nrm.setX(i, -nrm.getX(i));
  }
  // Flip winding: swap the 2nd and 3rd vertex of every triangle.
  const p = pos.array, n = nrm ? nrm.array : null;
  for (let t = 0; t < pos.count; t += 3) {
    for (let c = 0; c < 3; c++) {
      const i1 = (t + 1) * 3 + c, i2 = (t + 2) * 3 + c;
      let tmp = p[i1]; p[i1] = p[i2]; p[i2] = tmp;
      if (n) { tmp = n[i1]; n[i1] = n[i2]; n[i2] = tmp; }
    }
  }
  pos.needsUpdate = true;
  if (nrm) nrm.needsUpdate = true;
  return g;
}

// The shaft's radial cross-section is a scalloped polygon (flutes), not a
// circle -- built directly rather than displacing a plain CylinderGeometry,
// since the flutes affect the true silhouette, not just shading.
function buildFlutedCylinderGeometry(radius, height, fluteCount, fluteDepth, pointsPerFlute = 5) {
  const angularSteps = fluteCount * pointsPerFlute;
  const ring = (y) => {
    const pts = [];
    for (let i = 0; i < angularSteps; i++) {
      const theta = (i / angularSteps) * Math.PI * 2;
      const fluteFrac = (theta / (Math.PI * 2)) * fluteCount;
      const f = fluteFrac - Math.floor(fluteFrac); // 0..1 within one flute
      const r = radius - fluteDepth * Math.sin(f * Math.PI);
      pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    }
    return pts;
  };
  const bottom = ring(0), top = ring(height);
  const positions = [], normals = [];
  const pushTri = (a, b, c) => {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const n = new THREE.Vector3().crossVectors(ab, ac).normalize();
    for (const p of [a, b, c]) { positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z); }
  };
  for (let i = 0; i < angularSteps; i++) {
    const j = (i + 1) % angularSteps;
    pushTri(bottom[i], bottom[j], top[i]);
    pushTri(top[i], bottom[j], top[j]);
  }
  // Cap the top so the capital core sitting on it doesn't reveal a hollow
  // tube interior (the base moulding already hides the bottom from view).
  const topCenter = new THREE.Vector3(0, height, 0);
  for (let i = 0; i < angularSteps; i++) {
    const j = (i + 1) % angularSteps;
    pushTri(top[i], top[j], topCenter);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return g;
}

// A small stylized acanthus-leaf outline (lanceolate, serrated edges),
// extruded flat -- Shape+ExtrudeGeometry, the correct family for a repeated
// flat organic profile (img2threejs geometry_patterns.md: prefer Shape
// extrude / curve+tube / instancing before hand BufferGeometry).
function buildAcanthusLeafGeometry(length, width, depth) {
  const shape = new THREE.Shape();
  const lobes = 3;
  shape.moveTo(0, 0);
  for (let i = 1; i <= lobes; i++) {
    const t = i / lobes;
    const y = t * length;
    const w = width * Math.sin(t * Math.PI * 0.85) * 0.5;
    shape.lineTo(-w * 0.75, y - length * 0.05);
    shape.lineTo(-w, y - length * 0.01);
  }
  shape.lineTo(0, length);
  for (let i = lobes; i >= 1; i--) {
    const t = i / lobes;
    const y = t * length;
    const w = width * Math.sin(t * Math.PI * 0.85) * 0.5;
    shape.lineTo(w, y - length * 0.01);
    shape.lineTo(w * 0.75, y - length * 0.05);
  }
  shape.lineTo(0, 0);
  // Leaf is authored pointing up (+Y) in its local XY plane, extruded along
  // local Z (the leaf's outward-facing thickness) -- placement below rotates
  // this Z axis to point radially outward, keeping the leaf's natural
  // "rising up the capital" orientation intact.
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
}

// A coiled volute scroll: a logarithmic-ish spiral curve, swept with
// TubeGeometry -- curve+tube is the correct primitive family for a
// continuous coiled form (img2threejs geometry_patterns.md).
function buildVoluteGeometry(turns, startRadius, endRadius, tubeRadius) {
  const points = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * turns;
    const r = THREE.MathUtils.lerp(startRadius, endRadius, t);
    points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const tube = new THREE.TubeGeometry(curve, 64, tubeRadius, 6, false);
  const eye = new THREE.SphereGeometry(tubeRadius * 1.4, 8, 6);
  eye.translate(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].z);
  return mergeParts([{ geometry: tube }, { geometry: eye }]);
}

// Minimal geometry merge (no BufferGeometryUtils vendored): each entry is
// {geometry, matrix?, color?}; everything is converted to non-indexed
// triangles, transformed, vertex-colored, and concatenated into one
// BufferGeometry -- one draw call for the whole column.
function mergeParts(entries) {
  const positions = [], normals = [], colors = [];
  const m3 = new THREE.Matrix3();
  for (const { geometry, matrix, color } of entries) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position, nrm = g.attributes.normal;
    const mat = matrix || new THREE.Matrix4();
    m3.getNormalMatrix(mat);
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    const c = color || STONE;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mat);
      n.fromBufferAttribute(nrm, i).applyMatrix3(m3).normalize();
      positions.push(v.x, v.y, v.z);
      normals.push(n.x, n.y, n.z);
      colors.push(c.r, c.g, c.b);
    }
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return merged;
}

const mat4 = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
};

// ---- the column, built to a fixed 2.2-unit total height (matches the
// plinth height every station's layout math already assumes -- D36 keeps
// this a drop-in swap, not a relayout) ----------------------------------
export function createColumnModel() {
  const parts = [];

  // Plinth (macro): flat square base slab.
  const plinthH = 0.09;
  parts.push({
    geometry: new THREE.BoxGeometry(1.6, plinthH, 1.4),
    matrix: mat4(0, plinthH / 2, 0),
    color: STONE_DARK,
  });
  let y = plinthH;

  // Base moulding (meso): torus-scotia-torus, one revolved profile.
  const baseH = 0.21;
  const baseProfile = [
    new THREE.Vector2(0.66, 0), new THREE.Vector2(0.72, 0.02), new THREE.Vector2(0.72, baseH * 0.32),
    new THREE.Vector2(0.62, baseH * 0.46), new THREE.Vector2(0.62, baseH * 0.62),
    new THREE.Vector2(0.7, baseH * 0.82), new THREE.Vector2(0.7, baseH * 0.96), new THREE.Vector2(0.58, baseH),
  ];
  const baseGeo = new THREE.LatheGeometry(baseProfile, 24);
  parts.push({ geometry: baseGeo, matrix: mat4(0, y, 0), color: STONE });
  y += baseH;

  // Shaft (macro, repetitionSystem: 20 flutes).
  const shaftH = 1.45, shaftR = 0.5;
  parts.push({
    geometry: buildFlutedCylinderGeometry(shaftR, shaftH, 20, 0.045),
    matrix: mat4(0, y, 0),
    color: STONE,
  });
  y += shaftH;

  // Astragal neck ring (meso): plain thin band.
  parts.push({
    geometry: new THREE.TorusGeometry(shaftR * 0.98, 0.025, 6, 24),
    matrix: mat4(0, y, 0, 1, 1, 1, Math.PI / 2, 0, 0),
    color: STONE_LIGHT,
  });
  y += 0.04;

  // Capital (macro assembly): core drum + volute pair + acanthus collar +
  // egg-and-dart band + central boss + abacus.
  const capitalBaseY = y;
  const coreH = 0.24;
  const coreProfile = [
    new THREE.Vector2(shaftR * 0.94, 0), new THREE.Vector2(shaftR * 1.02, coreH * 0.3),
    new THREE.Vector2(shaftR * 1.14, coreH * 0.7), new THREE.Vector2(shaftR * 1.2, coreH),
  ];
  parts.push({ geometry: new THREE.LatheGeometry(coreProfile, 20), matrix: mat4(0, capitalBaseY, 0), color: STONE });

  // Acanthus collar: two tiers of 8 leaves each, shingled. Sized boldly
  // (not to the reference photo's literal proportions) so the leaf silhouette
  // still reads at the real ~7.5-unit station viewing distance.
  const leafGeo = buildAcanthusLeafGeometry(0.42, 0.34, 0.1);
  const leafCount = 8;
  for (let tier = 0; tier < 2; tier++) {
    const tierY = capitalBaseY + 0.02 + tier * 0.15;
    const tierR = shaftR * (1.0 - tier * 0.06);
    const tierScale = 1 - tier * 0.15;
    for (let i = 0; i < leafCount; i++) {
      const a = (i / leafCount) * Math.PI * 2 + (tier * Math.PI) / leafCount; // shingled offset
      const m = new THREE.Matrix4();
      const pos = new THREE.Vector3(Math.cos(a) * tierR, tierY, Math.sin(a) * tierR);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2);
      m.compose(pos, q, new THREE.Vector3(tierScale, tierScale, tierScale));
      parts.push({ geometry: leafGeo, matrix: m, color: STONE_SHADOW });
    }
  }

  // Egg-and-dart band, stylized as a plain thin ring (blockout-tier detail).
  parts.push({
    geometry: new THREE.TorusGeometry(shaftR * 1.16, 0.02, 6, 24),
    matrix: mat4(0, capitalBaseY + 0.29, 0, 1, 1, 1, Math.PI / 2, 0, 0),
    color: STONE_LIGHT,
  });

  // Volute pair: volute-right authored, volute-left its sagittal mirror
  // (negate x only, flip winding -- see mirrorGeometryX above).
  // Spiral curve is authored in the local XY plane, so it is already face-on
  // to the +Z (front) viewing direction with no extra rotation needed.
  // Bolder tube radius/reach than a literal scale-down of the reference --
  // confirmed against the exact real station camera (position/lookAt formula
  // from sceneSystem.js) that a thin coil disappears at that distance.
  const voluteGeo = buildVoluteGeometry(1.6, 0.22, 0.03, 0.038);
  const voluteY = capitalBaseY + 0.32;
  const voluteOffsetX = shaftR * 1.05;
  parts.push({
    geometry: voluteGeo,
    matrix: mat4(voluteOffsetX, voluteY, shaftR * 0.7),
    color: STONE,
  });
  parts.push({
    geometry: mirrorGeometryX(voluteGeo),
    matrix: mat4(-voluteOffsetX, voluteY, shaftR * 0.7),
    color: STONE,
  });

  // Central floral boss, between the two volutes.
  parts.push({
    geometry: new THREE.SphereGeometry(0.045, 8, 6),
    matrix: mat4(0, voluteY + 0.06, shaftR * 1.05),
    color: STONE_LIGHT,
  });

  // Abacus (macro): flat square cap slab.
  const abacusH = 0.07;
  const capitalH = 0.52; // headroom for the bolder leaf/volute sizing above
  parts.push({
    geometry: new THREE.BoxGeometry(1.36, abacusH, 1.36),
    matrix: mat4(0, capitalBaseY + capitalH - abacusH / 2, 0),
    color: STONE_LIGHT,
  });

  const geometry = mergeParts(parts);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.68, metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.columnHeight = capitalBaseY + capitalH;
  return mesh;
}
