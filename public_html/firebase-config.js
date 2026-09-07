import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInAnonymously,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    setDoc, 
    query, 
    where, 
    orderBy,
    deleteDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4T-WCoykSR39BfCF746xnGmAOAzKBwd0",
    authDomain: "lpx--gerador-de-formularios.firebaseapp.com",
    projectId: "lpx--gerador-de-formularios",
    storageBucket: "lpx--gerador-de-formularios.firebasestorage.app",
    messagingSenderId: "255906717959",
    appId: "1:255906717959:web:fe6dab99e8bf188461e5a2",
    measurementId: "G-6LGR8PHPKW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

export { 
    app, 
    auth, 
    db, 
    doc, 
    getDoc, 
    getDocs, 
    collection, 
    setDoc, 
    query, 
    where, 
    orderBy,
    deleteDoc,
    serverTimestamp, 
    onAuthStateChanged,
    signInAnonymously,
    signInWithPopup,
    googleProvider,
    microsoftProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
};
