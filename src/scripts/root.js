import { redirectIfLogged } from "./utils.js";

initEvents();

function initEvents() {
  startServiceWorker();
  redirectIfLogged();
}

function startServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.error('Cannot add worker');
    return;
  }

  navigator.serviceWorker.getRegistration('/../../src/scripts/sw.js')
    .then(registration => {
      if (registration) return;
      navigator.serviceWorker
        .register('/src/scripts/sw.js')
        .then()
        .catch(err => {
          console.error('Erro ao registrar SW:', err);
        });
    });
}

