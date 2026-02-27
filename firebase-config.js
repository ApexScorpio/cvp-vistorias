import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4T-WCoykSR39BfCF746xnGmAOAzKBwd0",
    authDomain: "lpx--gerador-de-formularios.firebaseapp.com",
    projectId: "lpx--gerador-de-formularios",
    storageBucket: "lpx--gerador-de-formularios.firebasestorage.app",
    messagingSenderId: "255906717959",
    appId: "1:255906717959:web:fe6dab99e8bf188461e5a2",
    measurementId: "G-6LGR8PHPKW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Providers
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

export { auth, db, googleProvider, microsoftProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, serverTimestamp, orderBy };
