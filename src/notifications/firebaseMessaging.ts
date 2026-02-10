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

export const getWorkerFCMToken = async (): Promise<string | null> => {
  try {
    const msg = await messaging;
    if (!msg) return null;
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    
    const vapidKey = 'BKPxQFVLQr3vX-iG8vNjU7NfaDsgzWtm2e3rJPFOnac_6PNJz5azLA2cvxdo9cX09-4RUtIT2C6vwR_8mcHvBzU';
    const token = await getToken(msg, { vapidKey });
    return token || null;
  } catch (error) {
    return null;
  }
};

export const listenForegroundNotifications = (callback: (payload: any) => void) => {
  messaging.then(msg => {
    if (msg) {
      onMessage(msg, callback);
    }
  });
};