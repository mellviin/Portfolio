import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FilmPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/FilmPass.js";
import { ShaderPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/shaders/FXAAShader.js";



// ---- Scene setup ----
const scene = new THREE.Scene();

// 🌫️ ---- Add Realistic Fog ----
const fogColor = new THREE.Color(0xffffff);
scene.fog = new THREE.FogExp2(0x000000, 0.002);
scene.background = 0x000000;

// ---- Starfield ----
function createStarField() {
  const starCount = 0; 
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const speeds = new Float32Array(starCount);
  const twinkleSpeeds = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    speeds[i] = Math.random() * 0.002 + 0.0005;
    twinkleSpeeds[i] = Math.random() * 0.02 + 0.005;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute('twinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}
const stars = createStarField();

let twinkleTime = 0;
function updateStars(delta) {
  twinkleTime += delta;
  const positions = stars.geometry.attributes.position;
  const speeds = stars.geometry.attributes.speed;

  for (let i = 0; i < positions.count; i++) {
    positions.array[i * 3 + 2] += Math.sin(twinkleTime * speeds.array[i]) * 0.002;
  }
  stars.material.opacity = 0.7 + Math.sin(twinkleTime * 2.0) * 0.2;
  positions.needsUpdate = true;
}

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 6);
// ---- Renderer ----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.getElementById("bg-canvas").appendChild(renderer.domElement);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));

renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.width = "100vw";
renderer.domElement.style.height = "100vh";
renderer.domElement.style.zIndex = "-9999";


// ---- Post Processing ----
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom (soft cinematic glow)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.12, 0.6, 0.05 
);
composer.addPass(bloomPass);// 🎞️ Optional: Film grain and FXAA (if you want to keep them)
const filmPass = new FilmPass(0.8, 0.25, 0, true);

const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);

// ---- Lighting ----
const ambient = new THREE.HemisphereLight(0xffffff, 0xffffff, 2.8);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(5, 10, -2);
scene.add(dirLight);

const ambient1 = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.8);
scene.add(ambient1);
const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight1.position.set(5, 10, -2);
scene.add(dirLight1);

// ---- Controls ----
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enableRotate = false;
controls.enablePan = false;

// ---- Loaders ----
const loader = new GLTFLoader();

// ---- Floating Models ----
const modelConfigs = [
  { file: '/Portfolio/models/animated_man.glb', scale: 0.01, radius: 0.8, isAstronaut: true },
  { file: '/Portfolio/models/sci-fi_computer.glb', scale: 0.1 },
  { file: '/Portfolio/models/rock1.glb', scale: 0.01, radius: 0.8 },
  { file: '/Portfolio/models/rock1.glb', scale: 0.005, radius: 0.1 },
  { file: '/Portfolio/models/rock1.glb', scale: 0.008, radius: 0.05 },
  { file: '/Portfolio/models/rock1.glb', scale: 0.02, radius: 0.4 },
];

const models = [];
const bounds = { x: 4, y: 6, z: 12 };
const damping = 0.995;
const clock = new THREE.Clock();

let astronautModel = null;
let astronautFly = { active: false, start: 0, duration: 28 };
let approachTarget = new THREE.Vector3(0, 0, 1.2);
let lastCycle = -1;





// ---- Load Floating Objects ----
modelConfigs.forEach((cfg) => {
  loader.load(cfg.file, (gltf) => {
    const model = gltf.scene;
    model.scale.set(cfg.scale, cfg.scale, cfg.scale);
    model.position.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 4
    );
    scene.add(model);

    const modelData = {
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
    };
    if (cfg.isAstronaut) {
  astronautModel = model;

    // --- Animation setup ---
  let astronautMixer = new THREE.AnimationMixer(model);
  if (gltf.animations && gltf.animations.length > 0) {
    const action = astronautMixer.clipAction(gltf.animations[0]);
    action.play();
  }
  model.userData.mixer = astronautMixer;


  // Enable raycasting on all astronaut meshes
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.clickable = true;
    }
  });

  

const bodyLight = new THREE.SpotLight(0x99ccff, 1.2, 6, Math.PI / 4, 0.5, 1.5);
bodyLight.position.set(0, 1.2, 0.2);
bodyLight.target.position.set(0, 0.5, 1.5); // points slightly forward
astronautModel.add(bodyLight);
astronautModel.add(bodyLight.target);

  

  // ✅ Setup click event only AFTER astronaut loads
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener("click", (event) => {
    if (!astronautModel) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Traverse inside astronaut model to collect meshes
    const clickableMeshes = [];
    astronautModel.traverse((child) => {
      if (child.isMesh) clickableMeshes.push(child);
    });

    const intersects = raycaster.intersectObjects(clickableMeshes, true);

    if (intersects.length > 0) {
      astronautFly.active = true;
      astronautFly.start = clock.getElapsedTime();
      console.log("🧑‍🚀 Astronaut clicked and flying!");
    }
  });
}

    models.push(modelData);
  });
});

// ---- Spaceship with Light ----
let spaceship = null;
let spaceshipLight = null;
let spaceshipClock = new THREE.Clock();
const flightDuration = 30;

loader.load('/Portfolio/models/star_wars_ship.glb', (gltf) => {
  spaceship = gltf.scene;
  spaceship.scale.set(4.8, 4.8, 4.8);
  spaceship.position.set(0, 0, -5);
  spaceship.rotation.x = Math.PI / 2;

  spaceshipLight = new THREE.PointLight(0xffffff, 20, 20, 2);
  spaceshipLight.position.set(0, 0, 1);
  spaceship.add(spaceshipLight);
  scene.add(spaceship);
});

// ---- Scroll Impulse ----
window.addEventListener('wheel', () => {
  models.forEach((data) => {
    data.velocity.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.08,
        (Math.random() - 0.5) * 0.05
      )
    );
  });
});

// ---- Click Interaction (Astronaut only) ----
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
  if (!astronautModel) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const meshes = [];
  astronautModel.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });

  const intersects = raycaster.intersectObjects(meshes, true);

  if (intersects.length > 0) {
    astronautFly.active = true;
    astronautFly.start = clock.getElapsedTime();
    astronautFly.duration = 12;

    // Optional: Add bloom pop
    bloomPass.strength = 0.1;
    setTimeout(() => (bloomPass.strength = 0.3), 800);
  }
});

// ---- Collision ----
function handleCollisions() {
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const a = models[i];
      const b = models[j];
      const diff = new THREE.Vector3().subVectors(b.object.position, a.object.position);
      const dist = diff.length();
      const minDist = a.radius + b.radius;
      if (dist < minDist) {
        const normal = diff.normalize();
        const overlap = (minDist - dist) * 0.5;
        a.object.position.addScaledVector(normal, -overlap);
        b.object.position.addScaledVector(normal, overlap);
        const relativeVelocity = new THREE.Vector3().subVectors(b.velocity, a.velocity);
        const velAlongNormal = relativeVelocity.dot(normal);
        if (velAlongNormal < 0) {
          const impulse = normal.multiplyScalar(-velAlongNormal);
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
  updateStars(delta);

    // 🔄 Update all model animations
  models.forEach((m) => {
    if (m.object.userData.mixer) {
      m.object.userData.mixer.update(delta);
    }
  });

 // --- Cinematic looping astronaut drift with random close approach ---
// --- Smooth zero-gravity drifting astronaut with random near-camera passes ---
// --- Subtle zero-gravity drifting with rare near-camera passes (NO noise library) ---
if (astronautModel) {
  const t = clock.getElapsedTime();

  // Base slow orbital drift (very subtle)
  const baseX = Math.sin(t * 0.12) * 1.4;
  const baseY = Math.cos(t * 0.09) * 0.9;
  const baseZ = Math.sin(t * 0.05) * 2.6 - 1.6;

  // Occasional near-camera visit
  if (!astronautModel.userData.nextVisit) {
    astronautModel.userData.nextVisit = t + 25 + Math.random() * 10; // 25–35 sec
  }

  let targetX = baseX;
  let targetY = baseY;
  let targetZ = baseZ;

  // If time to visit the camera
  if (t > astronautModel.userData.nextVisit) {
    // Pick a new slightly off-center close position only once
    if (!astronautModel.userData.visitPoint) {
      astronautModel.userData.visitPoint = {
        x: (Math.random() - 0.5) * 0.6, // slight left/right
        y: (Math.random() - 0.5) * 0.5, // slight up/down
        z: 1.25 + Math.random() * 5.15, // close, but not too close
      };
    }

    const v = astronautModel.userData.visitPoint;
    targetX = v.x;
    targetY = v.y;
    targetZ = v.z;

    // After 3–5 seconds near camera → reset cycle
    if (!astronautModel.userData.visitEnd) {
      astronautModel.userData.visitEnd = t + 3 + Math.random() * 2;
    }

    if (t > astronautModel.userData.visitEnd) {
      astronautModel.userData.nextVisit = t + 25 + Math.random() * 10;
      astronautModel.userData.visitPoint = null;
      astronautModel.userData.visitEnd = null;
    }
  }

  // Smooth lerp movement
  astronautModel.position.x += (targetX - astronautModel.position.x) * 0.016;
  astronautModel.position.y += (targetY - astronautModel.position.y) * 0.016;
  astronautModel.position.z += (targetZ - astronautModel.position.z) * 0.018;

  // Soft zero-gravity rotation
  astronautModel.rotation.y += 0.0008;
  astronautModel.rotation.x += Math.sin(t * 0.2) * 0.0008;
  astronautModel.rotation.z += Math.cos(t * 0.16) * 0.0006;
}





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

  // Spaceship animation
  if (spaceship) {
    const elapsed = spaceshipClock.getElapsedTime();
    const t = (elapsed % flightDuration) / flightDuration;
    const x = THREE.MathUtils.lerp(-12, 12, t);
    const y = Math.sin(t * Math.PI * 2) * 1.2;
    spaceship.position.set(x, y, -8);
    spaceship.rotation.y = Math.sin(t * Math.PI * 2) * 0.4;
    spaceship.rotation.z = Math.sin(t * Math.PI * 4) * 0.1;
  }

  // Astronaut drift animation
  if (astronautFly.active && astronautModel) {
    const elapsed = clock.getElapsedTime() - astronautFly.start;
    const flyOutTime = astronautFly.duration * 0.6;
    const flyBackTime = astronautFly.duration * 0.4;

    if (elapsed < flyOutTime) {
      const progress = elapsed / flyOutTime;
      astronautModel.position.z -= 1.0 * delta * (1 + Math.cos(progress * Math.PI)) * 6;
    } else if (elapsed < astronautFly.duration) {
      const progress = (elapsed - flyOutTime) / flyBackTime;
      astronautModel.position.z += 1.0 * delta * (1 - Math.cos(progress * Math.PI)) * 4.5;
    } else {
      astronautFly.active = false;
    }
  }

  stars.rotation.y += 0.00085;
  handleCollisions();

  camera.position.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.5;
  camera.position.y = Math.cos(clock.getElapsedTime() * 0.07) * 0.3;
  camera.lookAt(0, 0, 0);
  //updateTorchLight();
  composer.render();
}
animate();

// ---- Resize ----
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
