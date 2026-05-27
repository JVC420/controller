import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const env = import.meta.env;

// Modo demo: el bundle se comporta como demo (banner, login alternativo, etc.).
// Puede apuntar a un proyecto Firebase de demo público o a emuladores locales.
const isDemo = env.VITE_DEMO === 'true';

// Cuando true, intercepta todas las conexiones y las redirige a los puertos
// de Firebase Emulators (solo para demo local: npm run demo).
const useEmulators = env.VITE_USE_EMULATORS === 'true';

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

if (useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    // eslint-disable-next-line no-console
    console.info('[DEMO LOCAL] Conectado a Firebase Emulators');
} else if (isDemo) {
    // eslint-disable-next-line no-console
    console.info('[DEMO HOSTED] Conectado al proyecto Firebase de demo:', firebaseConfig.projectId);
}

export const DEMO_MODE = isDemo;
export const USE_EMULATORS = useEmulators;
