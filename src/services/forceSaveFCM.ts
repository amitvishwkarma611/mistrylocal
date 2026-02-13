import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getMessaging, getToken } from "firebase/messaging";

export const forceSaveFCMToken = async (userId: string) => {
  try {
    console.log("🚀 Starting FCM token generation for user:", userId);

    // Check authentication status
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    console.log("👤 Current user:", currentUser?.uid);
    console.log("✅ Authenticated:", !!currentUser);
    console.log("🎯 User ID match:", currentUser?.uid === userId);
    
    if (!currentUser) {
      console.error("❌ No authenticated user found");
      throw new Error("User not authenticated");
    }
    
    if (currentUser.uid !== userId) {
      console.error("❌ User ID mismatch. Expected:", userId, "Got:", currentUser.uid);
      throw new Error("User ID mismatch");
    }

    const messaging = getMessaging();

    // Request notification permission first
    const permission = await Notification.requestPermission();
    console.log("🔔 Notification permission status:", permission);
    
    if (permission !== 'granted') {
      console.warn("❌ Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA',
    });

    console.log("🔍 Generated token:", token?.substring(0, 20) + '...' || 'NULL');

    if (!token) {
      console.log("❌ Token is NULL — permission or SW issue");
      return null;
    }

    // Save locally
    localStorage.setItem("fcm_token", token);
    console.log("💾 Local storage updated with FCM token");

    console.log("💾 Attempting to save token to Firestore for user:", userId);
    console.log("📝 Document path: workers/", userId);

    // Check if document exists first
    const { getDoc } = await import('firebase/firestore');
    const workerRef = doc(db, "workers", userId);
    const existingDoc = await getDoc(workerRef);
    
    console.log("📊 Existing document exists:", existingDoc.exists());
    if (existingDoc.exists()) {
      console.log("📊 Existing data keys:", Object.keys(existingDoc.data() || {}));
      // Check if profession field exists
      const existingData = existingDoc.data();
      if (!existingData?.profession) {
        console.log("⚠️ No profession field found, adding default");
        // Update document to include profession field
        await setDoc(workerRef, {
          profession: 'carpenter', // Default profession
          fcmToken: token,
          tokenUpdatedAt: new Date(),
        }, { merge: true });
        console.log("✅ Added profession field and FCM token");
        return token;
      }
    } else {
      console.log("🆕 Creating new worker document");
      // Create new document with required fields
      await setDoc(workerRef, {
        profession: 'carpenter', // Required by rules
        fcmToken: token,
        tokenUpdatedAt: new Date(),
        createdAt: new Date(),
      });
      console.log("✅ Created new worker document with FCM token");
      return token;
    }

    // FORCE write using setDoc merge (for documents that already have profession)
    await setDoc(
      workerRef,
      {
        fcmToken: token,
        tokenUpdatedAt: new Date(),
      },
      { merge: true }
    );

    console.log("🔥 SUCCESS — FCM token saved to Firestore");
    return token;
  } catch (error: any) {
    console.error("❌ FIRESTORE SAVE FAILED:", error.code, error.message);
    console.error("📝 Error details:", error);
    throw error; // Re-throw to let caller handle
  }
};

export const forceSaveFCMTokenWithRetry = async (userId: string, maxRetries: number = 3): Promise<string | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} to save FCM token for user:`, userId);
      const token = await forceSaveFCMToken(userId);
      if (token) {
        console.log(`✅ FCM token successfully saved on attempt ${attempt}`);
        return token;
      }
      console.log(`⚠️ Attempt ${attempt} completed but no token returned`);
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error.code || error.message);
      if (attempt === maxRetries) {
        console.error(`💥 All ${maxRetries} attempts failed. Giving up.`);
        throw error;
      }
      // Wait before retry
      const waitTime = 1000 * attempt;
      console.log(`⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  return null;
};