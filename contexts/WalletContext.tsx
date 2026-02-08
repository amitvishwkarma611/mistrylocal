import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { getWalletBalance } from '../services/walletService';
import { getWorkerProfessionSafe } from '../services/professionService';

// Minimum interval between refreshes in milliseconds
const MIN_REFRESH_INTERVAL = 1000;

interface WalletContextType {
  walletBalance: number;
  refreshWalletBalance: (forceRefresh?: boolean) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
  userId?: string;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children, userId }) => {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const lastRefreshTimeRef = useRef<number | null>(null);

  const refreshWalletBalance = async (forceRefresh: boolean = false) => {
    if (!userId) return;
    
    // Rate limiting: prevent refreshes more frequently than MIN_REFRESH_INTERVAL
    // Unless forceRefresh is true
    if (!forceRefresh) {
      const now = Date.now();
      if (lastRefreshTimeRef.current && (now - lastRefreshTimeRef.current) < MIN_REFRESH_INTERVAL) {
        console.debug('Skipping wallet refresh - too frequent');
        return;
      }
      
      lastRefreshTimeRef.current = now;
    }
    
    try {
      // Add a small delay to prevent too rapid consecutive requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const profession = await getWorkerProfessionSafe(userId);
      const balance = await getWalletBalance(userId, profession);
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error refreshing wallet balance:', error);
    }
  };

  // Refresh wallet balance when userId changes
  useEffect(() => {
    if (userId) {
      refreshWalletBalance();
    } else {
      setWalletBalance(0);
    }
  }, [userId]);

  return (
    <WalletContext.Provider value={{ walletBalance, refreshWalletBalance }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};