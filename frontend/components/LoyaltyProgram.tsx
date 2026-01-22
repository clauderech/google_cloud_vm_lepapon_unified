import React from 'react';
import { Award, Gift, Star, TrendingUp } from 'lucide-react';

interface LoyaltyProgramProps {
  loyaltyPoints: number;
  onApplyDiscount: (discountPercent: number, pointsToDeduct: number) => void;
  cartTotal: number;
}

const REWARDS = [
  { points: 50, discount: 5, label: '5% de desconto', icon: '🎁' },
  { points: 100, discount: 10, label: '10% de desconto', icon: '🎉' },
  { points: 200, discount: 15, label: '15% de desconto', icon: '🌟' },
  { points: 300, discount: 20, label: '20% de desconto', icon: '💎' },
];

const LoyaltyProgram: React.FC<LoyaltyProgramProps> = ({ 
  loyaltyPoints, 
  onApplyDiscount,
  cartTotal 
}) => {
  const availableRewards = REWARDS.filter(reward => loyaltyPoints >= reward.points);
  const nextReward = REWARDS.find(reward => loyaltyPoints < reward.points);

  const handleApplyReward = (reward: typeof REWARDS[0]) => {
    if (loyaltyPoints >= reward.points) {
      const discountAmount = (cartTotal * reward.discount) / 100;
      if (confirm(
        `Usar ${reward.points} pontos para obter ${reward.discount}% de desconto (R$ ${discountAmount.toFixed(2)})?`
      )) {
        onApplyDiscount(reward.discount, reward.points);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-200 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-5 h-5 text-amber-600" />
        <h3 className="font-bold text-amber-900">Programa Fidelidade</h3>
      </div>

      {/* Pontos Atuais */}
      <div className="bg-white p-4 rounded-lg mb-4 border border-amber-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 font-medium">Seus Pontos</span>
          <Star className="w-5 h-5 text-amber-500" />
        </div>
        <p className="text-3xl font-black text-amber-600">{loyaltyPoints}</p>
        <p className="text-xs text-gray-500 mt-1">
          Ganhe 1 ponto a cada R$ 10 em compras
        </p>
      </div>

      {/* Próxima Recompensa */}
      {nextReward && (
        <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-900">Próxima Recompensa</span>
          </div>
          <p className="text-sm font-bold text-blue-800">
            {nextReward.icon} {nextReward.label}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Faltam {nextReward.points - loyaltyPoints} pontos
          </p>
        </div>
      )}

      {/* Recompensas Disponíveis */}
      {availableRewards.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
            <Gift className="w-4 h-4" />
            Resgatar Recompensa
          </p>
          {availableRewards.map(reward => (
            <button
              key={reward.points}
              onClick={() => handleApplyReward(reward)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-3 rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-between"
            >
              <span>
                {reward.icon} {reward.label}
              </span>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">
                {reward.points} pts
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">
            Continue comprando para ganhar pontos e descontos!
          </p>
        </div>
      )}

      {/* Tabela de Recompensas */}
      <div className="mt-4 pt-4 border-t border-amber-200">
        <p className="text-xs font-bold text-gray-700 mb-2">Tabela de Recompensas</p>
        <div className="space-y-1">
          {REWARDS.map(reward => (
            <div 
              key={reward.points}
              className={`flex justify-between text-xs p-2 rounded ${
                loyaltyPoints >= reward.points 
                  ? 'bg-green-50 text-green-800 font-bold' 
                  : 'bg-gray-50 text-gray-600'
              }`}
            >
              <span>{reward.icon} {reward.label}</span>
              <span>{reward.points} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyProgram;
