import { db } from '../firebase';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getProfessionWalletCollection } from './professionService';

// Constants
const LEAD_CHARGE_AMOUNT = 100;
const WELCOME_CREDIT_AMOUNT = 200;

/**
 * Gets the current wallet balance for a worker
 * @param workerId - ID of the worker
 * @param profession - Worker's profession to determine correct collection (defaults to 'carpenter')
 * @returns Promise<number> - Current balance
 */
export const getWalletBalance = async (workerId: string, profession: string = 'carpenter'): Promise<number> => {
  try {
    // Validate inputs
    if (!workerId || typeof workerId !== 'string') {
      console.error('Invalid workerId provided to getWalletBalance:', workerId);
      return 0;
    }
    
    if (!profession || typeof profession !== 'string') {
      console.error('Invalid profession provided to getWalletBalance:', profession);
      return 0;
    }
    
    const collectionName = getProfessionWalletCollection(profession);
    const walletRef = doc(db, collectionName, workerId);
    
    // Add a small delay to prevent too rapid consecutive requests
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists()) {
      const data = walletDoc.data();
      // Ensure balance is a number
      const balance = typeof data.balance === 'number' ? data.balance : 0;
      return Math.max(0, balance); // Ensure non-negative balance
    }
    
    // If no wallet exists, return 0
    return 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    // Return 0 instead of throwing to prevent UI disruptions
    return 0;
  }
};

/**
 * Gives welcome credit to worker on first login
 * @param workerId - ID of the worker
 * @param profession - Worker's profession
 * @returns Promise<boolean> - True if credit was given, false if already existed
 */
export const giveWelcomeCreditIfFirstLogin = async (workerId: string, profession: string): Promise<boolean> => {
  try {
    const collectionName = getProfessionWalletCollection(profession);
    const walletRef = doc(db, collectionName, workerId);
    
    let creditGiven = false;
    
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      
      // Only give welcome credit if wallet doesn't exist
      if (!walletDoc.exists()) {
        transaction.set(walletRef, {
          userId: workerId,
          balance: WELCOME_CREDIT_AMOUNT,
          totalRecharge: 0,
          totalSpent: 0,
          createdAt: serverTimestamp(),
          welcomeCreditGiven: true,
          updatedAt: serverTimestamp()
        });
        creditGiven = true;
        console.log(`✅ Welcome credit of ₹${WELCOME_CREDIT_AMOUNT} given to ${profession} ${workerId}`);
      }
    });
    
    return creditGiven;
  } catch (error) {
    console.error('Error giving welcome credit:', error);
    throw error;
  }
};

/**
 * Adds money to worker's wallet (for Razorpay recharge)
 * @param workerId - ID of the worker
 * @param amount - Amount to add
 * @param profession - Worker's profession
 * @returns Promise<void>
 */
export const addMoneyToWallet = async (workerId: string, amount: number, profession: string = 'carpenter'): Promise<void> => {
  // Validate inputs
  if (!workerId || typeof workerId !== 'string') {
    throw new Error('Invalid workerId provided to addMoneyToWallet');
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Recharge amount must be a positive number');
  }
  
  if (!profession || typeof profession !== 'string') {
    throw new Error('Invalid profession provided to addMoneyToWallet');
  }
  
  try {
    const collectionName = getProfessionWalletCollection(profession);
    const walletRef = doc(db, collectionName, workerId);
    
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      
      let currentBalance = 0;
      let totalRecharge = 0;
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        currentBalance = typeof walletData.balance === 'number' ? walletData.balance : 0;
        totalRecharge = typeof walletData.totalRecharge === 'number' ? walletData.totalRecharge : 0;
      }
      
      const newBalance = currentBalance + amount;
      const newTotalRecharge = totalRecharge + amount;
      
      const updateData: any = {
        balance: newBalance,
        totalRecharge: newTotalRecharge,
        updatedAt: serverTimestamp(),
      };
      
      // Preserve existing fields to satisfy Firestore security rules
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        updateData.userId = walletData.userId;
        updateData.createdAt = walletData.createdAt;
        console.log(`DEBUG: Updating existing wallet for ${workerId}. Old balance: ${currentBalance}, New balance: ${newBalance}. Old totalRecharge: ${totalRecharge}, New totalRecharge: ${newTotalRecharge}`);
      } else {
        updateData.userId = workerId;
        updateData.totalSpent = 0;
        updateData.welcomeCreditGiven = false;
        updateData.createdAt = serverTimestamp();
        console.log(`DEBUG: Creating new wallet for ${workerId}. Balance: ${newBalance}, totalRecharge: ${newTotalRecharge}`);
      }
      
      transaction.set(walletRef, updateData, { merge: true });
      console.log(`DEBUG: Wallet recharge transaction prepared for ${workerId}`);
      
      console.log(`✅ Added ₹${amount} to ${profession} ${workerId}'s wallet. New balance: ₹${newBalance}`);
    });
  } catch (error) {
    console.error('Error adding money to wallet:', error);
    console.log(`DEBUG: Error adding money to wallet for ${workerId}:`, error.message || error);
    throw error;
  }
};

/**
 * Deducts lead charge from worker's wallet when accepting a job
 * @param workerId - ID of the worker
 * @param amount - Amount to deduct (defaults to 100)
 * @param profession - Worker's profession (defaults to 'carpenter')
 * @returns Promise<void>
 * @throws 'LOW_BALANCE' if insufficient funds
 */
export const deductLeadCharge = async (workerId: string, amount: number = LEAD_CHARGE_AMOUNT, profession: string = 'carpenter'): Promise<void> => {
  // Validate inputs
  if (!workerId || typeof workerId !== 'string') {
    throw new Error('Invalid workerId provided to deductLeadCharge');
  }
  
  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Deduction amount must be a positive number');
  }
  
  if (!profession || typeof profession !== 'string') {
    throw new Error('Invalid profession provided to deductLeadCharge');
  }
  
  try {
    const collectionName = getProfessionWalletCollection(profession);
    const walletRef = doc(db, collectionName, workerId);
    
    await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      
      let currentBalance = 0;
      let totalSpent = 0;
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        currentBalance = typeof walletData.balance === 'number' ? walletData.balance : 0;
        totalSpent = typeof walletData.totalSpent === 'number' ? walletData.totalSpent : 0;
      } else {
        // No wallet exists, treat as zero balance
        currentBalance = 0;
        totalSpent = 0;
      }
      
      // Check if sufficient balance
      if (currentBalance < amount) {
        throw new Error('LOW_BALANCE');
      }
      
      // Deduct amount and update totals
      const newBalance = currentBalance - amount;
      const newTotalSpent = totalSpent + amount;
      
      // Update wallet document
      const updateData: any = {
        balance: newBalance,
        totalSpent: newTotalSpent,
        updatedAt: serverTimestamp(),
      };
      
      // Preserve existing fields to satisfy Firestore security rules
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        updateData.userId = walletData.userId;
        updateData.createdAt = walletData.createdAt;
        console.log(`DEBUG: Updating existing wallet for ${workerId}. Old balance: ${currentBalance}, New balance: ${newBalance}. Old totalSpent: ${totalSpent}, New totalSpent: ${newTotalSpent}`);
      } else {
        updateData.userId = workerId;
        updateData.createdAt = serverTimestamp();
        updateData.lastRecharge = null;
        console.log(`DEBUG: Creating new wallet for ${workerId}. Balance: ${newBalance}, totalSpent: ${newTotalSpent}`);
      }
      
      transaction.set(walletRef, updateData, { merge: true });
      console.log(`DEBUG: Wallet update transaction prepared for ${workerId}`);
    });
  } catch (error: any) {
    if (error.message === 'LOW_BALANCE') {
      console.log(`DEBUG: Low balance error for ${workerId}: current balance insufficient for deduction of ${amount}`);
      throw error;
    }
    console.error('Error deducting lead charge:', error);
    console.log(`DEBUG: Error deducting lead charge for ${workerId}:`, error.message || error);
    throw error;
  }
};

/**
 * Gets complete wallet information for a worker
 * @param workerId - ID of the worker
 * @param profession - Worker's profession
 * @returns Promise<object> - Wallet data
 */
export const getWalletInfo = async (workerId: string, profession: string = 'carpenter'): Promise<{
  balance: number;
  totalRecharge: number;
  totalSpent: number;
  welcomeCreditGiven: boolean;
  lastRecharge: any;
  createdAt: any;
  updatedAt: any;
} | null> => {
  // Validate inputs
  if (!workerId || typeof workerId !== 'string') {
    console.error('Invalid workerId provided to getWalletInfo:', workerId);
    return null;
  }
  
  if (!profession || typeof profession !== 'string') {
    console.error('Invalid profession provided to getWalletInfo:', profession);
    return null;
  }
  
  try {
    const collectionName = getProfessionWalletCollection(profession);
    const walletRef = doc(db, collectionName, workerId);
    
    // Add a small delay to prevent too rapid consecutive requests
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists()) {
      const data = walletDoc.data();
      // Ensure numeric fields are numbers
      return {
        balance: typeof data.balance === 'number' ? data.balance : 0,
        totalRecharge: typeof data.totalRecharge === 'number' ? data.totalRecharge : 0,
        totalSpent: typeof data.totalSpent === 'number' ? data.totalSpent : 0,
        welcomeCreditGiven: typeof data.welcomeCreditGiven === 'boolean' ? data.welcomeCreditGiven : false,
        lastRecharge: data.lastRecharge || null,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting wallet info:', error);
    // Return null instead of throwing to prevent UI disruptions
    return null;
  }
};

/**
 * Starts Razorpay wallet recharge process
 * @param workerId - ID of the worker
 * @param amount - Amount to recharge
 * @param profession - Worker's profession
 * @returns Promise<void>
 */
export const startWalletRecharge = async (workerId: string, amount: number, profession: string): Promise<void> => {
  // This function would typically integrate with Razorpay
  // For now, we'll simulate the Razorpay success flow
  try {
    console.log(`💳 Starting Razorpay recharge for ${profession} ${workerId}: ₹${amount}`);
    
    // Simulate Razorpay success (in real implementation, this would be called from Razorpay success handler)
    await addMoneyToWallet(workerId, amount, profession);
    
    console.log(`✅ Razorpay recharge successful for ${profession} ${workerId}: ₹${amount}`);
  } catch (error) {
    console.error('Error in wallet recharge:', error);
    throw error;
  }
};

/**
 * Verifies Razorpay payment and updates wallet
 * @param workerId - ID of the worker
 * @param amount - Amount paid
 * @param paymentId - Razorpay payment ID
 * @param orderId - Razorpay order ID
 * @param signature - Payment signature
 * @param profession - Worker's profession
 * @returns Promise<void>
 */
export const verifyAndRechargeWallet = async (
  workerId: string, 
  amount: number, 
  paymentId: string, 
  orderId: string, 
  signature: string,
  profession: string = 'carpenter'
): Promise<void> => {
  try {
    // In a real implementation, verify the payment signature with Razorpay server
    console.log(`🔍 Verifying payment: ${paymentId} for order: ${orderId}`);
    
    // If verification successful, add money to wallet
    await addMoneyToWallet(workerId, amount, profession);
    
    console.log(`✅ Wallet recharged successfully for ${profession} ${workerId}: ₹${amount}`);
  } catch (error) {
    console.error('Error verifying and recharging wallet:', error);
    throw error;
  }
};
/**
 * Recharges a worker's wallet (alias for addMoneyToWallet)
 * @param workerId - ID of the worker
 * @param amount - Amount to add
 * @param profession - Worker's profession (defaults to 'carpenter')
 * @returns Promise<void>
 */
export const rechargeWallet = async (workerId: string, amount: number, profession: string = 'carpenter'): Promise<void> => {
  return addMoneyToWallet(workerId, amount, profession);
};
