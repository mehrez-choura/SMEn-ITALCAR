import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // AJOUT IMPORTANT

// Votre configuration Firebase officielle
const firebaseConfig = {
  apiKey: "AIzaSyCUSBzbKBE2JRiiHZAwtkvJzy72RgrRoEU",
  authDomain: "smen-italcar.firebaseapp.com",
  projectId: "smen-italcar",
  storageBucket: "smen-italcar.firebasestorage.app",
  messagingSenderId: "188301662792",
  appId: "1:188301662792:web:1eca55e7e122582a8ed67d"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// Export de la base de données pour l'utiliser dans App.jsx
export const db = getFirestore(app);
