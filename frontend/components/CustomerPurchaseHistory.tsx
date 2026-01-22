import React, { useMemo } from 'react';
import { ShoppingBag, Calendar, DollarSign, Package, TrendingUp, Award } from 'lucide-react';
import type { Customer, Sale } from '../types';

interface CustomerPurchaseHistoryProps {
  customer: Customer;
  sales: Sale[];
  onClose: () => void;
}

const CustomerPurchaseHistory: React.FC<CustomerPurchaseHistoryProps> = ({ 
  customer, 
  sales,
  onClose 
}) => {
  // Filtrar vendas do cliente
  const customerSales = useMemo(() => {
    const customerFullName = `${customer.nome} ${customer.sobrenome || ''}`.trim().toLowerCase();
    
    return sales.filter(sale => {
      if (sale.customerId === customer.id) return true;
      if (sale.customerName?.toLowerCase() === customerFullName) return true;
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, customer]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalSpent = customerSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPurchases = customerSales.length;
    const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
    
    const itemsCount: Record<string, { name: string; count: number; total: number }> = {};
    customerSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemsCount[item.productId]) {
          itemsCount[item.productId] = { name: item.productName, count: 0, total: 0 };
        }
        itemsCount[item.productId].count += item.quantity;
        itemsCount[item.productId].total += item.quantity * item.unitPrice;
      });
    });
    
    const favoriteProducts = Object.values(itemsCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // Pontos de fidelidade: 1 ponto a cada R$ 10 gastos
    const loyaltyPoints = Math.floor(totalSpent / 10);
    
    return {
      totalSpent,
      totalPurchases,
      averageTicket,
      favoriteProducts,
      loyaltyPoints
    };
  }, [customerSales]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black mb-1">
                {customer.nome} {customer.sobrenome || ''}
              </h2>
              {customer.fone && (
                <p className="text-white/90 text-sm font-medium">{customer.fone}</p>
              )}
            </div>
            <button 
              onClick={onClose}
              className="text-white/90 hover:text-white font-bold text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-xs font-bold text-gray-600">Total Gasto</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                R$ {stats.totalSpent.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <span className="text-xs font-bold text-gray-600">Compras</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                {stats.totalPurchases}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-bold text-gray-600">Ticket Médio</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                R$ {stats.averageTicket.toFixed(2)}
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-lg shadow-sm text-white">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5" />
                <span className="text-xs font-bold">Pontos Fidelidade</span>
              </div>
              <p className="text-2xl font-black">
                {stats.loyaltyPoints}
              </p>
            </div>
          </div>
        </div>

        {/* Produtos Favoritos */}
        {stats.favoriteProducts.length > 0 && (
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Produtos Favoritos
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {stats.favoriteProducts.map((product, idx) => (
                <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="font-bold text-gray-900 text-sm truncate">{product.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {product.count}x • R$ {product.total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico de Compras */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            Histórico de Compras
          </h3>
          
          {customerSales.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">Nenhuma compra registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customerSales.map(sale => (
                <div key={sale.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">
                        {new Date(sale.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Pagamento: <span className="font-bold">
                          {sale.paymentMethod === 'cash' ? 'Dinheiro' : 
                           sale.paymentMethod === 'card' ? 'Cartão' : 
                           sale.paymentMethod === 'pix' ? 'PIX' : 'Crédito'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-700">
                        R$ {sale.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Itens da venda */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700 font-medium">
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="text-gray-900 font-bold">
                          R$ {(item.quantity * item.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {sale.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-600">
                        <span className="font-bold">Obs:</span> {sale.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerPurchaseHistory;
