import * as THREE from "./jslib/three.module.js";
import { MTLLoader } from "./jslib/MTLLoader.js";
import { OBJLoader } from "./jslib/OBJLoader.js";
import { GLTFLoader } from "./jslib/GLTFLoader.js";

/*              VARIABLES              */
let container, scene, renderer, camera;
const N = 300;

/*              FUNCTIONS              */
const init = () => {
  container = document.getElementById("container");
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.set(N / 4, N / 1.25, N * 2);
  camera.lookAt(new THREE.Vector3(N / 2, 0.0, N / 2));

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000ff, 1);
  container.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const render = () => {
  renderer.render(scene, camera);
};

const animate = () => {
  render();
};

init();
animate();
