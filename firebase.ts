
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
  if (!messaging) {
    console.warn('Messaging not initialized');
    return null;
  }
  
  try {
    console.log('🔄 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission status:', permission);
    
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }
    
    console.log('🔄 Getting FCM token with VAPID key...');
    const token = await getToken(messaging, {
      vapidKey: 'BKPxQFVLQr3vX-iG8vNjU7NfaDsgzWtm2e3rJPFOnac_6PNJz5azLA2cvxdo9cX09-4RUtIT2C6vwR_8mcHvBzU'
    });
    
    if (token) {
      console.log('✅ FCM Token generated successfully:', token);
      localStorage.setItem('fcm_token', token);
      return token;
    } else {
      console.warn('No token received from FCM');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error generating FCM token:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    return null;
  }
};

export const listenForegroundNotifications = () => {
  if (!messaging) {
    console.warn('Messaging not initialized, cannot listen for foreground notifications');
    return;
  }
  
  console.log('🔄 Setting up foreground notification listener...');
  
  onMessage(messaging, (payload) => {
    console.log('🔔 Foreground notification received:', payload);
    
    // Show browser notification
    if (payload.notification) {
      console.log('Showing notification:', payload.notification.title);
      new Notification(payload.notification.title || 'New Notification', {
        body: payload.notification.body || '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'mistry-foreground-notification'
      });
    }
    
    // Also dispatch custom event for app to handle
    const event = new CustomEvent('foregroundNotification', { 
      detail: payload 
    });
    window.dispatchEvent(event);
  });
};
