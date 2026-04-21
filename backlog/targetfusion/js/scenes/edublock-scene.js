(() => {
const BABYLON = globalThis.BABYLON;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

function createCheckerGroundMaterial(scene) {
    const texture = new BABYLON.DynamicTexture("edublock-ground-checker", { width: 1024, height: 1024 }, scene, false);
    const context = texture.getContext();
    const size = 128;

    for (let row = 0; row < 8; row += 1) {
        for (let column = 0; column < 8; column += 1) {
            context.fillStyle = (row + column) % 2 === 0 ? "#4caf50" : "#45a049";
            context.fillRect(column * size, row * size, size, size);
        }
    }

    texture.update();

    const material = new BABYLON.StandardMaterial("edublock-ground-material", scene);
    material.diffuseTexture = texture;
    material.specularColor = BABYLON.Color3.Black();
    material.diffuseTexture.uScale = 8;
    material.diffuseTexture.vScale = 8;
    return material;
}

function createColumn(scene, x, z, color) {
    const material = new BABYLON.StandardMaterial(`edublock-column-material-${x}-${z}`, scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    material.emissiveColor = BABYLON.Color3.FromHexString(color).scale(0.12);
    material.specularColor = BABYLON.Color3.Black();

    const column = BABYLON.MeshBuilder.CreateBox(`edublock-column-${x}-${z}`, { width: 1.1, height: 8, depth: 1.1 }, scene);
    column.position = new BABYLON.Vector3(x, 4, z);
    column.material = material;
}

function buildEnvironment(scene) {
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.012;
    scene.fogColor = BABYLON.Color3.FromHexString("#87ceeb");

    const hemi = new BABYLON.HemisphericLight("edublock-hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.84;

    const spot = new BABYLON.PointLight("edublock-spot", new BABYLON.Vector3(0, 8, 3), scene);
    spot.intensity = 0.56;

    const ground = BABYLON.MeshBuilder.CreateGround("edublock-ground", { width: 90, height: 90, subdivisions: 12 }, scene);
    ground.material = createCheckerGroundMaterial(scene);

    const backWallMaterial = new BABYLON.StandardMaterial("edublock-backwall-material", scene);
    backWallMaterial.diffuseColor = BABYLON.Color3.FromHexString("#263446");
    backWallMaterial.emissiveColor = BABYLON.Color3.FromHexString("#263446").scale(0.18);
    backWallMaterial.specularColor = BABYLON.Color3.Black();

    const backWall = BABYLON.MeshBuilder.CreateBox("edublock-backwall", { width: 18, height: 8.4, depth: 1 }, scene);
    backWall.position = new BABYLON.Vector3(0, 4.2, 28);
    backWall.material = backWallMaterial;

    createColumn(scene, -12.5, 23, "#ff8f3d");
    createColumn(scene, 12.5, 23, "#67d27a");
    createColumn(scene, -18, 14, "#5ac8fa");
    createColumn(scene, 18, 14, "#af52de");
}

function createBalloonDecoration({ scene, root, body, targetId }) {
    const stringMaterial = new BABYLON.StandardMaterial(`edublock-string-material-${targetId}`, scene);
    stringMaterial.diffuseColor = BABYLON.Color3.White();
    stringMaterial.specularColor = BABYLON.Color3.Black();

    const stringMesh = BABYLON.MeshBuilder.CreateCylinder(
        `edublock-string-${targetId}`,
        { height: 2.8, diameterTop: 0.04, diameterBottom: 0.04, tessellation: 6 },
        scene
    );
    stringMesh.parent = root;
    stringMesh.position = new BABYLON.Vector3(0, -2.1, 0);
    stringMesh.material = stringMaterial;
    stringMesh.isPickable = false;

    const knotMaterial = new BABYLON.StandardMaterial(`edublock-knot-material-${targetId}`, scene);
    knotMaterial.diffuseColor = BABYLON.Color3.FromHexString("#ffffff");
    knotMaterial.specularColor = BABYLON.Color3.Black();

    const knot = BABYLON.MeshBuilder.CreateSphere(`edublock-knot-${targetId}`, { diameter: 0.16, segments: 6 }, scene);
    knot.parent = root;
    knot.position = new BABYLON.Vector3(0, -0.75, 0.62);
    knot.material = knotMaterial;
    knot.isPickable = false;

    body.scaling = new BABYLON.Vector3(1, 1, 1);

    return {
        meshes: [stringMesh, knot],
        materials: [stringMaterial, knotMaterial]
    };
}

const edublockConfig = {
    id: "edublock",
    title: "EduBlock Arena",
    clearColor: "#87ceeb",
    camera: {
        position: new BABYLON.Vector3(0, 2.5, 0),
        target: new BABYLON.Vector3(0, 4.6, 18)
    },
    weaponAccent: "#66d17a",
    maxTargets: 5,
    targetRange: {
        min: 1,
        max: 9
    },
    targetBehavior: {
        motionMode: "rise-only",
        uniqueActiveValues: true
    },
    targetLayout: [
        { x: -14, hiddenY: -3.2, despawnY: 20.5, z: 10, speed: 4.1, driftX: 0.12 },
        { x: -9, hiddenY: -3.2, despawnY: 22.4, z: 16, speed: 4.8, driftZ: 0.09 },
        { x: -3, hiddenY: -3.2, despawnY: 21.7, z: 20, speed: 4.4, driftX: -0.08 },
        { x: 4, hiddenY: -3.2, despawnY: 23.1, z: 13, speed: 5.1, driftZ: -0.07 },
        { x: 10, hiddenY: -3.2, despawnY: 21.1, z: 18, speed: 4.5, driftX: 0.06 },
        { x: 14, hiddenY: -3.2, despawnY: 24.4, z: 23, speed: 5.2, driftX: -0.05 },
        { x: -12, hiddenY: -3.2, despawnY: 23.8, z: 24, speed: 4.9, driftZ: 0.05 },
        { x: 0, hiddenY: -3.2, despawnY: 25.2, z: 26, speed: 5.4 },
        { x: 8, hiddenY: -3.2, despawnY: 20.9, z: 24, speed: 4.3, driftX: 0.09 },
        { x: -6, hiddenY: -3.2, despawnY: 22.6, z: 12, speed: 4.7, driftZ: -0.08 }
    ],
    targetAppearance: {
        width: 1.6,
        height: 1.6,
        depth: 1.6,
        applyTextureToBody: true,
        palette: ["#ff6b45", "#ffd166", "#53d769", "#5ac8fa", "#af52de"],
        labelBackground: "#101720",
        frameColor: "#0b0f14",
        textColor: "#ffffff",
        riseSpeed: 5.2,
        hideSpeed: 4.8,
        labelFont: '700 112px "Press Start 2P"',
        decorateTarget: createBalloonDecoration,
        fallSpeed: 8
    },
    buildEnvironment
};

app.createEduBlockScene = function createEduBlockScene(context) {
    return app.createExperienceScene({ ...context, config: edublockConfig });
};
})();