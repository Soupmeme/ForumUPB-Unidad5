// hand.js
// A stylized procedural hand, authored directly in Three.js (code-only, from
// the reference photo). Station 1's exhibit: the hand reaching into the mass
// of latent potential. Built as an open, gently cupped reaching gesture.
//
// Local frame: palm centered at origin, palm facing +Y (palm-up), fingers
// extending toward +Z and curling up toward +Y, wrist trailing to -Z.
// Returns { group, reachPoint } where reachPoint is the local fingertip
// centroid (transform it by the group's matrix for a world position).

import * as THREE from 'three';

function tube(curvePts, r, mat, radial = 10, tubular = 20) {
  const curve = new THREE.CatmullRomCurve3(curvePts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, tubular, r, radial, false);
  return new THREE.Mesh(g, mat);
}

export function createHand() {
  const group = new THREE.Group();

  const skin = new THREE.MeshStandardMaterial({
    color: 0xcf9d6f, roughness: 0.62, metalness: 0.0,
    emissive: 0x3a2415, emissiveIntensity: 0.18,
  });

  // Palm: a flattened, slightly tapered ellipsoid (scaled sphere).
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skin);
  palm.scale.set(0.42, 0.15, 0.5);
  group.add(palm);

  // Wrist: a cylinder trailing back and down into the plinth.
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.9, 16), skin);
  wrist.rotation.x = Math.PI / 2;      // align cylinder axis to Z
  wrist.position.set(0, -0.02, -0.85);
  group.add(wrist);

  // Four fingers: tubes along curl curves emerging from the distal palm edge,
  // extending +Z and curling up (+Y) into a soft cup.
  const fingers = [
    { x: -0.28, len: 1.0, spread: -0.10 }, // index
    { x: -0.09, len: 1.12, spread: -0.03 }, // middle (longest)
    { x: 0.10, len: 1.02, spread: 0.04 }, // ring
    { x: 0.29, len: 0.82, spread: 0.12 }, // little (shortest)
  ];
  const tips = [];
  for (const f of fingers) {
    const bx = f.x, sx = f.spread;
    const z0 = 0.44, z1 = 0.44 + 0.30 * f.len, z2 = 0.44 + 0.46 * f.len;
    const pts = [
      [bx, 0.05, z0],
      [bx + sx * 0.5, 0.13, z1],
      [bx + sx, 0.30 * f.len, z2],
    ];
    group.add(tube(pts, 0.078, skin));
    const tip = new THREE.Vector3(bx + sx, 0.30 * f.len, z2);
    const tipBall = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), skin);
    tipBall.position.copy(tip);
    group.add(tipBall);
    tips.push(tip);
  }

  // Thumb: abducted on the radial (-X) side, rotated out of the palm plane.
  const thumbPts = [
    [-0.40, 0.05, 0.02],
    [-0.60, 0.14, 0.24],
    [-0.64, 0.30, 0.46],
  ];
  group.add(tube(thumbPts, 0.095, skin));
  const thumbTip = new THREE.Vector3(-0.64, 0.30, 0.46);
  const thumbBall = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), skin);
  thumbBall.position.copy(thumbTip);
  group.add(thumbBall);
  tips.push(thumbTip);

  // Reach point: centroid of the fingertips (local space).
  const reachPoint = new THREE.Vector3();
  for (const t of tips) reachPoint.add(t);
  reachPoint.multiplyScalar(1 / tips.length);

  return { group, reachPoint };
}
