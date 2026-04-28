(() => {
const BABYLON = globalThis.BABYLON;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

function createWeaponParts(scene, root, accentColor) {
    const matteMaterial = new BABYLON.StandardMaterial("weapon-matte-material", scene);
    matteMaterial.diffuseColor = BABYLON.Color3.FromHexString("#212833");
    matteMaterial.specularColor = BABYLON.Color3.Black();

    const metalMaterial = new BABYLON.StandardMaterial("weapon-metal-material", scene);
    metalMaterial.diffuseColor = BABYLON.Color3.FromHexString("#606b78");
    metalMaterial.specularColor = BABYLON.Color3.FromHexString("#202733");

    const accentMaterial = new BABYLON.StandardMaterial("weapon-accent-material", scene);
    accentMaterial.emissiveColor = BABYLON.Color3.FromHexString(accentColor);
    accentMaterial.diffuseColor = BABYLON.Color3.FromHexString(accentColor);

    const grip = BABYLON.MeshBuilder.CreateBox("weapon-grip", { width: 0.18, height: 0.34, depth: 0.14 }, scene);
    grip.parent = root;
    grip.position = new BABYLON.Vector3(0.05, -0.05, 0.28);
    grip.rotation.x = Math.PI * 0.1;
    grip.material = matteMaterial;
    grip.isPickable = false;

    const body = BABYLON.MeshBuilder.CreateBox("weapon-body", { width: 0.24, height: 0.2, depth: 0.7 }, scene);
    body.parent = root;
    body.position = new BABYLON.Vector3(0, 0, 0.35);
    body.material = matteMaterial;
    body.isPickable = false;

    const barrel = BABYLON.MeshBuilder.CreateBox("weapon-barrel", { width: 0.1, height: 0.08, depth: 0.8 }, scene);
    barrel.parent = root;
    barrel.position = new BABYLON.Vector3(0, 0.03, 0.78);
    barrel.material = metalMaterial;
    barrel.isPickable = false;

    const sight = BABYLON.MeshBuilder.CreateBox("weapon-sight", { width: 0.02, height: 0.04, depth: 0.02 }, scene);
    sight.parent = root;
    sight.position = new BABYLON.Vector3(0, 0.11, 1.04);
    sight.material = accentMaterial;
    sight.isPickable = false;

    const muzzle = new BABYLON.TransformNode("weapon-muzzle", scene);
    muzzle.parent = root;
    muzzle.position = new BABYLON.Vector3(0, 0.03, 1.2);

    return {
        muzzle,
        meshes: [grip, body, barrel, sight],
        materials: [matteMaterial, metalMaterial, accentMaterial]
    };
}

app.createWeaponSystem = function createWeaponSystem({ scene, camera, accentColor = "#f7b733" }) {
    const root = new BABYLON.TransformNode("weapon-root", scene);
    root.parent = camera;
    root.position = new BABYLON.Vector3(0.48, -0.38, 1.08);
    root.rotation = new BABYLON.Vector3(0, 0, 0);

    const parts = createWeaponParts(scene, root, accentColor);
    const tracerMaterial = new BABYLON.StandardMaterial("weapon-tracer-material", scene);
    tracerMaterial.emissiveColor = BABYLON.Color3.FromHexString("#ffd34d");
    tracerMaterial.diffuseColor = BABYLON.Color3.FromHexString("#ffd34d");
    tracerMaterial.specularColor = BABYLON.Color3.Black();

    const defaultFov = camera.fov;
    const zoomFov = 0.4;
    const tracers = [];
    let recoil = 0;

    function fire(targetPoint, onArrival) {
        camera.computeWorldMatrix(true);
        root.computeWorldMatrix(true);
        parts.muzzle.computeWorldMatrix(true);

        const tracerDepth = 0.55;
        const startPoint = parts.muzzle.getAbsolutePosition().clone();
        const direction = targetPoint.subtract(startPoint);
        const distance = direction.length();

        if (distance <= 0.001) {
            return;
        }

        direction.normalize();

        const tracer = BABYLON.MeshBuilder.CreateBox(
            `weapon-tracer-${tracers.length}`,
            { width: 0.08, height: 0.08, depth: tracerDepth },
            scene
        );
        tracer.material = tracerMaterial;
        tracer.isPickable = false;
        tracer.position.copyFrom(startPoint.add(direction.scale(tracerDepth * 0.5)));
        tracer.lookAt(targetPoint);

        tracers.push({
            mesh: tracer,
            direction,
            distance,
            travelled: 0,
            speed: 120,
            onArrival
        });

        recoil = 1;
    }

    function update(deltaSeconds) {
        recoil = BABYLON.Scalar.Lerp(recoil, 0, Math.min(1, deltaSeconds * 12));
        root.position.z = 1.08 - recoil * 0.16;
        root.position.y = -0.38 - recoil * 0.03;
        root.rotation.x = recoil * 0.22;

        for (let index = tracers.length - 1; index >= 0; index -= 1) {
            const tracer = tracers[index];
            const nextStep = tracer.speed * deltaSeconds;
            tracer.travelled += nextStep;

            if (tracer.travelled >= tracer.distance) {
                tracer.mesh.dispose();
                tracer.onArrival?.();
                tracers.splice(index, 1);
                continue;
            }

            tracer.mesh.position.addInPlace(tracer.direction.scale(nextStep));
        }
    }

    return {
        fire,
        update,
        setZoom(enabled) {
            camera.fov = enabled ? zoomFov : defaultFov;
        },
        dispose() {
            tracers.forEach((tracer) => tracer.mesh.dispose());
            parts.meshes.forEach((mesh) => mesh.dispose());
            parts.materials.forEach((material) => material.dispose());
            tracerMaterial.dispose();
            root.dispose();
        }
    };
};
})();