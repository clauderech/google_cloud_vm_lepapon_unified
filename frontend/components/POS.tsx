import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Receipt, ShoppingCart } from 'lucide-react';
import { Product } from '../types';

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface POSProps {
  products: Product[];
  onSale: (items: SaleItem[], paymentMethod: string, customerId?: string) => void;
}

const POS: React.FC<POSProps> = ({ products, onSale }) => {
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>(''); // cash, card, pix, credit

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['Todos', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.type !== 'insumo' && p.type !== 'insumo_bebida' && p.stock > 0)
      .filter(p => selectedCategory === 'Todos' || p.category === selectedCategory)
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, selectedCategory, searchTerm]);

  const addToSale = (product: Product) => {
    const existingItem = currentSale.find(item => item.productId === product.id);
    if (existingItem) {
      setCurrentSale(currentSale.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCurrentSale([...currentSale, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price
      }]);
    }
  };

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCurrentSale(currentSale.filter(item => item.productId !== productId));
    } else {
      setCurrentSale(currentSale.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const removeFromSale = (productId: string) => {
    setCurrentSale(currentSale.filter(item => item.productId !== productId));
  };

  const getTotalSale = () => {
    return currentSale.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  const handleFinalizeSale = (paymentMethod: string) => {
    if (currentSale.length === 0) return;
    
    onSale(currentSale, paymentMethod, customerId || undefined);
    setCurrentSale([]);
    setCustomerId('');
    setPaymentFilter('');
  };

  const clearSale = () => {
    setCurrentSale([]);
    setCustomerId('');
  };

  const paymentMethods = [
    { id: 'cash', name: 'Dinheiro', icon: '💵' },
    { id: 'card', name: 'Cartão', icon: '💳' },
    { id: 'pix', name: 'PIX', icon: '📱' },
    { id: 'credit', name: 'Crédito', icon: '📋' }
  ];

  return (
    <div className="flex h-full">
      {/* Produtos */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">PDV - Ponto de Venda</h2>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex overflow-x-auto mb-6 gap-2 pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-bold transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              onClick={() => addToSale(product)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <h3 className="font-bold text-sm text-gray-900 mb-1 truncate">{product.name}</h3>
              <p className="text-lg font-bold text-green-600">R$ {product.price.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Estoque: {product.stock}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Carrinho */}
      <div className="w-96 bg-gray-50 border-l border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900">Venda Atual</h3>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="ID do cliente (opcional)"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        <div className="flex-1 space-y-3 mb-6 max-h-96 overflow-y-auto">
          {currentSale.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum item no carrinho</p>
            </div>
          ) : (
            currentSale.map(item => (
              <div key={item.productId} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm text-gray-900 flex-1">{item.productName}</h4>
                  <button
                    onClick={() => removeFromSale(item.productId)}
                    className="text-red-500 hover:text-red-700 text-xs ml-2"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">R$ {item.unitPrice.toFixed(2)} cada</p>
                    <p className="font-bold text-green-600">R$ {(item.quantity * item.unitPrice).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {currentSale.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg">Total:</span>
                <span className="font-bold text-2xl text-green-600">R$ {getTotalSale().toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 text-sm">Forma de Pagamento:</h4>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => handleFinalizeSale(method.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <span>{method.icon}</span>
                    <span>{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={clearSale}
              className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 p-2 rounded-lg font-bold transition-colors text-sm"
            >
              Limpar Venda
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;