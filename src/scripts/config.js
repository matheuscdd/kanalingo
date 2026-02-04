import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
    getFirestore,
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD66-8YBsZ_z5pND__s35lmIquJU0CUYeI",
    authDomain: "gamescrever.firebaseapp.com",
    databaseURL: "https://gamescrever.firebaseio.com",
    projectId: "gamescrever",
    storageBucket: "gamescrever.firebasestorage.app",
    messagingSenderId: "106524113804",
    appId: "1:106524113804:web:51a4fdd61307a9f90234a9",
    measurementId: "G-VFW4KENY1J",
};

export const appFirebase = initializeApp(firebaseConfig);
export const dbFirebase = getFirestore(appFirebase);
export const authFirebase = getAuth(appFirebase);