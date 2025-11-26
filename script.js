import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass.js";

// =============================================
// SCENE
// =============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.002);

// =============================================
// CAMERA + RENDERER
// =============================================
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.6, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

document.getElementById("bg-canvas").appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.zIndex = "-9999";

// =============================================
// POST PROCESSING
// =============================================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.12,
  0.6,
  0.05
);
composer.addPass(bloomPass);

// =============================================
// LIGHTS
// =============================================
scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 3));
const dir = new THREE.DirectionalLight(0xffffff, 0.6);
dir.position.set(5, 10, -2);
scene.add(dir);

// =============================================
// ORBIT CONTROLS
// =============================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enablePan = false;

// =============================================
// LOAD MODELS
// =============================================
const loader = new GLTFLoader();
const models = [];
const bounds = { x: 4, y: 6, z: 12 };
const damping = 0.995;

let astronautModel = null;
const clock = new THREE.Clock();

// Floating model configs (Netlify safe paths)
const modelConfigs = [
  { file: "models/animated_man.glb", scale: 0.01, radius: 0.8, astronaut: true },
  { file: "models/sci-fi_computer.glb", scale: 0.1 },
  { file: "models/rock1.glb", scale: 0.01 },
  { file: "models/rock1.glb", scale: 0.005 },
  { file: "models/rock1.glb", scale: 0.008 },
  { file: "models/rock1.glb", scale: 0.02 }
];

// Load the floating models
modelConfigs.forEach(cfg => {
  loader.load(cfg.file, gltf => {
    const model = gltf.scene;
    model.scale.set(cfg.scale, cfg.scale, cfg.scale);
    model.position.set(
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 4
    );
    scene.add(model);

    const data = {
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
      radius: cfg.radius || 0.3
    };

    if (cfg.astronaut) {
      astronautModel = model;

      // Animation handling
      if (gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.play();
        model.userData.mixer = mixer;
      }
    }

    models.push(data);
  });
});

// =============================================
// RAYCASTING (CLICK ASTRONAUT)
// =============================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let fly = { active: false, start: 0, duration: 14 };

window.addEventListener("click", e => {
  if (!astronautModel) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const meshes = [];
  astronautModel.traverse(c => c.isMesh && meshes.push(c));

  if (raycaster.intersectObjects(meshes).length > 0) {
    fly.active = true;
    fly.start = clock.getElapsedTime();
  }
});

// =============================================
// COLLISION
// =============================================
function doCollisions() {
  for (let i = 0; i < models.length; i++) {
    for (let j = i + 1; j < models.length; j++) {
      const a = models[i], b = models[j];
      const diff = new THREE.Vector3().subVectors(b.object.position, a.object.position);
      const dist = diff.length();
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
        const normal = diff.normalize();
        const overlap = (minDist - dist) * 0.5;
        a.object.position.addScaledVector(normal, -overlap);
        b.object.position.addScaledVector(normal, overlap);
      }
    }
  }
}

// =============================================
// ANIMATION
// =============================================
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  models.forEach(m => {
    m.object.position.add(m.velocity);
    m.object.rotation.x += m.rotationVelocity.x;
    m.object.rotation.y += m.rotationVelocity.y;
    m.object.rotation.z += m.rotationVelocity.z;

    m.velocity.multiplyScalar(damping);
    m.rotationVelocity.multiplyScalar(damping);

    ["x", "y", "z"].forEach(axis => {
      if (m.object.position[axis] > bounds[axis] || m.object.position[axis] < -bounds[axis]) {
        m.velocity[axis] *= -1;
        m.object.position[axis] = THREE.MathUtils.clamp(
          m.object.position[axis],
          -bounds[axis],
          bounds[axis]
        );
      }
    });

    if (m.object.userData.mixer) {
      m.object.userData.mixer.update(delta);
    }
  });

  // Astronaut fly animation
  if (fly.active && astronautModel) {
    const elapsed = clock.getElapsedTime() - fly.start;

    if (elapsed < fly.duration) {
      astronautModel.position.z -= 0.02;
    } else {
      fly.active = false;
    }
  }

  doCollisions();
  composer.render();
}

animate();

// =============================================
// RESIZE
// =============================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
