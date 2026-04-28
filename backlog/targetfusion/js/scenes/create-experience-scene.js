(() => {
const BABYLON = globalThis.BABYLON;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});
const ROUND_DURATION_SECONDS = 60;
const HIT_SCORE = 10;
const MISS_SCORE = 5;

function getFallbackAimDistance(cameraPosition, targetLayout) {
    if (!Array.isArray(targetLayout) || targetLayout.length === 0) {
        return 18;
    }

    const distances = targetLayout
        .map((slot) => {
            const targetY = slot.visibleY ?? slot.despawnY ?? slot.hiddenY ?? cameraPosition.y;
            return BABYLON.Vector3.Distance(cameraPosition, new BABYLON.Vector3(slot.x ?? 0, targetY, slot.z ?? 18));
        })
        .sort((left, right) => left - right);

    return BABYLON.Scalar.Clamp(distances[Math.floor(distances.length / 2)] ?? 18, 18, 80);
}

function getMobileUiElements() {
    return {
        root: document.getElementById("mobile-controls"),
        lookZone: document.getElementById("mobile-look-zone"),
        lookStick: document.getElementById("mobile-look-stick"),
        shootButton: document.getElementById("mobile-shoot-button"),
        zoomButton: document.getElementById("mobile-zoom-button")
    };
}

app.createExperienceScene = function createExperienceScene({ engine, canvas, ui, appState, config, onPauseRequested, onRoundComplete }) {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color4.FromColor3(BABYLON.Color3.FromHexString(config.clearColor));

    const camera = new BABYLON.UniversalCamera(`${config.id}-camera`, config.camera.position.clone(), scene);
    camera.fov = 0.9;
    camera.minZ = 0.1;
    camera.setTarget(config.camera.target.clone());

    config.buildEnvironment(scene, camera);

    const audio = app.createAudioSystem();
    const isMCQ = Array.isArray(config.targetOptions);

    const targets = app.createTargetSystem({
        scene,
        layout: config.targetLayout,
        appearance: config.targetAppearance,
        maxTargets: config.maxTargets,
        range: config.targetRange ?? { min: 1, max: 30 },
        options: isMCQ ? config.targetOptions : null,
        behavior: config.targetBehavior
    });

    const rules = isMCQ
        ? app.createMCQRulesEngine(app.mockQuestions, {
            onQuestionChange(question) {
                ui.setRule(question.text);
                targets.setOptions(question.options);
            }
          })
        : app.createRulesEngine({
            onQuestionChange(question) {
                ui.setRule(question.text);
            }
          });

    const weapon = app.createWeaponSystem({ scene, camera, accentColor: config.weaponAccent });

    let roundComplete = false;
    let score = 0;
    let hits = 0;
    let shots = 0;
    let timeLeft = ROUND_DURATION_SECONDS;
    const fallbackAimDistance = getFallbackAimDistance(config.camera.position, config.targetLayout);

    ui.setModeLabel(config.title);
    ui.setScore(score);
    ui.setTimer(timeLeft);
    rules.reset();

    const input = app.createInputSystem({
        canvas,
        camera,
        mobileUi: getMobileUiElements(),
        onShoot() {
            if (roundComplete || appState.paused) {
                return;
            }

            shots += 1;
            audio.play("shoot");

            const centerX = engine.getRenderWidth() / 2;
            const centerY = engine.getRenderHeight() / 2;

            const pick = scene.pick(
                centerX,
                centerY,
                (mesh) => targets.isPickableMesh(mesh),
                false,
                camera
            );

            const worldPick = scene.pick(
                centerX,
                centerY,
                (mesh) => Boolean(mesh?.isPickable),
                false,
                camera
            );

            const forwardRay = camera.getForwardRay(fallbackAimDistance);
            let targetPoint = forwardRay.origin.add(forwardRay.direction.scale(fallbackAimDistance));
            let pickedTarget = null;

            if (worldPick?.hit && worldPick.pickedPoint && worldPick.distance > 4) {
                targetPoint = worldPick.pickedPoint.clone();
            }

            if (pick?.hit && pick.pickedPoint) {
                targetPoint = pick.pickedPoint.clone();
                const maybeTarget = targets.getTargetFromMesh(pick.pickedMesh);
                if (targets.markPendingHit(maybeTarget)) {
                    pickedTarget = maybeTarget;
                }
            }

            weapon.fire(targetPoint, () => {
                if (!pickedTarget || !targets.canResolveHit(pickedTarget)) {
                    return;
                }

                const isCorrect = isMCQ
                    ? rules.isCorrect(pickedTarget.optionId)
                    : rules.isCorrect(pickedTarget.value);

                if (!targets.resolveHit(pickedTarget, isCorrect)) {
                    return;
                }

                if (isCorrect) {
                    score += HIT_SCORE;
                    hits += 1;
                    ui.showFeedback(`+${HIT_SCORE}`, "positive");
                    ui.flashScreen("positive");
                    audio.play("hit");
                } else {
                    score -= MISS_SCORE;
                    ui.showFeedback(`-${MISS_SCORE}`, "negative");
                    ui.flashScreen("negative");
                    audio.play("wrong");
                }

                ui.setScore(score);

                if (isMCQ) {
                    targets.dismissAll();
                    const hasMore = rules.nextQuestion();
                    if (!hasMore) {
                        finishRound();
                    }
                }
            });
        },
        onZoomChange(enabled) {
            weapon.setZoom(enabled);
            ui.setZoomOverlay(enabled);
        },
        onPauseRequested() {
            if (!roundComplete) {
                onPauseRequested?.();
            }
        }
    });

    function finishRound() {
        if (roundComplete) {
            return;
        }

        roundComplete = true;
        input.deactivate();
        weapon.setZoom(false);
        ui.setZoomOverlay(false);

        onRoundComplete?.({
            experienceId: config.id,
            title: config.title,
            score,
            hits,
            shots,
            duration: ROUND_DURATION_SECONDS
        });
    }

    scene.onBeforeRenderObservable.add(() => {
        const deltaSeconds = engine.getDeltaTime() / 1000;
        input.update(deltaSeconds);
        weapon.update(deltaSeconds);

        if (roundComplete || appState.paused) {
            return;
        }

        timeLeft = Math.max(0, timeLeft - deltaSeconds);
        ui.setTimer(Math.ceil(timeLeft));
        rules.update(deltaSeconds);
        targets.update(deltaSeconds, timeLeft);

        if (timeLeft <= 0) {
            finishRound();
        }
    });

    return {
        scene,
        focus() {
            audio.resume();
            input.focus();
        },
        pause() {
            input.deactivate();
            weapon.setZoom(false);
            ui.setZoomOverlay(false);
        },
        resume() {
            if (roundComplete) {
                return;
            }

            audio.resume();
            input.resume();
        },
        dispose() {
            roundComplete = true;
            input.dispose();
            weapon.dispose();
            targets.dispose();
            audio.dispose();
            scene.dispose();
        }
    };
};
})();