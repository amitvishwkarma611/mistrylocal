import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';

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
const messaging = isSupported().then(supported => supported ? getMessaging(app) : null);

export const getWorkerFCMToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  try {
    const msg = await messaging;
    if (!msg) return null;
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    
    // Check localStorage first
    if (!forceRefresh) {
      const localToken = localStorage.getItem('fcm_token');
      if (localToken) {
        console.log('📱 Using existing worker FCM token from localStorage');
        return localToken;
      }
    }
    
    console.log('📱 Generating new worker FCM token (no deletion)');
    
    const vapidKey = 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA';
    const token = await getToken(msg, { vapidKey });
    return token || null;
  } catch (error: any) {
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn("Worker FCM token not registered:", error);
    }
    return null;
  }
};

export const forceRefreshWorkerFCMToken = async (): Promise<string | null> => {
  return await getWorkerFCMToken(true);
};

export const listenForegroundNotifications = (callback: (payload: any) => void) => {
  messaging.then(msg => {
    if (msg) {
      onMessage(msg, callback);
    }
  });
};