//импорт библиотеки three.js
import * as THREE from "./jslib/three.module.js";

/*              VARIABLES              */
let container, scene, renderer, camera, geometry, terrainMesh;
let targetList = [];
const N = 300;
let radiuscircle = 20;
let mouse = { x: 0, y: 0 };
let isPressed = false;
let k = 0.1;

/*              INITIALIZATION              */
const init = () => {
  container = document.getElementById("container");
  scene = new THREE.Scene();

  //        CAMERA
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    4000
  );
  camera.position.set(N / 4, N / 1.25, N * 2);
  camera.lookAt(new THREE.Vector3(N / 2, 0, N / 2));

  //        RENDER
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  container.appendChild(renderer.domElement);

  //        EVENT HANDLER
  window.addEventListener("resize", onWindowResize, false);
  renderer.domElement.addEventListener("contextmenu", (e) =>
    e.preventDefault()
  );
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("mouseup", onMouseUp);
  renderer.domElement.addEventListener("mousemove", onMouseMove);
  renderer.domElement.addEventListener("wheel", onDocumentMouseScroll);

  // Освещение
  const light = new THREE.PointLight(0xffffff, 1, 8000);
  light.position.set(N * 2, N * 2, N / 2);
  light.castShadow = true;
  scene.add(light);

  // Создаем ландшафт
  addTerrain();
  addSky();
  // Создаем кисть
  createBrush();
};

/*              TERRAIN CREATION              */
const addTerrain = () => {
  const vertices = [];
  const faces = [];
  const uvs = [];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      vertices.push(i, 0, j);
      uvs.push(i / (N - 1), j / (N - 1));
    }
  }

  for (let i = 0; i < N - 1; i++) {
    for (let j = 0; j < N - 1; j++) {
      const v1 = i + j * N;
      const v2 = i + 1 + j * N;
      const v3 = i + 1 + (j + 1) * N;
      const v4 = i + (j + 1) * N;

      faces.push(v1, v2, v3);
      faces.push(v1, v3, v4);
    }
  }

  geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometry.setIndex(faces);
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  const texture = new THREE.TextureLoader().load("./img/grasstile.jpg");
  const material = new THREE.MeshLambertMaterial({ map: texture });

  terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  targetList.push(terrainMesh);
};

/*              SKY  CREATION              */
const addSky = () => {
  const loader = new THREE.TextureLoader();
  const geometry = new THREE.SphereGeometry(1500, 64, 64);
  const maxAnisotropy = renderer.getMaxAnisotropy();

  const tex = loader.load("./img/sky-texture.jpg");
  tex.anisotropy = maxAnisotropy;
  tex.minFilter = THREE.NearestFilter;

  const material = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.copy(new THREE.Vector3(N / 2, 0, N / 2));

  scene.add(sphere);
};

/*              BRUSH IMPLEMENTATION              */
const createBrush = () => {
  //        CURSOR
  const cursorGeometry = new THREE.CylinderGeometry(10, 0, 40, 64);
  const cursorMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
  window.cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
  cursor.visible = false;
  scene.add(cursor);

  //        CIRCLE CURSOR
  const circleGeometry = new THREE.BufferGeometry();
  const circleMaterial = new THREE.LineDashedMaterial({
    color: 0xffff00,
    dashSize: 2,
    gapSize: 0,
  });

  updateCircleGeometry(circleGeometry);
  window.circle = new THREE.LineLoop(circleGeometry, circleMaterial);
  circle.computeLineDistances();
  circle.visible = false;
  scene.add(circle);
};

const updateCircleGeometry = (geometry) => {
  const segments = 72;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(
        Math.cos(angle) * radiuscircle,
        0,
        Math.sin(angle) * radiuscircle
      )
    );
  }
  geometry.setFromPoints(points);
};

/*              EVENT HANDLERS              */
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const onMouseDown = (event) => {
  if (event.target === renderer.domElement) {
    //        ACTIVATION BRUSH
    if (event.which === 1 || event.which === 3) {
      isPressed = true;
      k = event.which === 1 ? 0.1 : -0.1;
    }
  }
};

const onMouseUp = () => (isPressed = false);

const onMouseMove = (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const vector = new THREE.Vector3(mouse.x, mouse.y, 1).unproject(camera);
  const ray = new THREE.Raycaster(
    camera.position,
    vector.sub(camera.position).normalize()
  );
  const intersects = ray.intersectObjects(targetList);

  if (intersects.length > 0) {
    cursor.visible = true;
    circle.visible = true;

    cursor.position
      .copy(intersects[0].point)
      .add(new THREE.Vector3(0, 18.5, 0));
    circle.position.copy(intersects[0].point).setY(0);

    if (isPressed) modifyTerrain(intersects[0].point);
  } else {
    cursor.visible = false;
    circle.visible = false;
  }
};

const onDocumentMouseScroll = (event) => {
  const delta = Math.sign(event.deltaY);
  radiuscircle = Math.max(1, Math.min(40, radiuscircle - delta));
  updateCircleGeometry(circle.geometry);
  circle.geometry.attributes.position.needsUpdate = true;
};

const modifyTerrain = (center) => {
  const positions = geometry.attributes.position.array;
  const radiusSq = radiuscircle * radiuscircle;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    const dx = x - center.x;
    const dz = z - center.z;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq < radiusSq) {
      const h = Math.sqrt(radiusSq - distanceSq);
      positions[i + 1] += k * h;
    }
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
};

/*              ANIMATION LOOP              */
const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

init();
animate();
