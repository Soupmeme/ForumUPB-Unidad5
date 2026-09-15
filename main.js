// main.js
// DOM wiring: renderer + camera, station-to-station navigation (discrete jumps,
// the same operating logic as slides), HUD sync, and the animation loop. It
// contains no script text and no particle math; it only orchestrates.

import * as THREE from 'three';
import { config } from './config.js';
import { stations } from './stations.js';
import { HallScene } from './sceneSystem.js';
import { ParticleEngine } from './particleEngine.js';

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
  text: document.getElementById('station-text'),
  handle: document.getElementById('station-handle'),
  photo: document.getElementById('photo-tag'),
  qr: document.getElementById('qr-block'),
  counterNum: document.getElementById('counter-num'),
  counterTotal: document.getElementById('counter-total'),
  progressFill: document.getElementById('progress-fill'),
  help: document.getElementById('help'),
};
el.counterTotal.textContent = String(stations.length);

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function segmentsToHTML(segs, breakEach) {
  return segs
    .map((s) => (s.em ? `<strong>${esc(s.t)}</strong>` : esc(s.t)))
    .join(breakEach ? '<br>' : '');
}

function renderHUD(index) {
  const st = stations[index];
  el.counterNum.textContent = String(index + 1);
  el.progressFill.style.width = `${(index / (stations.length - 1)) * 100}%`;

  // Photo callout tag.
  if (st.photo) {
    el.photo.hidden = false;
    el.photo.textContent = `FOTO ${st.photo}`;
  } else {
    el.photo.hidden = true;
  }

  // Handle line (e.g. slide 1).
  if (st.handle) {
    el.handle.hidden = false;
    el.handle.textContent = st.handle;
  } else {
    el.handle.hidden = true;
    el.handle.textContent = '';
  }

  // Closing QR slide vs normal text.
  if (st.isClosing) {
    el.text.innerHTML = segmentsToHTML(st.text, true);
    el.text.style.fontSize = 'clamp(20px, 2.4vw, 34px)';
    el.qr.hidden = false;
  } else {
    el.text.innerHTML = segmentsToHTML(st.text, false);
    el.text.style.fontSize = '';
    el.qr.hidden = true;
  }
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

  hall.update(dt);
  engine.update(dt, elapsed);
  renderer.render(scene, camera);
}
animate();
