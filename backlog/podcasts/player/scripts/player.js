// --- Elementos do DOM ---
const podcastTitleEl = document.getElementById('podcast-title');
const sectionTitleEl = document.getElementById('section-title');
const episodeTitleEl = document.getElementById('episode-title');
const playerStatusEl = document.getElementById('player-status');
const playPauseBtn = document.getElementById('play-pause-btn');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const skipBackBtn = document.getElementById('skip-back');
const skipForwardBtn = document.getElementById('skip-forward');
const speedBtn = document.getElementById('speed-btn');
const subtitleBtn = document.getElementById('subtitle-btn');
const downloadBtn = document.getElementById('download-btn');
const subtitleWrapper = document.getElementById('subtitle-wrapper');
const subtitleTextEl = document.getElementById('subtitle-text');

// --- Constantes ---
const BASE_URL = 'https://raw.githubusercontent.com/matheuscdd/kanabase/refs/heads/main';
const PODCASTS_BASE_URL = `${BASE_URL}/podcasts`;
const VERSION_URL = `${BASE_URL}/version.json`;
const EPISODES_URL = `${PODCASTS_BASE_URL}/episodes.json`;
const speeds = [1, 1.2, 1.5, 2];
const PLAYBACK_PROGRESS_KEY_PREFIX = 'podcast-progress:';
const PLAYBACK_PROGRESS_SAVE_INTERVAL_MS = 10_000;

// --- Variáveis Globais ---
const audio = new Audio();
audio.crossOrigin = 'anonymous';
audio.preload = 'metadata';

let isPlaying = false;
let fadeInterval = null;
let parsedSubtitles = [];
let subtitlesVisible = false;
let currentSubtitleText = '';
let currentWordIndex = -1;
let currentSpeedIndex = 0;
let episodesPromise = null;
let currentEpisodeId = '';
let playbackProgressIntervalId = null;

const loadState = {
    episodeLoaded: false,
    audioReady: false,
    transcriptState: 'pending',
    failed: false,
};

function setPlayerStatus(message, tone = 'default') {
    playerStatusEl.textContent = message;
    playerStatusEl.classList.remove('is-ready', 'is-warning', 'is-error');

    if (tone === 'ready') {
        playerStatusEl.classList.add('is-ready');
    } else if (tone === 'warning') {
        playerStatusEl.classList.add('is-warning');
    } else if (tone === 'error') {
        playerStatusEl.classList.add('is-error');
    }
}

function setPlaybackControlsEnabled(enabled) {
    playPauseBtn.disabled = !enabled;
    skipBackBtn.disabled = !enabled;
    skipForwardBtn.disabled = !enabled;
    speedBtn.disabled = !enabled;
    progressBar.disabled = !enabled;
    downloadBtn.disabled = !enabled;
}

function resetSubtitleUI() {
    subtitlesVisible = false;
    currentSubtitleText = '';
    currentWordIndex = -1;
    subtitleBtn.classList.remove('active');
    subtitleWrapper.classList.remove('show');
    subtitleTextEl.classList.remove('show-text');
    subtitleTextEl.innerHTML = '';
}

function setSubtitleAvailability(hasSubtitles) {
    subtitleBtn.disabled = !hasSubtitles;

    if (!hasSubtitles) {
        resetSubtitleUI();
    }
}

function updateStatusFromState() {
    if (loadState.failed) {
        return;
    }

    if (!loadState.episodeLoaded) {
        setPlayerStatus('A carregar episódio...');
        return;
    }

    if (!loadState.audioReady) {
        setPlayerStatus('A preparar episódio...');
        return;
    }

    if (loadState.transcriptState === 'pending') {
        setPlayerStatus('Áudio pronto · a carregar transcrição...', 'ready');
        return;
    }

    if (loadState.transcriptState === 'available') {
        setPlayerStatus('Pronto a reproduzir', 'ready');
        return;
    }

    if (loadState.transcriptState === 'missing') {
        setPlayerStatus('Áudio pronto · sem transcrição', 'warning');
        return;
    }

    setPlayerStatus('Áudio pronto · falha ao carregar transcrição', 'warning');
}

function resetPlayerTimeline() {
    clearInterval(fadeInterval);
    clearPlaybackProgressTracking();
    isPlaying = false;
    audio.pause();
    audio.volume = 1;
    audio.playbackRate = speeds[0];
    currentSpeedIndex = 0;
    speedBtn.textContent = `${speeds[0]}X`;
    updatePlayButton();
    progressBar.value = 0;
    progressBar.max = 0;
    progressFill.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    durationEl.textContent = '0:00';
}

function prepareEpisodeUiForLoading() {
    parsedSubtitles = [];
    resetSubtitleUI();
    resetPlayerTimeline();
    setSubtitleAvailability(false);
}

function updateEpisodeMetadata(episode) {
    podcastTitleEl.textContent = episode.podcastName || 'Podcast';
    sectionTitleEl.textContent = episode.sectionName || 'Secção';
    episodeTitleEl.textContent = episode.name || 'Episódio';

    if (episode.name) {
        document.title = `${episode.name} | Player`;
    }
}

function handleFatalPlayerError(message) {
    loadState.failed = true;
    loadState.audioReady = false;
    setPlaybackControlsEnabled(false);
    setSubtitleAvailability(false);
    resetPlayerTimeline();
    setPlayerStatus(message, 'error');
}

function resolveAssetUrl(assetPath) {
    if (!assetPath) {
        return '';
    }

    if (/^https?:\/\//i.test(assetPath)) {
        return assetPath;
    }

    return `${PODCASTS_BASE_URL}/${assetPath}`;
}

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        error.url = url;
        throw error;
    }

    return response.json();
}

async function getEpisodes() {
    if (!episodesPromise) {
        episodesPromise = fetchJson(EPISODES_URL);
    }

    const episodes = await episodesPromise;
    return Array.isArray(episodes) ? episodes : [];
}

function normalizeSubtitles(data) {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .map((block) => {
            if (!block || typeof block !== 'object') {
                return null;
            }

            const start = Number(block.start);
            const end = Number(block.end);
            const text = typeof block.text === 'string' ? block.text : '';

            if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
                return null;
            }

            const words = Array.isArray(block.words)
                ? block.words
                    .map((word) => {
                        const wordStart = Number(word?.start);
                        const wordEnd = Number(word?.end);
                        const wordText = typeof word?.word === 'string' ? word.word : '';

                        if (!Number.isFinite(wordStart) || !Number.isFinite(wordEnd) || !wordText) {
                            return null;
                        }

                        return {
                            word: wordText,
                            start: wordStart,
                            end: wordEnd,
                        };
                    })
                    .filter(Boolean)
                : [];

            return {
                start,
                end,
                text,
                words,
            };
        })
        .filter(Boolean);
}

async function loadTranscript(episode) {
    const transcriptUrl = resolveAssetUrl(episode.transcription);

    if (!transcriptUrl) {
        parsedSubtitles = [];
        loadState.transcriptState = 'missing';
        setSubtitleAvailability(false);
        updateStatusFromState();
        return;
    }

    try {
        const transcript = await fetchJson(transcriptUrl);
        parsedSubtitles = normalizeSubtitles(transcript);
        loadState.transcriptState = parsedSubtitles.length > 0 ? 'available' : 'missing';
        setSubtitleAvailability(parsedSubtitles.length > 0);
    } catch (error) {
        if (error.status === 404) {
            parsedSubtitles = [];
            loadState.transcriptState = 'missing';
            setSubtitleAvailability(false);
            updateStatusFromState();
            return;
        }

        console.error(error);
        parsedSubtitles = [];
        loadState.transcriptState = 'error';
        setSubtitleAvailability(false);
    }

    updateStatusFromState();
}

function getEpisodeIdFromLocation() {
    const params = new URLSearchParams(globalThis.location.search);
    return params.get('id')?.trim() || '';
}

function getPlaybackProgressStorageKey(episodeId) {
    return `${PLAYBACK_PROGRESS_KEY_PREFIX}${episodeId}`;
}

function clearPlaybackProgressTracking() {
    if (playbackProgressIntervalId === null) {
        return;
    }

    clearInterval(playbackProgressIntervalId);
    playbackProgressIntervalId = null;
}

function clearPlaybackProgress(episodeId = currentEpisodeId) {
    if (!episodeId) {
        return;
    }

    try {
        localStorage.removeItem(getPlaybackProgressStorageKey(episodeId));
    } catch {
        // Ignora falhas de acesso ao storage para nao travar o player.
    }
}

function readPlaybackProgress(episodeId) {
    if (!episodeId) {
        return null;
    }

    try {
        const rawValue = localStorage.getItem(getPlaybackProgressStorageKey(episodeId));

        if (!rawValue) {
            return null;
        }

        const parsedValue = JSON.parse(rawValue);
        const savedTime = Number(parsedValue?.time);

        if (parsedValue?.id !== episodeId || !Number.isFinite(savedTime) || savedTime <= 0) {
            clearPlaybackProgress(episodeId);
            return null;
        }

        return savedTime;
    } catch {
        clearPlaybackProgress(episodeId);
        return null;
    }
}

function persistPlaybackProgress() {
    if (!currentEpisodeId || !loadState.audioReady) {
        return;
    }

    const currentTime = Number(audio.currentTime);

    if (!Number.isFinite(currentTime) || currentTime <= 0) {
        clearPlaybackProgress();
        return;
    }

    if (Number.isFinite(audio.duration) && currentTime >= Math.max(audio.duration - 1, 0)) {
        clearPlaybackProgress();
        return;
    }

    try {
        localStorage.setItem(
            getPlaybackProgressStorageKey(currentEpisodeId),
            JSON.stringify({
                id: currentEpisodeId,
                time: currentTime,
            }),
        );
    } catch {
        // Ignora falhas de acesso ao storage para nao travar o player.
    }
}

function startPlaybackProgressTracking() {
    clearPlaybackProgressTracking();

    playbackProgressIntervalId = globalThis.setInterval(() => {
        persistPlaybackProgress();
    }, PLAYBACK_PROGRESS_SAVE_INTERVAL_MS);
}

function updateTimelineUi(currentTime) {
    progressBar.value = currentTime;
    currentTimeEl.textContent = formatTime(currentTime);

    const percentage = audio.duration > 0
        ? (currentTime / audio.duration) * 100
        : 0;

    progressFill.style.width = `${percentage}%`;
}

function restorePlaybackProgress() {
    const savedTime = readPlaybackProgress(currentEpisodeId);

    if (!savedTime || !Number.isFinite(audio.duration)) {
        return;
    }

    const resumeTime = Math.min(savedTime, Math.max(audio.duration - 1, 0));

    if (resumeTime <= 0) {
        clearPlaybackProgress();
        return;
    }

    audio.currentTime = resumeTime;
    updateTimelineUi(audio.currentTime);
    updateSubtitles(audio.currentTime);
}

// Gera o HTML mantendo o texto original e isolando as palavras em spans
function generateSentenceHTML(block) {
    if (!Array.isArray(block.words) || block.words.length === 0) {
        return block.text;
    }

    let result = '';
    let currentPos = 0;
    const text = block.text;

    block.words.forEach((word, index) => {
        const cleanWord = word.word.trim();
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

function highlightWord(block, currentTime) {
    const words = Array.isArray(block.words) ? block.words : [];
    let activeWordIndex = -1;

    for (let index = 0; index < words.length; index += 1) {
        if (currentTime >= words[index].start && currentTime <= words[index].end) {
            activeWordIndex = index;
        }
    }

    if (activeWordIndex !== currentWordIndex) {
        currentWordIndex = activeWordIndex;
        const spans = subtitleTextEl.querySelectorAll('.sub-word');
        spans.forEach((span, index) => {
            span.classList.toggle('highlight', index === activeWordIndex);
        });
    }
}

subtitleBtn.addEventListener('click', () => {
    if (subtitleBtn.disabled) {
        return;
    }

    subtitlesVisible = !subtitlesVisible;

    if (subtitlesVisible) {
        subtitleBtn.classList.add('active');
        subtitleWrapper.classList.add('show');
        updateSubtitles(audio.currentTime);
        return;
    }

    subtitleBtn.classList.remove('active');
    subtitleWrapper.classList.remove('show');
    subtitleTextEl.classList.remove('show-text');
    currentSubtitleText = '';
    currentWordIndex = -1;
});

function updateSubtitles(currentTime) {
    if (!subtitlesVisible || parsedSubtitles.length === 0) {
        return;
    }

    const activeSubtitle = parsedSubtitles.find(
        (subtitle) => currentTime >= subtitle.start && currentTime <= subtitle.end,
    );

    if (activeSubtitle) {
        if (currentSubtitleText !== activeSubtitle.text) {
            currentSubtitleText = activeSubtitle.text;
            currentWordIndex = -1;
            subtitleTextEl.innerHTML = generateSentenceHTML(activeSubtitle);
            subtitleTextEl.classList.add('show-text');
        }

        highlightWord(activeSubtitle, currentTime);
        return;
    }

    if (currentSubtitleText !== '') {
        currentSubtitleText = '';
        currentWordIndex = -1;
        subtitleTextEl.classList.remove('show-text');
    }
}

audio.addEventListener('loadedmetadata', () => {
    loadState.audioReady = true;
    durationEl.textContent = formatTime(audio.duration);
    progressBar.max = audio.duration;
    restorePlaybackProgress();
    setPlaybackControlsEnabled(true);
    updateStatusFromState();
});

audio.addEventListener('timeupdate', () => {
    updateTimelineUi(audio.currentTime);
    updateSubtitles(audio.currentTime);
});

audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayButton();
    startPlaybackProgressTracking();
});

audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayButton();
    clearPlaybackProgressTracking();

    if (!audio.ended) {
        persistPlaybackProgress();
    }
});

audio.addEventListener('ended', () => {
    isPlaying = false;
    clearPlaybackProgressTracking();
    clearPlaybackProgress();
    updatePlayButton();
});

audio.addEventListener('error', () => {
    if (!audio.src || loadState.failed) {
        return;
    }

    handleFatalPlayerError('Não foi possível carregar o áudio deste episódio.');
});

progressBar.addEventListener('input', () => {
    if (!loadState.audioReady) {
        return;
    }

    audio.currentTime = Number(progressBar.value);
    updateTimelineUi(audio.currentTime);
    updateSubtitles(audio.currentTime);
    persistPlaybackProgress();
});

playPauseBtn.addEventListener('click', async () => {
    if (!loadState.audioReady) {
        return;
    }

    if (isPlaying) {
        isPlaying = false;
        updatePlayButton();
        clearInterval(fadeInterval);
        audio.pause();
        audio.volume = 1;
        return;
    }

    isPlaying = true;
    updatePlayButton();
    clearInterval(fadeInterval);
    audio.volume = 1;

    try {
        await audio.play();
    } catch (error) {
        console.error(error);
        isPlaying = false;
        updatePlayButton();
        setPlayerStatus('Não foi possível iniciar a reprodução.', 'error');
    }
});

function updatePlayButton() {
    if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        playPauseBtn.classList.add('playing');
        return;
    }

    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    playPauseBtn.classList.remove('playing');
}

skipBackBtn.addEventListener('click', () => {
    if (!loadState.audioReady) {
        return;
    }

    audio.currentTime = Math.max(0, audio.currentTime - 10);
});

skipForwardBtn.addEventListener('click', () => {
    if (!loadState.audioReady) {
        return;
    }

    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
});

speedBtn.addEventListener('click', () => {
    if (!loadState.audioReady) {
        return;
    }

    currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
    const speed = speeds[currentSpeedIndex];
    audio.playbackRate = speed;
    speedBtn.textContent = `${speed}X`;
});

function formatTime(seconds) {
    if (Number.isNaN(seconds)) {
        return '0:00';
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

downloadBtn.addEventListener('click', async () => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isPhoenix = userAgent.includes('phoenix') || userAgent.includes('phx/');

    if (isPhoenix) {
        const msg = "Abra o site em outro navegador";
        document.body.innerHTML = msg;
        alert(msg);
        return;
    }

    if (!audio.src) {
        return;
    }

    setPlayerStatus('A preparar download...', 'ready');

    try {
        downloadBtn.disabled = true;
        const resp = await fetch(audio.src);

        if (!resp.ok) {
            throw new Error(`Falha no download: ${resp.status}`);
        }

        const blob = await resp.blob();

        let filename = 'episode.mp3';

        try {
            const pathname = new URL(audio.src).pathname;
            const last = decodeURIComponent(pathname.split('/').pop() || '');
            if (last) {
                filename = last.includes('.') ? last : `${last}.mp3`;
            } else if (episodeTitleEl && episodeTitleEl.textContent) {
                filename = `${episodeTitleEl.textContent.replace(/[^a-z0-9\-_\.]/gi, '_')}.mp3`;
            }
        } catch {
            if (episodeTitleEl && episodeTitleEl.textContent) {
                filename = `${episodeTitleEl.textContent.replace(/[^a-z0-9\-_\.]/gi, '_')}.mp3`;
            }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setPlayerStatus('Download iniciado', 'ready');
    } catch (error) {
        console.error(error);
        setPlayerStatus('Falha ao iniciar o download', 'warning');
    } finally {
        downloadBtn.disabled = false;
    }
});

globalThis.addEventListener('beforeunload', () => {
    persistPlaybackProgress();
});

async function bootstrapPlayer() {
    const episodeId = getEpisodeIdFromLocation();
    setPlaybackControlsEnabled(false);
    setSubtitleAvailability(false);
    updatePlayButton();
    updateStatusFromState();

    if (!episodeId) {
        handleFatalPlayerError('Episódio não informado. Volte à biblioteca.');
        return;
    }

    try {
        const episodes = await getEpisodes();
        const episode = episodes.find((entry) => entry.id === episodeId);

        if (!episode) {
            episodeTitleEl.textContent = 'Episódio indisponível';
            handleFatalPlayerError('Não foi possível encontrar este episódio.');
            return;
        }

        loadState.failed = false;
        loadState.episodeLoaded = true;
        loadState.audioReady = false;
        loadState.transcriptState = 'pending';

        updateEpisodeMetadata(episode);
        prepareEpisodeUiForLoading();
        currentEpisodeId = episodeId;
        updateStatusFromState();

        const audioUrl = resolveAssetUrl(episode.audio);
        if (!audioUrl) {
            handleFatalPlayerError('Este episódio não tem áudio disponível.');
            return;
        }

        audio.src = audioUrl;
        audio.load();
        void loadTranscript(episode);
    } catch (error) {
        console.error(error);
        handleFatalPlayerError('Falha ao carregar o episódio.');
    }
}

await bootstrapPlayer();
