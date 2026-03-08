import { defaults, japanese } from "@/database/letters.js";
import { authFirebase, dbFirebase } from "@/scripts/config.js";
import { showNumberIncreasing } from "@/scripts/utilsDom.js";
import { getTotalScore } from "@/scripts/utilsPure.js";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, setDoc, doc, updateDoc } from "firebase/firestore";
import { gameState } from "./state.js";

const totalScoreDisplay = document.getElementById("total-score-course");

export async function updateScoreLocal(key, char, amount) {
    if (gameState.lastWrong === char) return;
    if (!gameState.scorePerChar[char]) {
        gameState.scorePerChar[char] = { [key]: 0 };
    }
    gameState.lastTotalScore = getTotalScore(gameState.scorePerChar);
    gameState.scorePerChar[char][key] =
        (gameState.scorePerChar[char][key] || 0) + amount;
    localStorage.setItem(japanese, JSON.stringify(gameState.scorePerChar));
    updateTotalScoreDisplay();
}

export async function updateScoreDatabase() {
    try {
        const user = authFirebase.currentUser;
        const ref = doc(dbFirebase, "users", user.uid);
        await updateDoc(ref, { [japanese]: gameState.scorePerChar });
    } catch (error) {
        console.error(error);
    }
}

export async function updateTotalScoreDisplay(isFirstLoad) {
    const total = getTotalScore(gameState.scorePerChar);
    totalScoreDisplay.parentElement.classList = "golden-color2";
    if (isFirstLoad) {
        await showNumberIncreasing(
            total,
            gameState.lastTotalScore,
            totalScoreDisplay,
            1,
            total * 0.01,
        );
    } else {
        await showNumberIncreasing(
            total,
            gameState.lastTotalScore,
            totalScoreDisplay,
            1,
        );
    }

    totalScoreDisplay.parentElement.classList = "";
}

export function getValueToScorePerChar(char, key) {
    if (!gameState.scorePerChar[char]) {
        return 0;
    }
    return gameState.scorePerChar[char][key] || 0;
}

export async function loadProgress() {
    const local = JSON.parse(
        localStorage.getItem(japanese) ?? JSON.stringify({}),
    );
    if (Object.keys(local).length) {
        gameState.scorePerChar = local;
    }

    onAuthStateChanged(authFirebase, async (user) => {
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

            if (
                Object.keys(local).length &&
                getTotalScore(local) > getTotalScore(currentProgress)
            ) {
                return;
            }
            localStorage.setItem("ja", JSON.stringify(currentProgress));
            gameState.scorePerChar = currentProgress;
        } catch (error) {
            console.error(error);
        }
    });
}
