(() => {
const isCoarsePointer = Boolean(globalThis.matchMedia?.("(pointer: coarse)").matches) || "ontouchstart" in globalThis;
const app = globalThis.TiroApp || (globalThis.TiroApp = {});

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

app.createInputSystem = function createInputSystem({ canvas, camera, onShoot, onZoomChange, onPauseRequested, mobileUi }) {
    const state = {
        active: false,
        suppressUnlock: false,
        lookTouchId: null,
        lookVector: { x: 0, y: 0 },
        zoomed: false
    };

    let yaw = camera.rotation.y;
    let pitch = camera.rotation.x;

    function syncCameraRotation() {
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    function setMobileVisibility(visible) {
        if (!mobileUi?.root) {
            return;
        }

        mobileUi.root.classList.toggle("hidden", !(isCoarsePointer && visible));
    }

    function resetStick() {
        state.lookTouchId = null;
        state.lookVector.x = 0;
        state.lookVector.y = 0;

        if (mobileUi?.lookStick) {
            mobileUi.lookStick.style.transform = "translate(-50%, -50%)";
        }
    }

    function disableZoom() {
        if (!state.zoomed) {
            return;
        }

        state.zoomed = false;
        onZoomChange(false);
    }

    function enableZoom() {
        if (state.zoomed || !state.active) {
            return;
        }

        state.zoomed = true;
        onZoomChange(true);
    }

    function requestCapture() {
        if (isCoarsePointer) {
            return;
        }

        document.body.requestPointerLock?.();
    }

    function hasPointerLock() {
        return document.pointerLockElement === document.body || document.pointerLockElement === canvas;
    }

    function applyMouseLook(deltaX, deltaY) {
        yaw += deltaX * 0.0022;
        pitch = clamp(pitch + deltaY * 0.0022, -1.08, 1.08);
        syncCameraRotation();
    }

    function updateLookVector(touch) {
        const zoneRect = mobileUi.lookZone.getBoundingClientRect();
        const centerX = zoneRect.left + zoneRect.width / 2;
        const centerY = zoneRect.top + zoneRect.height / 2;
        const offsetX = touch.clientX - centerX;
        const offsetY = touch.clientY - centerY;
        const radius = zoneRect.width * 0.35;
        const distance = Math.hypot(offsetX, offsetY);
        const limitedDistance = Math.min(distance, radius);
        const angle = Math.atan2(offsetY, offsetX);
        const stickX = Math.cos(angle) * limitedDistance;
        const stickY = Math.sin(angle) * limitedDistance;

        state.lookVector.x = stickX / radius;
        state.lookVector.y = stickY / radius;
        mobileUi.lookStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;
    }

    function handlePointerMove(event) {
        if (!state.active || isCoarsePointer || !hasPointerLock()) {
            return;
        }

        if (event.buttons & 2) {
            enableZoom();
        } else {
            disableZoom();
        }

        applyMouseLook(event.movementX || 0, event.movementY || 0);
    }

    function handleDesktopMouseDown(event) {
        if (!state.active || isCoarsePointer) {
            return;
        }

        if (event.button === 0) {
            if (hasPointerLock()) {
                onShoot();
            } else {
                requestCapture();
            }
            return;
        }

        if (event.button === 2) {
            event.preventDefault();
            enableZoom();
        }
    }

    function handleDesktopMouseUp(event) {
        if (!state.active || isCoarsePointer) {
            return;
        }

        if (event.button === 2) {
            event.preventDefault();
            disableZoom();
        }
    }

    function handlePointerLockChange() {
        if (isCoarsePointer) {
            return;
        }

        const locked = hasPointerLock();

        if (!locked && state.suppressUnlock) {
            state.suppressUnlock = false;
            return;
        }

        if (state.active && !locked) {
            state.active = false;
            disableZoom();
            onPauseRequested?.();
        }
    }

    function handleKeyDown(event) {
        if (!state.active) {
            return;
        }

        if (event.key === "Shift" && !state.zoomed) {
            enableZoom();
        }
    }

    function handleKeyUp(event) {
        if (event.key === "Shift") {
            disableZoom();
        }
    }

    function handleContextMenu(event) {
        if (state.active) {
            event.preventDefault();
        }
    }

    function handleWindowBlur() {
        disableZoom();
    }

    function handleLookStart(event) {
        if (!state.active || !isCoarsePointer) {
            return;
        }

        event.preventDefault();
        const touch = event.changedTouches[0];
        state.lookTouchId = touch.identifier;
        updateLookVector(touch);
    }

    function handleLookMove(event) {
        if (!state.active || !isCoarsePointer || state.lookTouchId === null) {
            return;
        }

        event.preventDefault();

        for (const touch of event.changedTouches) {
            if (touch.identifier === state.lookTouchId) {
                updateLookVector(touch);
                break;
            }
        }
    }

    function handleLookEnd(event) {
        if (state.lookTouchId === null) {
            return;
        }

        for (const touch of event.changedTouches) {
            if (touch.identifier === state.lookTouchId) {
                resetStick();
                break;
            }
        }
    }

    function handleShootTouch(event) {
        if (!state.active) {
            return;
        }

        event.preventDefault();
        onShoot();
    }

    function handleZoomTouchStart(event) {
        if (!state.active || state.zoomed) {
            return;
        }

        event.preventDefault();
        enableZoom();
    }

    function handleZoomTouchEnd(event) {
        event.preventDefault();
        disableZoom();
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    globalThis.addEventListener("mousedown", handleDesktopMouseDown);
    globalThis.addEventListener("mouseup", handleDesktopMouseUp);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    globalThis.addEventListener("contextmenu", handleContextMenu);
    globalThis.addEventListener("blur", handleWindowBlur);

    if (mobileUi?.lookZone) {
        mobileUi.lookZone.addEventListener("touchstart", handleLookStart, { passive: false });
        mobileUi.lookZone.addEventListener("touchmove", handleLookMove, { passive: false });
        mobileUi.lookZone.addEventListener("touchend", handleLookEnd, { passive: false });
        mobileUi.lookZone.addEventListener("touchcancel", handleLookEnd, { passive: false });
        mobileUi.shootButton.addEventListener("touchstart", handleShootTouch, { passive: false });
        mobileUi.zoomButton.addEventListener("touchstart", handleZoomTouchStart, { passive: false });
        mobileUi.zoomButton.addEventListener("touchend", handleZoomTouchEnd, { passive: false });
        mobileUi.zoomButton.addEventListener("touchcancel", handleZoomTouchEnd, { passive: false });
    }

    return {
        focus() {
            state.active = true;
            yaw = camera.rotation.y;
            pitch = camera.rotation.x;
            setMobileVisibility(true);
            requestCapture();
        },
        resume() {
            this.focus();
        },
        deactivate() {
            state.active = false;
            resetStick();
            disableZoom();
            setMobileVisibility(false);

            if (!isCoarsePointer && hasPointerLock()) {
                state.suppressUnlock = true;
                document.exitPointerLock?.();
            }
        },
        update(deltaSeconds) {
            if (!state.active || !isCoarsePointer) {
                return;
            }

            yaw += state.lookVector.x * deltaSeconds * 1.9;
            pitch = clamp(pitch + state.lookVector.y * deltaSeconds * 1.6, -1.08, 1.08);
            syncCameraRotation();
        },
        dispose() {
            this.deactivate();
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerlockchange", handlePointerLockChange);
            globalThis.removeEventListener("mousedown", handleDesktopMouseDown);
            globalThis.removeEventListener("mouseup", handleDesktopMouseUp);
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
            globalThis.removeEventListener("contextmenu", handleContextMenu);
            globalThis.removeEventListener("blur", handleWindowBlur);

            if (mobileUi?.lookZone) {
                mobileUi.lookZone.removeEventListener("touchstart", handleLookStart);
                mobileUi.lookZone.removeEventListener("touchmove", handleLookMove);
                mobileUi.lookZone.removeEventListener("touchend", handleLookEnd);
                mobileUi.lookZone.removeEventListener("touchcancel", handleLookEnd);
                mobileUi.shootButton.removeEventListener("touchstart", handleShootTouch);
                mobileUi.zoomButton.removeEventListener("touchstart", handleZoomTouchStart);
                mobileUi.zoomButton.removeEventListener("touchend", handleZoomTouchEnd);
                mobileUi.zoomButton.removeEventListener("touchcancel", handleZoomTouchEnd);
            }
        }
    };
};
})();