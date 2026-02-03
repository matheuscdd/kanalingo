import { redirectIfLogged } from "./utils.js";

initEvents();

function initEvents() {
    startServiceWorker();
    redirectIfLogged();
}

function startServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/../src/scripts/sw.js')
    }
    else {
        console.error('Cannot add worker');
    }
}

