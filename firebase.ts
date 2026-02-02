
/**
 * Firebase Configuration and Initialization
 * 
 * Firestore Security Rules:
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /users/{userId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *     }
 *     match /bookings/{bookingId} {
 *       allow read: if request.auth != null;
 *       allow write: if request.auth != null;
 *     }
 *   }
 * }
 */

import { initializeApp } from "firebase/app";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, EmailAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, orderBy, limit, addDoc, updateDoc } from "firebase/firestore";

// Replace with your actual Firebase Project config
const firebaseConfig = {
  apiKey: "AIzaSyBos6sD7W3y8EHvcDSYnvu7TehIgaw4ka8",
  authDomain: "mistrylocal.firebaseapp.com",
  projectId: "mistrylocal",
  storageBucket: "mistrylocal.firebasestorage.app",
  messagingSenderId: "994770518651",
  appId: "1:994770518651:web:426413c55474680eee58de",
  measurementId: "G-HVY35P8TJE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable persistence (default for web auth SDK)
auth.languageCode = 'en'; // Can be updated dynamically

// Removed onSnapshot export to prevent real-time listener usage

export { 
  auth, 
  db, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  EmailAuthProvider, 
  RecaptchaVerifier, 
  onAuthStateChanged, 
  signOut,
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  addDoc,
  updateDoc
};
