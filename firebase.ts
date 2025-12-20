import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Chef's Jalsa Firebase Configuration
 */
const firebaseConfig = {
  apiKey: "AIzaSyBCSmSoCSyoAKYDDjKCKp0FgyztscMNne4",
  authDomain: "jalsa-77ec9.firebaseapp.com",
  projectId: "jalsa-77ec9",
  storageBucket: "jalsa-77ec9.firebasestorage.app",
  messagingSenderId: "262356073632",
  appId: "1:262356073632:web:078c7dc5f5c2ea38bb5dc5",
  measurementId: "G-72VNFKQ1TR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);