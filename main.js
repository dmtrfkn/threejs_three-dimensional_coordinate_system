import * as THREE from "./jslib/three.module.js";
import { MTLLoader } from "./jslib/MTLLoader.js";
import { OBJLoader } from "./jslib/OBJLoader.js";
import { GLTFLoader } from "./jslib/GLTFLoader.js";

/*              VARIABLES              */
let container, scene, renderer, camera, geometry, imagedata;
let targetList = [];
let mixer;
let morphs = [];
const N = 300;

/*              FUNCTIONS              */
function init() {
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  container.appendChild(renderer.domElement);
  window.addEventListener("resize", onWindowResize, false);

  mixer = new THREE.AnimationMixer(scene);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const img = new Image();
  img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
    imagedata = context.getImageData(0, 0, img.width, img.height);
    addTerrain();
  };
  img.src = "img/ter6.jpg";

  const light = new THREE.PointLight(0xffffff, 1, 8000);
  light.position.set(N * 2, N * 2, N / 2);
  light.castShadow = true;
  scene.add(light);
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 1500;
}

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const render = () => {
  renderer.render(scene, camera);
};

const animate = () => {
  requestAnimationFrame(animate);
  render();
};

const addTerrain = () => {
  let vertices = [];
  let faces = [];
  let uvs = [];
  geometry = new THREE.BufferGeometry();

  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      vertices.push(i, 0.0, j);
      uvs.push(i / (N - 1), j / (N - 1));
    }

  for (let i = 0; i < N - 1; i++)
    for (let j = 0; j < N - 1; j++) {
      const v1 = i + j * N;
      const v2 = i + 1 + j * N;
      const v3 = i + 1 + (j + 1) * N;
      const v4 = i + (j + 1) * N;

      faces.push(v1, v2, v3);
      faces.push(v1, v3, v4);
    }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(faces);
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const tex = new THREE.TextureLoader().load(
    "./img/grasstile.jpg",
    function (texture) {
      console.log("Текстура загружена успешно");
    },
    undefined,
    function (error) {
      console.error("Ошибка загрузки текстуры:", error);
    }
  );

  const material = new THREE.MeshLambertMaterial({
    map: tex,
    wireframe: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.position.set(0.0, 0.0, 0.0);
  scene.add(mesh);

  targetList.push(mesh);
};

init();
animate();
