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
    
    const vapidKey = 'BH6D2mE26nsF1VinWSfBFx-2ES-ijPtYhR9Ebo4ZPB0FZbXVxMSo8L3jPotMg5zc0b7HVIUOJJpimimcJ0_imY8';
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