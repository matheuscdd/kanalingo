import {
    insertLoadingScreen,
    redirectIfLogged,
    removeLoadingScreen,
} from "./utils.js";

initEvents();

function initEvents() {
    startServiceWorker();
    redirectIfLogged();
    document.addEventListener("DOMContentLoaded", insertLoadingScreen);
    window.addEventListener("load", removeLoadingScreen);
}

function startServiceWorker() {
    // if (globalThis.location.hostname === "localhost") return;

    if (!("serviceWorker" in navigator)) {
        console.error("Cannot add worker");
        return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        // alert("Nova versão disponível, recarregue 😺");
    });

    const path = "/tmp.js";
    navigator.serviceWorker.getRegistration(path).then((registration) => {
        if (registration) return;
        navigator.serviceWorker
            .register(path)
            .then()
            .catch((err) => {
                console.error("Erro ao registrar SW:", err);
            });
    });
}
