import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
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
    
    let token = null;
    
    if (forceRefresh) {
      try {
        await deleteToken(msg); // Force delete the current token
        console.log('🗑️ Old worker FCM token deleted, forcing new token generation');
      } catch (deleteError) {
        console.log('ℹ️ No existing worker token to delete');
      }
    }
    
    const vapidKey = 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA';
    token = await getToken(msg, { vapidKey });
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