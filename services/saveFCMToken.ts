import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function saveFCMToken(userId: string) {
  try {
    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: 'BKPxQFVLQr3vX-iG8vNjU7NfaDsgzWtm2e3rJPFOnac_6PNJz5azLA2cvxdo9cX09-4RUtIT2C6vwR_8mcHvBzU'
    });

    if (!token) return;

    await updateDoc(doc(db, "carpenters", userId), {
      fcmToken: token,
    });

    console.log("✅ FCM token saved");
  } catch (err) {
    console.error("FCM save failed:", err);
  }
}