import { databasesData } from "@/database/letters.js";
import { getCurrentDatabase } from "./round.js";
import { audioCache, statusRef } from "./state.js";

async function loadAudioAsBlob(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Audio(URL.createObjectURL(blob));
}

export async function preloadAudios() {
    for (const { definition } of databasesData.kanas) {
        const url = `../../assets/audios/letters/${definition}.webm`;

        try {
            audioCache.letters[definition] = await loadAudioAsBlob(url);
        } catch (error) {
            console.error(`Erro ao carregar o áudio: ${url}`, error);
        }
    }

    for (const key in statusRef) {
        const url = `../../assets/audios/effects/${key}.webm`;

        try {
            audioCache.effects[key] = await loadAudioAsBlob(url);
        } catch (error) {
            console.error(`Erro ao carregar o áudio: ${url}`, error);
        }
    }
}

export function playSoundEffect(sound) {
    const audio =
        audioCache.effects[sound] ??
        new Audio(`../../assets/audios/effects/${sound}.webm`);
    audio.currentTime = 0;
    audio.play();
}

export function playLetterSound(currentJA) {
    const currentRO = getCurrentDatabase().find(
        (x) => x.term === currentJA,
    ).definition;
    const audio =
        audioCache.letters[currentRO] ??
        new Audio(`../../assets/audios/effects/${currentRO}.webm`);
    audio.currentTime = 0;
    audio.play();
}
