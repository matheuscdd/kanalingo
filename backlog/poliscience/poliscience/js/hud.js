// HUD em HTML/CSS: velocímetro numérico, cronômetro, mensagens, painel da polícia
// e moldura do retrovisor.

import { toKmh } from "./carPhysics.js";

export function createHud() {
  const hudEl = document.getElementById("hud");
  const speedEl = document.getElementById("speedValue");
  const timerEl = document.getElementById("timer");
  const messageEl = document.getElementById("message");
  const mirrorFrameEl = document.getElementById("mirrorFrame");
  const policeEl = document.getElementById("police");
  const policeDistanceEl = document.getElementById("policeDistance");
  const bustMeterEl = document.getElementById("bustMeter");
  const bustFillEl = document.getElementById("bustFill");

  let lastKmh = -1;
  let hitTimeout = null;
  let lastPolice = { text: "", percent: -1, level: "" };

  return {
    /** Atualiza o velocímetro (m/s -> km/h). Só toca o DOM quando o valor muda. */
    setSpeed(speedMs) {
      const kmh = toKmh(speedMs);
      if (kmh !== lastKmh) {
        speedEl.textContent = String(kmh);
        lastKmh = kmh;
      }
    },

    /** Atualiza o cronômetro (segundos -> mm:ss.cc). */
    setTime(seconds) {
      timerEl.textContent = formatTime(seconds);
    },

    /** Mostra uma mensagem central (string com \n para quebras). */
    showMessage(text) {
      messageEl.textContent = text;
      messageEl.classList.remove("hidden");
    },

    hideMessage() {
      messageEl.classList.add("hidden");
    },

    /** Flash vermelho rápido ao bater. */
    flashHit() {
      hudEl.classList.remove("hit");
      // Força reinício da animação CSS
      void hudEl.offsetWidth;
      hudEl.classList.add("hit");
      clearTimeout(hitTimeout);
      hitTimeout = setTimeout(() => hudEl.classList.remove("hit"), 400);
    },

    /** Mostra a moldura do retrovisor alinhada ao viewport da câmera (frações da tela). */
    showMirrorFrame(viewport) {
      const s = mirrorFrameEl.style;
      s.left = `${viewport.x * 100}%`;
      s.width = `${viewport.w * 100}%`;
      s.top = `${(1 - viewport.y - viewport.h) * 100}%`; // viewport.y conta de baixo para cima
      s.height = `${viewport.h * 100}%`;
      mirrorFrameEl.classList.remove("hidden");
    },

    showPolice(visible) {
      policeEl.classList.toggle("hidden", !visible);
    },

    /** Distância até a viatura e medidor de "pego" (0..1). */
    setPolice(distance, bust) {
      const st = policeStatus(distance, bust);
      if (st.text !== lastPolice.text) policeDistanceEl.textContent = st.text;
      if (st.percent !== lastPolice.percent) {
        bustFillEl.style.width = `${st.percent}%`;
        bustMeterEl.setAttribute("aria-valuenow", String(st.percent));
      }
      if (st.level !== lastPolice.level) {
        policeEl.classList.toggle("warning", st.level === "warning");
        policeEl.classList.toggle("danger", st.level === "danger");
      }
      lastPolice = st;
    },
  };
}

/**
 * Texto, nível de alerta e percentual do painel da polícia.
 * @param {number} distance metros até a viatura
 * @param {number} bust medidor 0..1
 * @returns {{ text: string, level: "calm"|"warning"|"danger", percent: number }}
 */
export function policeStatus(distance, bust) {
  const percent = Math.round(Math.min(1, Math.max(0, bust)) * 100);
  const level = percent > 0 ? "danger" : distance < 30 ? "warning" : "calm";
  const text = Number.isFinite(distance) ? `${Math.round(distance)} m` : "-- m";
  return { text, level, percent };
}

/** Formata segundos como mm:ss.cc */
export function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const cents = Math.floor((s * 100) % 100);
  return `${pad(m)}:${pad(sec)}.${pad(cents)}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}
