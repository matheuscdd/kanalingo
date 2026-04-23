import { authFirebase, dbFirebase } from "../../../scripts/config.js";
import {
    setDoc,
    doc,
    collection, query, where, getDocs, deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
// Variável global para gerar IDs únicos para as perguntas
let questionIdCounter = 0;
let currentQuizId = null;
const STORAGE_KEY = "duo_quizzes_data";

// Inicializa o SortableJS no container de perguntas
const questionsContainer = document.getElementById("questions-container");
new Sortable(questionsContainer, {
    handle: ".drag-handle", // Define qual elemento inicia o arraste
    animation: 150, // Suavidade da animação
    ghostClass: "sortable-ghost",
    dragClass: "sortable-drag",
});

// Função para inicializar o app com a lista
function init() {
    onAuthStateChanged(authFirebase, async (user) => {
            if (!user) return console.error("null user");
            showListView();
        });
}

// --- Novas Funções de Storage e Navegação ---
async function getSavedQuizzes() {
    const snapshot = await getDocs(
        query(
            collection(dbFirebase, "quizzes"),
            where("ownerId", "==", authFirebase.currentUser.uid)
        )
    );

    const quizzes = snapshot.docs.map(doc => doc.data());
    return quizzes;
}

function showListView() {
    document.getElementById("editor-view").classList.add("hidden");
    document.getElementById("list-view").classList.remove("hidden");
    renderQuizList();
}

async function renderQuizList() {
    const container = document.getElementById("quiz-list-container");
    const quizzes = await getSavedQuizzes();

    if (quizzes.length === 0) {
        container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-light);">
                        <i class="fa-solid fa-folder-open" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                        <p>Nenhum quiz salvo ainda. Crie o seu primeiro!</p>
                    </div>`;
        return;
    }

    container.innerHTML = "";
    quizzes.forEach((quiz) => {
        const itemHTML = `
                    <div class="quiz-list-item">
                        <div class="quiz-info">
                            <h3>${quiz.title}</h3>
                            <p>${quiz.questions.length} pergunta(s)</p>
                        </div>
                        <div class="quiz-actions">
                            <button class="icon-btn" style="color: var(--primary);" onclick="editQuiz('${quiz.id}')" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="icon-btn" onclick="deleteSavedQuiz('${quiz.id}')" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
        container.insertAdjacentHTML("beforeend", itemHTML);
    });
}

function createNewQuiz() {
    currentQuizId = crypto.randomUUID(); // ID único
    document.getElementById("quiz-title").value = "";
    document.getElementById("questions-container").innerHTML = "";
    questionIdCounter = 0;

    document.getElementById("list-view").classList.add("hidden");
    document.getElementById("editor-view").classList.remove("hidden");

    addQuestion(); // Primeira pergunta vazia
}

async function editQuiz(id) {
    const quizzes = await getSavedQuizzes();
    const quiz = quizzes.find((q) => q.id === id);
    if (!quiz) return;

    currentQuizId = quiz.id;
    document.getElementById("quiz-title").value = quiz.title;
    document.getElementById("questions-container").innerHTML = "";
    questionIdCounter = 0;

    document.getElementById("list-view").classList.add("hidden");
    document.getElementById("editor-view").classList.remove("hidden");

    // Reconstrói a interface com os dados salvos
    quiz.questions.forEach((qData) => addQuestion(qData));
}

async function deleteSavedQuiz(id) {
    if (!confirm("Tem certeza que deseja excluir este quiz?")) return;
    await deleteDoc(doc(dbFirebase, "quizzes", id));
    showListView();
}

// Função para adicionar uma nova pergunta ou carregar existente
function addQuestion(existingData = null) {
    questionIdCounter++;
    const qId = questionIdCounter;

    const isMultiple = existingData ? existingData.allowMultipleAnswers : false;
    const qText = existingData ? existingData.text : "";

    const questionHTML = `
                <div class="card question-card" id="question-${qId}" data-id="${qId}">
                    <div class="card-top-bar">
                        <i class="fa-solid fa-grip-vertical drag-handle" title="Arraste para reordenar"></i>
                        <button class="icon-btn" onclick="deleteQuestion(${qId})" title="Excluir Pergunta">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    
                    <input type="text" class="q-text" placeholder="Digite sua pergunta..." value="${qText}" required>
                    
                    <div class="question-settings">
                        <span>Permitir múltiplas respostas corretas?</span>
                        <label class="toggle-switch">
                            <input type="checkbox" class="q-type-toggle" onchange="toggleQuestionType(${qId})" ${isMultiple ? "checked" : ""}>
                            <span class="slider"></span>
                        </label>
                    </div>

                    <div class="options-list" id="options-list-${qId}">
                        <!-- Alternativas iniciais -->
                    </div>

                    <button class="btn btn-outline" style="font-size: 14px; padding: 8px 16px;" onclick="addOption(${qId})">
                        <i class="fa-solid fa-plus"></i> Adicionar Alternativa
                    </button>
                </div>
            `;

    // Adiciona ao DOM
    questionsContainer.insertAdjacentHTML("beforeend", questionHTML);

    // Carrega alternativas existentes ou adiciona 2 vazias por padrão
    if (existingData?.options) {
        existingData.options.forEach((opt) => addOption(qId, opt));
    } else {
        addOption(qId);
        addOption(qId);
    }
}

// Função para deletar uma pergunta
function deleteQuestion(qId) {
    const questionElement = document.getElementById(`question-${qId}`);
    // Animação simples antes de remover
    questionElement.style.opacity = "0";
    questionElement.style.transform = "scale(0.95)";
    setTimeout(() => {
        questionElement.remove();
    }, 200);
}

// Função para adicionar uma alternativa a uma pergunta específica
function addOption(qId, existingOptData = null) {
    const listContainer = document.getElementById(`options-list-${qId}`);
    const questionCard = document.getElementById(`question-${qId}`);
    const isMultiple = questionCard.querySelector(".q-type-toggle").checked;

    const inputType = isMultiple ? "checkbox" : "radio";
    const inputName = isMultiple ? `q-${qId}-opt[]` : `q-${qId}-opt`;

    const optText = existingOptData ? existingOptData.text : "";
    const isCorrect = existingOptData ? existingOptData.isCorrect : false;

    const optionHTML = `
                <div class="option-item ${isCorrect ? "is-correct" : ""}">
                    <label class="selector-label">
                        <input type="${inputType}" name="${inputName}" class="opt-correct" onchange="updateOptionStyle(this)" ${isCorrect ? "checked" : ""}>
                        <i class="fa-solid fa-check selector-icon" aria-hidden="true"></i>
                    </label>
                    <input type="text" class="opt-text" placeholder="Texto da alternativa..." value="${optText}" required>
                    <button class="icon-btn" onclick="deleteOption(this)" title="Excluir alternativa">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            `;

    listContainer.insertAdjacentHTML("beforeend", optionHTML);
}

// Função para deletar uma alternativa
function deleteOption(btnElement) {
    const optionItem = btnElement.closest(".option-item");
    const listContainer = optionItem.parentElement;

    // Garante que tenha pelo menos 2 alternativas
    if (listContainer.children.length > 2) {
        optionItem.remove();
    } else {
        alert("Uma pergunta deve ter pelo menos 2 alternativas.");
    }
}

// Função que altera visualmente se a alternativa está marcada como correta ou não
function updateOptionStyle(inputElement) {
    // Se for radio, precisamos limpar o estilo de todos os outros da mesma pergunta
    if (inputElement.type === "radio") {
        const listContainer = inputElement.closest(".options-list");
        const allItems = listContainer.querySelectorAll(".option-item");
        allItems.forEach((item) => item.classList.remove("is-correct"));
    }

    const optionItem = inputElement.closest(".option-item");
    if (inputElement.checked) {
        optionItem.classList.add("is-correct");
    } else {
        optionItem.classList.remove("is-correct");
    }
}

// Transforma os inputs de rádio em checkbox e vice-versa quando o professor altera o tipo
function toggleQuestionType(qId) {
    const questionCard = document.getElementById(`question-${qId}`);
    const isMultiple = questionCard.querySelector(".q-type-toggle").checked;
    const options = questionCard.querySelectorAll(".opt-correct");

    options.forEach((opt) => {
        // Desmarca todos para evitar bugs de estado misto ao trocar o tipo
        opt.checked = false;
        updateOptionStyle(opt);

        if (isMultiple) {
            opt.type = "checkbox";
            opt.name = `q-${qId}-opt[]`;
        } else {
            opt.type = "radio";
            opt.name = `q-${qId}-opt`;
        }
    });
}

// Função Principal: Varre o DOM, monta o JSON e imprime no console
async function saveQuiz() {
    const quizTitle = document.getElementById("quiz-title").value.trim();

    if (!quizTitle) {
        alert("Por favor, defina um título para o Quiz.");
        document.getElementById("quiz-title").focus();
        return;
    }

    const quizData = {
        id: currentQuizId ?? crypto.randomUUID(),
        title: quizTitle,
        questions: [],
    };

    const questionCards = document.querySelectorAll(".question-card");

    if (questionCards.length === 0) {
        alert("Adicione pelo menos uma pergunta ao seu Quiz.");
        return;
    }

    let isValid = true;

    questionCards.forEach((card, index) => {
        const qText = card.querySelector(".q-text").value.trim();
        const isMultiple = card.querySelector(".q-type-toggle").checked;

        if (!qText) {
            alert(`A pergunta ${index + 1} está sem texto.`);
            isValid = false;
            return;
        }

        const questionObj = {
            order: index + 1,
            text: qText,
            allowMultipleAnswers: isMultiple,
            options: [],
        };

        const optionElements = card.querySelectorAll(".option-item");
        let hasCorrectAnswer = false;

        optionElements.forEach((optEl) => {
            const optText = optEl.querySelector(".opt-text").value.trim();
            const isCorrect = optEl.querySelector(".opt-correct").checked;

            if (isCorrect) hasCorrectAnswer = true;

            questionObj.options.push({
                text: optText,
                isCorrect: isCorrect,
            });
        });

        if (!hasCorrectAnswer) {
            alert(
                `A pergunta "${qText.substring(0, 20)}..." não possui nenhuma resposta correta marcada.`,
            );
            isValid = false;
            return;
        }

        quizData.questions.push(questionObj);
    });

    if (isValid) {
        quizData.id = currentQuizId || crypto.randomUUID(); // Associa o ID

        // Lógica de salvar/atualizar no localStorage
        console.log("=== JSON DO QUIZ SALVO ===");
        console.log(JSON.stringify(quizData, null, 4));

        alert("Quiz salvo com sucesso!");
        await updateQuizDatabase(quizData);
        showListView(); // Volta para a tela inicial
    }
}

async function updateQuizDatabase(quiz) {
    try {
        const ownerId = authFirebase.currentUser.uid;
        console.log(ownerId);
        const ref = doc(dbFirebase, "quizzes", quiz.id);
        await setDoc(ref, { ...quiz, ownerId });
    } catch (error) {
        console.error(error);
    }
}

// Inicia o App
globalThis.onload = init;
globalThis.createNewQuiz = createNewQuiz;
globalThis.showListView = showListView;
globalThis.addQuestion = addQuestion;
globalThis.saveQuiz = saveQuiz;
globalThis.updateOptionStyle = updateOptionStyle;
globalThis.deleteQuestion = deleteQuestion;
globalThis.toggleQuestionType = toggleQuestionType;
globalThis.deleteOption = deleteOption;
globalThis.editQuiz = editQuiz;
globalThis.deleteSavedQuiz = deleteSavedQuiz;
globalThis.addOption = addOption;