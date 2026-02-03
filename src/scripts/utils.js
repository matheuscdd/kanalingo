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
    const publicRoutes = [
            'login.html',
            'register.html',
            'landing.html'
    ];
    const privateRoutes = [
        'dashboard.html'
    ];

    onAuthStateChanged(auth, user => {
        const isInPublicRoutes = publicRoutes.find(x => globalThis.location.href.includes(x));
        const isInPrivateRoutes = privateRoutes.find(x => globalThis.location.href.includes(x));

        if ((user && isInPrivateRoutes) || (!user && isInPublicRoutes)) return;
        else if (user && isInPublicRoutes) {
            const isProduction = globalThis.location.href.includes('github');
            
            globalThis.location.href = (isProduction ? '/kanalingo' : '') + '/src/pages/dashboard/dashboard.html';
        }
    });
}