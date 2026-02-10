
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
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

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

export const generateFCMToken = async (): Promise<string | null> => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    
    const token = await getToken(messaging, {
      vapidKey: 'BH6D2mE26nsF1VinWSfBFx-2ES-ijPtYhR9Ebo4ZPB0FZbXVxMSo8L3jPotMg5zc0b7HVIUOJJpimimcJ0_imY8'
    });
    
    if (token) {
      console.log('✅ FCM Token generated successfully:', token);
      localStorage.setItem('fcm_token', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ Error generating FCM token:', error);
    return null;
  }
};

export const listenForegroundNotifications = () => {
  if (!messaging) return;
  
  onMessage(messaging, (payload) => {
    console.log('Foreground notification received:', payload);
    
    // Show browser notification
    if (payload.notification) {
      new Notification(payload.notification.title || 'New Notification', {
        body: payload.notification.body || '',
        icon: '/icons/icon-192.png'
      });
    }
  });
};
