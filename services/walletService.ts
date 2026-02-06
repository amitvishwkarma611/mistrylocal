import { db } from '../firebase';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

// Constants
const LEAD_CHARGE_AMOUNT = 100;

/**
 * Gets the current wallet balance for a carpenter
 * @param carpenterId - ID of the carpenter
 * @returns Promise<number> - Current balance
 */
export const getWalletBalance = async (carpenterId: string): Promise<number> => {
  try {
    const walletDoc = await getDoc(doc(db, 'carpenter_wallets', carpenterId));
    
    if (walletDoc.exists()) {
      const data = walletDoc.data();
      return data.balance || 0;
    }
    
    // If no wallet exists, return 0
    return 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
};

/**
 * Deducts lead charge from carpenter's wallet when accepting a job
 * @param carpenterId - ID of the carpenter
 * @param amount - Amount to deduct (defaults to 100)
 * @returns Promise<void>
 * @throws 'LOW_BALANCE' if insufficient funds
 */
export const deductLeadCharge = async (carpenterId: string, amount: number = LEAD_CHARGE_AMOUNT): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, 'carpenter_wallets', carpenterId);
      const walletDoc = await transaction.get(walletRef);
      
      let currentBalance = 0;
      let totalSpent = 0;
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        currentBalance = walletData.balance || 0;
        totalSpent = walletData.totalSpent || 0;
      }
      
      // Check if sufficient balance
      if (currentBalance < amount) {
        throw new Error('LOW_BALANCE');
      }
      
      // Deduct amount and update totals
      const newBalance = currentBalance - amount;
      const newTotalSpent = totalSpent + amount;
      
      // Update wallet document
      transaction.set(walletRef, {
        balance: newBalance,
        totalSpent: newTotalSpent,
        updatedAt: serverTimestamp(),
        // If this is the first transaction, set lastRecharge to null or initial value
        ...(walletDoc.exists() ? {} : { lastRecharge: null })
      }, { merge: true });
    });
  } catch (error: any) {
    if (error.message === 'LOW_BALANCE') {
      throw error;
    }
    console.error('Error deducting lead charge:', error);
    throw error;
  }
};

/**
 * Recharges a carpenter's wallet
 * @param carpenterId - ID of the carpenter
 * @param amount - Amount to add
 * @returns Promise<void>
 */
export const rechargeWallet = async (carpenterId: string, amount: number): Promise<void> => {
  if (amount <= 0) {
    throw new Error('Recharge amount must be positive');
  }
  
  try {
    await runTransaction(db, async (transaction) => {
      const walletRef = doc(db, 'carpenter_wallets', carpenterId);
      const walletDoc = await transaction.get(walletRef);
      
      let currentBalance = 0;
      
      if (walletDoc.exists()) {
        const walletData = walletDoc.data();
        currentBalance = walletData.balance || 0;
      }
      
      const newBalance = currentBalance + amount;
      
      transaction.set(walletRef, {
        balance: newBalance,
        lastRecharge: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // If this is the first transaction, initialize totalSpent
        ...(walletDoc.exists() ? {} : { totalSpent: 0 })
      }, { merge: true });
    });
  } catch (error) {
    console.error('Error recharging wallet:', error);
    throw error;
  }
};

/**
 * Gets complete wallet information for a carpenter
 * @param carpenterId - ID of the carpenter
 * @returns Promise<object> - Wallet data
 */
export const getWalletInfo = async (carpenterId: string): Promise<{
  balance: number;
  totalSpent: number;
  lastRecharge: any;
  updatedAt: any;
} | null> => {
  try {
    const walletDoc = await getDoc(doc(db, 'carpenter_wallets', carpenterId));
    
    if (walletDoc.exists()) {
      return walletDoc.data() as any;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting wallet info:', error);
    throw error;
  }
};