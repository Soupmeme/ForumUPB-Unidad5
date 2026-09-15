// main.js
// DOM wiring: renderer + camera, station-to-station navigation (discrete jumps,
// the same operating logic as slides), HUD sync, and the animation loop. It
// contains no script text and no particle math; it only orchestrates.

import * as THREE from 'three';
import { config } from './config.js';
import { stations } from './stations.js';
import { HallScene } from './sceneSystem.js';
import { ParticleEngine } from './particleEngine.js';
import { makePlacardTexture, ensureFonts } from './placardText.js';
import { createHand } from './hand.js';

// ---- Renderer ----
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// ---- Scene + camera ----
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  config.camera.fov,
  window.innerWidth / window.innerHeight,
  config.camera.near,
  config.camera.far,
);

const hall = new HallScene(scene, stations.length);
const engine = new ParticleEngine(scene, hall, stations);

// Bake each station's words onto its in-world placard (decision D3, revised).
// Wait for the vendored font first, otherwise the canvas bakes with a fallback.
async function bakeLabels() {
  await ensureFonts();
  stations.forEach((st, i) => {
    hall.setLabel(i, makePlacardTexture({
      text: st.text,
      handle: st.handle,
      photo: st.photo,
      closing: st.isClosing,
    }));
  });
}
bakeLabels();

// Station 1 exhibit: the hand reaching up into the mass of latent potential.
const cc0 = hall.cloudCenter(0);
const { group: handGroup, reachPoint: handReachLocal } = createHand();
handGroup.scale.setScalar(1.3);
handGroup.rotation.x = -1.35;          // tilt fingers up, palm toward the visitor
handGroup.position.set(0, cc0.y - 0.95, cc0.z + 0.15);
scene.add(handGroup);
handGroup.updateMatrixWorld(true);
// Hand the fingertip world position to station 0's particle system.
engine.systems[0].reachPoint = handReachLocal.clone().applyMatrix4(handGroup.matrixWorld);

// ---- Navigation state ----
let current = 0;
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
{
  const v = hall.stationView(0);
  camPos.copy(v.pos);
  camLook.copy(v.look);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

function goTo(index) {
  index = Math.max(0, Math.min(stations.length - 1, index));
  if (index === current) return;
  current = index;
  engine.setActiveStation(current);
  renderHUD(current);
}

function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }
function restart() { goTo(0); }

// ---- HUD ----
const el = {
  qr: document.getElementById('qr-block'),
  counterNum: document.getElementById('counter-num'),
  counterTotal: document.getElementById('counter-total'),
  progressFill: document.getElementById('progress-fill'),
  help: document.getElementById('help'),
};
el.counterTotal.textContent = String(stations.length);

// The script text now lives on the in-world placards. The HUD keeps only
// navigation chrome plus the scannable QR on the closing station (a QR on an
// angled placard at distance would not scan, so it stays screen-space).
function renderHUD(index) {
  const st = stations[index];
  el.counterNum.textContent = String(index + 1);
  el.progressFill.style.width = `${(index / (stations.length - 1)) * 100}%`;
  el.qr.hidden = !st.isClosing;
}
renderHUD(0);

// ---- Input ----
window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ': case 'ArrowRight': case 'ArrowDown': case 'PageDown':
      e.preventDefault(); next(); break;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
      e.preventDefault(); prev(); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case 'h': case 'H': el.help.hidden = !el.help.hidden; break;
    case 'r': case 'R': restart(); break;
  }
});

// Touch swipe (mobile).
let touchX = null;
window.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
window.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); }
  touchX = null;
}, { passive: true });

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- Loop ----
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  // Ease camera toward the active station's view.
  const view = hall.stationView(current);
  camPos.lerp(view.pos, Math.min(1, dt * config.camera.moveEase));
  camLook.lerp(view.look, Math.min(1, dt * config.camera.lookEase));
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  hall.update(dt, elapsed);
  engine.update(dt, elapsed);
  renderer.render(scene, camera);
}
animate();
