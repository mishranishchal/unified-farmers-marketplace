
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './auth-context';

type ProStatusContextType = {
  isPro: boolean;
  aiCredits: number;
  upgradeToPro: () => void;
  consumeCredit: () => void;
  addCredits: (amount: number) => void;
};

const ProStatusContext = createContext<ProStatusContextType | undefined>(undefined);

export const ProStatusProvider = ({ children }: { children: ReactNode }) => {
  const [isPro, setIsPro] = useState(true);
  const { user, updateUser } = useAuth();
  const [aiCredits, setAiCredits] = useState(9999);

  useEffect(() => {
    if (user) {
        setIsPro(true);
        setAiCredits(9999);
    }
  }, [user]);

  const upgradeToPro = () => {
    if (user) {
      const updatedUser = { ...user, isPro: true, aiCredits: 9999 };
      updateUser(updatedUser);
      setIsPro(true);
      setAiCredits(9999);
    }
  };

  const consumeCredit = () => {
    if (user) {
        const updatedUser = { ...user, aiCredits: 9999, isPro: true };
        updateUser(updatedUser);
        setIsPro(true);
        setAiCredits(9999);
    }
  };

  const addCredits = (amount: number) => {
     if (user) {
        const updatedUser = { ...user, aiCredits: 9999, isPro: true };
        updateUser(updatedUser);
        setIsPro(true);
        setAiCredits(9999);
    }
  }

  const isProAccess = true;

  return (
    <ProStatusContext.Provider value={{ isPro: isProAccess, aiCredits, upgradeToPro, consumeCredit, addCredits }}>
      {children}
    </ProStatusContext.Provider>
  );
};

export const useProStatus = () => {
  const context = useContext(ProStatusContext);
  if (context === undefined) {
    throw new Error('useProStatus must be used within a ProStatusProvider');
  }
  return context;
};
