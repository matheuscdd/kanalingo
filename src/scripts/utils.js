import { authFirebase } from "./config.js";
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

export async function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export function getSumFromValues(x) {
    if (Object.values(x).length === 0) return 0;
    return Object.values(x).reduce((a, b) => a + b, 0);
}

export async function showNumberIncreasing(destination, initial, el, interval, increaser=1) { 
    for (let i = initial; i <= destination; i+=increaser) {
        el.innerText = `${i.toFixed(0)} XP`;
        await sleep(interval); 
        if (i >= destination) break;
    }
    el.innerText = `${destination} XP`;
}

export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

export function shuffleArray(arr) {
    return arr.toSorted(() => Math.random() - 0.5);
}

export function orderArray(arr) {
    return arr.toSorted((a, b) => a - b);
}

export function redirectIfLogged() {
    const publicRoutes = [
            'login.html',
            'register.html',
            'landing.html'
    ];
    const privateRoutes = [
        'dashboard.html'
    ];

    onAuthStateChanged(authFirebase, user => {
        const isInPublicRoutes = publicRoutes.find(x => globalThis.location.href.includes(x));
        const isInPrivateRoutes = privateRoutes.find(x => globalThis.location.href.includes(x));
        
        const isProduction = globalThis.location.href.includes('github');
        if (user && isInPublicRoutes) {
            globalThis.location.href = (isProduction ? '/kanalingo' : '') + '/src/pages/dashboard/dashboard.html';
        }
        else if (!user && isInPrivateRoutes) {
            globalThis.location.href = (isProduction ? '/kanalingo' : '') + '/src/pages/landing/landing.html';
        }
    });
}

export function defaultObj(defaultValue) {
  const map = {};
  return new Proxy(map, {
      get(target, prop) {
          if (!target.hasOwnProperty(prop)) {
              target[prop] = typeof defaultValue === 'function' ? new defaultValue() : defaultValue;
          }
          return Reflect.get(...arguments);
      }
  });
}
