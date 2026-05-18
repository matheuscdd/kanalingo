// --- Elementos do DOM ---
const audioInput = document.getElementById('audio-upload');
const jsonInput = document.getElementById('json-upload');
const fileNameDisplay = document.getElementById('file-name-display');
const jsonNameDisplay = document.getElementById('json-name-display');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const skipBackBtn = document.getElementById('skip-back');
const skipForwardBtn = document.getElementById('skip-forward');
const speedBtn = document.getElementById('speed-btn');
const subtitleBtn = document.getElementById('subtitle-btn');
const subtitleWrapper = document.getElementById('subtitle-wrapper');
const subtitleTextEl = document.getElementById('subtitle-text');
const canvas = document.getElementById('waveform');
const ctx = canvas.getContext('2d');

// --- Variáveis Globais ---
let audio = new Audio();
let audioContext = null;
let analyser = null;
let source = null;
let dataArray = null;
let animationId = null;
let isPlaying = false;
let fadeInterval = null; // Variável para controlar o fade de volume

// Configurações das Ondas
let phase1 = 0, phase2 = 0, phase3 = 0;
let targetAmplitude = 0; // Amplitude base (quando pausado)
let currentAmplitude = 0; // Suavização (Lerp)
let currentSpeed = 0; // Controle de velocidade suave

// --- Legendas (Mock JSON com Palavras) ---
const mockJSON = [
    {
        "start": 0.0,
        "end": 3.54,
        "text": " Imagine a really famous, uh, aging king.",
        "words": [
            { "word": "Imagine", "start": 0.0, "end": 0.28 },
            { "word": "a", "start": 0.28, "end": 0.48 },
            { "word": "really", "start": 0.48, "end": 0.74 },
            { "word": "famous", "start": 0.74, "end": 1.26 },
            { "word": "uh", "start": 1.44, "end": 2.04 },
            { "word": "aging", "start": 2.28, "end": 3.12 },
            { "word": "king", "start": 3.12, "end": 3.54 }
        ]
    },
    {
        "start": 3.72,
        "end": 5.9,
        "text": " Right. A man at the very end of his life.",
        "words": [
            { "word": "Right", "start": 3.72, "end": 3.92 },
            { "word": "A", "start": 4.32, "end": 4.76 },
            { "word": " man", "start": 4.76, "end": 4.96 },
            { "word": "at", "start": 4.96, "end": 5.12 },
            { "word": "the", "start": 5.12, "end": 5.16 },
            { "word": " very", "start": 5.16, "end": 5.32 },
            { "word": "end", "start": 5.32, "end": 5.5 },
            { "word": " of", "start": 5.5, "end": 5.6 },
            { "word": " his", "start": 5.6, "end": 5.68 },
            { "word": "life", "start": 5.68, "end": 5.9 }
        ]
    }
];

let parsedSubtitles = mockJSON;
let subtitlesVisible = false;

let currentSubtitleText = "";
let currentWordIndex = -1;

// Gera o HTML mantendo o texto original (com pontuação) e isolando as palavras em spans
function generateSentenceHTML(block) {
    let result = "";
    let currentPos = 0;
    const text = block.text;

    block.words.forEach((w, index) => {
        // Limpa espaços extras da palavra do array (como " man") para fazer o match correto no texto original
        const cleanWord = w.word.trim();
        const wordIndex = text.indexOf(cleanWord, currentPos);

        if (wordIndex !== -1) {
            result += text.substring(currentPos, wordIndex);
            result += `<span class="sub-word" data-index="${index}">${cleanWord}</span>`;
            currentPos = wordIndex + cleanWord.length;
        }
    });
    result += text.substring(currentPos);
    return result;
}

// Destaca a palavra atual
function highlightWord(block, currentTime) {
    let activeWordIndex = -1;

    // Procura a palavra cujo tempo exato bate com o momento atual
    for (let i = 0; i < block.words.length; i++) {
        if (currentTime >= block.words[i].start && currentTime <= block.words[i].end) {
            activeWordIndex = i;
        }
    }

    if (activeWordIndex !== currentWordIndex) {
        currentWordIndex = activeWordIndex;
        const spans = subtitleTextEl.querySelectorAll('.sub-word');
        spans.forEach((span, index) => {
            if (index === activeWordIndex) {
                span.classList.add('highlight');
            } else {
                span.classList.remove('highlight');
            }
        });
    }
}

// Toggle do botão de legendas
subtitleBtn.addEventListener('click', () => {
    subtitlesVisible = !subtitlesVisible;
    if (subtitlesVisible) {
        subtitleBtn.classList.add('active');
        subtitleWrapper.classList.add('show');
    } else {
        subtitleBtn.classList.remove('active');
        subtitleWrapper.classList.remove('show');
        subtitleTextEl.classList.remove('show-text');
        currentSubtitleText = ""; // Reseta o estado
    }
});

// Função que verifica o tempo atual e atualiza a interface
function updateSubtitles(currentTime) {
    if (!subtitlesVisible) return;

    // Busca se existe alguma legenda cujo tempo bate com o áudio atual
    const activeSub = parsedSubtitles.find(sub => currentTime >= sub.start && currentTime <= sub.end);

    if (activeSub) {
        // Atualiza o bloco de texto inteiro (frase)
        if (currentSubtitleText !== activeSub.text) {
            currentSubtitleText = activeSub.text;
            currentWordIndex = -1; // Reseta o índice da palavra

            // Atualiza a frase na tela imediatamente sem atrasos/transições
            subtitleTextEl.innerHTML = generateSentenceHTML(activeSub);
            subtitleTextEl.classList.add('show-text');
            highlightWord(activeSub, currentTime);
        } else if (subtitleTextEl.classList.contains('show-text')) {
            // Se o bloco de texto já está visível, apenas atualiza a cor da palavra
            highlightWord(activeSub, currentTime);
        }
    } else {
        // Esconde a legenda caso não haja texto no tempo atual
        if (currentSubtitleText !== "") {
            currentSubtitleText = "";
            currentWordIndex = -1;
            subtitleTextEl.classList.remove('show-text');
        }
    }
}

// Redimensionar Canvas
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Lógica de Upload do JSON ---
jsonInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        jsonNameDisplay.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                // Lê e faz o parse do conteúdo do ficheiro
                const uploadedJSON = JSON.parse(event.target.result);
                parsedSubtitles = uploadedJSON;

                // Limpa as legendas no ecrã para evitar conflitos ao trocar o ficheiro
                currentSubtitleText = "";
                currentWordIndex = -1;
                subtitleTextEl.classList.remove('show-text');

                // Se estiver a reproduzir com legendas visíveis, tenta atualizar com os novos dados
                if (subtitlesVisible) {
                    updateSubtitles(audio.currentTime);
                }
            } catch (error) {
                alert("Erro ao ler o ficheiro JSON. Verifique se o formato está correto.");
                console.error(error);
                jsonNameDisplay.textContent = "Erro no ficheiro";
            }
        };
        // Lê o ficheiro como texto para podermos convertê-lo depois
        reader.readAsText(file);
    }
});

// --- Lógica de Upload de Áudio ---
audioInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const objectURL = URL.createObjectURL(file);
        audio.src = objectURL;
        fileNameDisplay.textContent = file.name;
        playPauseBtn.disabled = false;

        // Reseta UI
        progressBar.value = 0;
        progressFill.style.width = '0%';
        currentTimeEl.textContent = '0:00';
        audio.volume = 1; // Garante que o volume volte a 100% ao trocar de música

        // Para carregar os metadados (duração)
        audio.load();

        // Se o contexto já existe, precisamos garantir que está rodando
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
});

// --- Lógica do Áudio ---
audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    progressBar.max = audio.duration;
});

audio.addEventListener('timeupdate', () => {
    progressBar.value = audio.currentTime;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    const percentage = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percentage + '%';

    // Checa a minutagem da legenda atual
    updateSubtitles(audio.currentTime);
});

audio.addEventListener('ended', () => {
    isPlaying = false;
    updatePlayButton();
});

// Barra de progresso manual
progressBar.addEventListener('input', () => {
    audio.currentTime = progressBar.value;
    const percentage = (progressBar.value / audio.duration) * 100;
    progressFill.style.width = percentage + '%';
});

// --- Controles Principais ---
playPauseBtn.addEventListener('click', () => {
    if (!audio.src) return;

    // Inicializa o Web Audio API apenas na primeira interação do usuário (Regra dos Navegadores)
    if (!audioContext) {
        initWebAudio();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (isPlaying) {
        // Inicia o processo de pausa suave (Fade Out)
        isPlaying = false;
        updatePlayButton(); // Muda o ícone para play imediatamente

        clearInterval(fadeInterval);
        let vol = audio.volume;

        // Reduz o volume a cada 30ms para dar um efeito de descida rápida (dura aprox. 300ms)
        fadeInterval = setInterval(() => {
            vol -= 0.1;
            if (vol <= 0) {
                audio.volume = 0;
                audio.pause();
                clearInterval(fadeInterval);
            } else {
                audio.volume = vol;
            }
        }, 30);

    } else {
        // Toca a música e restaura o volume
        isPlaying = true;
        updatePlayButton();

        clearInterval(fadeInterval);
        audio.volume = 1; // Restaura para o volume máximo
        audio.play();
    }
});

function updatePlayButton() {
    if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        playPauseBtn.classList.add('playing');
    } else {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playPauseBtn.classList.remove('playing');
    }
}

skipBackBtn.addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 10);
});

skipForwardBtn.addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
});

// Controle de Velocidade
const speeds = [1, 1.2, 1.5, 2];
let currentSpeedIndex = 0;
speedBtn.addEventListener('click', () => {
    currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
    const newSpeed = speeds[currentSpeedIndex];
    audio.playbackRate = newSpeed;
    speedBtn.textContent = newSpeed + 'X';
});

// --- Utilitários ---
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// --- Web Audio API e Canvas (A Mágica das Ondas) ---
function initWebAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128; // Define a resolução da frequência

    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

let lastSubCheckTime = -1;

function drawWaveform() {
    animationId = requestAnimationFrame(drawWaveform);

    // Atualiza as legendas a 60 FPS no loop de animação.
    // O evento padrão do áudio dispara devagar e "pula" palavras rápidas.
    // Executar isso aqui garante que cada micro-palavra acenda no momento exato.
    if (audio.currentTime !== lastSubCheckTime) {
        updateSubtitles(audio.currentTime);
        lastSubCheckTime = audio.currentTime;
    }

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    let targetSpeed = 0;

    if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        // Calcula a média das frequências para obter a "energia" da música
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // Aumenta a amplitude baseada na batida da música
        targetAmplitude = 2 + (average * 0.4);
        targetSpeed = 1;
    } else {
        // Se pausado, volta para uma linha reta e para de mover
        targetAmplitude = 0;
        targetSpeed = 0;
    }

    // Suavização (Lerp) para a animação não ficar travada/pulando
    currentAmplitude += (targetAmplitude - currentAmplitude) * 0.1;
    currentSpeed += (targetSpeed - currentSpeed) * 0.1;

    // Velocidade das ondas multiplicada pela velocidade atual
    phase1 += 0.05 * currentSpeed;
    phase2 -= 0.03 * currentSpeed;
    phase3 += 0.04 * currentSpeed;

    // Desenha as 3 linhas (Verde, Azul claro, Roxo)
    drawSineWave(ctx, width, centerY, currentAmplitude * 1.2, phase1, '#68d391', 0.015);
    drawSineWave(ctx, width, centerY, currentAmplitude * 0.9, phase2, '#7f9cf5', 0.02);
    drawSineWave(ctx, width, centerY, currentAmplitude * 0.6, phase3, '#9f7aea', 0.01);
}

function drawSineWave(ctx, width, centerY, amplitude, phase, color, frequency) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    for (let x = 0; x < width; x++) {
        // A função seno cria as ondas. A multiplicação diminui as bordas para centralizar o efeito.
        // Isso faz as pontas da linha ficarem grudadas no centro vertical (como no vídeo).
        const edgeDamping = Math.sin((x / width) * Math.PI);

        const y = centerY + Math.sin(x * frequency + phase) * amplitude * edgeDamping;

        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

// Desenha ondas paradas no início
drawWaveform();
