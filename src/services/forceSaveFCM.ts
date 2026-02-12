import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getMessaging, getToken } from "firebase/messaging";

export const forceSaveFCMToken = async (userId: string) => {
  try {
    console.log("🚀 Starting FCM token generation...");

    const messaging = getMessaging();

    const token = await getToken(messaging, {
      vapidKey: 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA',
    });

    console.log("🔍 Generated token:", token);

    if (!token) {
      console.log("❌ Token is NULL — permission or SW issue");
      return;
    }

    // Save locally
    localStorage.setItem("fcm_token", token);

    console.log("💾 Saving token to Firestore for user:", userId);

    // FORCE write using setDoc merge
    await setDoc(
      doc(db, "workers", userId),
      {
        fcmToken: token,
        tokenUpdatedAt: new Date(),
      },
      { merge: true }
    );

    console.log("🔥 SUCCESS — FCM token saved to Firestore");
  } catch (error) {
    console.error("❌ FIRESTORE SAVE FAILED:", error);
  }
};