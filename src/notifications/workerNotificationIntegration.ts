import { getWorkerFCMToken } from './firebaseMessaging';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export const initializeWorkerNotifications = async (workerId: string, profession: string) => {
  try {
    const token = await getWorkerFCMToken();
    if (token) {
      const workerRef = doc(db, `${profession}s`, workerId);
      await setDoc(workerRef, { fcmToken: token }, { merge: true });
    }
  } catch (error) {
    // Silent fail - non-intrusive
  }
};