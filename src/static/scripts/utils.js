export function encodeUrlParam(param) {
    // param = param.toLocaleLowerCase();
    let replacements = { '/': '_barra_', ' ': '_espacio_', '.': '_punto_' };
    return param.replace(/[/ .]/g, match => replacements[match]);
}

// Variables globales
let scene, camera, camera2, renderer, renderer2, controls, loader;
const container = document.getElementById('principal_viewer');
const container2 = document.getElementById('second_viewer');
const FIXED_WIDTH = 1200;
const FIXED_HEIGHT = 1200;

function init() {
    // Configurar la escena
    scene = new THREE.Scene();
    camera = setupCamera(container, false);
    camera2 = setupCamera(container2, true);
    setupRenderer();
    setupLights();
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', () => {
        renderer.render(scene, camera);
        renderer2.render(scene, camera2);
    });
    loader = new THREE.STLLoader();
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const { width, height } = getContainerDimensions(container);
    renderer.setSize(width, height);
    updateCameraSize();
}

function syncCamera(sourceCamera, targetCamera) {
    targetCamera.position.copy(sourceCamera.position);
    targetCamera.rotation.copy(sourceCamera.rotation);
    targetCamera.zoom = sourceCamera.zoom; // Sincronizar el zoom
    targetCamera.updateProjectionMatrix(); // Asegúrate de actualizar la matriz de proyección
}

function updateCameraSize() {
    const { width, height } = getContainerDimensions(container);
    const aspect = width / height;

    camera.left = -camera.frustumSize * aspect / 2;
    camera.right = camera.frustumSize * aspect / 2;
    camera.top = camera.frustumSize / 2;
    camera.bottom = -camera.frustumSize / 2;
    camera.updateProjectionMatrix();

    // Sincroniza la cámara2 con la cámara principal
    synchronizeCameras(camera, camera2);
}

function setupCamera(container, isFixedSize) {
    const { width, height } = isFixedSize ? { width: FIXED_WIDTH, height: FIXED_HEIGHT } : getContainerDimensions(container);
    const aspect = width / height;
    const frustumSize = 20; // Tamaño del frustum en unidades del mundo

    const camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, // left
        frustumSize * aspect / 2,  // right
        frustumSize / 2,           // top
        -frustumSize / 2,          // bottom
        1,                         // near
        1000                       // far
    );

    camera.frustumSize = frustumSize; // Guarda el tamaño del frustum en la cámara

    return camera;
}
function setupRenderer() {
    const { width, height } = getContainerDimensions(container);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    renderer2 = new THREE.WebGLRenderer({ antialias: true });
    renderer2.setSize(FIXED_WIDTH, FIXED_HEIGHT);
    container2.style.width = `${FIXED_WIDTH}px`;
    container2.style.height = `${FIXED_HEIGHT}px`;
    container2.appendChild(renderer2.domElement);
}

function setupLights() {
    const lightPositions = [
        { x: 0, y: 2, z: 20 },
        { x: 0, y: 2, z: -20 },
        { x: -20, y: 2, z: 0 },
        { x: 20, y: 2, z: 0 }
    ];

    lightPositions.forEach(position => {
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(position.x, position.y, position.z);
        scene.add(light);
    });
}

function getContainerDimensions(container) {
    const style = window.getComputedStyle(container);
    const totalHeight = container.clientHeight;
    const totalWidth = container.clientWidth;
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const paddingLateral = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const freeHeight = totalHeight - paddingTop - paddingBottom - 1;
    const freeWidth = totalWidth - paddingLateral - 1;
    return { width: freeWidth, height: freeHeight };
}

export function load_model_visor(url) {
    return new Promise((resolve, reject) => {
        if (!scene) init();

        url = '/static/temp/files/ready/' + url;
        removeExistingModels();

        loader.load(url, function (geometry) {
            geometry.center();
            const mesh = createMesh(geometry);
            let measures = get_model_measures(mesh);
            measures['volume_ml'] = calculate_model_volume_ml(mesh);
            measures['has_base'] = hasBase(geometry);
            if (measures['has_base']) {
                const approximateBaseSize = calculateApproximateBaseDiameter(geometry);
                measures['base_size'] = getBaseSizeCategory(approximateBaseSize, measures['max_height_cm']);
            }

            scene.add(mesh);

            // Ajustar las cámaras
            adjustCameraOrthographic(mesh, camera, container);
            adjustCameraOrthographic(mesh, camera2, container2);
            resolve(measures);
        }, undefined, function (error) {
            reject(error);
        });

        animate();
    });
}

function removeExistingModels() {
    scene.children.forEach(child => {
        if (child.isMesh) {
            scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }
    });
}

function createMesh(geometry) {
    const material = new THREE.MeshLambertMaterial({ color: 0x404040 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(0.1, 0.1, 0.1);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(-Math.PI / 2, 0, 0);
    return mesh;
}

function adjustCameraOrthographic(model, camera, container) {
    if (scene.children.length === 0) return; // No hay modelo en la escena

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const { width, height } = getContainerDimensions(container);
    const aspect = width / height;

    const frustumSize = maxDim * 1.5;

    camera.frustumSize = frustumSize;
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();

    const center = box.getCenter(new THREE.Vector3());
    camera.position.set(center.x, center.y, maxDim * 1.5);
    camera.lookAt(center);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update(); // Actualizar el control compartido

    // Renderizar las vistas
    renderer.render(scene, camera);
    renderer2.render(scene, camera2);

    // Sincronizar la cámara secundaria con la principal
    syncCamera(camera, camera2);
}

function synchronizeCameras(camera1, camera2) {
    // Sincroniza posición, rotación y frustumSize
    camera2.position.copy(camera1.position);
    camera2.rotation.copy(camera1.rotation);
    camera2.frustumSize = camera1.frustumSize; // Sincroniza el tamaño del frustum

    // Necesita actualizar la matriz de proyección de la cámara2
    camera2.left = -camera2.frustumSize * (camera2.aspect || 1) / 2;
    camera2.right = camera2.frustumSize * (camera2.aspect || 1) / 2;
    camera2.top = camera2.frustumSize / 2;
    camera2.bottom = -camera2.frustumSize / 2;
    camera2.updateProjectionMatrix();
}

// init();

function get_model_measures(model) {
    // Obtener el tamaño del modelo
    if (!(model instanceof THREE.Mesh)) {
        throw new Error('El objeto proporcionado no es una malla.');
    }

    // Obtener el tamaño del modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    // Convertir el alto a centímetros
    let list_axis = ['x', 'y', 'z'];
    let axis_name = {
        'x': 'max_width_cm',
        'y': 'max_depth_cm',
        'z': 'max_height_cm',
    }
    let measures = {};
    for (let axis of list_axis) {
        measures[axis_name[axis]] = parseFloat((size[axis] / 10).toFixed(2));
    }

    return measures
}

export function capitalize_first_letter(str) {
    if (!str) return ''; // Verifica que el string no esté vacío
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculate_model_volume_ml(model) {
    // Verificar si el objeto proporcionado es una malla
    // Verificar si el objeto proporcionado es una malla
    if (!(model instanceof THREE.Mesh)) {
        throw new Error('El objeto proporcionado no es una malla.');
    }

    // Obtener la geometría del modelo
    let geometry = model.geometry;

    // Calcular el volumen utilizando la geometría
    let volume_mm3 = 0;
    const pos = geometry.attributes.position.array;
    const index = geometry.index ? geometry.index.array : null;

    if (index) {
        for (let i = 0; i < index.length; i += 3) {
            const p0 = new THREE.Vector3().fromArray(pos, index[i] * 3);
            const p1 = new THREE.Vector3().fromArray(pos, index[i + 1] * 3);
            const p2 = new THREE.Vector3().fromArray(pos, index[i + 2] * 3);

            // Calcular el volumen del tetraedro
            volume_mm3 += p0.dot(p1.cross(p2)) / 6.0;
        }
    } else {
        // Si no hay índices, asumimos que los vértices están organizados en triángulos secuenciales
        for (let i = 0; i < pos.length; i += 9) {
            const p0 = new THREE.Vector3().fromArray(pos, i);
            const p1 = new THREE.Vector3().fromArray(pos, i + 3);
            const p2 = new THREE.Vector3().fromArray(pos, i + 6);

            // Calcular el volumen del tetraedro
            volume_mm3 += p0.dot(p1.cross(p2)) / 6.0;
        }
    }

    // Convertir el volumen a centímetros cúbicos (1 cm³ = 1 ml)
    const volume_ml = Math.abs(volume_mm3 / 1000);

    return parseFloat(volume_ml.toFixed(2));
}


function hasBase(geometry, threshold = 0.05, areaThreshold = 0.1) {
    const vertices = geometry.attributes.position.array;
    let minZ = Infinity;
    let maxZ = -Infinity;

    // Encontrar la altura mínima y máxima
    for (let i = 0; i < vertices.length; i += 3) {
        minZ = Math.min(minZ, vertices[i + 2]);
        maxZ = Math.max(maxZ, vertices[i + 2]);
    }

    const height = maxZ - minZ;
    let baseArea = 0;

    // Buscar planos en la parte inferior
    for (let i = 0; i < vertices.length; i += 9) {
        const z1 = vertices[i + 2];
        const z2 = vertices[i + 5];
        const z3 = vertices[i + 8];

        if (Math.abs(z1 - minZ) < threshold &&
            Math.abs(z2 - minZ) < threshold &&
            Math.abs(z3 - minZ) < threshold) {

            // Calcular el área del triángulo
            const ax = vertices[i], ay = vertices[i + 1], az = vertices[i + 2];
            const bx = vertices[i + 3], by = vertices[i + 4], bz = vertices[i + 5];
            const cx = vertices[i + 6], cy = vertices[i + 7], cz = vertices[i + 8];

            const ab = new THREE.Vector3(bx - ax, by - ay, bz - az);
            const ac = new THREE.Vector3(cx - ax, cy - ay, cz - az);
            const cross = new THREE.Vector3();
            cross.crossVectors(ab, ac);
            const triangleArea = 0.5 * cross.length();

            baseArea += triangleArea;
        }
    }

    const totalArea = geometry.boundingBox.max.x * geometry.boundingBox.max.y;

    // Verificar si el área de la base es suficiente
    return (baseArea / totalArea) > areaThreshold;
}

function calculateApproximateBaseDiameter(geometry, threshold = 0.05, unitScale = 1) {
    const vertices = geometry.attributes.position.array;
    let minZ = Infinity;

    // Encontrar la altura mínima
    for (let i = 0; i < vertices.length; i += 3) {
        minZ = Math.min(minZ, vertices[i + 2]);
    }

    let baseArea = 0;

    // Buscar triángulos en la parte inferior (cerca del plano de base)
    for (let i = 0; i < vertices.length; i += 9) {
        const z1 = vertices[i + 2];
        const z2 = vertices[i + 5];
        const z3 = vertices[i + 8];

        if (Math.abs(z1 - minZ) < threshold &&
            Math.abs(z2 - minZ) < threshold &&
            Math.abs(z3 - minZ) < threshold) {

            // Calcular el área del triángulo
            const ax = vertices[i], ay = vertices[i + 1], az = vertices[i + 2];
            const bx = vertices[i + 3], by = vertices[i + 4], bz = vertices[i + 5];
            const cx = vertices[i + 6], cy = vertices[i + 7], cz = vertices[i + 8];

            const ab = new THREE.Vector3(bx - ax, by - ay, bz - az);
            const ac = new THREE.Vector3(cx - ax, cy - ay, cz - az);
            const cross = new THREE.Vector3();
            cross.crossVectors(ab, ac);
            const triangleArea = 0.5 * cross.length();

            baseArea += triangleArea;
        }
    }

    // Convertir el área a centímetros cuadrados y calcular el diámetro de la base en centímetros
    const radius = Math.sqrt(baseArea / Math.PI) * unitScale / 10; // Ajusta el factor de escala según la unidad usada en la geometría
    const diameter = 2 * radius;

    console.log(`El diámetro aproximado de la base es: ${diameter.toFixed(2)} cm`);
    return diameter;
}

function getBaseSizeCategory(baseSize, height) {
    const baseSizes = {
        "tiny": 1.5,
        "medium": 2.54,
        "large": 5.08,
        "huge": 7.62,
        "gargantuan": 10.16
    };
    let closestCategory = null;
    let closestDifference = Infinity;

    for (const [category, size] of Object.entries(baseSizes)) {
        const difference = Math.abs(baseSize - size);
        if (difference < closestDifference) {
            closestDifference = difference;
            closestCategory = category;
        }
    }
    if (closestCategory === 'medium' && height < 2.1) {
        closestCategory = 'small';
    }

    return closestCategory;
}

const canvas = new fabric.Canvas('label_canvas');
let rect, isDrawing = false, shiftPressed = false;

export function save_capture() {
    const canvas = renderer2.domElement;
    return canvas.toDataURL('image/png');
}