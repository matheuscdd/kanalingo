import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { authFirebase } from "../../../scripts/config.js";
import { isValidEmail, redirectIfLogged } from "../../../scripts/utils.js";

const btnSend = document.getElementById("login");
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
        btnSend.disabled = true;
        await signInWithEmailAndPassword(
            authFirebase,
            emailInput.value,
            passwordInput.value,
        );
        localStorage.clear();
        redirectIfLogged();
    } catch (error) {
        console.error(error);
        addErrorsEmail();
        addErrorsPassword();
    } finally {
        btnSend.disabled = false;
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

btnSend.onclick = tryLogin;
emailInput.oninput = () => clearError(emailInput, groupEmail);
passwordInput.oninput = () => clearError(passwordInput, groupPassword);
