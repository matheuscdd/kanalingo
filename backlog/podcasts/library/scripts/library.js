const BASE_URL = 'https://raw.githubusercontent.com/matheuscdd/kanabase/refs/heads/main';
let allPodcasts = 'http://127.0.0.1:3000/podcasts.json';
let allSections = 'http://127.0.0.1:3000/sections.json';
let allEpisodes = 'http://127.0.0.1:3000/episodes.json';

if (globalThis.location.hostname.includes('vercel')) {
    allPodcasts = `${BASE_URL}/podcasts/podcasts.json`;
    allSections = `${BASE_URL}/podcasts/sections.json`;
    allEpisodes = `${BASE_URL}/podcasts/episodes.json`;
}

const VERSION_URL = `${BASE_URL}/version.json`;

async function getData(url) {
    const response = await fetch(url);
    const data = await response.json();
    return data;
}

// --- 2. Estado da Aplicação e Traduções ---
const translations = {
    pt: {
        titlePodcasts: "O que queres ouvir?",
        searchPodcasts: "Pesquisar podcasts...",
        searchSections: "Pesquisar secções (ex: Temporadas)...",
        searchEpisodes: "Pesquisar episódios...",
        emptyPodcasts: "Nenhum podcast encontrado.",
        emptySections: "Nenhuma secção encontrada.",
        emptyEpisodes: "Nenhum episódio encontrado.",
        episodesCount: "episódios",
        playing: "A reproduzir:",
        flagUrl: "https://flagcdn.com/w40/pt.png"
    },
    en: {
        titlePodcasts: "What do you want to hear?",
        searchPodcasts: "Search podcasts...",
        searchSections: "Search sections (e.g., Seasons)...",
        searchEpisodes: "Search episodes...",
        emptyPodcasts: "No podcasts found.",
        emptySections: "No sections found.",
        emptyEpisodes: "No episodes found.",
        episodesCount: "episodes",
        playing: "Playing:",
        flagUrl: "https://flagcdn.com/w40/gb.png"
    },
    // es: {
    //     titlePodcasts: "¿Qué quieres escuchar?",
    //     searchPodcasts: "Buscar podcasts...",
    //     searchSections: "Buscar secciones (ej: Temporadas)...",
    //     searchEpisodes: "Buscar episodios...",
    //     emptyPodcasts: "No se encontraron podcasts.",
    //     emptySections: "No se encontraron secciones.",
    //     emptyEpisodes: "No se encontraron episodios.",
    //     episodesCount: "episodios",
    //     playing: "Reproduciendo:",
    //     flagUrl: "https://flagcdn.com/w40/es.png"
    // }
};

const ctx = {
    podcasts: null,
    sections: null,
    episodes: null,
}

let state = {
    currentIndex: 0,
    currentId: null,
    currentPodcastId: null,
    currentSectionId: null,
    lang: localStorage.getItem('kanalingo_lang') || 'pt',
    viewModes: {
        podcasts: localStorage.getItem('kanalingo_podcasts_view') || 'grid',
        sections: localStorage.getItem('kanalingo_sections_view') || 'grid',
        episodes: localStorage.getItem('kanalingo_episodes_view') || 'list' // Por defeito, episódios começam em lista
    }
};

// --- 3. Elementos do DOM ---
const viewsOrder = ["podcasts", "sections", "episodes"];
const views = {
    podcasts: document.getElementById('view-podcasts'),
    sections: document.getElementById('view-sections'),
    episodes: document.getElementById('view-episodes')
};

const containers = {
    podcasts: document.getElementById('podcasts-grid'),
    sections: document.getElementById('sections-grid'),
    episodes: document.getElementById('episodes-grid')
};

const inputs = {
    podcasts: document.getElementById('search-podcasts'),
    sections: document.getElementById('search-sections'),
    episodes: document.getElementById('search-episodes')
};

// --- 4. Funções de Idioma ---
function toggleLangDropdown() {
    document.getElementById('lang-dropdown').classList.toggle('show');
}

function setLanguage(langCode) {
    state.lang = langCode;
    localStorage.setItem('kanalingo_lang', langCode);

    // Atualizar UI do botão
    document.getElementById('current-lang-text').textContent = langCode.toUpperCase();
    document.getElementById('current-lang-flag').src = translations[langCode].flagUrl;

    // Fechar dropdown
    document.getElementById('lang-dropdown').classList.remove('show');

    // Atualizar textos estáticos
    applyTranslations();

    navigate('podcasts');
}

function applyTranslations() {
    const t = translations[state.lang];
    document.getElementById('title-podcasts').textContent = t.namePodcasts;
    inputs.podcasts.placeholder = t.searchPodcasts;
    inputs.sections.placeholder = t.searchSections;
    inputs.episodes.placeholder = t.searchEpisodes;
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
    const selector = document.querySelector('.lang-selector');
    if (selector && !selector.contains(e.target)) {
        document.getElementById('lang-dropdown').classList.remove('show');
    }
});

// --- 5. Funções de Navegação e Visualização ---
function setViewMode(viewName, mode) {
    state.viewModes[viewName] = mode;
    localStorage.setItem(`kanalingo_${viewName}_view`, mode);
    updateViewModeUI(viewName);
}

function updateViewModeUI(viewName) {
    const mode = state.viewModes[viewName];
    const container = containers[viewName];

    if (!container) return;

    if (mode === 'list') {
        container.classList.add('list-mode');
    } else {
        container.classList.remove('list-mode');
    }

    const buttons = document.querySelectorAll(`#view-${viewName} .view-btn`);
    buttons.forEach(btn => {
        if (btn.dataset.view === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

globalThis.addEventListener('popstate', (e) => {
  const nextIndex = state.currentIndex === 0 ?  0 : state.currentIndex - 1;
  navigate(viewsOrder[nextIndex], null, { push: false });
});

function navigate(viewName, id = null, { push = true } = {}) {
    if (push) {
    history.pushState({ view: viewName, id }, '', "#" + crypto.randomUUID());
  } else {
    history.replaceState({ view: viewName, id }, '', location.href);
  }

    state.currentIndex = viewsOrder.indexOf(viewName);
    state.currentId = id;

    globalThis.scrollTo({ top: 0, behavior: "smooth" });
    Object.values(views).forEach(view => view.classList.remove('active'));
    Object.values(inputs).forEach(input => input.value = '');
    views[viewName].classList.add('active');
    const headerImg = document.getElementById('header-podcast-img');

    if (viewName === 'podcasts') {
        state.currentPodcastId = null;
        state.currentSectionId = null;
        renderPodcasts(ctx.podcasts);
    }
    else if (viewName === 'sections') {
        if (id) state.currentPodcastId = id;
        const podcast = ctx.podcasts.find(p => p.id === state.currentPodcastId);
        document.getElementById('header-podcast-title').textContent = podcast.name;

        // Tratar a imagem no cabeçalho
        
        headerImg.parentElement.style = 'background-color: ' + podcast.color;
        if (podcast.imageUrl) {
            headerImg.src = podcast.imageUrl;
            headerImg.style.display = 'block';
        } else {
            headerImg.style.display = 'none';
        }

        renderSections(podcast.sections);
    }
    else if (viewName === 'episodes') {
        if (id) state.currentSectionId = id;
        const podcast = ctx.podcasts.find(p => p.id === state.currentPodcastId);
        const section = podcast.sections.find(s => s.id === state.currentSectionId);
        document.getElementById('header-section-title').textContent = section.name;

        const headerImg = document.getElementById('header-section-img');
        headerImg.parentElement.style = 'background-color: ' + section.color;
        if (section.imageUrl) {
            headerImg.src = section.imageUrl;
            headerImg.style.display = 'block';
        } else {
            headerImg.style.display = 'none';
        }

        renderEpisodes(section.episodes);
    }
}

// --- 5. Funções de Renderização ---
function renderEmptyState(container, message) {
    container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ghost"></i>
                    <p>${message}</p>
                </div>
            `;
}

async function renderPodcasts(data) {
    containers.podcasts.innerHTML = '';
    if (data.length === 0) return renderEmptyState(containers.podcasts, translations[state.lang].emptyPodcasts);

    for (const podcast of data.filter(x => x.language === state.lang)) {
        const card = document.createElement('div');
        // Adiciona a classe 'has-image' para ativar a miniatura na vista de lista, se existir imagem
        const hasImageClass = podcast.imageUrl ? 'has-image' : 'no-image';
        card.className = `card ${hasImageClass}`;
        card.onclick = () => navigate('sections', podcast.id);

        let thumbHtml = '';
        if (podcast.imageUrl) {
            const imgPath = await getCachedIcon(podcast.imageUrl);
            thumbHtml = `<img src="${imgPath}" class="card-img" alt="Capa" onerror="this.style.display='none';">`;
        }
        card.innerHTML = `
                    <div class="card-image-placeholder" style="background-color: ${podcast.color}">
                        ${thumbHtml}
                    </div>
                    <div class="card-content">
                        <div class="card-title">${podcast.name}</div>
                    </div>
                `;
        containers.podcasts.appendChild(card);
    };
}

async function renderSections(data) {
    containers.sections.innerHTML = '';
    if (data.length === 0) return renderEmptyState(containers.sections, translations[state.lang].emptySections);

    for (const section of data) {
        const card = document.createElement('div');
        const hasImageClass = section.imageUrl ? 'has-image' : 'no-image';
        card.className = `card card-section ${hasImageClass}`;
        card.onclick = () => navigate('episodes', section.id);

        let thumbHtml = '';
        if (section.imageUrl) {
            const imgPath = await getCachedIcon(section.imageUrl);
            thumbHtml = `<img src="${imgPath}" class="card-img" alt="Capa" onerror="this.style.display='none';">`;
        }
        card.innerHTML = `
                    <div class="card-image-placeholder" style="background-color: ${section.color}">
                        ${thumbHtml}
                    </div>
                    <div class="card-content">
                        <div class="card-title">${section.name}</div>
                        <div class="card-subtitle">${section.episodes.length} ${translations[state.lang].episodesCount}</div>
                    </div>
                `;
        containers.sections.appendChild(card);
    };
}

async function renderEpisodes(data) {
    containers.episodes.innerHTML = '';
    if (data.length === 0) return renderEmptyState(containers.episodes, translations[state.lang].emptyEpisodes);

    for (const episode of data) {
        const item = document.createElement('div'); // Mudou de <li> para <div> para fazer parte do Grid
        item.className = 'episode-item';
        item.onclick = () => globalThis.location.href = `/backlog/podcasts/player/player.html?id=${episode.id}`;
        
        let thumbHtml = '';
        if (episode.color) {
            const imgPath = await getCachedIcon(episode.imageUrl);
            thumbHtml = `
                <img src="${imgPath}" class="episode-thumb" alt="Capa" onerror="this.style.display='none';" style="background-color: ${episode.color ?? '#000'}">
            `;
        }
        item.innerHTML = `
                    <div class="episode-play-btn"><i class="fas fa-circle-play"></i></div>
                        ${thumbHtml}
                    <div class="episode-info">
                        <div class="episode-title">${episode.name}</div>
                        <div class="episode-duration"><i class="far fa-clock"></i> ${formatDuration(episode.duration)}</div>
                    </div>
                `;
        containers.episodes.appendChild(item);
    };
}

// --- 6. Event Listeners para Pesquisa (Filtros) ---
inputs.podcasts.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const filtrados = ctx.podcasts.filter(p =>
        p.name.toLowerCase().includes(termo) 
    );
    renderPodcasts(filtrados);
});

inputs.sections.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const podcast = ctx.podcasts.find(p => p.id === state.currentPodcastId);
    const filtrados = podcast.sections.filter(s =>
        s.name.toLowerCase().includes(termo)
    );
    renderSections(filtrados);
});

inputs.episodes.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const podcast = ctx.podcasts.find(p => p.id === state.currentPodcastId);
    const section = podcast.sections.find(s => s.id === state.currentSectionId);
    const filtrados = section.episodes.filter(ep =>
        ep.name.toLowerCase().includes(termo)
    );
    renderEpisodes(filtrados);
});

// --- 7. Inicialização ---
applyTranslations(); // Aplica idioma guardado logo no início

// Atualiza a UI do botão de idioma na inicialização
document.getElementById('current-lang-text').textContent = state.lang.toUpperCase();
document.getElementById('current-lang-flag').src = translations[state.lang].flagUrl;

async function loadContent() {
    await initDB();
    ctx.episodes = await getData(allEpisodes);
    ctx.sections = await getData(allSections);
    ctx.podcasts = await getData(allPodcasts);
    const podcastsRef = {};
    ctx.podcasts.forEach(x => (podcastsRef[x.id] = x.ref));

    ctx.sections = ctx.sections.map(x => ({...x, 
        imageUrl: `${BASE_URL}/podcasts/covers/${podcastsRef[x.podcastId]}/${x.order}.png`,
        episodes: ctx.episodes
            .filter(y => y.podcastId === x.podcastId && y.sectionId === x.id)
            .toSorted((a, b) => a.order - b.order)
    }));

    ctx.sections.forEach(section => {
        section.episodes.forEach(episode => {
            episode.imageUrl = `${BASE_URL}/podcasts/covers/${podcastsRef[section.podcastId]}/${section.order}/${episode.order}.png`;
        });
    });
    
    ctx.podcasts = ctx.podcasts
        .filter(x => x.completed)
        .map(x => ({...x, 
            imageUrl: `${BASE_URL}/podcasts/covers/${x.ref}/index.png`,
            sections: ctx.sections
                .filter(y => y.podcastId === x.id)
                .toSorted((a, b) => a.order - b.order)
        }));



    updateViewModeUI('podcasts');
    updateViewModeUI('sections');
    updateViewModeUI('episodes');
    renderPodcasts(ctx.podcasts);
} 

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return `${m}:${s.toString().padStart(2, '0')}`
}

function deleteIndexedDb(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);

    request.onsuccess = () => {
      console.log(`Banco "${name}" apagado com sucesso.`);
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };

    request.onblocked = () => {
      reject(new Error("Não foi possível apagar o banco porque ele está em uso."));
    };
  });
}

async function init() {
    const version = (await getData(VERSION_URL)).version;
    if (localStorage.getItem('version') !== version) {
        localStorage.setItem('version', version);
        await deleteIndexedDb('database').catch(e => console.error('Erro ao apagar DB', e));
    }

    loadContent();
    globalThis.setLanguage = setLanguage;
    globalThis.setViewMode = setViewMode;
    globalThis.navigate = navigate;
    globalThis.toggleLangDropdown = toggleLangDropdown;
}

init();

function initDB() {
    return new Promise(resolve => {
        const request = indexedDB.open('database', 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('icons')) {
                const store = db.createObjectStore('icons', { keyPath: 'url' });
                store.createIndex('urlIndex', 'url', { unique: true });
            }
            resolve();
        }
        request.onsuccess = (e) => {
            resolve(e.target.result);
        }
    });
}

function saveCacheIcon(url) {
    return new Promise(resolve => {
        const request = indexedDB.open('database');
        request.onsuccess = (e) => {
            getImgBase64(url).then(b64 => {
                const db = e.target.result;
                const transaction = db.transaction(['icons'], 'readwrite');
                const store = transaction.objectStore('icons');
                const addRequest = store.put({ url, b64 }); 
    
                addRequest.onsuccess = function() {
                    resolve(b64);
                };
    
                addRequest.onerror = function() {
                    console.error(addRequest.error);
                    resolve(null);
                };
            }).catch(console.error);
        };
    });
}


function getCachedIcon(url) {
    return new Promise(resolve => {
        const request = indexedDB.open('database');
        
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(['icons'], 'readonly');
            const store = transaction.objectStore('icons');
            
            const getRequest = store.get(url);
            getRequest.onsuccess = () => {
                if (!getRequest.result?.b64) {
                    saveCacheIcon(url).then((b64) => resolve(b64))
                } else {
                    resolve(getRequest.result.b64); 
                }
            };

            getRequest.onerror = () => {
                console.error(getRequest.error);
                resolve(null);
            };
        };
    });
}

async function getImgBase64(url, placeholder = '') {
    return fetch(url)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(placeholder);
            reader.readAsDataURL(blob);
        }))
        .catch(() => placeholder);
}