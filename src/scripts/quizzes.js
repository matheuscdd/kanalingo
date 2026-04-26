import { dbFirebase } from "./config.js";
import {
    doc,
    getDoc,
    setDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

function showErrorMessage(message) {
    document.body.innerHTML = `<span style="color: #FFF">${message}</span>`;
}

const context = {}

export async function getSavedQuiz() {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const id = urlParams.get('id');
    if (!id) {
        return showErrorMessage('Id não fornecido');
    }
    const snapshot = await getDoc(doc(dbFirebase, "quizzes", id));

    if (!snapshot.exists()) {
        return showErrorMessage('Id não encontrado');
    }

    context.results = snapshot.data();
    return context.results;
}

export async function insertHistoryPractice(questions) {
    try {
        const practiceId = crypto.randomUUID();
        const quiz = {
            id: practiceId,
            quizId: context.results.id,
            date: new Date(),
            username: localStorage.getItem('player_name'),
            duration: questions.reduce((a, b) => a + b.duration, 0),
            score: (questions.filter(x => x.correct).length / questions.length) * 100,
            questions
        }
        console.log(quiz)
        await setDoc(doc(dbFirebase, "practices", practiceId), quiz);
    } catch (error) {
        console.error(error);
    }
}