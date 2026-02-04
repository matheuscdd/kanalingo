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
      if (registration) {
        console.log('Service Worker já registrado:', registration);
      } else {
        navigator.serviceWorker
          .register('/src/scripts/sw.js')
          .then(reg => {
            console.log('Service Worker registrado com sucesso:', reg);
          })
          .catch(err => {
            console.error('Erro ao registrar SW:', err);
          });
      }
    });
}

