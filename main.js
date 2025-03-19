//импорт библиотеки three.js
import * as THREE from "./jslib/three.module.js";
import { MTLLoader } from "./jslib/MTLLoader.js";
import { OBJLoader } from "./jslib/OBJLoader.js";

/*              VARIABLES              */
let container, scene, renderer, camera, geometry, terrainMesh;
let targetList = [];
let draworder = [];
let drawbox = [];
let mixer = [];
const N = 300;
let radiusCircle = 20;
let mouse = { x: 0, y: 0 };
let isPressed = false;
let isPressed1 = false;
let isActiveBrush = false;
let k = 0.1;
const gui = new dat.GUI();
gui.width = 400;

const params = {
  sx: 0,
  sy: 0,
  sz: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  brush: false,
  addHouse: function () {
    addHouse();
  },
  addBush: function () {
    addBush();
  },
  addFence: function () {
    addFence();
  },
  del: function () {
    delMesh();
  },
};
let picked = null;

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

  //        LIGHTS
  const light = new THREE.PointLight(0xffffff, 1, 8000);
  light.position.set(N * 2, N * 2, N / 2);
  light.castShadow = true;
  scene.add(light);

  addTerrain();
  addSky();
  createBrush();

  const scaleTab = gui.addFolder("Scale");
  const rotateTab = gui.addFolder("Rotate");
  const rotateFabric = (value) => {
    return rotateTab
      .add(params, "r" + value)
      .min(0)
      .max(Math.PI * 2)
      .step(Math.PI / 180)
      .listen();
  };
  const rotateX = rotateFabric("x");
  const rotateY = rotateFabric("y");
  const rotateZ = rotateFabric("z");
  const meshScaleFabric = (coordinate) => {
    return scaleTab.add(params, coordinate).min(1).max(100).step(1).listen();
  };
  const meshSX = meshScaleFabric("sx");
  const meshSY = meshScaleFabric("sy");
  const meshSZ = meshScaleFabric("sz");
  scaleTab.open();
  rotateTab.open();

  const meshScaleOnChangeFabric = (coordinate) => {
    return (value) => {
      const box = new THREE.Box3();
      const ind1 = drawbox.indexOf(picked.userData.cube);

      draworder[ind1].scale[coordinate] = params["s" + coordinate];
      box.setFromObject(draworder[ind1]);
      draworder[ind1].userData.box = box;

      const pos = new THREE.Vector3();
      box.getCenter(pos);
      picked.userData.cube.position.copy(pos);

      const size = new THREE.Vector3();
      box.getSize(size);
      picked.userData.obb.position.copy(pos);
      picked.userData.cube.scale.set(size.x, size.y, size.z);
      box.getSize(picked.userData.obb.halfSize).multiplyScalar(0.5);

      for (let i = 0; i < drawbox.length; i++) {
        if (picked.userData.cube != drawbox[i]) {
          drawbox[i].material.visible = false;
          drawbox[i].material.color = { r: 1, g: 1, b: 0 };

          if (intersect(picked.userData, drawbox[i].userData) == true) {
            drawbox[i].material.color = { r: 1, g: 0, b: 0 };
            drawbox[i].material.visible = true;
          }
        }
      }
    };
  };
  const meshRotateOnChangeFabric = (coordinate) => {
    return (value) => {
      var box = new THREE.Box3();
      var ind1 = drawbox.indexOf(picked.userData.cube);
      picked.userData.cube.rotation[coordinate] = params["r" + coordinate];
      draworder[ind1].rotation[coordinate] = params["r" + coordinate];
      box.setFromObject(draworder[ind1]);
      draworder[ind1].userData.box = box;
      var pos = new THREE.Vector3();
      box.getCenter(pos);
      picked.userData.cube.position.copy(pos);
      picked.userData.obb.position.copy(pos);
      for (var i = 0; i < drawbox.length; i++) {
        if (picked.userData.cube != drawbox[i]) {
          drawbox[i].material.visible = false;
          drawbox[i].material.color = { r: 1, g: 1, b: 0 };

          if (intersect(picked.userData, drawbox[i].userData) == true) {
            drawbox[i].material.color = { r: 1, g: 0, b: 0 };
            drawbox[i].material.visible = true;
          }
        }
      }
    };
  };

  meshSX.onChange(meshScaleOnChangeFabric("x"));
  meshSY.onChange(meshScaleOnChangeFabric("y"));
  meshSZ.onChange(meshScaleOnChangeFabric("z"));

  rotateX.onChange(meshRotateOnChangeFabric("x"));
  rotateY.onChange(meshRotateOnChangeFabric("y"));
  rotateZ.onChange(meshRotateOnChangeFabric("z"));

  const cubeVisible = gui.add(params, "brush").name("brush").listen();
  cubeVisible.onChange((value) => {
    isActiveBrush = value;
    cursor.visible = value;
    circle.visible = value;
  });

  gui.add(params, "addHouse").name("add house");
  gui.add(params, "addBush").name("add Bush");
  gui.add(params, "addFence").name("add Fence");

  gui.open();
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
        Math.cos(angle) * radiusCircle,
        0,
        Math.sin(angle) * radiusCircle
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
  if (isActiveBrush) {
    if (event.which == 1) {
      isPressed = true;
      k = 1;
    }
    if (event.which == 3) {
      isPressed = true;
      k = -1;
    }
  } else {
    isPressed1 = true;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    //создание луча, исходящего из позиции камеры и проходящего сквозь позицию курсора мыши
    var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
    vector.unproject(camera);
    var ray = new THREE.Raycaster(
      camera.position,
      vector.sub(camera.position).normalize()
    );
    // создание массива для хранения объектов, с которыми пересечётся луч

    var intersects = ray.intersectObjects(draworder, true);
    if (intersects.length > 0) {
      if (picked != null) {
        picked.userData.cube.material.visible = false;
        picked = intersects[0].object.parent;
        picked.userData.cube.material.visible = true;
      } else {
        picked = intersects[0].object.parent;
        picked.userData.cube.material.visible = true;
      }
    } else {
      picked = null;
    }
  }
};

const onMouseUp = () =>
  isActiveBrush ? (isPressed = false) : (isPressed1 = false);

const onMouseMove = (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  const vector = new THREE.Vector3(mouse.x, mouse.y, 1).unproject(camera);
  const ray = new THREE.Raycaster(
    camera.position,
    vector.sub(camera.position).normalize()
  );
  const intersects = ray.intersectObjects(targetList);
  if (isActiveBrush) {
    if (intersects.length > 0) {
      //печать списка полей объекта
      cursor.position.copy(intersects[0].point);
      circle.position.copy(intersects[0].point);
      circle.position.y = 0;
      cursor.position.y += 18.5;

      for (
        var i = 0;
        i < circle.geometry.attributes.position.array.length - 1;
        i += 3
      ) {
        //получение позиции в локальной системе координат
        var pos = new THREE.Vector3();
        pos.x = circle.geometry.attributes.position.array[i];
        pos.y = circle.geometry.attributes.position.array[i + 1];
        pos.z = circle.geometry.attributes.position.array[i + 2];

        //нахождение позиции в глобальной системе координат
        pos.applyMatrix4(circle.matrixWorld);

        var x = Math.round(pos.x);
        var z = Math.round(pos.z);
        var ind = (z + x * N) * 3;

        if (ind >= 0 && ind < geometry.attributes.position.array.length) {
          circle.geometry.attributes.position.array[i + 1] =
            geometry.attributes.position.array[ind + 1] + 0.25;
        }
      }

      circle.geometry.attributes.position.needsUpdate = true;
    }
  } else {
    if (intersects.length > 0) {
      if (picked != null && isPressed1 == true) {
        picked.position.copy(intersects[0].point);

        picked.userData.box.setFromObject(picked);
        var pos = new THREE.Vector3();
        picked.userData.box.getCenter(pos);

        picked.userData.obb.position.copy(pos);

        picked.userData.cube.position.copy(pos);

        for (var i = 0; i < drawbox.length; i++) {
          if (picked.userData.cube != drawbox[i]) {
            drawbox[i].material.visible = false;
            drawbox[i].material.color = { r: 1, g: 1, b: 0 };

            if (intersect(picked.userData, drawbox[i].userData) == true) {
              drawbox[i].material.color = { r: 1, g: 0, b: 0 };
              drawbox[i].material.visible = true;
            }
          }
        }
      }
    }
  }
};

const onDocumentMouseScroll = (event) => {
  if (isActiveBrush) {
    const delta = Math.sign(event.deltaY);
    radiusCircle = Math.max(1, Math.min(40, radiusCircle - delta));
    updateCircleGeometry(circle.geometry);
    circle.geometry.attributes.position.needsUpdate = true;
  }
};

const modifyTerrain = (center) => {
  const positions = geometry.attributes.position.array;
  const radiusSq = radiusCircle * radiusCircle;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];
    const dx = x - center.x;
    const dz = z - center.z;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq < radiusSq) {
      const h = Math.sqrt(radiusSq - distanceSq);
      positions[i + 1] += K * h;
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

function addHouse() {
  loadModel("/models/House/", "Cyprys_House.obj", "Cyprys_House.mtl", 4);
}
function addBush() {
  loadModel("/models/Bush/", "Bush1.obj", "Bush1.mtl", 25);
}
function addFence() {
  loadModel("/models/Fence/", "grade.obj", "grade.mtl", 5);
}

const loadModel = (path, oname, mname, s) => {
  if (isActiveBrush == false) {
    const onProgress = function (xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log(Math.round(percentComplete, 2) + "% downloaded");
      }
    };
    const onError = function () {};
    const manager = new THREE.LoadingManager();
    new MTLLoader(manager).setPath(path).load(mname, function (materials) {
      materials.preload();
      new OBJLoader(manager)
        .setMaterials(materials)
        .setPath(path)
        .load(
          oname,
          function (object) {
            object.traverse(function (child) {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.parent = object;
              }
            });
            object.castShadow = true;
            object.parent = object;
            var x = Math.random() * N;
            var z = Math.random() * N;
            object.position.x = x;
            object.position.z = z;
            object.scale.set(s, s, s);

            var box = new THREE.Box3();

            box.setFromObject(object);
            object.userData.box = box;
            var geometry = new THREE.BoxGeometry(1, 1, 1);
            var material = new THREE.MeshBasicMaterial({
              color: 0x00ff00,
              wireframe: true,
            });
            var cube = new THREE.Mesh(geometry, material);
            scene.add(cube);

            cube.material.visible = false;

            var pos = new THREE.Vector3();
            box.getCenter(pos);

            var size = new THREE.Vector3();
            box.getSize(size);

            var obb = {};
            obb.basis = new THREE.Matrix4();
            obb.halfSize = new THREE.Vector3();
            obb.position = new THREE.Vector3();
            box.getCenter(obb.position);
            box.getSize(obb.halfSize).multiplyScalar(0.5);
            obb.basis.extractRotation(object.matrixWorld);
            obb.basis.extractRotation(cube.matrixWorld);
            object.userData.obb = obb;
            cube.userData.obb = obb;

            cube.position.copy(pos);

            cube.scale.set(size.x, size.y, size.z);

            object.userData.cube = cube;
            cube.userData.object = object;

            draworder.push(object);
            drawbox.push(cube);
            scene.add(object);
          },
          onProgress,
          onError
        );
    });
  }
};

init();
animate();
