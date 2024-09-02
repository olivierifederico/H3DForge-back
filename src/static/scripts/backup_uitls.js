let scene, camera, camera2, renderer, renderer2, controls, loader;
const container = document.getElementById('model_viewer-div');
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
    const { width, height } = getContainerDimensions();
    renderer.setSize(width, height);
    updateCameraSize();
}

function updateCameraSize() {
    const { width, height } = getContainerDimensions();
    const aspect = width / height;

    // Actualiza el frustum de la cámara basado en el tamaño del contenedor
    camera.left = -camera.frustumSize * aspect / 2;
    camera.right = camera.frustumSize * aspect / 2;
    camera.top = camera.frustumSize / 2;
    camera.bottom = -camera.frustumSize / 2;
    camera.updateProjectionMatrix();
}

function setupCamera(container, isFixedSize) {
    const { width, height } = isFixedSize ? { width: FIXED_WIDTH, height: FIXED_HEIGHT } : getContainerDimensions(container);
    const aspect = width / height;
    const frustumSize = 20; // Tamaño del frustum en unidades del mundo

    return new THREE.OrthographicCamera(
        -frustumSize * aspect / 2, // left
        frustumSize * aspect / 2,  // right
        frustumSize / 2,           // top
        -frustumSize / 2,          // bottom
        1,                         // near
        1000                       // far
    );
}

function setupRenderer() {
    const { width, height } = getContainerDimensions();
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

function getContainerDimensions() {
    const style = window.getComputedStyle(container);
    const totalHeight = container.clientHeight;
    const totalWidth = container.clientWidth;
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const paddingLateral = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

    return {
        width: totalWidth - paddingLateral - 1,
        height: totalHeight - paddingTop - paddingBottom - 1
    };
}

export function load_model_visor(url) {
    return new Promise((resolve, reject) => {
        if (!scene) init();

        url = '/static/temp/files/' + url;
        removeExistingModels();

        loader.load(url, function (geometry) {
            geometry.center();
            const mesh = createMesh(geometry);
            let measures = get_model_measures(mesh);
            measures['volume_ml'] = calculate_model_volume_ml(mesh);
            measures['has_base'] = hasBase(geometry);
            if (measures['has_base']) {
                const approximateBaseSize = calculateApproximateBaseDiameter(geometry);
                console.log(approximateBaseSize);
                measures['base_size'] = getBaseSizeCategory(approximateBaseSize, measures['max_height_cm']);
            }

            scene.add(mesh);
            adjustCameraOrthographic(mesh);
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

function adjustCameraOrthographic(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const { width, height } = getContainerDimensions();
    const aspect = width / height;

    // Ajusta el tamaño del frustum para que el modelo quepa correctamente
    const frustumSize = maxDim * 1.5;

    camera.frustumSize = frustumSize; // Guardar el tamaño del frustum en la cámara

    camera.left = -frustumSize * aspect / 2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = -frustumSize / 2;
    camera.updateProjectionMatrix();

    const center = box.getCenter(new THREE.Vector3());
    camera.position.set(center.x, center.y, maxDim * 1.5); // Ajusta la distancia según el tamaño del modelo
    camera.lookAt(center);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    renderer2.render(scene, camera2);
}