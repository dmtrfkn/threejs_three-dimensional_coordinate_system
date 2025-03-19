//импорт библиотеки three.js
import * as THREE from "./jslib/three.module.js";
import { MTLLoader } from "./jslib/MTLLoader.js";
import { OBJLoader } from "./jslib/OBJLoader.js";

/*              VARIABLES              */
let container, scene, renderer, camera, geometry, terrainMesh;
let targetList = [];
let drawOrder = [];
let drawBox = [];
let mixer = [];
const N = 300;
let radiusCircle = 20;
let mouse = { x: 0, y: 0 };
let isPressed = false;
let isPressed1 = false;
let isActiveBrush = false;
let K = 0.1;

const gui = new dat.GUI();
const params = {
  sx: 0,
  sy: 0,
  sz: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  brush: false,
  addHouse: () => addHouse(),
  addBush: () => addBush(),
  addFence: () => addFence(),
  del: () => delMesh(),
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

  //        TABS
  const scaleTab = gui.addFolder("Масштабирование");
  const rotateTab = gui.addFolder("Поворот");
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
      const ind1 = drawBox.indexOf(picked.userData.cube);

      drawOrder[ind1].scale[coordinate] = params["s" + coordinate];
      box.setFromObject(drawOrder[ind1]);
      drawOrder[ind1].userData.box = box;

      const pos = new THREE.Vector3();
      box.getCenter(pos);
      picked.userData.cube.position.copy(pos);

      const size = new THREE.Vector3();
      box.getSize(size);
      picked.userData.obb.position.copy(pos);
      picked.userData.cube.scale.set(size.x, size.y, size.z);
      box.getSize(picked.userData.obb.halfSize).multiplyScalar(0.5);

      for (let i = 0; i < drawBox.length; i++) {
        if (picked.userData.cube != drawBox[i]) {
          drawBox[i].material.visible = false;
          drawBox[i].material.color = { r: 1, g: 1, b: 0 };

          if (intersect(picked.userData, drawBox[i].userData) == true) {
            drawBox[i].material.color = { r: 1, g: 0, b: 0 };
            drawBox[i].material.visible = true;
          }
        }
      }
    };
  };
  const meshRotateOnChangeFabric = (coordinate) => {
    return (value) => {
      const box = new THREE.Box3();
      const ind1 = drawBox.indexOf(picked.userData.cube);
      picked.userData.cube.rotation[coordinate] = params["r" + coordinate];
      drawOrder[ind1].rotation[coordinate] = params["r" + coordinate];
      box.setFromObject(drawOrder[ind1]);
      drawOrder[ind1].userData.box = box;
      let pos = new THREE.Vector3();
      box.getCenter(pos);
      picked.userData.cube.position.copy(pos);
      picked.userData.obb.position.copy(pos);
      for (let i = 0; i < drawBox.length; i++) {
        if (picked.userData.cube != drawBox[i]) {
          drawBox[i].material.visible = false;
          drawBox[i].material.color = { r: 1, g: 1, b: 0 };

          if (intersect(picked.userData, drawBox[i].userData) == true) {
            drawBox[i].material.color = { r: 1, g: 0, b: 0 };
            drawBox[i].material.visible = true;
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

  const cubeVisible = gui.add(params, "brush").name("Кисть").listen();
  cubeVisible.onChange((value) => {
    isActiveBrush = value;
    cursor.visible = value;
    circle.visible = value;
  });

  gui.add(params, "addHouse").name("Добавить дом");
  gui.add(params, "addBush").name("Добавить куст");
  gui.add(params, "addFence").name("Добавить ограду");
  gui.add(params, "del").name("Удалить");

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
    if (event.target === renderer.domElement) {
      //        ACTIVATION BRUSH
      if (event.which === 1 || event.which === 3) {
        isPressed = true;
        K = event.which === 1 ? 0.1 : -0.1;
      }
    }
  } else {
    isPressed1 = true;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    //        RAY
    const vector = new THREE.Vector3(mouse.x, mouse.y, 1);
    vector.unproject(camera);
    const ray = new THREE.Raycaster(
      camera.position,
      vector.sub(camera.position).normalize()
    );

    var intersects = ray.intersectObjects(drawOrder, true);
    if (intersects.length > 0) {
      if (picked != null) {
        picked.userData.cube.material.visible = false;
        picked = intersects[0].object.parent;
        picked.userData.cube.material.visible = true;
      } else {
        picked = intersects[0].object.parent;
        picked.userData.cube.material.visible = true;
      }
    } else picked = null;
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
      cursor.position.copy(intersects[0].point);
      circle.position.copy(intersects[0].point);
      circle.position.y = 0;
      cursor.position.y += 18.5;

      for (
        let i = 0;
        i < circle.geometry.attributes.position.array.length - 1;
        i += 3
      ) {
        //       GET LOCAL POSITION
        const pos = new THREE.Vector3();
        pos.x = circle.geometry.attributes.position.array[i];
        pos.y = circle.geometry.attributes.position.array[i + 1];
        pos.z = circle.geometry.attributes.position.array[i + 2];

        //        FIND GLOBAL POSITION
        pos.applyMatrix4(circle.matrixWorld);

        const x = Math.round(pos.x);
        const z = Math.round(pos.z);
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
        const pos = new THREE.Vector3();
        picked.userData.box.getCenter(pos);

        picked.userData.obb.position.copy(pos);

        picked.userData.cube.position.copy(pos);

        for (var i = 0; i < drawBox.length; i++) {
          if (picked.userData.cube != drawBox[i]) {
            drawBox[i].material.visible = false;
            drawBox[i].material.color = { r: 1, g: 1, b: 0 };

            if (intersect(picked.userData, drawBox[i].userData) == true) {
              drawBox[i].material.color = { r: 1, g: 0, b: 0 };
              drawBox[i].material.visible = true;
            }
          }
        }
      }
    }
  }

  if (isPressed) modifyTerrain(intersects[0].point);
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

/*              MODELS              */
const addHouse = () =>
  loadModel("/models/House/", "Cyprys_House.obj", "Cyprys_House.mtl", 4);
const addBush = () => loadModel("/models/Bush/", "Bush1.obj", "Bush1.mtl", 25);
const addFence = () => loadModel("/models/Fence/", "grade.obj", "grade.mtl", 5);

const delMesh = () => {
  const ind = drawOrder.indexOf(picked.userData.cube);
  const ind1 = drawBox.indexOf(picked.userData.cube);
  if (~ind) drawOrder.splice(ind, 1);
  if (~ind) drawBox.splice(ind1, 1);
  console.log(ind1);
  scene.remove(picked.userData.cube);
  scene.remove(drawOrder[ind1]);
};

/*              LOADER             */
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
            const x = Math.random() * N;
            const z = Math.random() * N;
            object.position.x = x;
            object.position.z = z;
            object.scale.set(s, s, s);

            const box = new THREE.Box3();

            box.setFromObject(object);
            object.userData.box = box;
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({
              color: 0x00ff00,
              wireframe: true,
            });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);

            cube.material.visible = false;

            const pos = new THREE.Vector3();
            box.getCenter(pos);

            const size = new THREE.Vector3();
            box.getSize(size);

            const obb = {};
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

            drawOrder.push(object);
            drawBox.push(cube);
            scene.add(object);
          },
          onProgress,
          onError
        );
    });
  }
};

const intersect = (ob1, ob2) => {
  //OOB
  var xAxisA = new THREE.Vector3();
  var yAxisA = new THREE.Vector3();
  var zAxisA = new THREE.Vector3();
  var xAxisB = new THREE.Vector3();
  var yAxisB = new THREE.Vector3();
  var zAxisB = new THREE.Vector3();
  var translation = new THREE.Vector3();
  var vector = new THREE.Vector3();

  var axisA = [];
  var axisB = [];
  var rotationMatrix = [[], [], []];
  var rotationMatrixAbs = [[], [], []];
  var _EPSILON = 1e-3;

  var halfSizeA, halfSizeB;
  var t, i;

  ob1.obb.basis.extractBasis(xAxisA, yAxisA, zAxisA);
  ob2.obb.basis.extractBasis(xAxisB, yAxisB, zAxisB);

  // push basis vectors into arrays, so you can access them via indices
  axisA.push(xAxisA, yAxisA, zAxisA);
  axisB.push(xAxisB, yAxisB, zAxisB);
  // get displacement vector
  vector.subVectors(ob2.obb.position, ob1.obb.position);
  // express the translation vector in the coordinate frame of the current
  // OBB (this)
  for (i = 0; i < 3; i++) {
    translation.setComponent(i, vector.dot(axisA[i]));
  }
  // generate a rotation matrix that transforms from world space to the
  // OBB's coordinate space
  for (i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      rotationMatrix[i][j] = axisA[i].dot(axisB[j]);
      rotationMatrixAbs[i][j] = Math.abs(rotationMatrix[i][j]) + _EPSILON;
    }
  }
  // test the three major axes of this OBB
  for (i = 0; i < 3; i++) {
    vector.set(
      rotationMatrixAbs[i][0],
      rotationMatrixAbs[i][1],
      rotationMatrixAbs[i][2]
    );
    halfSizeA = ob1.obb.halfSize.getComponent(i);
    halfSizeB = ob2.obb.halfSize.dot(vector);

    if (Math.abs(translation.getComponent(i)) > halfSizeA + halfSizeB) {
      return false;
    }
  }
  // test the three major axes of other OBB
  for (i = 0; i < 3; i++) {
    vector.set(
      rotationMatrixAbs[0][i],
      rotationMatrixAbs[1][i],
      rotationMatrixAbs[2][i]
    );
    halfSizeA = ob1.obb.halfSize.dot(vector);
    halfSizeB = ob2.obb.halfSize.getComponent(i);
    vector.set(
      rotationMatrix[0][i],
      rotationMatrix[1][i],
      rotationMatrix[2][i]
    );
    t = translation.dot(vector);
    if (Math.abs(t) > halfSizeA + halfSizeB) {
      return false;
    }
  }
  // test the 9 different cross-axes
  // A.x <cross> B.x
  halfSizeA =
    ob1.obb.halfSize.y * rotationMatrixAbs[2][0] +
    ob1.obb.halfSize.z * rotationMatrixAbs[1][0];
  halfSizeB =
    ob2.obb.halfSize.y * rotationMatrixAbs[0][2] +
    ob2.obb.halfSize.z * rotationMatrixAbs[0][1];
  t =
    translation.z * rotationMatrix[1][0] - translation.y * rotationMatrix[2][0];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.x < cross> B.y
  halfSizeA =
    ob1.obb.halfSize.y * rotationMatrixAbs[2][1] +
    ob1.obb.halfSize.z * rotationMatrixAbs[1][1];
  halfSizeB =
    ob2.obb.halfSize.x * rotationMatrixAbs[0][2] +
    ob2.obb.halfSize.z * rotationMatrixAbs[0][0];
  t =
    translation.z * rotationMatrix[1][1] - translation.y * rotationMatrix[2][1];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.x <cross> B.z
  halfSizeA =
    ob1.obb.halfSize.y * rotationMatrixAbs[2][2] +
    ob1.obb.halfSize.z * rotationMatrixAbs[1][2];
  halfSizeB =
    ob2.obb.halfSize.x * rotationMatrixAbs[0][1] +
    ob2.obb.halfSize.y * rotationMatrixAbs[0][0];
  t =
    translation.z * rotationMatrix[1][2] - translation.y * rotationMatrix[2][2];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.y <cross> B.x
  halfSizeA =
    ob1.obb.halfSize.x * rotationMatrixAbs[2][0] +
    ob1.obb.halfSize.z * rotationMatrixAbs[0][0];
  halfSizeB =
    ob2.obb.halfSize.y * rotationMatrixAbs[1][2] +
    ob2.obb.halfSize.z * rotationMatrixAbs[1][1];
  t =
    translation.x * rotationMatrix[2][0] - translation.z * rotationMatrix[0][0];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.y <cross> B.y
  halfSizeA =
    ob1.obb.halfSize.x * rotationMatrixAbs[2][1] +
    ob1.obb.halfSize.z * rotationMatrixAbs[0][1];
  halfSizeB =
    ob2.obb.halfSize.x * rotationMatrixAbs[1][2] +
    ob2.obb.halfSize.z * rotationMatrixAbs[1][0];
  t =
    translation.x * rotationMatrix[2][1] - translation.z * rotationMatrix[0][1];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.y <cross> B.z
  halfSizeA =
    ob1.obb.halfSize.x * rotationMatrixAbs[2][2] +
    ob1.obb.halfSize.z * rotationMatrixAbs[0][2];
  halfSizeB =
    ob2.obb.halfSize.x * rotationMatrixAbs[1][1] +
    ob2.obb.halfSize.y * rotationMatrixAbs[1][0];
  t =
    translation.x * rotationMatrix[2][2] - translation.z * rotationMatrix[0][2];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.z <cross> B.x
  halfSizeA =
    ob1.obb.halfSize.x * rotationMatrixAbs[1][0] +
    ob1.obb.halfSize.y * rotationMatrixAbs[0][0];
  halfSizeB =
    ob2.obb.halfSize.y * rotationMatrixAbs[2][2] +
    ob2.obb.halfSize.z * rotationMatrixAbs[2][1];
  t =
    translation.y * rotationMatrix[0][0] - translation.x * rotationMatrix[1][0];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.z <cross> B.y
  halfSizeA =
    ob1.obb.halfSize.x * rotationMatrixAbs[1][1] +
    ob1.obb.halfSize.y * rotationMatrixAbs[0][1];
  halfSizeB =
    ob2.obb.halfSize.x * rotationMatrixAbs[2][2] +
    ob2.obb.halfSize.z * rotationMatrixAbs[2][0];
  t =
    translation.y * rotationMatrix[0][1] - translation.x * rotationMatrix[1][1];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // A.z <cross> B.z
  halfSizeA =
    ob1.obb.halfSize.x * rotationMatrixAbs[1][2] +
    ob1.obb.halfSize.y * rotationMatrixAbs[0][2];
  halfSizeB =
    ob2.obb.halfSize.x * rotationMatrixAbs[2][1] +
    ob2.obb.halfSize.y * rotationMatrixAbs[2][0];
  t =
    translation.y * rotationMatrix[0][2] - translation.x * rotationMatrix[1][2];
  if (Math.abs(t) > halfSizeA + halfSizeB) {
    return false;
  }
  // no separating axis exists, so the two OBB don't intersect
  return true;
};
init();
animate();
