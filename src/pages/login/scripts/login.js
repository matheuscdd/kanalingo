import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { authFirebase } from "../../../scripts/config.js";
import { isValidEmail } from "../../../scripts/utils.js";

const btnSend = document.getElementById("login");
const txtBtnSend = btnSend.querySelector("span");
const loading = btnSend.querySelector(".loader-container");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const groupEmail = document.getElementById("group-email");
const groupPassword = document.getElementById("group-password");

async function tryLogin() {
    let hasErrors = false;
    if (!emailInput.value || !isValidEmail(emailInput.value)) {
        addErrorsEmail();
        hasErrors = true;
    }

    if (!passwordInput.value || passwordInput.value.trim().length < 6) {
        addErrorsPassword();
        hasErrors = true;
    }

    if (hasErrors) {
        const container = document.querySelector(".login-container");
        container.animate(
            [
                { transform: "translateX(0)" },
                { transform: "translateX(-10px)" },
                { transform: "translateX(10px)" },
                { transform: "translateX(-10px)" },
                { transform: "translateX(0)" },
            ],
            {
                duration: 300,
            },
        );
        return;
    }

    try {
        txtBtnSend.classList.add("hidden");
        loading.classList.remove("hidden");
        btnSend.disabled = true;
        localStorage.clear();
        const response = await signInWithEmailAndPassword(
            authFirebase,
            emailInput.value,
            passwordInput.value,
        );
        localStorage.setItem("user", JSON.stringify(response.user.uid));
    } catch (error) {
        console.error(error);
        addErrorsEmail();
        addErrorsPassword();
    } finally {
        btnSend.disabled = false;
        txtBtnSend.classList.remove("hidden");
        loading.classList.add("hidden");
    }
}

function clearError(inputElement, groupElement) {
    inputElement.classList.remove("error");
    groupElement.classList.remove("has-error");
}

function addErrorsEmail() {
    emailInput.classList.add("error");
    groupEmail.classList.add("has-error");
}

function addErrorsPassword() {
    passwordInput.classList.add("error");
    groupPassword.classList.add("has-error");
}

document.addEventListener("keypress", (e) => {
    if (e.key !== "Enter") return;
    tryLogin();
});

btnSend.onclick = tryLogin;
emailInput.oninput = () => clearError(emailInput, groupEmail);
passwordInput.oninput = () => clearError(passwordInput, groupPassword);
