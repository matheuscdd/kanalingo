// Teclado: setas e WASD funcionam ao mesmo tempo.
// Expõe um estado simples lido a cada frame pelo carro/jogo.

const KEY_MAP = {
  ArrowUp: "accel",
  KeyW: "accel",
  ArrowDown: "brake",
  KeyS: "brake",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  KeyR: "reset",
  Space: "handbrake",
};

export function createInput(target = window) {
  const state = {
    accel: false,
    brake: false,
    left: false,
    right: false,
    reset: false,
    handbrake: false,
    anyPressed: false,
  };

  // Callbacks disparados uma vez por pressionamento (não repetem enquanto segura)
  const onceListeners = { reset: [] };

  function setKey(code, pressed) {
    const action = KEY_MAP[code];
    if (!action) return false;
    const wasPressed = state[action];
    state[action] = pressed;
    if (pressed && !wasPressed && onceListeners[action]) {
      onceListeners[action].forEach((fn) => fn());
    }
    if (pressed) state.anyPressed = true;
    return true;
  }

  target.addEventListener("keydown", (e) => {
    if (setKey(e.code, true)) e.preventDefault(); // evita scroll com setas/espaço
  });
  target.addEventListener("keyup", (e) => {
    if (setKey(e.code, false)) e.preventDefault();
  });
  // Solta tudo se a janela perder o foco (evita carro "preso" acelerando)
  target.addEventListener("blur", () => {
    for (const k of Object.keys(state)) if (k !== "anyPressed") state[k] = false;
  });

  return {
    state,
    /** Registra callback para o pressionamento (uma vez) da tecla R. */
    onReset(fn) {
      onceListeners.reset.push(fn);
    },
    /** Lateral: -1 esquerda, +1 direita, 0 nenhum/ambos. */
    get steer() {
      return (state.right ? 1 : 0) - (state.left ? 1 : 0);
    },
    /** Longitudinal: +1 acelera, -1 freia/ré, 0 nenhum/ambos. */
    get throttle() {
      return (state.accel ? 1 : 0) - (state.brake ? 1 : 0);
    },
  };
}
