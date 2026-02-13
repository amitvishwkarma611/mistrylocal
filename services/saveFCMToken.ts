import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const VAPID_KEY = 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA';

export async function saveFCMToken(userId: string, collectionName: string = "carpenters", forceRefresh: boolean = false) {
  try {
    // Check for existing valid token first
    if (!forceRefresh) {
      const existingDoc = await getDoc(doc(db, collectionName, userId));
      if (existingDoc.exists()) {
        const existingToken = existingDoc.data()?.fcmToken;
        if (existingToken) {
          console.log('✅ Using existing FCM token (no refresh needed)');
          localStorage.setItem('fcm_token', existingToken);
          return existingToken;
        }
      }
      
      // Check localStorage
      const localToken = localStorage.getItem('fcm_token');
      if (localToken) {
        console.log('✅ Using FCM token from localStorage');
        return localToken;
      }
    }

    console.log('🔄 Generating new FCM token (no deletion)');
    const messaging = getMessaging();

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (!token) return;

    // Save to carpenters collection (for job notifications)
    await updateDoc(doc(db, "carpenters", userId), {
      fcmToken: token,
      tokenUpdatedAt: new Date(),
      online: true
    });

    // Also save to workers collection (for token management)
    await updateDoc(doc(db, "workers", userId), {
      fcmToken: token,
      tokenUpdatedAt: new Date()
    });

    // Also save locally
    localStorage.setItem('fcm_token', token);

    console.log(`✅ FCM token saved for ${collectionName}/${userId}`);
    return token;
  } catch (err: any) {
    if (err.code === 'messaging/registration-token-not-registered') {
      console.warn("FCM token not registered, will retry on next load");
      // Don't clear token - let it retry naturally
    } else {
      console.error("FCM save failed:", err);
    }
    return null;
  }
}

export async function forceRefreshAndSaveFCMToken(userId: string, collectionName: string = "carpenters") {
  return await saveFCMToken(userId, collectionName, true);
}