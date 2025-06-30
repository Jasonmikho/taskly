import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBalPkxTJp2lFYA6eDP8aC3XtJ22lTFa8E",
  authDomain: "ai-task-manager-40276.firebaseapp.com",
  projectId: "ai-task-manager-40276",
  storageBucket: "ai-task-manager-40276.appspot.com",
  messagingSenderId: "1047605916089",
  appId: "1:1047605916089:web:4359d6518e13dba9e0c668",
  measurementId: "G-R9ML8F0T07"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence);

export { auth };
export const db = getFirestore(app);
