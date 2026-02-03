import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { firebaseConfig } from "../../../scripts/config.js";
import { isValidEmail, redirectIfLogged } from "../../../scripts/utils.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const btnSend = document.getElementById('login');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const groupEmail = document.getElementById('group-email');
const groupPassword = document.getElementById('group-password');

async function tryLogin(e) {
  console.log(e)

  let hasErrors = false;
  if (!emailInput.value || !isValidEmail(emailInput.value)) {
    addErrorsEmail();
    hasErrors = true;
  }

  if (!passwordInput.value || passwordInput.value.trim().length < 6) {
    addErrorsPassword();
    hasErrors = true;
  }

  const container = document.querySelector('.login-container');
  container.animate([
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(0)' }
  ], {
    duration: 300
  });

  if (hasErrors) return;
  try {
    btnSend.disabled = true;
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
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
  inputElement.classList.remove('error');
  groupElement.classList.remove('has-error');
}

function addErrorsEmail() {
  emailInput.classList.add('error');
  groupEmail.classList.add('has-error');
}

function addErrorsPassword() {
  passwordInput.classList.add('error');
  groupPassword.classList.add('has-error');
}

btnSend.onclick = tryLogin;
emailInput.oninput = () => clearError(emailInput, groupEmail);
passwordInput.oninput = () => clearError(passwordInput, groupPassword);

// document.getElementById("login").addEventListener("click", async () => {
//   const email = document.getElementById("email").value;
//   const senha = document.getElementById("senha").value;

//   if (!email || !senha) {
//     status.textContent = "Preencha email e senha";
//     return;
//   }

//   try {

//     status.textContent = "Login realizado";
//   } catch (error) {
//     if (error.code === "auth/user-not-found") {
//       try {
//         await createUserWithEmailAndPassword(auth, email, senha);
//         status.textContent = "Usuário criado e logado";
//       } catch (e) {
//         status.textContent = "Erro ao criar usuário: " + e.message;
//       }
//     } else {
//       status.textContent = "Erro: " + error.message;
//     }
//   }
// });