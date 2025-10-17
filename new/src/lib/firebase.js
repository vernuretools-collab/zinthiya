import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyB0vJ9gp7s7Uis_79bzRt6buz1MJEV2JKg",
  authDomain: "zinthiya-74299.firebaseapp.com",
  projectId: "zinthiya-74299",
  storageBucket: "zinthiya-74299.firebasestorage.app",
  messagingSenderId: "38274652969",
  appId: "1:38274652969:web:c99e2704fff50357b63538",
  measurementId: "G-SWK15Z84RL"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'europe-west2');

export default app;
