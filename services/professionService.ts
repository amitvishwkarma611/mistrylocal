import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppRole } from '../types';

/**
 * Auto-set profession for workers on first login
 * QUOTA-SAFE: Only writes when document missing or profession field missing
 * @param uid - Worker's Firebase UID
 * @param role - Worker's role (CARPENTER)
 * @param selectedProfession - Profession selected during role selection (if available)
 * @param storedProfession - Profession stored in local storage (if available)
 */
export const autoSetWorkerProfession = async (
  uid: string, 
  role: AppRole, 
  selectedProfession?: string,
  storedProfession?: string
): Promise<void> => {
  try {
    // Determine profession value with priority order:
    // selectedProfession → storedProfession → "carpenter" (default)
    const profession = selectedProfession || storedProfession || "carpenter";
    
    // Validate profession value
    const validProfessions = ["carpenter", "plumber", "electrician"];
    if (!validProfessions.includes(profession)) {
      console.warn(`Invalid profession "${profession}", defaulting to "carpenter"`);
      return autoSetWorkerProfession(uid, role, "carpenter", storedProfession);
    }
    
    // Get the correct collection name
    const collectionName = getProfessionCollection(profession);
    const workerDocRef = doc(db, collectionName, uid);
    const workerDoc = await getDoc(workerDocRef);
    
    // NEW LOGIC: Check if profession needs to be updated
    const existingProfession = workerDoc.exists() ? workerDoc.data().profession : null;
    
    // Update if:
    // 1. Document doesn't exist
    // 2. Document exists but has no profession field
    // 3. Document exists but profession doesn't match selected profession
    if (!workerDoc.exists() || !existingProfession || existingProfession !== profession) {
      if (existingProfession && existingProfession !== profession) {
        console.log(`🔄 Worker ${uid} changing profession from ${existingProfession} to ${profession}`);
      }
      
      if (!workerDoc.exists()) {
        // Create new worker document with profession in the correct collection
        const currentTime = serverTimestamp();
        await setDoc(workerDocRef, {
          id: uid,
          name: `${profession.charAt(0).toUpperCase() + profession.slice(1)} User`, // Default name based on profession
          phone: '',
          rating: 0,
          online: false,
          services: [profession],
          serviceAreas: ['400707', '400708'], // Default Airoli service areas
          location: { lat: 0, lng: 0 },
          city: '',
          serviceArea: 'airoli', // Default service area
          createdAt: currentTime,
          updatedAt: currentTime,
          profession: profession, // Store the selected profession
          jobsCompleted: 0,
          verified: false,
          trustScore: 0
        }, { merge: true });
        
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log(`✅ Created new ${profession} profile in ${collectionName} collection for worker ${uid}`);
        }
      } else {
        // Update existing document with correct profession field
        await updateDoc(workerDocRef, {
          profession: profession,
          services: [profession], // Also ensure services array is consistent
          updatedAt: serverTimestamp()
        });
        
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          console.log(`✅ Updated existing profile with profession: ${profession} in ${collectionName} collection for worker ${uid}`);
        }
      }
    } else {
      // Document exists and profession is already set correctly - no action needed
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(`ℹ️ Worker ${uid} already has correct profession set: ${workerDoc.data().profession} in ${collectionName} collection`);
      }
    }
  } catch (error) {
    console.error('❌ Error in autoSetWorkerProfession:', error);
    throw error;
  }
};

/**
 * Get the correct Firestore collection name based on profession
 * @param profession - Worker's profession ("carpenter", "plumber", "electrician")
 * @returns Collection name string
 */
export const getProfessionCollection = (profession: string): string => {
  const validProfessions = ["carpenter", "plumber", "electrician"];
  if (!validProfessions.includes(profession)) {
    console.warn(`Invalid profession "${profession}", defaulting to "carpenters"`);
    return "carpenters";
  }
  return profession + "s"; // carpenter -> carpenters, plumber -> plumbers, electrician -> electricians
};

/**
 * Get the correct Firestore collection name for wallet based on profession
 * @param profession - Worker's profession ("carpenter", "plumber", "electrician")
 * @returns Collection name string for wallet
 */
export const getProfessionWalletCollection = (profession: string): string => {
  const validProfessions = ["carpenter", "plumber", "electrician"];
  if (!validProfessions.includes(profession)) {
    console.warn(`Invalid profession "${profession}", defaulting to "carpenter_wallets"`);
    return "carpenter_wallets";
  }
  return profession + "_wallets"; // carpenter -> carpenter_wallets, plumber -> plumber_wallets, electrician -> electrician_wallets
};

/**
 * Get worker's profession from Firestore
 * QUOTA-SAFE: Single read operation
 * @param uid - Worker's Firebase UID
 * @returns Profession string or undefined if not set
 */
export const getWorkerProfession = async (uid: string): Promise<string | undefined> => {
  try {
    console.log(`🔍 Looking for worker ${uid} in all collections...`);
    // Try all collections to find the worker's document
    const collections = ["carpenters", "plumbers", "electricians"];
    const foundDocs: {collection: string, profession: string}[] = [];
    
    for (const collectionName of collections) {
      const docRef = doc(db, collectionName, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profession = data.profession || collectionName.replace('s', '');
        foundDocs.push({collection: collectionName, profession});
        console.log(`✅ Found worker ${uid} in ${collectionName} collection with profession: ${profession}`);
      }
    }
    
    if (foundDocs.length === 0) {
      console.log(`❌ Worker ${uid} not found in any collection`);
      return undefined;
    }
    
    // If multiple documents found, prioritize non-carpenter professions
    if (foundDocs.length > 1) {
      console.log(`⚠️ Worker ${uid} found in multiple collections:`, foundDocs);
      const nonCarpenter = foundDocs.find(doc => doc.profession !== 'carpenter');
      if (nonCarpenter) {
        console.log(`🎯 Prioritizing non-carpenter profession: ${nonCarpenter.profession} from ${nonCarpenter.collection}`);
        return nonCarpenter.profession;
      }
    }
    
    // Return the first found profession
    const result = foundDocs[0].profession;
    console.log(`📋 Returning profession: ${result}`);
    return result;
  } catch (error) {
    console.error('Error fetching worker profession:', error);
    return undefined;
  }
};

/**
 * Get profession with backward compatibility fallback
 * @param uid - Worker's Firebase UID
 * @returns Profession string (defaults to "carpenter" if missing)
 */
export const getWorkerProfessionSafe = async (uid: string): Promise<string> => {
  const profession = await getWorkerProfession(uid);
  return profession || "carpenter"; // Default fallback for backward compatibility
};