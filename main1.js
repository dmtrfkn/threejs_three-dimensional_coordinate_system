import * as THREE from "./jslib/three.module.js";
import { MTLLoader } from "./jslib/MTLLoader.js";
import { OBJLoader } from "./jslib/OBJLoader.js";

class TerrainEditor {
  constructor() {
    this.N = 300;
    this.radiusCircle = 20;
    this.radiusSquare = 20;
    this.isSquareBrush = false;
    this.K = 0.1;
    this.mouse = { x: 0, y: 0 };
    this.isPressed = false;
    this.isPressed1 = false;
    this.isActiveBrush = false;
    this.targetList = [];
    this.drawOrder = [];
    this.drawBox = [];
    this.mixer = [];
    this.params = {
      sx: 0,
      sy: 0,
      sz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      brush: false,
      addHouse: () => this.addHouse(),
      addBush: () => this.addBush(),
      addFence: () => this.addFence(),
      del: () => this.delMesh(),
    };
    this.picked = null;
    this.gui = new dat.GUI();
    this.init();
  }

  init() {
    this.container = document.getElementById("container");
    this.scene = new THREE.Scene();
    this.createCamera();
    this.createRenderer();
    this.addEventListeners();
    this.addLight();
    this.addTerrain();
    this.addSky();
    this.createBrush();
    this.createGUI();
    this.animate();
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      4000
    );
    this.camera.position.set(this.N / 4, this.N / 1.25, this.N * 2);
    this.camera.lookAt(new THREE.Vector3(this.N / 2, 0, this.N / 2));
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);
  }

  addEventListeners() {
    window.addEventListener("resize", () => this.onWindowResize(), false);
    this.renderer.domElement.addEventListener("contextmenu", (e) =>
      e.preventDefault()
    );
    this.renderer.domElement.addEventListener("mousedown", (e) =>
      this.onMouseDown(e)
    );
    this.renderer.domElement.addEventListener("mouseup", () =>
      this.onMouseUp()
    );
    this.renderer.domElement.addEventListener("mousemove", (e) =>
      this.onMouseMove(e)
    );
    this.renderer.domElement.addEventListener("wheel", (e) =>
      this.onDocumentMouseScroll(e)
    );
  }

  addLight() {
    const light = new THREE.PointLight(0xffffff, 1, 8000);
    light.position.set(this.N * 2, this.N * 2, this.N / 2);
    light.castShadow = true;
    this.scene.add(light);
  }

  addTerrain() {
    const vertices = [];
    const faces = [];
    const uvs = [];

    for (let i = 0; i < this.N; i++) {
      for (let j = 0; j < this.N; j++) {
        vertices.push(i, 0, j);
        uvs.push(i / (this.N - 1), j / (this.N - 1));
      }
    }

    for (let i = 0; i < this.N - 1; i++) {
      for (let j = 0; j < this.N - 1; j++) {
        const v1 = i + j * this.N;
        const v2 = i + 1 + j * this.N;
        const v3 = i + 1 + (j + 1) * this.N;
        const v4 = i + (j + 1) * this.N;
        faces.push(v1, v2, v3, v1, v3, v4);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setIndex(faces);
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    const texture = new THREE.TextureLoader().load("./img/grasstile.jpg");
    const material = new THREE.MeshLambertMaterial({ map: texture });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
    this.targetList.push(this.terrainMesh);
  }

  addSky() {
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.SphereGeometry(1500, 64, 64);
    const texture = loader.load("./img/sky-texture.jpg");

    texture.anisotropy = this.renderer.getMaxAnisotropy();
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(this.N / 2, 0, this.N / 2);
    this.scene.add(sphere);
  }

  createBrush() {
    // Cursor
    const cursorGeometry = new THREE.CylinderGeometry(10, 0, 40, 64);
    const cursorMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    this.cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.cursor.visible = false;
    this.scene.add(this.cursor);

    // Circle cursor
    const circleGeometry = new THREE.BufferGeometry();
    this.updateCircleGeometry(circleGeometry);

    const circleMaterial = new THREE.LineDashedMaterial({
      color: 0xffff00,
      dashSize: 2,
      gapSize: 0,
    });

    this.circle = new THREE.LineLoop(circleGeometry, circleMaterial);
    this.circle.computeLineDistances();
    this.circle.visible = false;
    this.scene.add(this.circle);

    const squareGeometry = new THREE.BufferGeometry();
    this.updateSquareGeometry(squareGeometry);

    const squareMaterial = new THREE.LineDashedMaterial({
      color: 0x00ffff,
      dashSize: 2,
      gapSize: 0,
    });

    this.square = new THREE.LineLoop(squareGeometry, squareMaterial);
    this.square.computeLineDistances();
    this.square.visible = false;
    this.scene.add(this.square);
  }

  updateSquareGeometry(geometry) {
    const halfSize = this.radiusSquare / 2;
    const points = [
      new THREE.Vector3(-halfSize, 0, -halfSize),
      new THREE.Vector3(halfSize, 0, -halfSize),
      new THREE.Vector3(halfSize, 0, halfSize),
      new THREE.Vector3(-halfSize, 0, halfSize),
      new THREE.Vector3(-halfSize, 0, -halfSize),
    ];

    geometry.setFromPoints(points);
  }
  updateCircleGeometry(geometry) {
    const segments = 72;
    const points = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * this.radiusCircle,
          0,
          Math.sin(angle) * this.radiusCircle
        )
      );
    }

    geometry.setFromPoints(points);
  }

  createGUI() {
    const scaleTab = this.gui.addFolder("Масштабирование");
    const rotateTab = this.gui.addFolder("Поворот");

    const createScaleControl = (coord) => {
      return scaleTab
        .add(this.params, `s${coord}`)
        .min(1)
        .max(100)
        .step(1)
        .listen();
    };

    const createRotateControl = (coord) => {
      return rotateTab
        .add(this.params, `r${coord}`)
        .min(0)
        .max(Math.PI * 2)
        .step(Math.PI / 180)
        .listen();
    };

    const sx = createScaleControl("x");
    const sy = createScaleControl("y");
    const sz = createScaleControl("z");
    const rx = createRotateControl("x");
    const ry = createRotateControl("y");
    const rz = createRotateControl("z");

    sx.onChange((value) => this.onScaleChange("x", value));
    sy.onChange((value) => this.onScaleChange("y", value));
    sz.onChange((value) => this.onScaleChange("z", value));

    rx.onChange((value) => this.onRotateChange("x", value));
    ry.onChange((value) => this.onRotateChange("y", value));
    rz.onChange((value) => this.onRotateChange("z", value));

    this.gui
      .add(this.params, "brush")
      .name("Кисть")
      .onChange((value) => {
        this.isActiveBrush = value;
        this.cursor.visible = value;
        this.circle.visible = value;
      });

    this.gui
      .add({ squareBrush: false }, "squareBrush")
      .name(" кисть квадрат")
      .onChange((value) => {
        this.isSquareBrush = value;
        if (this.isActiveBrush) {
          if (value) {
            this.square.visible = true;
            this.circle.visible = false;
          } else {
            this.circle.visible = true;
            this.square.visible = false;
          }
        }
      });

    this.gui.add(this.params, "addHouse").name("Добавить дом");
    this.gui.add(this.params, "addBush").name("Добавить куст");
    this.gui.add(this.params, "addFence").name("Добавить забор");
    this.gui.add(this.params, "del").name("Удалить");
    this.gui.open();
  }

  onScaleChange(coord, value) {
    if (!this.picked) return;

    const index = this.drawBox.indexOf(this.picked.userData.cube);
    if (index === -1) return;

    this.drawOrder[index].scale[coord] = value;
    const box = new THREE.Box3().setFromObject(this.drawOrder[index]);

    this.drawOrder[index].userData.box = box;
    const pos = new THREE.Vector3();
    box.getCenter(pos);

    this.picked.userData.cube.position.copy(pos);
    this.picked.userData.obb.position.copy(pos);

    const size = new THREE.Vector3();
    box.getSize(size);
    this.picked.userData.cube.scale.set(size.x, size.y, size.z);
    box.getSize(this.picked.userData.obb.halfSize).multiplyScalar(0.5);

    this.updateCollisionVisuals();
  }

  onRotateChange(coord, value) {
    if (!this.picked) return;

    const index = this.drawBox.indexOf(this.picked.userData.cube);
    if (index === -1) return;

    this.picked.userData.cube.rotation[coord] = value;
    this.drawOrder[index].rotation[coord] = value;

    const box = new THREE.Box3().setFromObject(this.drawOrder[index]);
    this.drawOrder[index].userData.box = box;

    const pos = new THREE.Vector3();
    box.getCenter(pos);

    this.picked.userData.cube.position.copy(pos);
    this.picked.userData.obb.position.copy(pos);

    this.updateCollisionVisuals();
  }

  updateCollisionVisuals() {
    for (let i = 0; i < this.drawBox.length; i++) {
      if (this.picked && this.picked.userData.cube === this.drawBox[i])
        continue;

      this.drawBox[i].material.visible = false;
      this.drawBox[i].material.color.set(0xffff00);

      if (
        this.picked &&
        this.picked.userData &&
        this.intersect(this.picked.userData, this.drawBox[i].userData)
      ) {
        this.drawBox[i].material.color.set(0xff0000);
        this.drawBox[i].material.visible = true;
      }
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseDown(event) {
    if (this.isActiveBrush) {
      if (event.which === 1 || event.which === 3) {
        this.isPressed = true;
        this.K = event.which === 1 ? 0.1 : -0.1;
      }
    } else {
      this.isPressed1 = true;
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // Используем this.mouse
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // Используем this.mouse

      const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 1).unproject(
        this.camera
      );
      const ray = new THREE.Raycaster(
        this.camera.position,
        vector.sub(this.camera.position).normalize()
      );

      const intersects = ray.intersectObjects(this.drawOrder, true);

      if (intersects.length > 0) {
        if (this.picked) {
          this.picked.userData.cube.material.visible = false;
        }

        this.picked = intersects[0].object.parent;
        if (this.picked && this.picked.userData && this.picked.userData.cube) {
          this.picked.userData.cube.material.visible = true;
        }
      } else {
        if (this.picked) {
          this.picked.userData.cube.material.visible = false;
          this.picked = null;
        }
      }
    }
  }

  onMouseUp() {
    this.isPressed = false;
    this.isPressed1 = false;
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // Используем this.mouse
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // Используем this.mouse

    const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 1).unproject(
      this.camera
    );
    const ray = new THREE.Raycaster(
      this.camera.position,
      vector.sub(this.camera.position).normalize()
    );

    const intersects = ray.intersectObjects(this.targetList);

    if (this.isActiveBrush) {
      if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;
        this.cursor.position.copy(intersectPoint);

        // Обновляем позицию текущей кисти (круг или квадрат)
        if (this.isSquareBrush) {
          this.square.position.copy(intersectPoint);
          this.square.position.y = 0;
          this.cursor.position.y += 18.5;

          // Обновляем высоту вершин квадрата по ландшафту
          const positions = this.square.geometry.attributes.position.array;
          const halfSize = this.radiusSquare / 2;
          const corners = [
            { x: -halfSize, z: -halfSize },
            { x: halfSize, z: -halfSize },
            { x: halfSize, z: halfSize },
            { x: -halfSize, z: halfSize },
            { x: -halfSize, z: -halfSize },
          ];

          for (let i = 0; i < corners.length; i++) {
            const worldPos = new THREE.Vector3(
              intersectPoint.x + corners[i].x,
              0,
              intersectPoint.z + corners[i].z
            );

            const height = this.getTerrainHeight(worldPos.x, worldPos.z);
            positions[i * 3 + 1] = height + 0.25;
          }

          this.square.geometry.attributes.position.needsUpdate = true;
        } else {
          this.circle.position.copy(intersectPoint);
          this.circle.position.y = 0;
          this.cursor.position.y += 18.5;

          for (
            let i = 0;
            i < this.circle.geometry.attributes.position.array.length - 1;
            i += 3
          ) {
            const pos = new THREE.Vector3();
            pos.x = this.circle.geometry.attributes.position.array[i];
            pos.y = this.circle.geometry.attributes.position.array[i + 1];
            pos.z = this.circle.geometry.attributes.position.array[i + 2];
            pos.applyMatrix4(this.circle.matrixWorld);

            const x = Math.round(pos.x);
            const z = Math.round(pos.z);
            const index = (z + x * this.N) * 3;

            if (
              index >= 0 &&
              index < this.terrainMesh.geometry.attributes.position.array.length
            ) {
              this.circle.geometry.attributes.position.array[i + 1] =
                this.terrainMesh.geometry.attributes.position.array[index + 1] +
                0.25;
            }
          }
          this.circle.geometry.attributes.position.needsUpdate = true;
        }
      }
    } else {
      if (intersects.length > 0) {
        if (this.picked && this.isPressed1) {
          this.picked.position.copy(intersects[0].point);

          if (this.picked.userData && this.picked.userData.box) {
            this.picked.userData.box.setFromObject(this.picked);

            const pos = new THREE.Vector3();
            this.picked.userData.box.getCenter(pos);

            this.picked.userData.obb.position.copy(pos);
            this.picked.userData.cube.position.copy(pos);

            this.updateCollisionVisuals();
          }
        }
      }
    }

    if (this.isPressed) {
      if (intersects.length > 0) {
        this.modifyTerrain(intersects[0].point);
      }
    }
  }

  onDocumentMouseScroll(event) {
    if (!this.isActiveBrush) return;

    const delta = Math.sign(event.deltaY);
    if (this.isSquareBrush) {
      this.radiusSquare = Math.max(1, Math.min(80, this.radiusSquare - delta));
      this.updateSquareGeometry(this.square.geometry);
      this.square.geometry.attributes.position.needsUpdate = true;
    } else {
      this.radiusCircle = Math.max(1, Math.min(40, this.radiusCircle - delta));
      this.updateCircleGeometry(this.circle.geometry);
      this.circle.geometry.attributes.position.needsUpdate = true;
    }
  }

  modifyTerrain(center) {
    const positions = this.terrainMesh.geometry.attributes.position.array;

    if (this.isSquareBrush) {
      const halfSize = this.radiusSquare / 2;
      const minX = center.x - halfSize;
      const maxX = center.x + halfSize;
      const minZ = center.z - halfSize;
      const maxZ = center.z + halfSize;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];

        if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
          positions[i + 1] += this.K * 10;
        }
      }
    } else {
      // circle
      const radiusSq = this.radiusCircle ** 2;
      for (let i = 0; i < positions.length; i += 3) {
        const dx = positions[i] - center.x;
        const dz = positions[i + 2] - center.z;
        const distanceSq = dx ** 2 + dz ** 2;

        if (distanceSq < radiusSq) {
          const h = Math.sqrt(radiusSq - distanceSq);
          positions[i + 1] += this.K * h;
        }
      }
    }

    // Обновление объектов на местности (остается без изменений)
    this.drawOrder.forEach((object) => {
      const box = object.userData.box;
      const centerPos = new THREE.Vector3();
      box.getCenter(centerPos);

      let distanceSq;
      if (this.isSquareBrush) {
        const halfSize = this.radiusSquare / 2;
        const inX = Math.abs(centerPos.x - center.x) <= halfSize;
        const inZ = Math.abs(centerPos.z - center.z) <= halfSize;
        distanceSq = inX && inZ ? 0 : Infinity;
      } else {
        const dx = centerPos.x - center.x;
        const dz = centerPos.z - center.z;
        distanceSq = dx ** 2 + dz ** 2;
      }

      if (distanceSq < (this.isSquareBrush ? 1 : radiusSq)) {
        const terrainHeight = this.getTerrainHeight(
          object.position.x,
          object.position.z
        );

        const objectBaseOffset = object.position.y - box.min.y;
        object.position.y = terrainHeight + objectBaseOffset;
        object.userData.box.setFromObject(object);
        const newPos = new THREE.Vector3();
        object.userData.box.getCenter(newPos);

        object.userData.cube.position.copy(newPos);
        object.userData.obb.position.copy(newPos);

        const size = new THREE.Vector3();
        object.userData.box.getSize(size);
        object.userData.cube.scale.copy(size);
        object.userData.obb.halfSize.copy(size).multiplyScalar(0.5);
      }
    });

    this.terrainMesh.geometry.attributes.position.needsUpdate = true;
    this.terrainMesh.geometry.computeVertexNormals();
  }

  getTerrainHeight(x, z) {
    x = Math.max(0, Math.min(this.N - 1, x));
    z = Math.max(0, Math.min(this.N - 1, z));

    const positions = this.terrainMesh.geometry.attributes.position.array;
    const index = (Math.floor(z) + Math.floor(x) * this.N) * 3 + 1;
    return positions[index] || 0;
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  loadModel = (path, oname, mname, scale) => {
    if (!this.isActiveBrush) {
      const manager = new THREE.LoadingManager();
      new MTLLoader(manager).setPath(path).load(mname, (materials) => {
        materials.preload();
        new OBJLoader(manager)
          .setMaterials(materials)
          .setPath(path)
          .load(oname, (object) => {
            object.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
              }
            });

            object.castShadow = true;
            object.scale.set(scale, scale, scale);

            // Создание Box3 для объекта
            const box = new THREE.Box3().setFromObject(object);

            // Создание куба для отображения границ
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({
              color: 0x00ff00,
              wireframe: true,
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.material.visible = false;

            // Вычисление центра и размеров
            const pos = new THREE.Vector3();
            const size = new THREE.Vector3();
            box.getCenter(pos);
            box.getSize(size);

            // Инициализация Oriented Bounding Box (OBB)
            const obb = {
              basis: new THREE.Matrix4(),
              halfSize: new THREE.Vector3(),
              position: new THREE.Vector3(),
            };
            box.getCenter(obb.position);
            box.getSize(obb.halfSize).multiplyScalar(0.5);
            obb.basis.extractRotation(object.matrixWorld);

            object.userData = { box, obb, cube };
            cube.userData = { obb, object };

            cube.position.copy(pos);
            cube.scale.copy(size);

            this.drawOrder.push(object);
            this.drawBox.push(cube);
            this.scene.add(object, cube);
          });
      });
    }
  };

  addHouse() {
    this.loadModel("/models/House/", "Cyprys_House.obj", "Cyprys_House.mtl", 4);
  }

  addBush() {
    this.loadModel("/models/Bush/", "Bush1.obj", "Bush1.mtl", 25);
  }

  addFence() {
    this.loadModel("/models/Fence/", "grade.obj", "grade.mtl", 5);
  }

  delMesh() {
    if (!this.picked) return;

    const index = this.drawBox.indexOf(this.picked.userData.cube);
    if (index !== -1) {
      this.scene.remove(this.drawOrder[index], this.drawBox[index]);
      this.drawOrder.splice(index, 1);
      this.drawBox.splice(index, 1);

      if (this.picked.userData.cube === this.drawBox[index]) {
        this.picked = null; // Сброс picked
      }
    }
  }

  intersect(ob1, ob2) {
    const xAxisA = new THREE.Vector3();
    const yAxisA = new THREE.Vector3();
    const zAxisA = new THREE.Vector3();
    const xAxisB = new THREE.Vector3();
    const yAxisB = new THREE.Vector3();
    const zAxisB = new THREE.Vector3();

    const translation = new THREE.Vector3();
    const vector = new THREE.Vector3();
    const axisA = [xAxisA, yAxisA, zAxisA];
    const axisB = [xAxisB, yAxisB, zAxisB];
    const rotationMatrix = [[], [], []];
    const rotationMatrixAbs = [[], [], []];
    const _EPSILON = 1e-3;
    let halfSizeA, halfSizeB, t;

    ob1.obb.basis.extractBasis(xAxisA, yAxisA, zAxisA);
    ob2.obb.basis.extractBasis(xAxisB, yAxisB, zAxisB);

    vector.subVectors(ob2.obb.position, ob1.obb.position);
    for (let i = 0; i < 3; i++) {
      translation.setComponent(i, vector.dot(axisA[i]));
    }

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        rotationMatrix[i][j] = axisA[i].dot(axisB[j]);
        rotationMatrixAbs[i][j] = Math.abs(rotationMatrix[i][j]) + _EPSILON;
      }
    }

    for (let i = 0; i < 3; i++) {
      vector.set(
        rotationMatrixAbs[i][0],
        rotationMatrixAbs[i][1],
        rotationMatrixAbs[i][2]
      );
      halfSizeA = ob1.obb.halfSize.getComponent(i);
      halfSizeB = ob2.obb.halfSize.dot(vector);
      if (Math.abs(translation.getComponent(i)) > halfSizeA + halfSizeB)
        return false;
    }

    for (let i = 0; i < 3; i++) {
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
      if (Math.abs(t) > halfSizeA + halfSizeB) return false;
    }

    // Cross-axis checks (9 combinations)
    // A.x × B.x
    halfSizeA =
      ob1.obb.halfSize.y * rotationMatrixAbs[2][0] +
      ob1.obb.halfSize.z * rotationMatrixAbs[1][0];
    halfSizeB =
      ob2.obb.halfSize.y * rotationMatrixAbs[0][2] +
      ob2.obb.halfSize.z * rotationMatrixAbs[0][1];
    t =
      translation.z * rotationMatrix[1][0] -
      translation.y * rotationMatrix[2][0];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.x × B.y
    halfSizeA =
      ob1.obb.halfSize.y * rotationMatrixAbs[2][1] +
      ob1.obb.halfSize.z * rotationMatrixAbs[1][1];
    halfSizeB =
      ob2.obb.halfSize.x * rotationMatrixAbs[0][2] +
      ob2.obb.halfSize.z * rotationMatrixAbs[0][0];
    t =
      translation.z * rotationMatrix[1][1] -
      translation.y * rotationMatrix[2][1];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.x × B.z
    halfSizeA =
      ob1.obb.halfSize.y * rotationMatrixAbs[2][2] +
      ob1.obb.halfSize.z * rotationMatrixAbs[1][2];
    halfSizeB =
      ob2.obb.halfSize.x * rotationMatrixAbs[0][1] +
      ob2.obb.halfSize.y * rotationMatrixAbs[0][0];
    t =
      translation.z * rotationMatrix[1][2] -
      translation.y * rotationMatrix[2][2];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.y × B.x
    halfSizeA =
      ob1.obb.halfSize.x * rotationMatrixAbs[2][0] +
      ob1.obb.halfSize.z * rotationMatrixAbs[0][0];
    halfSizeB =
      ob2.obb.halfSize.y * rotationMatrixAbs[1][2] +
      ob2.obb.halfSize.z * rotationMatrixAbs[1][1];
    t =
      translation.x * rotationMatrix[2][0] -
      translation.z * rotationMatrix[0][0];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.y × B.y
    halfSizeA =
      ob1.obb.halfSize.x * rotationMatrixAbs[2][1] +
      ob1.obb.halfSize.z * rotationMatrixAbs[0][1];
    halfSizeB =
      ob2.obb.halfSize.x * rotationMatrixAbs[1][2] +
      ob2.obb.halfSize.z * rotationMatrixAbs[1][0];
    t =
      translation.x * rotationMatrix[2][1] -
      translation.z * rotationMatrix[0][1];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.y × B.z
    halfSizeA =
      ob1.obb.halfSize.x * rotationMatrixAbs[2][2] +
      ob1.obb.halfSize.z * rotationMatrixAbs[0][2];
    halfSizeB =
      ob2.obb.halfSize.x * rotationMatrixAbs[1][1] +
      ob2.obb.halfSize.y * rotationMatrixAbs[1][0];
    t =
      translation.x * rotationMatrix[2][2] -
      translation.z * rotationMatrix[0][2];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.z × B.x
    halfSizeA =
      ob1.obb.halfSize.x * rotationMatrixAbs[1][0] +
      ob1.obb.halfSize.y * rotationMatrixAbs[0][0];
    halfSizeB =
      ob2.obb.halfSize.y * rotationMatrixAbs[2][2] +
      ob2.obb.halfSize.z * rotationMatrixAbs[2][1];
    t =
      translation.y * rotationMatrix[0][0] -
      translation.x * rotationMatrix[1][0];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.z × B.y
    halfSizeA =
      ob1.obb.halfSize.x * rotationMatrixAbs[1][1] +
      ob1.obb.halfSize.y * rotationMatrixAbs[0][1];
    halfSizeB =
      ob2.obb.halfSize.x * rotationMatrixAbs[2][2] +
      ob2.obb.halfSize.z * rotationMatrixAbs[2][0];
    t =
      translation.y * rotationMatrix[0][1] -
      translation.x * rotationMatrix[1][1];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    // A.z × B.z
    halfSizeA =
      ob1.obb.halfSize.x * rotationMatrixAbs[1][2] +
      ob1.obb.halfSize.y * rotationMatrixAbs[0][2];
    halfSizeB =
      ob2.obb.halfSize.x * rotationMatrixAbs[2][1] +
      ob2.obb.halfSize.y * rotationMatrixAbs[2][0];
    t =
      translation.y * rotationMatrix[0][2] -
      translation.x * rotationMatrix[1][2];
    if (Math.abs(t) > halfSizeA + halfSizeB) return false;

    return true;
  }
}

new TerrainEditor();
