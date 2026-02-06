import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { authFirebase } from "../../../scripts/config.js";
import { isValidEmail, redirectIfLogged } from "../../../scripts/utils.js";

const btnSend = document.getElementById("register");
const txtBtnSend = btnSend.querySelector("span");
const loading = btnSend.querySelector(".loader-container");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const passwordConfirmInput = document.getElementById("password-confirm");
const groupEmail = document.getElementById("group-email");
const groupPassword = document.getElementById("group-password");
const groupPasswordConfirm = document.getElementById("group-password-confirm");
const errorSmallPassword = document.querySelector(".custom-error-message");

async function tryRegister() {
    let hasErrors = false;
    if (!emailInput.value || !isValidEmail(emailInput.value)) {
        addErrorsEmail();
        hasErrors = true;
    }

    if (!passwordInput.value || passwordInput.value.trim().length < 6) {
        errorSmallPassword.style.display = "flex";
        hasErrors = true;
    }

    if (
        !passwordConfirmInput.value ||
        passwordConfirmInput.value !== passwordInput.value
    ) {
        addErrorsPasswordConfirm();
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
        const response = await createUserWithEmailAndPassword(
            authFirebase,
            emailInput.value,
            passwordInput.value,
        );
        localStorage.setItem("user", JSON.stringify(response.user.uid));
        redirectIfLogged();
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

document.addEventListener("keypress", (e) => {
    if (e.key !== "Enter") return;
    tryRegister();
});

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

function addErrorsPasswordConfirm() {
    passwordConfirmInput.classList.add("error");
    groupPasswordConfirm.classList.add("has-error");
}

btnSend.onclick = tryRegister;
emailInput.oninput = () => clearError(emailInput, groupEmail);
passwordInput.oninput = () => {
    errorSmallPassword.style.display = "none";
    clearError(passwordInput, groupPassword);
};
passwordConfirmInput.oninput = () =>
    clearError(passwordConfirmInput, groupPasswordConfirm);
