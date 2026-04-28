(() => {
const BABYLON = globalThis.BABYLON;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

const LABEL_TEXTURE_SIZE = 512;
const WRAPPED_BODY_TILE_COUNT = 2;

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

const LABEL_PADDING = 48;
const LABEL_LINE_HEIGHT_RATIO = 1.4;

function measureWrappedLines(context, text, maxWidth) {
    const words = String(text).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [String(text)];
    const lines = [];
    let current = words[0];
    for (let i = 1; i < words.length; i += 1) {
        const test = current + " " + words[i];
        if (context.measureText(test).width > maxWidth) {
            lines.push(current);
            current = words[i];
        } else {
            current = test;
        }
    }
    lines.push(current);
    return lines;
}

function computeFontAndLines(context, text, baseFont, usableWidth, usableHeight) {
    const fontMatch = baseFont.match(/(\d+)px/);
    if (!fontMatch) return { resolvedFont: baseFont, lines: [String(text)], fontSize: 16 };
    const maxFontSize = parseInt(fontMatch[1], 10);
    for (let fontSize = maxFontSize; fontSize >= 14; fontSize = Math.floor(fontSize * 0.76)) {
        const resolvedFont = baseFont.replace(/(\d+)px/, fontSize + "px");
        context.font = resolvedFont;
        const lines = measureWrappedLines(context, text, usableWidth);
        if (lines.length * fontSize * LABEL_LINE_HEIGHT_RATIO <= usableHeight) {
            return { resolvedFont, lines, fontSize };
        }
    }
    const resolvedFont = baseFont.replace(/(\d+)px/, "14px");
    context.font = resolvedFont;
    return { resolvedFont, lines: measureWrappedLines(context, text, usableWidth), fontSize: 14 };
}

function computeSizeScale(text) {
    const len = String(text).length;
    if (len > 40) return 3.2;
    if (len > 20) return 2.4;
    if (len >= 10) return 1.9;
    if (len >= 5)  return 1.4;
    if (len >= 3)  return 1.2;
    return 1.0;
}

function pickNextOption(targets, options) {
    const correctOption = options.find((o) => o.isCorrect);
    const activeOptionIds = new Set(targets.map((t) => t.optionId).filter((id) => id != null));

    // Always guarantee the correct option is on screen
    if (correctOption && !activeOptionIds.has(correctOption.id)) {
        return correctOption;
    }

    // Correct option gets double weight so it appears more often
    const pool = [...options];
    if (correctOption) pool.push(correctOption);
    return pool[Math.floor(Math.random() * pool.length)];
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
        const usableWidth = LABEL_TEXTURE_SIZE - LABEL_PADDING * 2;
        const usableHeight = LABEL_TEXTURE_SIZE - LABEL_PADDING * 2;
        const { resolvedFont, lines, fontSize } = computeFontAndLines(
            context, String(value), appearance.labelFont, usableWidth, usableHeight
        );
        const lineHeight = fontSize * LABEL_LINE_HEIGHT_RATIO;
        const totalTextHeight = lines.length * lineHeight;
        const startY = tileY + (LABEL_TEXTURE_SIZE - totalTextHeight) / 2 + lineHeight * 0.5;
        const centerX = tileX + LABEL_TEXTURE_SIZE / 2;

        context.fillStyle = appearance.textColor ?? "#ffffff";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.font = resolvedFont;
        context.shadowColor = "rgba(0, 0, 0, 0.32)";
        context.shadowBlur = 12;
        context.shadowOffsetX = 8;
        context.shadowOffsetY = 8;

        lines.forEach((line, index) => {
            context.fillText(line, centerX, startY + index * lineHeight);
        });
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

function createTargetVisual(scene, targetId, value, appearance, sizeScale = 1) {
    const root = new BABYLON.TransformNode(`target-root-${targetId}`, scene);
    const bodyColor = appearance.palette[Math.floor(Math.random() * appearance.palette.length)];
    const usesWrappedBodyTexture = Boolean(appearance.applyTextureToBody);
    const w = appearance.width * sizeScale;
    const h = appearance.height * sizeScale;
    const d = appearance.depth * sizeScale;

    const bodyMaterial = new BABYLON.StandardMaterial(`target-body-material-${targetId}`, scene);
    bodyMaterial.diffuseColor = BABYLON.Color3.FromHexString(bodyColor);
    bodyMaterial.specularColor = BABYLON.Color3.Black();

    const body = BABYLON.MeshBuilder.CreateBox(
        `target-body-${targetId}`,
        {
            width: w,
            height: h,
            depth: d,
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
            width: w * 0.88,
            height: h * 0.88,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        },
        scene
    );
    label.parent = root;
    label.position = new BABYLON.Vector3(0, 0.03, -(d * 0.51));
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

    body.isPickable = true;
    body.metadata = { targetId };

    label.isPickable = false;

    const decoration = appearance.decorateTarget?.({
        scene,
        root,
        body,
        label,
        targetId,
        value,
        bodyColor,
        bodyMaterial,
        labelMaterial,
        sizeScale
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
    options = null,
    behavior = {}
}) {
    const slots = layout.map((slot, slotIndex) => ({ ...slot, id: slotIndex, inUse: false }));
    const targets = [];
    let currentOptions = options ? [...options] : null;
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

        let value;
        let optionId = null;

        if (currentOptions && currentOptions.length > 0) {
            const picked = pickNextOption(targets, currentOptions);
            value = picked.text;
            optionId = picked.id;
        } else {
            value = pickNextValue(targets, range, uniqueActiveValues);
            if (value === null) {
                return;
            }
        }

        const sizeScale = computeSizeScale(String(value));
        const visual = createTargetVisual(scene, nextTargetId, value, appearance, sizeScale);

        visual.root.position = new BABYLON.Vector3(slot.x, slot.hiddenY, slot.z);
        slot.inUse = true;

        targets.push({
            id: nextTargetId,
            value,
            optionId,
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
        setOptions(newOptions) {
            currentOptions = newOptions ? [...newOptions] : null;
        },
        dismissAll() {
            for (let index = targets.length - 1; index >= 0; index -= 1) {
                const target = targets[index];
                if (!target.resolved && target.state !== "FALLING") {
                    target.resolved = true;
                    target.pendingHit = false;
                    target.state = "FALLING";
                    setTargetHitTint(target, false);
                }
            }
        },
        dispose() {
            while (targets.length > 0) {
                removeTarget(targets[0]);
            }
        }
    };
};
})();