import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOMsddUqKS5_z3tArY2i-D6sK2kp64j04",
  authDomain: "footpro-c8971.firebaseapp.com",
  projectId: "footpro-c8971",
  storageBucket: "footpro-c8971.firebasestorage.app",
  messagingSenderId: "138177969965",
  appId: "1:138177969965:web:870e657dd58f6837171da4",
  measurementId: "G-NCW64TYQ99"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);