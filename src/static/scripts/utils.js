export function encodeUrlParam(param) {
    // param = param.toLocaleLowerCase();
    let replacements = { '/': '_barra_', ' ': '_espacio_', '.': '_punto_' };
    return param.replace(/[/ .]/g, match => replacements[match]);
}

// Variables globales
let scene, camera, renderer, controls, loader;
const container = document.getElementById('model_viewer-div');

// Obtén el estilo calculado del contenedor
const style = window.getComputedStyle(container);

// Obtén el alto total incluyendo padding
const totalHeight = container.clientHeight;
const totalWidth = container.clientWidth;

// Obtén el padding superior e inferior
const paddingTop = parseFloat(style.paddingTop);
const paddingBottom = parseFloat(style.paddingBottom);

const paddingLateral = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);


// Calcula el alto libre después de restar el padding
const freeHeight = totalHeight - paddingTop - paddingBottom;
const freeWidth = totalWidth - paddingLateral;

function init() {
    scene = new THREE.Scene();

    // Crear la cámara ortográfica
    const containerWidth = freeWidth;
    const containerHeight = freeHeight;
    const aspect = containerWidth / containerHeight;
    const frustumSize = 20; // Tamaño del frustum en unidades del mundo

    camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, // left
        frustumSize * aspect / 2,  // right
        frustumSize / 2,           // top
        -frustumSize / 2,          // bottom
        1,                         // near
        1000                       // far
    );

    // Configurar el renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(freeWidth, freeHeight);
    container.appendChild(renderer.domElement);

    // Configurar luces
    const lightFront = new THREE.DirectionalLight(0xffffff, 1.5);
    lightFront.position.set(0, 2, 20);
    scene.add(lightFront);

    const lightBack = new THREE.DirectionalLight(0xffffff, 1.5);
    lightBack.position.set(0, 2, -20);
    scene.add(lightBack);

    const lightLeft = new THREE.DirectionalLight(0xffffff, 1.5);
    lightLeft.position.set(-20, 2, 0);
    scene.add(lightLeft);

    const lightRight = new THREE.DirectionalLight(0xffffff, 1.5);
    lightRight.position.set(20, 2, 0);
    scene.add(lightRight);

    // Añadir control de órbita
    controls = new THREE.OrbitControls(camera, renderer.domElement);

    // Inicializar el cargador STL
    loader = new THREE.STLLoader();
}

export function load_model_visor(url) {
    return new Promise((resolve, reject) => {
        if (!scene) {
            init();
        }

        // Limpiar la escena
        url = '/static/temp/files/' + url;
        scene.children.forEach((child) => {
            if (child.isMesh) {
                scene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        });

        // Cargar el archivo STL
        loader.load(url, function (geometry) {
            geometry.center(); // Centrar el modelo
            let material = new THREE.MeshLambertMaterial({ 
                color: 0x404040 // Gris oscuro
            });
            
            let mesh = new THREE.Mesh(geometry, material);
            let height_cm = get_model_height_cm(mesh);
            mesh.scale.set(0.1, 0.1, 0.1); // Ajustar la escala del modelo si es necesario
            mesh.position.set(0, 0, 0);
            mesh.rotation.set(-Math.PI / 2, 0, 0); // Rotación en radianes

            scene.add(mesh);

            // Ajustar la cámara
            adjustCameraOrthographic(mesh);

            // Resuelve la promesa con el valor de height_cm
            resolve(height_cm);
        }, undefined, function (error) {
            // Rechaza la promesa en caso de error
            reject(error);
        });

        animate();
    });
}

function adjustCameraOrthographic(model) {
    // Obtener el tamaño del modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Obtener las dimensiones del contenedor
    const container = document.getElementById('model_viewer-div');
    const containerWidth = freeWidth;
    const containerHeight = freeHeight;
    const aspect = containerWidth / containerHeight;

    // Calcular el tamaño del frustum en función del tamaño del modelo
    const frustumSize = maxDim * 1.5; // Ajustar el factor según sea necesario

    // Ajustar la cámara ortográfica
    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();

    // Posicionar la cámara
    const center = box.getCenter(new THREE.Vector3());
    camera.position.set(center.x, center.y, 20); // Ajustar la distancia según sea necesario
    camera.lookAt(center);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function get_model_height_cm(model) {
    // Obtener el tamaño del modelo
    if (!(model instanceof THREE.Mesh)) {
        throw new Error('El objeto proporcionado no es una malla.');
    }

    // Obtener el tamaño del modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // Convertir el alto a centímetros
    const height_mm = size.z;
    const height_cm = height_mm / 10 // Convertir metros a centímetros

    return parseFloat(height_cm.toFixed(2));
}

export function capitalize_first_letter(str) {
    if (!str) return ''; // Verifica que el string no esté vacío
    return str.charAt(0).toUpperCase() + str.slice(1);
}