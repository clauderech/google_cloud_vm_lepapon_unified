import { useState, useEffect } from 'react';
import { financialService } from '../services/financialService';
import type { CashRegister } from '../types';

export interface CashStatusHook {
  cashRegister: CashRegister | null;
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useCashRegisterStatus = (): CashStatusHook => {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const current = await financialService.getCurrentCashRegister();
      setCashRegister(current);
    } catch (err) {
      console.error('Erro ao carregar status do caixa:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar caixa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    cashRegister,
    isOpen: cashRegister?.status === 'open',
    loading,
    error,
    refresh
  };
};

export default useCashRegisterStatus;
