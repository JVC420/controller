import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDQ2eENUbC_MTCM6A9D9_ec-blrZSFpnYY",
    authDomain: "contratoslma-62f5a.firebaseapp.com",
    projectId: "contratoslma-62f5a",
    storageBucket: "contratoslma-62f5a.firebasestorage.app",
    messagingSenderId: "210132231622",
    appId: "1:210132231622:web:feba0623237ff21ad33ec7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
