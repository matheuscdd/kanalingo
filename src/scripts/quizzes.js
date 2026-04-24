import { dbFirebase } from "./config.js";
import {
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

export async function getSavedQuiz() {
    const urlParams = new URLSearchParams(globalThis.location.search);
    const id = urlParams.get('id'); // Retorna "123"
    if (!id) {
        document.body.innerHTML = '<span style="color: #FFF">Id não fornecido</span>';
        return;
    }
    const snapshot = await getDoc(doc(dbFirebase, "quizzes", id));

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data();
}