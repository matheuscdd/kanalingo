(() => {
const BABYLON = globalThis.BABYLON;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

const LABEL_TEXTURE_SIZE = 512;
const WRAPPED_BODY_TILE_COUNT = 2;

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function finalizeLabelTexture(texture) {
    texture.update();
    texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

    return texture;
}

function drawLabelFace(context, tileX, tileY, value, appearance, fillColor) {
    context.save();
    context.clearRect(tileX, tileY, LABEL_TEXTURE_SIZE, LABEL_TEXTURE_SIZE);
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
    context.fillStyle = appearance.labelBackground ?? fillColor;
    context.fillRect(tileX, tileY, LABEL_TEXTURE_SIZE, LABEL_TEXTURE_SIZE);

    context.strokeStyle = appearance.frameColor ?? "#1f2937";
    context.lineWidth = 20;
    context.strokeRect(tileX + 18, tileY + 18, LABEL_TEXTURE_SIZE - 36, LABEL_TEXTURE_SIZE - 36);

    if (value !== null && value !== undefined) {
        context.fillStyle = appearance.textColor ?? "#ffffff";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = appearance.labelFont;
        context.shadowColor = "rgba(0, 0, 0, 0.32)";
        context.shadowBlur = 12;
        context.shadowOffsetX = 8;
        context.shadowOffsetY = 8;
        context.fillText(String(value), tileX + (LABEL_TEXTURE_SIZE / 2), tileY + 278);
    }

    context.restore();
}

function createLabelTexture(scene, value, appearance, fillColor) {
    const texture = new BABYLON.DynamicTexture(
        `target-label-${value}-${Math.random().toString(16).slice(2)}`,
        { width: LABEL_TEXTURE_SIZE, height: LABEL_TEXTURE_SIZE },
        scene,
        false
    );

    const context = texture.getContext();
    drawLabelFace(context, 0, 0, value, appearance, fillColor);

    return finalizeLabelTexture(texture);
}

function createWrappedBodyTexture(scene, value, appearance, fillColor) {
    const texture = new BABYLON.DynamicTexture(
        `target-body-label-${value}-${Math.random().toString(16).slice(2)}`,
        { width: LABEL_TEXTURE_SIZE * WRAPPED_BODY_TILE_COUNT, height: LABEL_TEXTURE_SIZE },
        scene,
        false
    );

    const context = texture.getContext();
    drawLabelFace(context, 0, 0, value, appearance, fillColor);
    drawLabelFace(context, LABEL_TEXTURE_SIZE, 0, null, appearance, fillColor);

    return finalizeLabelTexture(texture);
}

function createWrappedBodyFaceUV() {
    return [
        new BABYLON.Vector4(0, 0, 0.5, 1),
        new BABYLON.Vector4(0, 0, 0.5, 1),
        new BABYLON.Vector4(0, 0, 0.5, 1),
        new BABYLON.Vector4(0, 0, 0.5, 1),
        new BABYLON.Vector4(0, 0, 0.5, 1),
        new BABYLON.Vector4(0.5, 0, 1, 1)
    ];
}

function createTargetVisual(scene, targetId, value, appearance) {
    const root = new BABYLON.TransformNode(`target-root-${targetId}`, scene);
    const bodyColor = appearance.palette[Math.floor(Math.random() * appearance.palette.length)];
    const usesWrappedBodyTexture = Boolean(appearance.applyTextureToBody);

    const bodyMaterial = new BABYLON.StandardMaterial(`target-body-material-${targetId}`, scene);
    bodyMaterial.diffuseColor = BABYLON.Color3.FromHexString(bodyColor);
    bodyMaterial.specularColor = BABYLON.Color3.Black();

    const body = BABYLON.MeshBuilder.CreateBox(
        `target-body-${targetId}`,
        {
            width: appearance.width,
            height: appearance.height,
            depth: appearance.depth,
            ...(usesWrappedBodyTexture
                ? {
                    faceUV: createWrappedBodyFaceUV(),
                    wrap: true,
                    topBaseAt: 1,
                    bottomBaseAt: 1
                }
                : {})
        },
        scene
    );
    body.parent = root;
    body.material = bodyMaterial;

    const labelTexture = createLabelTexture(scene, value, appearance, bodyColor);
    const bodyTexture = usesWrappedBodyTexture
        ? createWrappedBodyTexture(scene, value, appearance, bodyColor)
        : null;
    const labelMaterial = new BABYLON.StandardMaterial(`target-label-material-${targetId}`, scene);
    labelMaterial.diffuseTexture = labelTexture;
    labelMaterial.emissiveTexture = labelTexture;
    labelMaterial.emissiveColor = BABYLON.Color3.White();
    labelMaterial.specularColor = BABYLON.Color3.Black();
    labelMaterial.disableLighting = true;
    labelMaterial.backFaceCulling = false;

    const label = BABYLON.MeshBuilder.CreatePlane(
        `target-label-${targetId}`,
        {
            width: appearance.width * 0.88,
            height: appearance.height * 0.88,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        },
        scene
    );
    label.parent = root;
    label.position = new BABYLON.Vector3(0, 0.03, -(appearance.depth * 0.51));
    label.material = labelMaterial;

    if (usesWrappedBodyTexture) {
        bodyMaterial.diffuseTexture = bodyTexture;
        bodyMaterial.emissiveTexture = bodyTexture;
        bodyMaterial.diffuseColor = BABYLON.Color3.White();
        label.setEnabled(false);
        label.isPickable = false;
    }

    if (appearance.labelTilt) {
        label.rotation.x = appearance.labelTilt;
    }

    body.metadata = { targetId };
    label.metadata = { targetId };

    const decoration = appearance.decorateTarget?.({
        scene,
        root,
        body,
        label,
        targetId,
        value,
        bodyColor,
        bodyMaterial,
        labelMaterial
    }) ?? {};

    return {
        root,
        body,
        label,
        bodyMaterial,
        labelMaterial,
        labelTexture,
        bodyTexture,
        extraMeshes: decoration.meshes ?? [],
        extraMaterials: decoration.materials ?? [],
        extraTextures: bodyTexture
            ? [...(decoration.textures ?? []), bodyTexture]
            : (decoration.textures ?? [])
    };
}

function setTargetHitTint(target, isCorrect) {
    const tint = BABYLON.Color3.FromHexString(isCorrect ? "#66d17a" : "#f14a61");
    target.bodyMaterial.emissiveColor = tint.scale(0.35);
    target.labelMaterial.emissiveColor = tint.scale(0.8);
}

function updatePopTargetMotion(target, appearance, removeTarget, deltaSeconds) {
    if (target.state === "RISING") {
        target.root.position.y += appearance.riseSpeed * deltaSeconds;
        if (target.root.position.y >= target.slot.visibleY) {
            target.root.position.y = target.slot.visibleY;
            target.state = "VISIBLE";
        }
        return;
    }

    if (target.state === "VISIBLE") {
        if (!target.pendingHit) {
            target.timer -= deltaSeconds;
        }

        if (target.timer <= 0 && !target.pendingHit) {
            target.state = "HIDING";
        }
        return;
    }

    if (target.state === "HIDING") {
        target.root.position.y -= appearance.hideSpeed * deltaSeconds;
        if (target.root.position.y <= target.slot.hiddenY) {
            removeTarget(target);
        }
        return;
    }

    if (target.state === "FALLING") {
        target.root.position.y -= appearance.fallSpeed * deltaSeconds;
        target.root.rotation.x += 4.2 * deltaSeconds;
        target.root.rotation.z += 3.7 * deltaSeconds;

        if (target.root.position.y <= target.slot.hiddenY - 2.5) {
            removeTarget(target);
        }
    }
}

function updateRiseOnlyTargetMotion(target, appearance, removeTarget, deltaSeconds) {
    if (target.state === "RISING") {
        const riseSpeed = target.slot.speed ?? appearance.riseSpeed;
        target.root.position.y += riseSpeed * deltaSeconds;

        if (target.slot.driftX) {
            target.root.position.x += target.slot.driftX * deltaSeconds;
        }

        if (target.slot.driftZ) {
            target.root.position.z += target.slot.driftZ * deltaSeconds;
        }

        if (target.root.position.y >= (target.slot.despawnY ?? target.slot.visibleY)) {
            removeTarget(target);
        }
        return;
    }

    if (target.state === "FALLING") {
        target.root.position.y -= appearance.fallSpeed * deltaSeconds;
        target.root.rotation.x += 4.2 * deltaSeconds;
        target.root.rotation.z += 3.7 * deltaSeconds;

        if (target.root.position.y <= target.slot.hiddenY - 2.5) {
            removeTarget(target);
        }
    }
}

function pickNextValue(targets, range, uniqueActiveValues) {
    if (!uniqueActiveValues) {
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }

    const activeValues = new Set(targets.map((target) => target.value));
    const availableValues = [];

    for (let value = range.min; value <= range.max; value += 1) {
        if (!activeValues.has(value)) {
            availableValues.push(value);
        }
    }

    if (availableValues.length === 0) {
        return null;
    }

    return availableValues[Math.floor(Math.random() * availableValues.length)];
}

app.createTargetSystem = function createTargetSystem({
    scene,
    layout,
    appearance,
    maxTargets = 4,
    range = { min: 1, max: 30 },
    behavior = {}
}) {
    const slots = layout.map((slot, slotIndex) => ({ ...slot, id: slotIndex, inUse: false }));
    const targets = [];
    let nextTargetId = 0;
    let spawnCooldown = randomBetween(0.8, 1.8);
    const motionMode = behavior.motionMode ?? "pop";
    const uniqueActiveValues = Boolean(behavior.uniqueActiveValues);

    function removeTarget(target) {
        target.slot.inUse = false;
        target.labelTexture.dispose();
        target.extraTextures?.forEach((texture) => texture.dispose());
        target.extraMaterials?.forEach((material) => material.dispose());
        target.extraMeshes?.forEach((mesh) => mesh.dispose());
        target.body.dispose();
        target.label.dispose();
        target.bodyMaterial.dispose();
        target.labelMaterial.dispose();
        target.root.dispose();

        const index = targets.indexOf(target);
        if (index >= 0) {
            targets.splice(index, 1);
        }
    }

    function spawnTarget() {
        if (targets.length >= maxTargets) {
            return;
        }

        const availableSlots = slots.filter((slot) => !slot.inUse);

        if (availableSlots.length === 0) {
            return;
        }

        const slot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        const value = pickNextValue(targets, range, uniqueActiveValues);

        if (value === null) {
            return;
        }

        const visual = createTargetVisual(scene, nextTargetId, value, appearance);

        visual.root.position = new BABYLON.Vector3(slot.x, slot.hiddenY, slot.z);
        slot.inUse = true;

        targets.push({
            id: nextTargetId,
            value,
            slot,
            state: "RISING",
            timer: randomBetween(2.3, 4.6),
            pendingHit: false,
            resolved: false,
            ...visual
        });

        nextTargetId += 1;
    }

    return {
        update(deltaSeconds, timeLeftSeconds) {
            for (let index = targets.length - 1; index >= 0; index -= 1) {
                if (motionMode === "rise-only") {
                    updateRiseOnlyTargetMotion(targets[index], appearance, removeTarget, deltaSeconds);
                } else {
                    updatePopTargetMotion(targets[index], appearance, removeTarget, deltaSeconds);
                }
            }

            spawnCooldown -= deltaSeconds;

            if (spawnCooldown > 0) {
                return;
            }

            spawnTarget();
            const lateRoundBoost = BABYLON.Scalar.Clamp(1 - timeLeftSeconds / 60, 0, 0.45);
            spawnCooldown = randomBetween(1.1, 2.2 - lateRoundBoost);
        },
        isPickableMesh(mesh) {
            return Boolean(mesh?.metadata?.targetId !== undefined);
        },
        getTargetFromMesh(mesh) {
            let currentNode = mesh;

            while (currentNode) {
                if (currentNode.metadata?.targetId !== undefined) {
                    return targets.find((target) => target.id === currentNode.metadata.targetId) ?? null;
                }

                currentNode = currentNode.parent;
            }

            return null;
        },
        markPendingHit(target) {
            if (!target || target.pendingHit || target.resolved) {
                return false;
            }

            if (target.state !== "VISIBLE" && target.state !== "RISING") {
                return false;
            }

            target.pendingHit = true;
            return true;
        },
        canResolveHit(target) {
            return Boolean(target && !target.resolved && target.pendingHit);
        },
        resolveHit(target, isCorrect) {
            if (!this.canResolveHit(target)) {
                return false;
            }

            target.resolved = true;
            target.pendingHit = false;
            target.state = "FALLING";
            setTargetHitTint(target, isCorrect);
            return true;
        },
        dispose() {
            while (targets.length > 0) {
                removeTarget(targets[0]);
            }
        }
    };
};
})();