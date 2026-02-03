import { firebaseConfig } from "./config.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

export async function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export async function showNumberIncreasing(destination, initial, el, interval, increaser=1) { 
    for (let i = initial; i <= destination; i+=increaser) {
        el.innerText = `${i} XP`;
        await sleep(interval); 
    }
    el.innerText = `${destination} XP`;
}

export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function redirectIfLogged() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("Logado:", user.uid);
        } else {
            console.log("Deslogado");
        }
    });
}