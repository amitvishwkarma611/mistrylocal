import { doc, setDoc, getDoc } from "firebase/firestore";
import { getMessaging, getToken } from "firebase/messaging";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase";

const VAPID_KEY = 'BJyj641GcztGJRfxOxODv9NipObdddA8qPp-PkTmqIRkdNhSb9UdWCE_zmsc2C-4l_7rUEX5qNnkjT79DprCiIA';
const STORAGE_KEY = 'fcm_token';
const TOKEN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Singleton flag to prevent multiple token generations
let isTokenGenerationInProgress = false;
let cachedToken: string | null = null;

/**
 * FCM Token Manager - Production Ready
 * Generates token only once, reuses valid tokens, never deletes
 */
export const fcmTokenManager = {
  /**
   * Get existing or generate new FCM token
   * Uses singleton pattern to prevent duplicate getToken() calls
   */
  async getToken(userId: string): Promise<string | null> {
    // Return cached token if available
    if (cachedToken) {
      console.log('📱 FCM: Using cached token');
      return cachedToken;
    }

    // Prevent duplicate token generation
    if (isTokenGenerationInProgress) {
      console.log('📱 FCM: Token generation already in progress, waiting...');
      // Wait for existing operation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      return cachedToken;
    }

    isTokenGenerationInProgress = true;

    try {
      console.log('📱 FCM: Starting token generation for user:', userId);

      // Check authentication
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser || currentUser.uid !== userId) {
        console.error('📱 FCM: User not authenticated or ID mismatch');
        return null;
      }

      // Check existing token in Firestore first
      const existingToken = await this.getExistingTokenFromFirestore(userId);
      if (existingToken) {
        console.log('📱 FCM: Found existing token in Firestore');
        // Validate and cache
        cachedToken = existingToken;
        localStorage.setItem(STORAGE_KEY, existingToken);
        return existingToken;
      }

      // Check localStorage as fallback
      const localToken = localStorage.getItem(STORAGE_KEY);
      if (localToken) {
        console.log('📱 FCM: Found token in localStorage');
        // Validate against Firestore
        const isValid = await this.validateTokenWithFirestore(userId, localToken);
        if (isValid) {
          cachedToken = localToken;
          return localToken;
        } else {
          console.log('📱 FCM: localStorage token invalid, generating new one');
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Request notification permission ONLY if not granted
      const permission = await Notification.requestPermission();
      console.log('📱 FCM: Notification permission:', permission);
      
      if (permission !== 'granted') {
        console.warn('📱 FCM: Notification permission not granted');
        return null;
      }

      // Generate new token
      const messaging = getMessaging();
      const newToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (!newToken) {
        console.error('📱 FCM: Failed to generate token');
        return null;
      }

      console.log('📱 FCM: New token generated:', newToken.substring(0, 20) + '...');
      
      // Cache and persist
      cachedToken = newToken;
      localStorage.setItem(STORAGE_KEY, newToken);
      
      // Save to Firestore
      await this.saveTokenToFirestore(userId, newToken);
      
      console.log('📱 FCM: Token generation complete');
      return newToken;

    } catch (error: any) {
      console.error('📱 FCM: Token generation error:', error.message);
      
      // Handle specific errors gracefully
      if (error.code === 'messaging/registration-token-not-registered') {
        console.warn('📱 FCM: Token not registered, will retry on next load');
        // Clear cached token to allow retry
        cachedToken = null;
      }
      
      return null;
    } finally {
      isTokenGenerationInProgress = false;
    }
  },

  /**
   * Get existing token from Firestore
   */
  async getExistingTokenFromFirestore(userId: string): Promise<string | null> {
    try {
      const workerRef = doc(db, "workers", userId);
      const docSnap = await getDoc(workerRef);
      
      if (!docSnap.exists()) {
        console.log('📱 FCM: No worker document found');
        return null;
      }
      
      const data = docSnap.data();
      const existingToken = data?.fcmToken;
      const tokenUpdatedAt = data?.tokenUpdatedAt;
      
      if (!existingToken) {
        console.log('📱 FCM: No existing token in Firestore');
        return null;
      }
      
      // Check if token is still valid (not expired)
      if (tokenUpdatedAt) {
        const tokenDate = tokenUpdatedAt.toDate();
        const tokenAge = Date.now() - tokenDate.getTime();
        
        if (tokenAge > TOKEN_VALIDITY_MS) {
          console.log('📱 FCM: Token expired (age:', Math.floor(tokenAge / (1000 * 60 * 60 * 24)), 'days)');
          return null;
        }
        
        console.log('📱 FCM: Token valid (age:', Math.floor(tokenAge / (1000 * 60 * 60)), 'hours)');
      }
      
      return existingToken;
    } catch (error) {
      console.error('📱 FCM: Error reading from Firestore:', error);
      return null;
    }
  },

  /**
   * Validate token against Firestore
   */
  async validateTokenWithFirestore(userId: string, token: string): Promise<boolean> {
    try {
      const existingToken = await this.getExistingTokenFromFirestore(userId);
      return existingToken === token;
    } catch {
      return false;
    }
  },

  /**
   * Save token to Firestore (only if changed)
   */
  async saveTokenToFirestore(userId: string, token: string): Promise<boolean> {
    try {
      const workerRef = doc(db, "workers", userId);
      
      // Check current token in Firestore
      const docSnap = await getDoc(workerRef);
      const currentData = docSnap.exists() ? docSnap.data() : null;
      const currentToken = currentData?.fcmToken;
      
      // Only update if token changed
      if (currentToken === token) {
        console.log('📱 FCM: Token unchanged, skipping Firestore update');
        return true;
      }
      
      console.log('📱 FCM: Token changed, updating Firestore');
      
      // Prepare update data
      const updateData: Record<string, any> = {
        fcmToken: token,
        tokenUpdatedAt: new Date()
      };
      
      // Add profession if creating new document
      if (!docSnap.exists() || !currentData?.profession) {
        updateData.profession = 'carpenter';
      }
      
      // Use setDoc with merge for both create and update
      await setDoc(workerRef, updateData, { merge: true });
      
      console.log('📱 FCM: Token saved to Firestore successfully');
      return true;
    } catch (error: any) {
      console.error('📱 FCM: Failed to save token to Firestore:', error.message);
      return false;
    }
  },

  /**
   * Get cached token (synchronous)
   */
  getCachedToken(): string | null {
    if (cachedToken) return cachedToken;
    return localStorage.getItem(STORAGE_KEY);
  },

  /**
   * Clear cached token (use sparingly - only for invalid tokens)
   */
  clearCache(): void {
    cachedToken = null;
  }
};

export default fcmTokenManager;
