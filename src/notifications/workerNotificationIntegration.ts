import { getWorkerFCMToken } from './firebaseMessaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const initializeWorkerNotifications = async (workerId: string, profession: string) => {
  try {
    console.log('🔔 Initializing worker notifications for:', workerId, profession);
    
    const token = await getWorkerFCMToken();
    console.log('🔑 FCM token retrieved:', token ? 'YES' : 'NO');
    
    if (token) {
      console.log('💾 Saving FCM token to Firestore...');
      const workerRef = doc(db, `${profession}s`, workerId);
      await setDoc(workerRef, { 
        fcmToken: token,
        tokenUpdatedAt: new Date()
      }, { merge: true });
      console.log('✅ FCM token saved successfully to', workerRef.path);
    } else {
      console.warn('❌ No FCM token generated - check notification permissions');
    }
  } catch (error) {
    console.error('❌ Failed to initialize worker notifications:', error);
    // Re-throw to let caller handle if needed
    throw error;
  }
};