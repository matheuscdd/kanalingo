(() => {
const BABYLON = globalThis.BABYLON;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

function createStripedCanopy(scene) {
    for (let index = 0; index < 12; index += 1) {
        const stripe = BABYLON.MeshBuilder.CreateBox(
            `fair-canopy-${index}`,
            { width: 1.1, height: 0.24, depth: 6.2 },
            scene
        );

        const stripeMaterial = new BABYLON.StandardMaterial(`fair-canopy-material-${index}`, scene);
        stripeMaterial.diffuseColor = BABYLON.Color3.FromHexString(index % 2 === 0 ? "#d5523f" : "#f6efe6");
        stripeMaterial.specularColor = BABYLON.Color3.Black();

        stripe.material = stripeMaterial;
        stripe.position = new BABYLON.Vector3(-6 + index * 1.08, 6.8, 12.2);
        stripe.rotation.x = -0.18;
    }
}

function createTree(scene, x, z) {
    const trunkMaterial = new BABYLON.StandardMaterial(`fair-trunk-${x}-${z}`, scene);
    trunkMaterial.diffuseColor = BABYLON.Color3.FromHexString("#5f452c");
    trunkMaterial.specularColor = BABYLON.Color3.Black();

    const crownMaterial = new BABYLON.StandardMaterial(`fair-crown-${x}-${z}`, scene);
    crownMaterial.diffuseColor = BABYLON.Color3.FromHexString("#3f7f39");
    crownMaterial.specularColor = BABYLON.Color3.Black();

    const trunk = BABYLON.MeshBuilder.CreateBox(`fair-trunk-mesh-${x}-${z}`, { width: 1, height: 3.2, depth: 1 }, scene);
    trunk.position = new BABYLON.Vector3(x, 1.6, z);
    trunk.material = trunkMaterial;

    const crown = BABYLON.MeshBuilder.CreateBox(`fair-crown-mesh-${x}-${z}`, { width: 3.4, height: 3.4, depth: 3.4 }, scene);
    crown.position = new BABYLON.Vector3(x, 4.2, z);
    crown.material = crownMaterial;
}

function buildEnvironment(scene) {
    const hemi = new BABYLON.HemisphericLight("fair-hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.96;

    const sun = new BABYLON.DirectionalLight("fair-sun", new BABYLON.Vector3(-0.35, -1, 0.45), scene);
    sun.position = new BABYLON.Vector3(10, 18, -12);
    sun.intensity = 0.68;

    const ground = BABYLON.MeshBuilder.CreateGround("fair-ground", { width: 80, height: 80 }, scene);
    const groundMaterial = new BABYLON.StandardMaterial("fair-ground-material", scene);
    groundMaterial.diffuseColor = BABYLON.Color3.FromHexString("#4f8e42");
    groundMaterial.specularColor = BABYLON.Color3.Black();
    ground.material = groundMaterial;

    const counterMaterial = new BABYLON.StandardMaterial("fair-counter-material", scene);
    counterMaterial.diffuseColor = BABYLON.Color3.FromHexString("#835533");
    counterMaterial.specularColor = BABYLON.Color3.Black();

    const counter = BABYLON.MeshBuilder.CreateBox("fair-counter", { width: 10, height: 1.4, depth: 1.8 }, scene);
    counter.position = new BABYLON.Vector3(0, 0.9, 8.6);
    counter.material = counterMaterial;

    const backWall = BABYLON.MeshBuilder.CreateBox("fair-backwall", { width: 14, height: 7.4, depth: 0.8 }, scene);
    backWall.position = new BABYLON.Vector3(0, 3.7, 17.8);
    backWall.material = counterMaterial;

    const shelfMaterial = new BABYLON.StandardMaterial("fair-shelf-material", scene);
    shelfMaterial.diffuseColor = BABYLON.Color3.FromHexString("#614126");
    shelfMaterial.specularColor = BABYLON.Color3.Black();

    const shelfBottom = BABYLON.MeshBuilder.CreateBox("fair-shelf-bottom", { width: 14, height: 0.24, depth: 1.2 }, scene);
    shelfBottom.position = new BABYLON.Vector3(0, 1.75, 14.4);
    shelfBottom.material = shelfMaterial;

    const shelfTop = BABYLON.MeshBuilder.CreateBox("fair-shelf-top", { width: 14, height: 0.24, depth: 1.2 }, scene);
    shelfTop.position = new BABYLON.Vector3(0, 3.25, 17.2);
    shelfTop.material = shelfMaterial;

    createStripedCanopy(scene);
    createTree(scene, -16, 6);
    createTree(scene, -22, -6);
    createTree(scene, 18, 4);
    createTree(scene, 24, -7);
}

const fairConfig = {
    id: "fair",
    title: "Feira Matemática",
    clearColor: "#83bfff",
    camera: {
        position: new BABYLON.Vector3(0, 2.5, 0),
        target: new BABYLON.Vector3(0, 2.8, 16)
    },
    weaponAccent: "#f7b733",
    maxTargets: 4,
    targetLayout: [
        { x: -5.8, hiddenY: 1.1, visibleY: 2.2, z: 14.1 },
        { x: -1.9, hiddenY: 1.1, visibleY: 2.2, z: 14.1 },
        { x: 1.9, hiddenY: 1.1, visibleY: 2.2, z: 14.1 },
        { x: 5.8, hiddenY: 1.1, visibleY: 2.2, z: 14.1 },
        { x: -3.9, hiddenY: 2.4, visibleY: 3.6, z: 17.1 },
        { x: 0, hiddenY: 2.4, visibleY: 3.6, z: 17.1 },
        { x: 3.9, hiddenY: 2.4, visibleY: 3.6, z: 17.1 }
    ],
    targetAppearance: {
        width: 1.05,
        height: 1.05,
        depth: 1.05,
        palette: ["#7c5732", "#93653a", "#9f7846"],
        labelBackground: "#ead7a1",
        frameColor: "#8f7441",
        textColor: "#1b1d21",
        labelFont: '700 210px "Chakra Petch"',
        riseSpeed: 4,
        hideSpeed: 4,
        fallSpeed: 8
    },
    buildEnvironment
};

app.createFairScene = function createFairScene(context) {
    return app.createExperienceScene({ ...context, config: fairConfig });
};
})();