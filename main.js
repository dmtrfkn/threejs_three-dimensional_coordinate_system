//импорт библиотеки three.js
import * as THREE from "./jslib/three.module.js";
//импорт библиотек для загрузки моделей и материалов
import { MTLLoader } from './jslib/MTLLoader.js';
import { OBJLoader } from './jslib/OBJLoader.js';
//импорт библиотеки для загрузки моделей в формате glb
import { GLTFLoader } from './jslib/GLTFLoader.js';
// Ссылка на элемент веб страницы в котором будет отображаться графика
var container;
// Переменные "камера", "сцена" и "отрисовщик"
var camera, scene, renderer;
var N = 300;
var cursor;
var imagedata;
var Keyboard = new THREEx.KeyboardState();
var clock = new THREE.Clock();
//глобальные переменные для хранения списка анимаций
var mixer, morphs = [];
var k = 0;
var keyboard = new THREEx.KeyboardState();
var circle;
var f = 0;
var radiuscircle = 20;
var geometry;
var mouse = { x: 0, y: 0 }; //переменная для хранения координат мыши
//массив для объектов, проверяемых на пересечение с курсором
var targetList = [];
var draworder = [];
var terrain;
var isPressed = false;
var isPressed1 = false;
var brvis = false;
var drawbox = [];

//объект интерфейса и его ширина
var gui = new dat.GUI();
gui.width = 400;

//массив переменных, ассоциированных с интерфейсом
var params =
{
    sx: 0, sy: 0, sz: 0,
    rx: 0, ry: 0, rz: 0,
    brush: false,
    addHouse: function () { addHouse() },
    addBush: function () { addBush() },
    addFence: function () { addFence() },
    del: function () { delMesh() }
};
var picked = null;


// Функция инициализации камеры, отрисовщика, объектов сцены и т.д.
init();
// Обновление данных по таймеру браузера
animate();

// В этой функции можно добавлять объекты и выполнять их первичную настройку
function init() {
    // Получение ссылки на элемент html страницы
    container = document.getElementById('container');
    // Создание "сцены"
    scene = new THREE.Scene();
    // Установка параметров камеры
    // 45 - угол обзора
    // window.innerWidth / window.innerHeight - соотношение сторон
    // 1 - 4000 - ближняя и дальняя плоскости отсечения
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    // Установка позиции камеры
    //camera.position.set(5, 5, 5);
    camera.position.set(N / 4, N / 1.25, N * 2);
    // Установка точки, на которую камера будет смотреть
    camera.lookAt(new THREE.Vector3(N / 2, 0.0, N / 2));
    // Создание отрисовщика
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Закрашивание экрана синим цветом, заданным в 16ричной системе
    renderer.setClearColor(0x000000ff, 1);
    // Настройки рендера для включения режима расчёта теней
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);
    // Добавление функции обработки события изменения размеров окна
    window.addEventListener('resize', onWindowResize, false);

    renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
    renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);
    renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
    renderer.domElement.addEventListener('wheel', onDocumentMouseScroll, false);
    renderer.domElement.addEventListener("contextmenu",
        function (event) {
            event.preventDefault();
        });



    mixer = new THREE.AnimationMixer(scene);

    //addSphere(1200, "img/sky-texture.jpg");

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var img = new Image();
    img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        imagedata = context.getImageData(0, 0, img.width, img.height);
        // Пользовательская функция генерации ландшафта
        addTerrain();
    }
    // Загрузка изображения с картой высот
    img.src = 'img/ter6.jpg';
    //создание точечного источника освещения, параметры: цвет, интенсивность, дальность
    const light = new THREE.PointLight(0xffffff, 1, 8000);
    light.position.set(N * 2, N * 2, N / 2); //позиция источника освещения
    light.castShadow = true; //включение расчёта теней от источника освещения
    scene.add(light); //добавление источника освещения в сцену
    // light.target = new THREE.Object3D();
    // // direction
    // light.target.position.set(0, 0, 0);
    // scene.add(light.target)
    //настройка расчёта теней от источника освещения
    light.shadow.mapSize.width = 2048; //ширина карты теней в пикселях
    light.shadow.mapSize.height = 2048; //высота карты теней в пикселях
    light.shadow.camera.near = 0.5; //расстояние, ближе которого не будет теней
    light.shadow.camera.far = 1500; //расстояние, дальше которого не будет теней
    cursor = addCursor();
    circle = addCircle(720);

    //создание вкладки
    var folder1 = gui.addFolder('Scale');
    //ассоциирование переменных отвечающих за масштабирование
    //в окне интерфейса они будут представлены в виде слайдера
    //минимальное значение - 1, максимальное – 100, шаг – 1
    //listen означает, что изменение переменных будет отслеживаться
    var meshSX = folder1.add(params, 'sx').min(1).max(100).step(1).listen();
    var meshSY = folder1.add(params, 'sy').min(1).max(100).step(1).listen();
    var meshSZ = folder1.add(params, 'sz').min(1).max(100).step(1).listen();
    var folder2 = gui.addFolder('Rotate');
    var rotX = folder2.add(params, 'rx').min(0).max(Math.PI * 2).step(Math.PI / 180).listen();
    var rotY = folder2.add(params, 'ry').min(0).max(Math.PI * 2).step(Math.PI / 180).listen();
    var rotZ = folder2.add(params, 'rz').min(0).max(Math.PI * 2).step(Math.PI / 180).listen();
    //при запуске программы папка будет открыта
    folder1.open();
    folder2.open();
    //описание действий совершаемых при изменении ассоциированных значений

    meshSX.onChange(function (value) {

        var box = new THREE.Box3();

        
        var ind1 = drawbox.indexOf(picked.userData.cube);
        
        draworder[ind1].scale.x = params.sx;
        box.setFromObject(draworder[ind1]);
        draworder[ind1].userData.box = box;
        var pos = new THREE.Vector3();     
        box.getCenter(pos);
        picked.userData.cube.position.copy(pos);
        var size = new THREE.Vector3();
        box.getSize(size);
        picked.userData.obb.position.copy(pos);
        picked.userData.cube.scale.set(size.x, size.y, size.z);       
        box.getSize(picked.userData.obb.halfSize).multiplyScalar(0.5);

        for (var i = 0; i < drawbox.length;i++)
        {   
            
            if (picked.userData.cube != drawbox[i])
            {
                drawbox[i].material.visible = false;
                drawbox[i].material.color = {r:1,g:1,b:0};

                if(intersect(picked.userData, drawbox[i].userData) == true)
                {
                    drawbox[i].material.color = {r:1,g:0,b:0};
                    drawbox[i].material.visible = true;
                }
            }    
        }      
        
   
       
        

    });
    meshSY.onChange(function (value) {
        var box = new THREE.Box3();

        var ind1 = drawbox.indexOf(picked.userData.cube);
        
        draworder[ind1].scale.y = params.sy;
        box.setFromObject(draworder[ind1]);
        draworder[ind1].userData.box = box;
        var pos = new THREE.Vector3();
        box.getCenter(pos);
        picked.userData.cube.position.copy(pos);
        var size = new THREE.Vector3();
        box.getSize(size);
        picked.userData.obb.position.copy(pos);
        picked.userData.cube.scale.set(size.x, size.y, size.z);       
        box.getSize(picked.userData.obb.halfSize).multiplyScalar(0.5);

        for (var i = 0; i < drawbox.length;i++)
        {   
            
            if (picked.userData.cube != drawbox[i])
            {
                drawbox[i].material.visible = false;
                drawbox[i].material.color = {r:1,g:1,b:0};

                if(intersect(picked.userData, drawbox[i].userData) == true)
                {
                    drawbox[i].material.color = {r:1,g:0,b:0};
                    drawbox[i].material.visible = true;
                }
            }    
        }      
    });
    meshSZ.onChange(function (value) {
        var box = new THREE.Box3();

        var ind1 = drawbox.indexOf(picked.userData.cube);
        
        draworder[ind1].scale.z = params.sz;
        box.setFromObject(draworder[ind1]);
        draworder[ind1].userData.box = box;
        var pos = new THREE.Vector3();
        box.getCenter(pos);
        picked.userData.cube.position.copy(pos);
        var size = new THREE.Vector3();
        box.getSize(size);
        picked.userData.obb.position.copy(pos);
        picked.userData.cube.scale.set(size.x, size.y, size.z);       
        box.getSize(picked.userData.obb.halfSize).multiplyScalar(0.5);

        for (var i = 0; i < drawbox.length;i++)
        {   
            
            if (picked.userData.cube != drawbox[i])
            {
                drawbox[i].material.visible = false;
                drawbox[i].material.color = {r:1,g:1,b:0};

                if(intersect(picked.userData, drawbox[i].userData) == true)
                {
                    drawbox[i].material.color = {r:1,g:0,b:0};
                    drawbox[i].material.visible = true;
                }
            }    
        }      

    });


    rotX.onChange(function (value) {
        var box = new THREE.Box3();
        var ind1 = drawbox.indexOf(picked.userData.cube);
        picked.userData.cube.rotation.x = params.rx;
        draworder[ind1].rotation.x = params.rx;
        box.setFromObject(draworder[ind1]);
        draworder[ind1].userData.box = box;
        var pos = new THREE.Vector3();
        box.getCenter(pos);
        picked.userData.cube.position.copy(pos);
        picked.userData.obb.position.copy(pos);
        for (var i = 0; i < drawbox.length;i++)
        {   
            
            if (picked.userData.cube != drawbox[i])
            {
                drawbox[i].material.visible = false;
                drawbox[i].material.color = {r:1,g:1,b:0};

                if(intersect(picked.userData, drawbox[i].userData) == true)
                {
                    drawbox[i].material.color = {r:1,g:0,b:0};
                    drawbox[i].material.visible = true;
                }
            }    
        }

    });
    rotY.onChange(function (value) {
        var box = new THREE.Box3();
        var ind1 = drawbox.indexOf(picked.userData.cube);
        picked.userData.cube.rotation.y = params.ry;
        draworder[ind1].rotation.y = params.ry;
        box.setFromObject(draworder[ind1]);
        draworder[ind1].userData.box = box;
        var pos = new THREE.Vector3();
        box.getCenter(pos);
        picked.userData.cube.position.copy(pos);
        picked.userData.obb.position.copy(pos);
        for (var i = 0; i < drawbox.length;i++)
        {   
            
            if (picked.userData.cube != drawbox[i])
            {
                drawbox[i].material.visible = false;
                drawbox[i].material.color = {r:1,g:1,b:0};

                if(intersect(picked.userData, drawbox[i].userData) == true)
                {
                    drawbox[i].material.color = {r:1,g:0,b:0};
                    drawbox[i].material.visible = true;
                }
            }    
        }

    });
    rotZ.onChange(function (value) {
        var box = new THREE.Box3();
        var ind1 = drawbox.indexOf(picked.userData.cube);
        picked.userData.cube.rotation.z = params.rz;
        draworder[ind1].rotation.z = params.rz;
        box.setFromObject(draworder[ind1]);
        draworder[ind1].userData.box = box;
        var pos = new THREE.Vector3();
        box.getCenter(pos);
        picked.userData.cube.position.copy(pos);
        picked.userData.obb.position.copy(pos);
        for (var i = 0; i < drawbox.length;i++)
        {   
            
            if (picked.userData.cube != drawbox[i])
            {
                drawbox[i].material.visible = false;
                drawbox[i].material.color = {r:1,g:1,b:0};

                if(intersect(picked.userData, drawbox[i].userData) == true)
                {
                    drawbox[i].material.color = {r:1,g:0,b:0};
                    drawbox[i].material.visible = true;
                }
            }    
        }


    });
    //добавление чек бокса с именем brush
    var cubeVisible = gui.add(params, 'brush').name('brush').listen();
    cubeVisible.onChange(function (value) {
        brvis = value;
        cursor.visible = value;
        circle.visible = value;
    });
    //добавление кнопок, при нажатии которых будут вызываться функции addMesh
    //и delMesh соответственно. Функции описываются самостоятельно.
    gui.add(params, 'addHouse').name("add house");
    gui.add(params, 'addBush').name("add Bush");
    gui.add(params, 'addFence').name("add Fence");
    gui.add(params, 'del').name("delete");

    //при запуске программы интерфейс будет раскрыт
    gui.open();


}


function delMesh() 
{   
    var ind = draworder.indexOf(picked.userData.cube);
    var ind1 = drawbox.indexOf(picked.userData.cube);
    if (~ind) draworder.splice(ind, 1);
    if (~ind) drawbox.splice(ind1, 1);
    console.log(ind1);
    scene.remove(picked.userData.cube);
    scene.remove(draworder[ind1]);
    
}


function addHouse() {
    loadModel('/models/House/', "Cyprys_House.obj", "Cyprys_House.mtl", 4);

}
function addBush() {
    loadModel('/models/Bush/', "Bush1.obj", "Bush1.mtl", 25);

}
function addFence() {
    loadModel('/models/Fence/', "grade.obj", "grade.mtl", 5);

}

function onWindowResize() {
    // Изменение соотношения сторон для виртуальной камеры
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Изменение соотношения сторон рендера
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// В этой функции можно изменять параметры объектов и обрабатывать действия пользователя
//ВРАЩЕНИЕ КАМЕРЫ ВОКРУГ ПЛОСКОСТИ
function animate() {
    // Добавление функции на вызов, при перерисовки браузером страницы
    var delta = clock.getDelta();
    if (isPressed) {
        hSphere(k, delta);
    }
    if (keyboard.pressed("A")) {

        f += Math.PI / 90;

        camera.position.x = N / 2 + 300 * Math.cos(f);
        camera.position.z = N / 2 + 300 * Math.sin(f);
        camera.lookAt(new THREE.Vector3(N / 2, 0.0, N / 2));

    }
    if (keyboard.pressed("D")) {

        f -= Math.PI / 90;
        camera.position.x = N / 2 + 300 * Math.cos(f);
        camera.position.z = N / 2 + 300 * Math.sin(f);
        camera.lookAt(new THREE.Vector3(N / 2, 0.0, N / 2));
    }
    requestAnimationFrame(animate);
    render();
}
function render() {
    // Рисование кадра
    renderer.render(scene, camera);
}
function addTerrain() {
    var vertices = []; // Объявление массива для хранения вершин
    var faces = []; // Объявление массива для хранения индексов
    var colors = []; // Объявление массива для хранения цветов вершин
    var uvs = []; // Массив для хранения текстурных координат

    geometry = new THREE.BufferGeometry();// Создание структуры для хранения геометрии

    //faces.push(0, 1, 2);
    for (var i = 0; i < N; i++)
        for (var j = 0; j < N; j++) {
            //получение цвета пикселя в десятом столбце десятой строки изображения
            vertices.push(i, 0, j);

            uvs.push(i / (N - 1), j / (N - 1)); // Добавление текстурных координат для левой верхней вершины

        }
    for (var i = 0; i < N - 1; i++)
        for (var j = 0; j < N - 1; j++) {
            faces.push(i + j * N, (i + 1) + j * N, (i + 1) + (j + 1) * N);
            faces.push(i + j * N, (i + 1) + (j + 1) * N, i + (j + 1) * N);
        }

    //Добавление вершин и индексов в геометрию
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(faces);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    //geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    geometry.computeVertexNormals();

    //Загрузка текстуры yachik.jpg из папки pics
    var tex = new THREE.TextureLoader().load('img/grasstile.jpg');

    var triangleMaterial = new THREE.MeshLambertMaterial({
        map: tex,
        //vertexColors:THREE.VertexColors,
        wireframe: false,
        side: THREE.DoubleSide
    });

    // Режим повторения текстуры
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // Повторить текстуру 3х3 раз
    tex.repeat.set(3, 3);

    // Создание объекта и установка его в определённую позицию
    var triangleMesh = new THREE.Mesh(geometry, triangleMaterial);
    triangleMesh.position.set(0.0, 0.0, 0.0);

    triangleMesh.receiveShadow = true;
    // Добавление объекта в сцену
    targetList.push(triangleMesh);
    terrain = triangleMesh;
    scene.add(triangleMesh);
}
function loadModel(path, oname, mname, s) //где path – путь к папке с моделями
{   if (brvis == false){
        const onProgress = function (xhr) { //выполняющаяся в процессе загрузки
            if (xhr.lengthComputable) {
                const percentComplete = xhr.loaded / xhr.total * 100;
                console.log(Math.round(percentComplete, 2) + '% downloaded');
            }
        };
        const onError = function () { }; //выполняется в случае возникновения ошибки
        const manager = new THREE.LoadingManager();
        new MTLLoader(manager)
            .setPath(path) //путь до модели
            .load(mname, function (materials) { //название материала
                materials.preload();
                new OBJLoader(manager)
                    .setMaterials(materials) //установка материала
                    .setPath(path) //путь до модели
                    .load(oname, function (object) { //название модели
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
                        //масштаб модели
                        object.scale.set(s, s, s);
                        //добавление модели в сцену 
                        
                        
                        var box = new THREE.Box3();

                        box.setFromObject(object);
                        object.userData.box = box;
                        var geometry = new THREE.BoxGeometry(1,1,1);
                        var material = new THREE.MeshBasicMaterial({color:0x00ff00, wireframe: true});
                        var cube = new THREE.Mesh(geometry, material);
                        scene.add(cube);

                        cube.material.visible = false;

                        var pos = new THREE.Vector3();
                        box.getCenter(pos);
                        
                        //получение размеров объекта
                        var size = new THREE.Vector3();
                        box.getSize(size);

                        var obb = {};
                        //структура состоит из матрицы поворота, позиции и половины размера
                        obb.basis = new THREE.Matrix4();
                        obb.halfSize = new THREE.Vector3();
                        obb.position = new THREE.Vector3();
                        //получение позиции центра объекта
                        box.getCenter(obb.position);
                        //получение размеров объекта
                        box.getSize(obb.halfSize).multiplyScalar(0.5);
                        //получение матрицы поворота объекта
                        obb.basis.extractRotation(object.matrixWorld);
                        obb.basis.extractRotation(cube.matrixWorld);
                        //структура хранится в поле userData объекта
                        object.userData.obb = obb;
                        cube.userData.obb = obb;
                        //установка позиции и размера объекта в куб
                        cube.position.copy(pos);





                    //  FFFFFFFFFFFFFFFFFFFFF
                        cube.scale.set(size.x, size.y, size.z);
                        
                        
                        object.userData.cube = cube;
                        cube.userData.object = object;

                        draworder.push(object);
                        drawbox.push(cube);
                        scene.add(object);
                        
                        

                        

                        //создание объекта Box3 и установка его вокруг объекта object
                        
                    }, onProgress, onError);
            });
        }     
        


}

function onDocumentMouseScroll(event) {

    if (brvis == true)
    {
        if (radiuscircle > 1)
            if (event.wheelDelta < 0)
                radiuscircle--;
        if (radiuscircle < 40)
            if (event.wheelDelta > 0)
                radiuscircle++;
        


        circle.scale.set(radiuscircle, 1, radiuscircle);
    }
}
function onDocumentMouseMove(event) {


    //определение позиции мыши
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    //создание луча, исходящего из позиции камеры и проходящего сквозь позицию курсора мыши
    var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
    vector.unproject(camera);
    var ray = new THREE.Raycaster(camera.position,
        vector.sub(camera.position).normalize());
    // создание массива для хранения объектов, с которыми пересечётся луч
    
    var intersects = ray.intersectObjects(targetList);
        // если луч пересёк какой-либо объект из списка targetList
    if (brvis == true){
        if (intersects.length > 0) {
            //печать списка полей объекта
            cursor.position.copy(intersects[0].point);
            circle.position.copy(intersects[0].point);
            circle.position.y = 0;
            cursor.position.y += 18.5;

            for (var i = 0; i < circle.geometry.attributes.position.array.length - 1; i += 3) {
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
                
                if (ind >= 0 && ind < geometry.attributes.position.array.length)
                {                    
                    circle.geometry.attributes.position.array[i + 1] = geometry.attributes.position.array[ind + 1] + 0.25;
                }
            }

            circle.geometry.attributes.position.needsUpdate = true;

        }
   
    }
    else{
        if (intersects.length > 0){
            if (picked != null && isPressed1 == true)
            {
                picked.position.copy(intersects[0].point);

                picked.userData.box.setFromObject(picked);
                var pos = new THREE.Vector3();
                picked.userData.box.getCenter(pos);


                picked.userData.obb.position.copy(pos);

                picked.userData.cube.position.copy(pos);
                

                for (var i = 0; i < drawbox.length;i++)
                {   
                    
                    if (picked.userData.cube != drawbox[i])
                    {
                        drawbox[i].material.visible = false;
                        drawbox[i].material.color = {r:1,g:1,b:0};

                        if(intersect(picked.userData, drawbox[i].userData) == true)
                        {
                            drawbox[i].material.color = {r:1,g:0,b:0};
                            drawbox[i].material.visible = true;
                        }
                    }    
                }
            }
        }
    }
}
function onDocumentMouseDown(event) {
    
    if (brvis == true) {
        
        if (event.which == 1) {
            isPressed = true;
            k = 1;
        }
        if (event.which == 3) {
            isPressed = true;
            k = -1;
        }
    }else
    {   
        isPressed1 = true;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
        //создание луча, исходящего из позиции камеры и проходящего сквозь позицию курсора мыши
        var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
        vector.unproject(camera);
        var ray = new THREE.Raycaster(camera.position,
            vector.sub(camera.position).normalize());
        // создание массива для хранения объектов, с которыми пересечётся луч
        
        var intersects = ray.intersectObjects(draworder, true);
        if (intersects.length > 0) {
            if (picked != null)
            {   
                picked.userData.cube.material.visible = false;
                picked = intersects[0].object.parent;
                picked.userData.cube.material.visible = true;
            }
            else
            {
                picked = intersects[0].object.parent;
                picked.userData.cube.material.visible = true;
            }

        }
        else
        {
            picked.userData.cube.material.visible = false;
            picked = null;
        }
    }
    
}
function onDocumentMouseUp(event) {
    if (brvis == true){
        isPressed = false;        
       }
    else {
        isPressed1 = false;         
    }
}

function addCursor() {
    //параметры цилиндра: диаметр вершины, диаметр основания, высота, число сегментов
    var geometry = new THREE.CylinderGeometry(10, 0, 40, 64);
    var cyMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
    var cylinder = new THREE.Mesh(geometry, cyMaterial);
    scene.add(cylinder);
    cylinder.visible = false;
    return (cylinder);
}

function addCircle(L) {
    //создание материала для пунктирной линии
    var dashed_material = new THREE.LineDashedMaterial({
        color: 0xffff00, //цвет линии
        dashSize: 2, //размер сегмента
        gapSize: 0, //величина отступа между сегментами
    });
    var points = []; //массив для хранения координат сегментов
    var k = 360 / L;
    for (var i = 0; i < L; i++) {
        var x = Math.cos((i * k) * Math.PI / 180);
        var z = Math.sin((i * k) * Math.PI / 180);
        points.push(new THREE.Vector3(x, 0, z)); //завершение линии
    }
    var geometry = new THREE.BufferGeometry().setFromPoints(points); //создание геометрии
    var line = new THREE.LineLoop(geometry, dashed_material); //создание модели
    line.computeLineDistances(); //вычисление дистанции между сегментами
    line.scale.set(radiuscircle, 1, radiuscircle);
    scene.add(line); //добавление модели в сцену
    line.visible = false;
    return line;
}

function hSphere(k, delta) {
    var pos = new THREE.Vector3();
    pos.copy(cursor.position);

    var vertices = geometry.getAttribute("position"); //получение массива вершин плоскости
    for (var i = 0; i < vertices.array.length; i += 3) //перебор вершин
    {
        var x = vertices.array[i]; //получение координат вершин по X
        var z = vertices.array[i + 2]; //получение координат вершин по Z
        var h = (radiuscircle * radiuscircle) - (((x - pos.x) * (x - pos.x)) + ((z - pos.z) * (z - pos.z)));
        if (h > 0)
            vertices.array[i + 1] += Math.sqrt(h) * k * delta; //изменение координат по Y
    }
    geometry.setAttribute('position', vertices); //установка изменённых вершин
    geometry.computeVertexNormals(); //пересчёт нормалей
    geometry.attributes.position.needsUpdate = true; //обновление вершин
    geometry.attributes.normal.needsUpdate = true; //обновление нормалей
    //cube.position
  
    for(var i = 0; i < draworder.length; i++)
    {
        pos.copy(draworder[i].position);

        var xx = Math.round(pos.x);
        var zz = Math.round(pos.z);
        var inds = (zz+xx*N)*3;
       // console.log(geometry.attributes.position.array.lenght)

        if (inds>=0 && inds < geometry.attributes.position.array.length) 
        {
            draworder[i].position.y = geometry.attributes.position.array[inds+1];

            draworder[i].userData.box.setFromObject(draworder[i]);

            draworder[i].userData.box.getCenter(pos);

            draworder[i].userData.cube.position.copy(pos);
        }
    }
    //draworder[i].position.copy(cube.position);
    
}

function intersect(ob1, ob2) //OOB
{
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
    var rotationMatrix = [ [], [], [] ];
    var rotationMatrixAbs = [ [], [], [] ];
    var _EPSILON = 1e-3;

    var halfSizeA, halfSizeB;
    var t, i;

    ob1.obb.basis.extractBasis( xAxisA, yAxisA, zAxisA );
    ob2.obb.basis.extractBasis( xAxisB, yAxisB, zAxisB );

    // push basis vectors into arrays, so you can access them via indices
    axisA.push( xAxisA, yAxisA, zAxisA );
    axisB.push( xAxisB, yAxisB, zAxisB );
    // get displacement vector
    vector.subVectors( ob2.obb.position, ob1.obb.position );
    // express the translation vector in the coordinate frame of the current
    // OBB (this)
    for ( i = 0; i < 3; i++ )
    {
    translation.setComponent( i, vector.dot( axisA[ i ] ) );
    }
    // generate a rotation matrix that transforms from world space to the
    // OBB's coordinate space
    for ( i = 0; i < 3; i++ )
    {
    for ( var j = 0; j < 3; j++ )
    {
    rotationMatrix[ i ][ j ] = axisA[ i ].dot( axisB[ j ] );
    rotationMatrixAbs[ i ][ j ] = Math.abs( rotationMatrix[ i ][ j ] ) + _EPSILON;
    }
    }
    // test the three major axes of this OBB
    for ( i = 0; i < 3; i++ )
    {
    vector.set( rotationMatrixAbs[ i ][ 0 ], rotationMatrixAbs[ i ][ 1 ], rotationMatrixAbs[ i ][ 2 ]
    );
    halfSizeA = ob1.obb.halfSize.getComponent( i );
    halfSizeB = ob2.obb.halfSize.dot( vector );

    if ( Math.abs( translation.getComponent( i ) ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    }
    // test the three major axes of other OBB
    for ( i = 0; i < 3; i++ )
    {
    vector.set( rotationMatrixAbs[ 0 ][ i ], rotationMatrixAbs[ 1 ][ i ], rotationMatrixAbs[ 2 ][ i ] );
    halfSizeA = ob1.obb.halfSize.dot( vector );
    halfSizeB = ob2.obb.halfSize.getComponent( i );
    vector.set( rotationMatrix[ 0 ][ i ], rotationMatrix[ 1 ][ i ], rotationMatrix[ 2 ][ i ] );
    t = translation.dot( vector );
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    }
    // test the 9 different cross-axes
    // A.x <cross> B.x
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 0 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 0 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 1 ];
    t = translation.z * rotationMatrix[ 1 ][ 0 ] - translation.y * rotationMatrix[ 2 ][ 0 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.x < cross> B.y
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 1 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 0 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 0 ];
    t = translation.z * rotationMatrix[ 1 ][ 1 ] - translation.y * rotationMatrix[ 2 ][ 1 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.x <cross> B.z
    halfSizeA = ob1.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 2 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 0 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 0 ];
    t = translation.z * rotationMatrix[ 1 ][ 2 ] - translation.y * rotationMatrix[ 2 ][ 2 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.y <cross> B.x
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 0 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 1 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 1 ];
    t = translation.x * rotationMatrix[ 2 ][ 0 ] - translation.z * rotationMatrix[ 0 ][ 0 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.y <cross> B.y
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 1 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 1 ][ 0 ];
    t = translation.x * rotationMatrix[ 2 ][ 1 ] - translation.z * rotationMatrix[ 0 ][ 1 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.y <cross> B.z
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 2 ] + ob1.obb.halfSize.z *
    rotationMatrixAbs[ 0 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 1 ][ 0 ];
    t = translation.x * rotationMatrix[ 2 ][ 2 ] - translation.z * rotationMatrix[ 0 ][ 2 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.z <cross> B.x
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 0 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 0 ];
    halfSizeB = ob2.obb.halfSize.y * rotationMatrixAbs[ 2 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 2 ][ 1 ];
    t = translation.y * rotationMatrix[ 0 ][ 0 ] - translation.x * rotationMatrix[ 1 ][ 0 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.z <cross> B.y
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 1 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 1 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 2 ] + ob2.obb.halfSize.z *
    rotationMatrixAbs[ 2 ][ 0 ];
    t = translation.y * rotationMatrix[ 0 ][ 1 ] - translation.x * rotationMatrix[ 1 ][ 1 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // A.z <cross> B.z
    halfSizeA = ob1.obb.halfSize.x * rotationMatrixAbs[ 1 ][ 2 ] + ob1.obb.halfSize.y *
    rotationMatrixAbs[ 0 ][ 2 ];
    halfSizeB = ob2.obb.halfSize.x * rotationMatrixAbs[ 2 ][ 1 ] + ob2.obb.halfSize.y *
    rotationMatrixAbs[ 2 ][ 0 ];
    t = translation.y * rotationMatrix[ 0 ][ 2 ] - translation.x * rotationMatrix[ 1 ][ 2 ];
    if ( Math.abs( t ) > halfSizeA + halfSizeB )
    {
    return false;
    }
    // no separating axis exists, so the two OBB don't intersect
    return true;
    
}