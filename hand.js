// hand.js
// Station 1's exhibit hand: a real low-poly hand model ("Low poly hands" by
// Anastasiia Ku, CC-BY, via Poly Pizza), loaded from assets/hand.glb and
// re-materialed to the piece's warm palette. Normalized to a unit size and
// centered so main.js controls placement/scale.
//
// Returns a Promise of { group, reachPoint } where reachPoint is the fingertip
// region in the group's local space (transform by the group matrix for world).

import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const skin = new THREE.MeshStandardMaterial({
  color: 0xd9b48a, roughness: 0.72, metalness: 0.0,
  emissive: 0x3a2415, emissiveIntensity: 0.16, flatShading: true,
});

export function createHand() {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load('assets/hand.glb', (gltf) => {
      const model = gltf.scene;
      // The GLB is a pair of hands; keep a single hand (decision: one hand).
      while (model.children.length > 1) model.remove(model.children[model.children.length - 1]);
      model.traverse((o) => { if (o.isMesh) o.material = skin; });

      // Center and scale to a unit height inside an inner group so the outer
      // group's transform is main.js's to control.
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const s = 1 / (Math.max(size.x, size.y, size.z) || 1);

      const inner = new THREE.Group();
      model.position.sub(center);
      inner.add(model);
      inner.scale.setScalar(s);

      const group = new THREE.Group();
      group.add(inner);
      group.updateMatrixWorld(true);

      // Fingertip region: top-center of the normalized bounds.
      const nb = new THREE.Box3().setFromObject(group);
      const reachPoint = new THREE.Vector3(
        (nb.min.x + nb.max.x) / 2,
        nb.max.y * 0.85,
        (nb.min.z + nb.max.z) / 2,
      );
      console.log('HAND_GLB loaded', { topChildren: model.children.length, size: size.toArray() });
      resolve({ group, reachPoint });
    }, undefined, reject);
  });
}
