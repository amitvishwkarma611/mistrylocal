import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function saveFCMToken(userId: string, collectionName: string = "carpenters", forceRefresh: boolean = false) {
  try {
    const messaging = getMessaging();

    let token = null;
    
    if (forceRefresh) {
      try {
        await deleteToken(messaging); // Force delete the current token
        console.log('🗑️ Old FCM token deleted, forcing new token generation');
      } catch (deleteError) {
        console.log('ℹ️ No existing token to delete');
      }
    }

    token = await getToken(messaging, {
      vapidKey: 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA'
    });

    if (!token) return;

    await updateDoc(doc(db, collectionName, userId), {
      fcmToken: token,
    });

    console.log(`✅ FCM token saved for ${collectionName}/${userId}`);
  } catch (err: any) {
    if (err.code === 'messaging/registration-token-not-registered') {
      console.warn("FCM token not registered, clearing invalid token:", err);
      // Clear the invalid token from Firestore
      await updateDoc(doc(db, collectionName, userId), {
        fcmToken: null,
      });
    } else {
      console.error("FCM save failed:", err);
    }
  }
}

export async function forceRefreshAndSaveFCMToken(userId: string, collectionName: string = "carpenters") {
  return await saveFCMToken(userId, collectionName, true);
}