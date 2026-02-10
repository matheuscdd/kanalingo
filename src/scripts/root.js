import {
    getInternalPath,
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
    return;
    if (globalThis.location.hostname === "localhost") return;

    if (!("serviceWorker" in navigator)) {
        console.error("Cannot add worker");
        return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
        alert("Nova versão disponível, recarregue 😺");
    });


    const path = getInternalPath("/sw.js");
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
