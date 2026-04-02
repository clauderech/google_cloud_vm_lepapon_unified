import React, { useState, useEffect } from 'react';
import { Factory, Plus, Clock, Package, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { ProductionItem, ProductionHistory } from '../types';

interface ProductionManagerProps {
  onError: (message: string) => void;
}

const ProductionManager: React.FC<ProductionManagerProps> = ({ onError }) => {
  const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
  const [availableProductions, setAvailableProductions] = useState<ProductionItem[]>([]);
  const [productionHistory, setProductionHistory] = useState<ProductionHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [producing, setProducing] = useState<string | null>(null); // ID do produto sendo produzido
  const [productionQuantities, setProductionQuantities] = useState<{[key: string]: number}>({});
  const [productionNotes, setProductionNotes] = useState<{[key: string]: string}>({});

  // Buscar produções disponíveis
  const fetchAvailableProductions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/production/available');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar produções disponíveis');
      }
      
      const data = await response.json();
      setAvailableProductions(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar produções:', error);
      onError('Erro ao carregar produções disponíveis');
    } finally {
      setLoading(false);
    }
  };

  // Buscar histórico de produção
  const fetchProductionHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/production/history?limit=20');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }
      
      const data = await response.json();
      setProductionHistory(data.data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      onError('Erro ao carregar histórico de produção');
    } finally {
      setLoading(false);
    }
  };

  // Produzir insumo
  const produceItem = async (productId: string, quantity: number, notes?: string) => {
    try {
      setProducing(productId);
      
      const response = await fetch('/api/production/produce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          quantity,
          notes
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro na produção');
      }
      
      // Limpar campos
      setProductionQuantities(prev => ({ ...prev, [productId]: 1 }));
      setProductionNotes(prev => ({ ...prev, [productId]: '' }));
      
      // Recarregar dados
      await fetchAvailableProductions();
      if (activeTab === 'history') {
        await fetchProductionHistory();
      }
      
      alert(`✅ ${data.message}`);
      
    } catch (error: any) {
      console.error('Erro na produção:', error);
      onError(error.message || 'Erro ao produzir insumo');
    } finally {
      setProducing(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableProductions();
    } else {
      fetchProductionHistory();
    }
  }, [activeTab]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Factory className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Produção</h1>
              <p className="text-gray-600">Produção de insumos caseiros</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 px-6 py-4 text-center font-medium ${
              activeTab === 'available'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Factory className="h-5 w-5 inline mr-2" />
            Produções Disponíveis
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 text-center font-medium ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="h-5 w-5 inline mr-2" />
            Histórico
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {/* Tab: Produções Disponíveis */}
          {activeTab === 'available' && !loading && (
            <div className="space-y-4">
              {availableProductions.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum insumo com receita disponível para produção</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Adicione insumos da categoria "casa" com receitas no estoque para vê-los aqui.
                  </p>
                </div>
              ) : (
                availableProductions.map((item) => {
                  const quantity = productionQuantities[item.id] || 1;
                  const notes = productionNotes[item.id] || '';
                  const isProducing = producing === item.id;
                  const canProduce = item.maxProduction > 0;

                  return (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-600">Categoria: {item.category}</span>
                            <span className="text-sm text-gray-600">Custo: {formatCurrency(item.cost)}/{item.unit}</span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          canProduce ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {canProduce ? `Pode produzir: ${item.maxProduction} ${item.unit}` : 'Sem ingredientes'}
                        </div>
                      </div>

                      {/* Ingredientes */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Receita:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {item.ingredientDetails.map((ingredient) => (
                            <div
                              key={ingredient.id}
                              className={`text-xs p-2 rounded border ${
                                ingredient.possibleUnits > 0
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-red-50 border-red-200'
                              }`}
                            >
                              <div className="font-medium">{ingredient.name}</div>
                              <div className="text-gray-600">
                                Necessário: {ingredient.required} {ingredient.unit}
                              </div>
                              <div className="text-gray-600">
                                Disponível: {ingredient.available} {ingredient.unit}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Formulário de Produção */}
                      {canProduce && (
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantidade a produzir
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={item.maxProduction}
                                value={quantity}
                                onChange={(e) => setProductionQuantities(prev => ({
                                  ...prev,
                                  [item.id]: Math.max(1, Math.min(item.maxProduction, parseInt(e.target.value) || 1))
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isProducing}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Observações (opcional)
                              </label>
                              <input
                                type="text"
                                value={notes}
                                onChange={(e) => setProductionNotes(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                placeholder="Ex: Lote da manhã"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isProducing}
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => produceItem(item.id, quantity, notes || undefined)}
                                disabled={isProducing}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center"
                              >
                                {isProducing ? (
                                  <><Loader className="h-4 w-4 animate-spin mr-2" /> Produzindo...</>
                                ) : (
                                  <><Plus className="h-4 w-4 mr-2" /> Produzir</>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab: Histórico */}
          {activeTab === 'history' && !loading && (
            <div className="space-y-4">
              {productionHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma produção realizada ainda</p>
                </div>
              ) : (
                productionHistory.map((production) => (
                  <div key={production.productionId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Produção #{production.productionId.split('_')[1]}
                        </h3>
                        <p className="text-sm text-gray-600">{formatDate(production.date)}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>

                    {/* Itens Produzidos */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Itens Produzidos:</h4>
                      {production.producedItems.map((item) => (
                        <div key={item.id} className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-400">
                          <span className="font-medium">{item.productName}</span>: +{Math.abs(item.quantity)} 
                          {item.notes && <span className="text-gray-600 ml-2">({item.notes})</span>}
                        </div>
                      ))}
                    </div>

                    {/* Ingredientes Consumidos */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ingredientes Consumidos:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {production.consumedIngredients.map((ingredient) => (
                          <div key={ingredient.id} className="text-xs bg-red-50 p-2 rounded border-l-4 border-red-400">
                            <span className="font-medium">{ingredient.productName}</span>: {Math.abs(ingredient.quantity)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionManager;