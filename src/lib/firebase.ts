import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const rtdb = getDatabase(app);