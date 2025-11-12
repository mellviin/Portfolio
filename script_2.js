import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---- Scene setup ----
const scene = new THREE.Scene();

// 🌫️ ---- Add Realistic Fog ----
const fogColor = new THREE.Color(0x03030f);
scene.fog = new THREE.FogExp2(fogColor, 0.008);
scene.background = fogColor;

// ---- Starfield ----
function createStarField() {
  const starCount = 2000;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 200;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
  });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}
const stars = createStarField();

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 6);

// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// ---- Lighting ----
const ambient = new THREE.HemisphereLight(0x8888ff, 0x111122, 0.8);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, -2);
scene.add(dirLight);

// ---- Controls ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enableRotate = false;
controls.enablePan = false;

// ---- Loaders ----
const loader = new GLTFLoader();

// ---- Floating Models ----
const modelConfigs = [
  { file: './models/drifting_astronaut.glb', scale: 0.01, radius: 0.8 },
  { file: './models/rock1.glb', scale: 0.02, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.05, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.01, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.03, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.04, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.005, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.008, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.08, radius: 0.4 },
  { file: './models/rock1.glb', scale: 0.02, radius: 0.4 },
];

const models = [];
const bounds = { x: 4, y: 2.5, z: 3 };
const damping = 0.995;
const clock = new THREE.Clock();

// ---- Load Floating Objects ----
modelConfigs.forEach((cfg) => {
  loader.load(
    cfg.file,
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(cfg.scale, cfg.scale, cfg.scale);
      model.position.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 4
      );
      scene.add(model);

      models.push({
        object: model,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        rotationVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        radius: cfg.radius,
      });
    },
    undefined,
    (err) => console.error('Error loading:', cfg.file, err)
  );
});

// ---- Spaceship with light ----
let spaceship = null;
let spaceshipLight = null;
let spaceshipClock = new THREE.Clock();
const flightDuration = 30;

loader.load(
  './models/star_wars_ship.glb',
  (gltf) => {
    spaceship = gltf.scene;
    spaceship.scale.set(4.8, 4.8, 4.8);
    spaceship.position.set(0, 0, -5);
    spaceship.rotation.x = Math.PI / 2;

    spaceshipLight = new THREE.PointLight(0xffffff, 20, 20, 2);
    spaceshipLight.position.set(0, 0, 1);
    spaceship.add(spaceshipLight);
    scene.add(spaceship);
  },
  undefined,
  (err) => console.error('Error loading spaceship:', err)
);

// ---- Scroll Impulse ----
window.addEventListener('wheel', () => {
  models.forEach((data) => {
    data.velocity.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      )
    );
  });
});

// ---- Click Interaction ----
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  // Convert mouse to normalized device coordinates
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersected = raycaster.intersectObjects(models.map((m) => m.object), true);

  if (intersected.length > 0) {
    const hit = intersected[0].object;
    const modelData = models.find((m) => m.object === hit.parent || m.object === hit);

    if (modelData) {
      // 💥 Add "fly-away" velocity impulse
      const impulse = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      );
      modelData.velocity.add(impulse);
    }
  }
});

// ---- Collision ----
function handleCollisions() {
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const a = models[i];
      const b = models[j];
      const posA = a.object.position;
      const posB = b.object.position;
      const diff = new THREE.Vector3().subVectors(posB, posA);
      const dist = diff.length();
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
        const normal = diff.normalize();
        const overlap = (minDist - dist) * 0.5;
        posA.addScaledVector(normal, -overlap);
        posB.addScaledVector(normal, overlap);

        const relativeVelocity = new THREE.Vector3().subVectors(b.velocity, a.velocity);
        const velAlongNormal = relativeVelocity.dot(normal);
        if (velAlongNormal < 0) {
          const impulse = normal.multiplyScalar(velAlongNormal * -1);
          a.velocity.addScaledVector(impulse, -0.5);
          b.velocity.addScaledVector(impulse, 0.5);
        }
      }
    }
  }
}

// ---- Animate ----
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  models.forEach((m) => {
    const { object, velocity, rotationVelocity } = m;
    object.position.add(velocity);
    object.rotation.x += rotationVelocity.x;
    object.rotation.y += rotationVelocity.y;
    object.rotation.z += rotationVelocity.z;

    ['x', 'y', 'z'].forEach((axis) => {
      if (object.position[axis] > bounds[axis] || object.position[axis] < -bounds[axis]) {
        velocity[axis] *= -1;
        object.position[axis] = THREE.MathUtils.clamp(object.position[axis], -bounds[axis], bounds[axis]);
      }
    });

    velocity.multiplyScalar(damping);
    rotationVelocity.multiplyScalar(damping);
  });

  if (spaceship) {
    const elapsed = spaceshipClock.getElapsedTime();
    const t = (elapsed % flightDuration) / flightDuration;
    const x = THREE.MathUtils.lerp(-12, 12, t);
    const y = Math.sin(t * Math.PI * 2) * 1.2;
    spaceship.position.set(x, y, -8);
    spaceship.rotation.y = Math.sin(t * Math.PI * 2) * 0.4;
    spaceship.rotation.z = Math.sin(t * Math.PI * 4) * 0.1;
  }

  stars.rotation.y += 0.00015;
  handleCollisions();
  renderer.render(scene, camera);
}
animate();

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
