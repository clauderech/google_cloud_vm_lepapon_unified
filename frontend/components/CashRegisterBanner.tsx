import React from 'react';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';

interface CashRegisterBannerProps {
  isOpen: boolean;
  onOpenCashClick?: () => void;
}

export const CashRegisterBanner: React.FC<CashRegisterBannerProps> = ({ 
  isOpen, 
  onOpenCashClick 
}) => {
  if (isOpen) {
    // Caixa aberto - banner verde
    return (
      <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg shadow-sm">
        <div className="flex items-center gap-3">
          <Unlock className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-green-800">Caixa Aberto ✅</p>
            <p className="text-xs text-green-700">Você pode fazer vendas normalmente</p>
          </div>
        </div>
      </div>
    );
  }

  // Caixa fechado - banner vermelho
  return (
    <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-4 rounded-r-lg shadow-md">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 animate-pulse" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-800">⚠️ Caixa Fechado</p>
          <p className="text-xs text-red-700 mt-1">
            Você não pode fazer vendas sem abrir o caixa. Clique em "Caixa" no menu para abrir.
          </p>
        </div>
        {onOpenCashClick && (
          <button
            onClick={onOpenCashClick}
            className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            Abrir Caixa
          </button>
        )}
      </div>
    </div>
  );
};

export default CashRegisterBanner;
