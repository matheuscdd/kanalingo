import { authFirebase, dbFirebase } from "../../../scripts/config.js";
import {
    setDoc,
    doc,
    collection,
    query,
    where,
    getDocs,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
// Variável global para gerar IDs únicos para as perguntas
let questionIdCounter = 0;
let currentQuizId = null;
const STORAGE_KEY = "duo_quizzes_data";
import QrCodeStyling from "https://cdn.jsdelivr.net/npm/qr-code-styling@1.9.2/+esm";

function generateUrl(id) {
    return (
        globalThis.location.protocol +
        "//" +
        globalThis.location.host +
        "/backlog/knowtank/knowtank.html?" +
        new URLSearchParams({ id })
    );
}

function shareQuiz(id) {
    const url = generateUrl(id);

    // Clear previous QR and populate URL input
    const qrContainer = document.getElementById("qr");
    qrContainer.innerHTML = "";
    document.getElementById("share-url-input").value = url;

    // Show/hide copy-image button based on browser support
    const copyQrBtn = document.getElementById("copy-qr-btn");
    if (typeof ClipboardItem !== "undefined") {
        copyQrBtn.classList.remove("hidden");
    } else {
        copyQrBtn.classList.add("hidden");
    }

    const qrCode = new QrCodeStyling({
        type: "canvas",
        shape: "square",
        width: 280,
        height: 280,
        data: url,
        margin: 0,
        qrOptions: { typeNumber: "0", mode: "Byte", errorCorrectionLevel: "Q" },
        imageOptions: {
            saveAsBlob: true,
            hideBackgroundDots: false,
            imageSize: 0,
            margin: 0,
        },
        dotsOptions: {
            type: "rounded",
            color: "#1cb0f6",
            roundSize: true,
            gradient: null,
        },
        backgroundOptions: { round: 0, color: "#ffffff", gradient: null },
        dotsOptionsHelper: {
            colorType: { single: true, gradient: false },
            gradient: {
                linear: true,
                radial: false,
                color1: "#6a1a4c",
                color2: "#6a1a4c",
                rotation: "0",
            },
        },
        cornersSquareOptions: { type: "extra-rounded", color: "#b7b7b7" },
        cornersSquareOptionsHelper: {
            colorType: { single: true, gradient: false },
            gradient: {
                linear: true,
                radial: false,
                color1: "#b7b7b7",
                color2: "#b7b7b7",
                rotation: "0",
            },
        },
        cornersDotOptions: { type: "dot", color: "#838383" },
        cornersDotOptionsHelper: {
            colorType: { single: true, gradient: false },
            gradient: {
                linear: true,
                radial: false,
                color1: "#000000",
                color2: "#000000",
                rotation: "0",
            },
        },
        backgroundOptionsHelper: {
            colorType: { single: true, gradient: false },
            gradient: {
                linear: true,
                radial: false,
                color1: "#ffffff",
                color2: "#ffffff",
                rotation: "0",
            },
        },
    });
    qrCode.append(qrContainer);

    openShareModal();
}

function openShareModal() {
    document.getElementById("share-modal").classList.remove("hidden");
}

function closeShareModal() {
    document.getElementById("share-modal").classList.add("hidden");
}

function handleModalOverlayClick(event) {
    if (event.target === document.getElementById("share-modal")) {
        closeShareModal();
    }
}

function copyLink() {
    const url = document.getElementById("share-url-input").value;
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.querySelector(".copy-btn");
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
        setTimeout(() => {
            btn.innerHTML = original;
        }, 2000);
    });
}

function downloadQr() {
    const canvas = document.querySelector("#qr canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "quiz-qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function copyQrImage() {
    const canvas = document.querySelector("#qr canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
        navigator.clipboard
            .write([new ClipboardItem({ "image/png": blob })])
            .then(() => {
                const btn = document.getElementById("copy-qr-btn");
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
                setTimeout(() => {
                    btn.innerHTML = original;
                }, 2000);
            });
    }, "image/png");
}

function playQuiz(id) {
    globalThis.location.href = generateUrl(id);
}

// Inicializa o SortableJS no container de perguntas
const questionsContainer = document.getElementById("questions-container");
new Sortable(questionsContainer, {
    handle: ".drag-handle", // Define qual elemento inicia o arraste
    animation: 150, // Suavidade da animação
    ghostClass: "sortable-ghost",
    dragClass: "sortable-drag",
    onEnd: () => updateQuestionNumbers(),
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
            where("ownerId", "==", authFirebase.currentUser.uid),
        ),
    );

    const quizzes = snapshot.docs.map((doc) => doc.data());
    return quizzes;
}

function showListView() {
    document.getElementById("editor-view").classList.add("hidden");
    document.getElementById("reports-view").classList.add("hidden");
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
                            <button class="icon-btn" onclick="showReports('${quiz.id}')" title="Relatórios">
                                <i class="fa-solid fa-chart-pie"></i>
                            </button>
                            <button class="icon-btn" onclick="playQuiz('${quiz.id}')" title="Jogar">
                                <i class="fa-solid fa-play"></i>
                            </button>
                            <button class="icon-btn" onclick="shareQuiz('${quiz.id}')" title="Compartilhar">
                                <i class="fa-solid fa-share-nodes"></i>
                            </button>
                            <button class="icon-btn" onclick="editQuiz('${quiz.id}')" title="Editar">
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
                        <div class="drag-col">
                            <span class="question-number"></span>
                            <i class="fa-solid fa-grip-vertical drag-handle" title="Arraste para reordenar"></i>
                        </div>
                        <button class="icon-btn" onclick="duplicateQuestion(${qId})" title="Duplicar Pergunta">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                        <button class="icon-btn del-question" onclick="deleteQuestion(${qId})" title="Excluir Pergunta">
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
    updateQuestionNumbers();

    const delOptions = document.querySelectorAll(".del-question");
    if (delOptions.length === 1) {
        delOptions[0].classList.add("hidden");
    } else {
        delOptions.forEach((x) => x.classList.remove("hidden"));
    }

    // Carrega alternativas existentes ou adiciona 2 vazias por padrão
    if (existingData?.options) {
        existingData.options.forEach((opt) => addOption(qId, opt));
    } else {
        addOption(qId);
        addOption(qId);
    }
}

// Função para duplicar uma pergunta
function duplicateQuestion(qId) {
    const sourceCard = document.getElementById(`question-${qId}`);
    const text = sourceCard.querySelector(".q-text").value;
    const isMultiple = sourceCard.querySelector(".q-type-toggle").checked;
    const options = Array.from(sourceCard.querySelectorAll(".option-item")).map(
        (item) => ({
            text: item.querySelector(".opt-text").value,
            isCorrect: item.querySelector(".opt-correct").checked,
        }),
    );
    addQuestion({ text, allowMultipleAnswers: isMultiple, options });
    const newCard = document.getElementById(`question-${questionIdCounter}`);
    if (newCard) newCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateQuestionNumbers() {
    document.querySelectorAll(".question-card").forEach((card, index) => {
        card.querySelector(".question-number").textContent = index + 1;
    });
}

// Função para deletar uma pergunta
function deleteQuestion(qId) {
    const questionElement = document.getElementById(`question-${qId}`);
    // Animação simples antes de remover
    questionElement.style.opacity = "0";
    questionElement.style.transform = "scale(0.95)";
    setTimeout(() => {
        questionElement.remove();
        updateQuestionNumbers();

        const delOptions = document.querySelectorAll(".del-question");
        if (delOptions.length === 1) {
            delOptions[0].classList.add("hidden");
        } else {
            delOptions.forEach((x) => x.classList.remove("hidden"));
        }
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
            id: crypto.randomUUID(),
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
                id: crypto.randomUUID(),
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
        await setDoc(doc(dbFirebase, "quizzes", quiz.id), { ...quiz, ownerId });
    } catch (error) {
        console.error(error);
    }
}

// ─── Reports ─────────────────────────────────────────────────────────────────

let currentReportQuizId = null;
let currentResponses = [];

async function getQuizResponses(quizId) {
    const snapshot = await getDocs(
        query(
            collection(dbFirebase, "practices"),
            where("quizId", "==", quizId),
        ),
    );

    const quizzes = snapshot.docs.map((doc) => {
        const data = doc.data();
        data.date = data.date?.toDate
            ? data.date.toDate()
            : data.date instanceof Date
              ? data.date
              : new Date(data.date);
        return data;
    });
    console.log(quizzes);
    return quizzes;
}

function groupByDate(responses) {
    const groups = {};
    responses.forEach((r) => {
        const d = r.date instanceof Date ? r.date : new Date(r.date);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(r);
    });
    return Object.fromEntries(
        Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0])),
    );
}

function formatDateBR(dateStr) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

function buildResponseRow(r) {
    const total = r.questions.length;
    const correct = r.questions.filter((q) => q.correct).length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const badgeClass = pct >= 50 ? "score-badge--pass" : "score-badge--fail";

    const detailRows = r.questions
        .map((q) => {
            const correctOption = q.options.find((o) => o.isCorrect);
            return `
            <div class="answer-row ${q.correct ? "correct" : "wrong"}">
                <i class="fa-solid ${q.correct ? "fa-check" : "fa-xmark"} answer-icon"></i>
                <div class="answer-info">
                    <span class="answer-question">${q.text}</span>
                    <span class="answer-correct-opt">Resposta certa: ${correctOption ? correctOption.text : "—"}</span>
                </div>
                <span class="answer-duration">${q.duration.toFixed(1)}s</span>
            </div>`;
        })
        .join("");

    return `
        <div class="response-row" onclick="toggleResponseDetail(this)">
            <div class="response-main">
                <i class="fa-solid fa-user-circle response-avatar"></i>
                <span class="response-username">${r.username}</span>
                <span class="score-badge ${badgeClass}">${correct}/${total}</span>
                <span class="response-time"><i class="fa-solid fa-clock"></i> ${(() => {
                    const d =
                        r.date instanceof Date ? r.date : new Date(r.date);
                    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                })()}</span>
                <span class="response-duration">${r.duration.toFixed(1)}s</span>
                <i class="fa-solid fa-chevron-down response-chevron"></i>
            </div>
            <div class="response-detail hidden">${detailRows}</div>
        </div>`;
}

function renderReports(groupedData, filterDate = null) {
    const container = document.getElementById("reports-container");
    const entries = filterDate
        ? Object.entries(groupedData).filter(([date]) => date === filterDate)
        : Object.entries(groupedData);

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="reports-empty">
                <i class="fa-solid fa-inbox"></i>
                <p>Nenhuma resposta encontrada.</p>
            </div>`;
        return;
    }

    container.innerHTML = entries
        .map(([date, responses]) => {
            const rows = responses.map((r) => buildResponseRow(r)).join("");
            return `
            <div class="date-group">
                <div class="date-group-header">
                    <i class="fa-solid fa-calendar-day"></i>
                    <span>${formatDateBR(date)}</span>
                    <span class="date-group-count">${responses.length} resposta(s)</span>
                </div>
                <div class="date-group-body">${rows}</div>
            </div>`;
        })
        .join("");
}

async function showReports(quizId) {
    currentReportQuizId = quizId;

    const quizzes = await getSavedQuizzes();
    const quiz = quizzes.find((q) => q.id === quizId);
    document.getElementById("reports-quiz-title").textContent = quiz
        ? `Relatórios — ${quiz.title}`
        : "Relatórios";

    currentResponses = await getQuizResponses(quizId);
    const grouped = groupByDate(currentResponses);

    document.getElementById("list-view").classList.add("hidden");
    document.getElementById("report-date-filter").value = "";
    document.getElementById("reports-view").classList.remove("hidden");
    renderReports(grouped);
}

function filterReports() {
    const filterDate = document.getElementById("report-date-filter").value;
    const grouped = groupByDate(currentResponses);
    renderReports(grouped, filterDate || null);
}

function clearReportFilter() {
    document.getElementById("report-date-filter").value = "";
    filterReports();
}

async function refreshReports() {
    currentResponses = await getQuizResponses(currentReportQuizId);
    document.getElementById("report-date-filter").value = "";
    renderReports(groupByDate(currentResponses));
}

function toggleResponseDetail(rowEl) {
    rowEl.querySelector(".response-detail").classList.toggle("hidden");
    rowEl.querySelector(".response-chevron").classList.toggle("rotated");
}

// Inicia o App
globalThis.onload = init;
globalThis.createNewQuiz = createNewQuiz;
globalThis.showListView = showListView;
globalThis.addQuestion = addQuestion;
globalThis.saveQuiz = saveQuiz;
globalThis.updateOptionStyle = updateOptionStyle;
globalThis.deleteQuestion = deleteQuestion;
globalThis.duplicateQuestion = duplicateQuestion;
globalThis.toggleQuestionType = toggleQuestionType;
globalThis.deleteOption = deleteOption;
globalThis.editQuiz = editQuiz;
globalThis.deleteSavedQuiz = deleteSavedQuiz;
globalThis.addOption = addOption;
globalThis.shareQuiz = shareQuiz;
globalThis.playQuiz = playQuiz;
globalThis.openShareModal = openShareModal;
globalThis.closeShareModal = closeShareModal;
globalThis.handleModalOverlayClick = handleModalOverlayClick;
globalThis.copyLink = copyLink;
globalThis.downloadQr = downloadQr;
globalThis.copyQrImage = copyQrImage;
globalThis.showReports = showReports;
globalThis.filterReports = filterReports;
globalThis.clearReportFilter = clearReportFilter;
globalThis.toggleResponseDetail = toggleResponseDetail;
globalThis.refreshReports = refreshReports;
