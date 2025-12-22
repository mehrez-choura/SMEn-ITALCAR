import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Ajout de l'authentification

// Vos codes secrets (Je reprends ceux que vous m'avez donnés)
const firebaseConfig = {
  apiKey: "AIzaSyCUSBzbKBE2JRiiHZAwtkvJzy72RgrRoEU",
  authDomain: "smen-italcar.firebaseapp.com",
  projectId: "smen-italcar",
  storageBucket: "smen-italcar.firebasestorage.app",
  messagingSenderId: "188301662792",
  appId: "1:188301662792:web:1eca55e7e122582a8ed67d"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// On exporte la base de données (db) ET l'authentification (auth)
export const db = getFirestore(app);
export const auth = getAuth(app);
