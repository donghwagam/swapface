import { useState } from 'react';
import type { User, SwapHistory } from '../types';

/**
 * 사용자 상태 및 크레딧 관리 훅
 */
export const useUser = () => {
  const [user, setUser] = useState<User>({
    id: '1',
    name: '홍길동',
    credits: 2,
    freeTrialsUsed: 0,
    maxFreeTrials: 2,
  });

  const [history, setHistory] = useState<SwapHistory[]>([]);

  const deductCredit = (): boolean => {
    if (user.freeTrialsUsed < user.maxFreeTrials) {
      setUser(prev => ({
        ...prev,
        freeTrialsUsed: prev.freeTrialsUsed + 1,
      }));
      return true;
    } else if (user.credits > 0) {
      setUser(prev => ({
        ...prev,
        credits: prev.credits - 1,
      }));
      return true;
    }
    return false;
  };

  const addCredits = (amount: number): void => {
    setUser(prev => ({
      ...prev,
      credits: prev.credits + amount,
    }));
  };

  const addToHistory = (swap: Omit<SwapHistory, 'id' | 'timestamp'>): void => {
    const newSwap: SwapHistory = {
      ...swap,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setHistory(prev => [newSwap, ...prev]);
  };

  const canPerformSwap = (): boolean => {
    return user.freeTrialsUsed < user.maxFreeTrials || user.credits > 0;
  };

  const getSwapCost = (): number => {
    return user.freeTrialsUsed < user.maxFreeTrials ? 0 : 1;
  };

  return {
    user,
    history,
    deductCredit,
    addCredits,
    addToHistory,
    canPerformSwap,
    getSwapCost,
  };
};