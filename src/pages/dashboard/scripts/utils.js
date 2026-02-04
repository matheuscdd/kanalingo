import { alphabet, defaults } from "../../../database/letters.js";
import { authFirebase, dbFirebase } from "../../../scripts/config.js";
import { getSumFromValues, showNumberIncreasing } from "../../../scripts/utils.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getDoc,
  setDoc,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export const gameState = Object.seal({
  currentRound: [],
  currentIndex: 0,
  scorePerChar: structuredClone(defaults),
  lastWrong: false,
});

const totalScoreDisplay = document.getElementById("total-score");

export const maxCharsRound = 5;
export const statusRef = Object.freeze({
  correct: "correct",
  wrong: "wrong",
});


export async function updateScoreLocal(key, char, amount) {
  if (gameState.lastWrong === char) return;
  if (!gameState.scorePerChar[char]) {
    gameState.scorePerChar[char] = { [key]: 0 }
  }
  gameState.scorePerChar[char][key] = (gameState.scorePerChar[char][key] || 0) + amount;
  localStorage.setItem("ja", JSON.stringify(gameState.scorePerChar));
  updateTotalScoreDisplay();
}

export async function updateScoreDatabase() {
  try {
    const user = authFirebase.currentUser;
    const ref = doc(dbFirebase, "users", user.uid);
    await updateDoc(ref, { ja: gameState.scorePerChar });
  } catch (error) {
    console.error(error)
  }
}

export function getTotalScore(ref) {
  return Object.values(ref).reduce((x, y) => getSumFromValues(y) + x, 0);
}

export async function updateTotalScoreDisplay(isFirstLoad) {
  const total = getTotalScore(gameState.scorePerChar);
  if (isFirstLoad) {
    totalScoreDisplay.classList = "golden-color2";
    await showNumberIncreasing(total, 0, totalScoreDisplay, 1, total * 0.01);
    totalScoreDisplay.classList = "";
    return;
  }

  totalScoreDisplay.classList = "golden-color2";
  await showNumberIncreasing(total, total - 100, totalScoreDisplay, 1);
  totalScoreDisplay.classList = "";
}

export function getValueToScorePerChar(char, key) {
  if (!gameState.scorePerChar[char]) {
    return 0;
  }
  return gameState.scorePerChar[char][key] || 0;
}

export async function loadProgress() {
  const local = JSON.parse(localStorage.getItem("ja") ?? JSON.stringify({}));
  if (Object.keys(local).length) {
    gameState.scorePerChar = local;
  }

  onAuthStateChanged(authFirebase, async user => {
    if (!user) return console.error("null user");
    const ref = doc(dbFirebase, "users", user.uid);
    try {
      let currentProgress = null;
      const response = await getDoc(ref);
      if (response.exists()) {
        currentProgress = response.data().ja;
      } else {
        await setDoc(ref, { ja: defaults }, { merge: true });
        currentProgress = defaults;
      }
      
      if (Object.keys(local).length && getTotalScore(local) > getTotalScore(currentProgress)) {
        return;
      }
      localStorage.setItem("ja", JSON.stringify(currentProgress));
    } catch (error) {
      console.error(error);
    }
  });
}

export function playLetterSound(currentJP) {
  const currentRO = alphabet.find((x) => x.term === currentJP).definition;
  const audio = new Audio(`../../assets/audios/letters/${currentRO}.mp3`);
  audio.play();
}