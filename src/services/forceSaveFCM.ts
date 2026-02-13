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

    // Check for existing valid token first
    const { getDoc } = await import('firebase/firestore');
    const workerRef = doc(db, "workers", userId);
    const existingDoc = await getDoc(workerRef);
    
    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      const existingToken = existingData?.fcmToken;
      const lastUpdated = existingData?.tokenUpdatedAt;
      
      // Check if we have a recent token (less than 7 days old)
      if (existingToken && lastUpdated) {
        const tokenAge = Date.now() - lastUpdated.toDate().getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        if (tokenAge < sevenDays) {
          console.log("✅ Found existing valid FCM token:", existingToken.substring(0, 20) + '...');
          console.log("🕒 Token age:", Math.floor(tokenAge / (1000 * 60 * 60)), "hours");
          
          // Update local storage with existing token
          localStorage.setItem("fcm_token", existingToken);
          console.log("💾 Using existing token from Firestore");
          return existingToken;
        } else {
          console.log("⏰ Existing token is older than 7 days, generating new token");
        }
      } else if (existingToken) {
        console.log("✅ Found existing FCM token without timestamp, validating...");
        // For tokens without timestamp, still use them but update the timestamp
        localStorage.setItem("fcm_token", existingToken);
        // Update the timestamp in Firestore
        await setDoc(workerRef, {
          tokenUpdatedAt: new Date(),
        }, { merge: true });
        console.log("💾 Validated and updated existing token");
        return existingToken;
      }
    } else {
      console.log("🆕 No existing worker document found");
    }

    // If no valid existing token, generate a new one
    console.log("🔄 Generating new FCM token...");
    
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

    console.log("🔍 Generated new token:", token?.substring(0, 20) + '...' || 'NULL');

    if (!token) {
      console.log("❌ Token is NULL — permission or SW issue");
      return null;
    }

    // Save locally
    localStorage.setItem("fcm_token", token);
    console.log("💾 Local storage updated with new FCM token");

    console.log("💾 Saving new token to Firestore for user:", userId);
    console.log("📝 Document path: workers/", userId);

    // Handle document creation/update
    if (existingDoc.exists()) {
      console.log("📊 Updating existing worker document");
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
      // Update existing document with new token
      await setDoc(workerRef, {
        fcmToken: token,
        tokenUpdatedAt: new Date(),
      }, { merge: true });
      console.log("✅ Updated existing worker document with new FCM token");
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
    }

    console.log("🔥 SUCCESS — New FCM token saved to Firestore");
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
        console.log(`✅ FCM token successfully processed on attempt ${attempt}`);
        return token;
      }
      console.log(`⚠️ Attempt ${attempt} completed but no token returned`);
      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt;
        console.log(`⏳ Waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
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

export const validateAndRefreshTokenIfNeeded = async (userId: string): Promise<string | null> => {
  try {
    console.log("🔍 Validating FCM token for user:", userId);
    
    // Check localStorage first
    const localToken = localStorage.getItem("fcm_token");
    if (localToken) {
      console.log("💾 Found token in localStorage:", localToken.substring(0, 20) + '...');
      
      // Check Firestore for validation
      const { getDoc } = await import('firebase/firestore');
      const workerRef = doc(db, "workers", userId);
      const docSnapshot = await getDoc(workerRef);
      
      if (docSnapshot.exists()) {
        const docData = docSnapshot.data();
        if (docData.fcmToken === localToken) {
          console.log("✅ Local token matches Firestore token");
          return localToken;
        } else {
          console.log("⚠️ Local token doesn't match Firestore, removing local copy");
          localStorage.removeItem("fcm_token");
        }
      } else {
        console.log("⚠️ No Firestore document found, removing local token");
        localStorage.removeItem("fcm_token");
      }
    }
    
    // If no valid token found, generate a new one
    console.log("🔄 No valid token found, generating new one...");
    return await forceSaveFCMToken(userId);
  } catch (error) {
    console.error("❌ Token validation failed:", error);
    return null;
  }
};