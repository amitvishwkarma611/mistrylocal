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
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

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

export const generateFCMToken = async (userId?: string, collectionName: string = "carpenters"): Promise<string | null> => {
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

    // Check for existing valid token first (never delete tokens)
    const localToken = localStorage.getItem('fcm_token');
    if (localToken) {
      console.log('✅ Using existing FCM token from localStorage');
      return localToken;
    }

    // Only generate new token if none exists
    console.log('🔄 Getting FCM token with VAPID key...');
    const token = await getToken(messaging, {
      vapidKey: 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA'
    });

    if (token) {
      console.log('✅ FCM Token generated successfully:', token);
      localStorage.setItem('fcm_token', token);

      // Save the token to Firestore if userId is provided
      if (userId) {
        try {
          await updateDoc(doc(db, collectionName, userId), {
            fcmToken: token,
          });
          console.log(`✅ FCM token saved for ${collectionName}/${userId}`);
        } catch (dbError: any) {
          if (dbError.code === 'messaging/registration-token-not-registered') {
            console.warn("FCM token not registered, clearing invalid token:", dbError);
            await updateDoc(doc(db, collectionName, userId), {
              fcmToken: null,
            });
          } else {
            console.error('Failed to save FCM token to Firestore:', dbError);
          }
        }
      }

      return token;
    } else {
      console.warn('No token received from FCM');
      return null;
    }
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn("FCM token not registered:", error);
    } else {
      console.error('❌ Error generating FCM token:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
    }
    return null;
  }
};

// Function to refresh token (without deleting old one)
export const forceRefreshFCMToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn('Messaging not initialized');
    return null;
  }

  try {
    // Clear local token cache to force new token generation
    localStorage.removeItem('fcm_token');
    console.log('🔄 Local token cache cleared, generating new token');

    // Generate a new token
    return await generateFCMToken();
  } catch (error: any) {
    console.error('❌ Error forcing FCM token refresh:', error);
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
    console.log("📩 Foreground message received:", payload);

    const title = payload?.notification?.title || "New Job";
    const options = {
      body: payload?.notification?.body || "Tap to open",
      icon: "/icons/icon-192.png",
    };

    // Show browser notification manually
    if (Notification.permission === "granted") {
      new Notification(title, options);
    }

    // Also dispatch custom event for app to handle
    const event = new CustomEvent('foregroundNotification', {
      detail: payload
    });
    window.dispatchEvent(event);
  });
};