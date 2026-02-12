import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getMessaging, getToken } from "firebase/messaging";

export const saveFCMTokenToFirestore = async (userId: string) => {
  try {
    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    if (!token) {
      console.log("❌ No FCM token generated");
      return;
    }

    const existingToken = localStorage.getItem("fcm_token");

    // Prevent duplicate Firestore writes
    if (existingToken === token) {
      console.log("⚡ Token already saved, skipping Firestore write");
      return;
    }

    console.log("✅ FCM token generated:", token);

    // Save locally
    localStorage.setItem("fcm_token", token);

    // Save to Firestore worker document
    await updateDoc(doc(db, "workers", userId), {
      fcmToken: token,
      tokenUpdatedAt: new Date(),
    });

    console.log("🔥 Token saved to Firestore successfully");
  } catch (err) {
    console.error("❌ Error saving FCM token:", err);
  }
};