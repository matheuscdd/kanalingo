import { getAuth, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    doc,
    updateDoc,
    arrayUnion 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { firebaseConfig } from "../../scripts/config.js";



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, async user => {
  if (user) {
    console.log("Usuário logado:", user.uid);
    const ref = doc(db, "users", user.uid);

    await setDoc(ref, {
        email: user.email,
        nomes: []
    }, { merge: true });
    // Pode acessar Firestore aqui
  } else {
    console.log("Usuário deslogado");
    // Redirecionar para login
  }
});


// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional


// // 🔹 Inicializa Firebase


// 🔹 Referência da coleção

async function adicionarNome(nome) {
  const user = auth.currentUser;
  if (!user) return;

  const ref = doc(db, "users", user.uid);

  await updateDoc(ref, {
    nomes: localStorage.getItem("kanalingo_data")
  });
}

document.getElementById("salvar").onclick = async () => {
  const nome = document.getElementById("nome").value;


  await adicionarNome(nome);
  // await listarNomes();
};

// async function listarNomes() {
//   const user = auth.currentUser;
//   if (!user) return;

//   const ref = doc(db, "users", user.uid);
//   const snap = await getDoc(ref);

//   if (!snap.exists()) return;

//   const nomes = snap.data().nomes || [];

//   const ul = document.getElementById("lista");
//   ul.innerHTML = "";

//   nomes.forEach(n => {
//     const li = document.createElement("li");
//     li.textContent = n;
//     ul.appendChild(li);
//   });
// }
