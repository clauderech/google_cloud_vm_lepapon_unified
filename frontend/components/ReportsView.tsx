import React, { useState } from 'react';
import { 
  FileText, 
  TrendingDown, 
  Package, 
  TrendingUp,
  Download,
  Calendar
} from 'lucide-react';
import { financialService } from '../services/financialService';

type ReportType = 'monthly' | 'lowStock' | 'bestSellers' | 'profitability' | 'productionCapacity';

export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('monthly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const [monthlyFilters, setMonthlyFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const loadReport = async (type: ReportType) => {
    setLoading(true);
    try {
      let data;
      switch (type) {
        case 'monthly':
          data = await financialService.getMonthlyReport(monthlyFilters.month, monthlyFilters.year);
          break;
        case 'lowStock':
          data = await financialService.getLowStockReport();
          break;
        case 'bestSellers':
          data = await financialService.getBestSellersReport();
          break;
        case 'profitability':
          data = await financialService.getProfitabilityReport();
          break;
        case 'productionCapacity':
          data = await financialService.getProductionCapacityReport();
          break;
      }
      setReportData(data);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      alert('Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const handleReportChange = (type: ReportType) => {
    setActiveReport(type);
    setReportData(null);
    loadReport(type);
  };

  const exportToCSV = () => {
    if (!reportData) return;
    
    let csv = '';
    let filename = '';

    switch (activeReport) {
      case 'monthly':
        filename = `relatorio_mensal_${monthlyFilters.month}_${monthlyFilters.year}.csv`;
        csv = 'Descrição,Valor\n';
        csv += `Total Vendas,${reportData.totalSales}\n`;
        csv += `Total Despesas,${reportData.totalExpenses}\n`;
        csv += `Lucro Líquido,${reportData.netProfit}\n`;
        break;
      
      case 'lowStock':
        filename = 'estoque_baixo.csv';
        csv = 'Produto,Estoque Atual,Estoque Mínimo,Diferença\n';
        reportData.forEach((item: any) => {
          csv += `${item.productName},${item.currentStock},${item.minStock},${item.difference}\n`;
        });
        break;
      
      case 'bestSellers':
        filename = 'mais_vendidos.csv';
        csv = 'Produto,Quantidade Vendida,Receita Total\n';
        reportData.forEach((item: any) => {
          csv += `${item.productName},${item.totalQuantity},${item.totalRevenue}\n`;
        });
        break;
      
      case 'profitability':
        filename = 'lucratividade.csv';
        csv = 'Produto,Custo,Preço Venda,Margem,Lucro Unitário\n';
        reportData.forEach((item: any) => {
          csv += `${item.productName},${item.cost},${item.price},${item.profitMargin}%,${item.unitProfit}\n`;
        });
        break;

      case 'productionCapacity':
        filename = 'capacidade_producao.csv';
        csv = 'Produto,Capacidade Máxima,Ingredientes Limitantes\n';
        reportData.forEach((item: any) => {
          csv += `${item.dishName},${item.maxProducible},${item.limitingIngredients || 'N/A'}\n`;
        });
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h2>
        {reportData && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Menu de Relatórios */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => handleReportChange('monthly')}
          className={`p-4 rounded-xl font-bold transition-all ${
            activeReport === 'monthly'
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
          }`}
        >
          <FileText className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm">Mensal</span>
        </button>

        <button
          onClick={() => handleReportChange('lowStock')}
          className={`p-4 rounded-xl font-bold transition-all ${
            activeReport === 'lowStock'
              ? 'bg-red-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-red-300'
          }`}
        >
          <TrendingDown className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm">Estoque Baixo</span>
        </button>

        <button
          onClick={() => handleReportChange('bestSellers')}
          className={`p-4 rounded-xl font-bold transition-all ${
            activeReport === 'bestSellers'
              ? 'bg-green-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
          }`}
        >
          <TrendingUp className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm">Mais Vendidos</span>
        </button>

        <button
          onClick={() => handleReportChange('profitability')}
          className={`p-4 rounded-xl font-bold transition-all ${
            activeReport === 'profitability'
              ? 'bg-purple-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300'
          }`}
        >
          <FileText className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm">Lucratividade</span>
        </button>

        <button
          onClick={() => handleReportChange('productionCapacity')}
          className={`p-4 rounded-xl font-bold transition-all ${
            activeReport === 'productionCapacity'
              ? 'bg-orange-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300'
          }`}
        >
          <Package className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm">Capacidade</span>
        </button>
      </div>

      {/* Filtros para Relatório Mensal */}
      {activeReport === 'monthly' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <select
              value={monthlyFilters.month}
              onChange={(e) => setMonthlyFilters({ ...monthlyFilters, month: parseInt(e.target.value) })}
              className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={monthlyFilters.year}
              onChange={(e) => setMonthlyFilters({ ...monthlyFilters, year: parseInt(e.target.value) })}
              className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-medium"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <button
              onClick={() => loadReport('monthly')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Carregar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo do Relatório */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-600">Carregando relatório...</div>
        ) : !reportData ? (
          <div className="p-12 text-center text-gray-600">Selecione um relatório para visualizar</div>
        ) : (
          <div className="p-6">
            {activeReport === 'monthly' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Relatório Mensal - {new Date(monthlyFilters.year, monthlyFilters.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 font-bold mb-2">Total de Vendas</p>
                    <p className="text-3xl font-black text-blue-900">
                      {financialService.formatCurrency(reportData.totalSales || 0)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">{reportData.salesCount || 0} vendas</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700 font-bold mb-2">Total de Despesas</p>
                    <p className="text-3xl font-black text-red-900">
                      {financialService.formatCurrency(reportData.totalExpenses || 0)}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Operacional + Compras</p>
                  </div>
                  <div className={`p-6 rounded-lg border-2 ${
                    (reportData.netProfit || 0) >= 0 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-orange-50 border-orange-300'
                  }`}>
                    <p className="text-sm font-bold mb-2">Lucro Líquido</p>
                    <p className={`text-3xl font-black ${
                      (reportData.netProfit || 0) >= 0 ? 'text-green-900' : 'text-orange-900'
                    }`}>
                      {financialService.formatCurrency(reportData.netProfit || 0)}
                    </p>
                    <p className="text-xs mt-1">
                      Margem: {financialService.calculateProfitMargin(reportData.netProfit || 0, reportData.totalSales || 0)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeReport === 'lowStock' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Produtos com Estoque Baixo</h3>
                {reportData.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">Todos os produtos estão com estoque adequado!</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-red-100">
                      <tr>
                        <th className="text-left p-3 font-bold text-red-900 text-sm">Produto</th>
                        <th className="text-center p-3 font-bold text-red-900 text-sm">Estoque Atual</th>
                        <th className="text-center p-3 font-bold text-red-900 text-sm">Estoque Mínimo</th>
                        <th className="text-center p-3 font-bold text-red-900 text-sm">Diferença</th>
                        <th className="text-center p-3 font-bold text-red-900 text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{item.productName}</td>
                          <td className="p-3 text-center font-bold text-red-600">{item.currentStock} {item.unit}</td>
                          <td className="p-3 text-center text-gray-700">{item.minStock} {item.unit}</td>
                          <td className="p-3 text-center font-black text-red-700">{item.difference} {item.unit}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                              Reabastecer
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeReport === 'bestSellers' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Produtos Mais Vendidos</h3>
                {reportData.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">Nenhuma venda registrada</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="text-left p-3 font-bold text-green-900 text-sm">Posição</th>
                        <th className="text-left p-3 font-bold text-green-900 text-sm">Produto</th>
                        <th className="text-center p-3 font-bold text-green-900 text-sm">Quantidade Vendida</th>
                        <th className="text-right p-3 font-bold text-green-900 text-sm">Receita Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-black text-green-600 text-lg">#{idx + 1}</td>
                          <td className="p-3 font-medium text-gray-900">{item.productName}</td>
                          <td className="p-3 text-center font-bold text-gray-900">{item.totalQuantity}</td>
                          <td className="p-3 text-right font-black text-green-700">
                            {financialService.formatCurrency(item.totalRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeReport === 'profitability' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Análise de Lucratividade por Produto</h3>
                {reportData.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">Nenhum produto cadastrado</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="text-left p-3 font-bold text-purple-900 text-sm">Produto</th>
                        <th className="text-right p-3 font-bold text-purple-900 text-sm">Custo</th>
                        <th className="text-right p-3 font-bold text-purple-900 text-sm">Preço Venda</th>
                        <th className="text-right p-3 font-bold text-purple-900 text-sm">Lucro Unitário</th>
                        <th className="text-center p-3 font-bold text-purple-900 text-sm">Margem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{item.productName}</td>
                          <td className="p-3 text-right text-gray-700">{financialService.formatCurrency(item.cost)}</td>
                          <td className="p-3 text-right font-bold text-gray-900">{financialService.formatCurrency(item.price)}</td>
                          <td className="p-3 text-right font-black text-green-700">
                            {financialService.formatCurrency(item.unitProfit)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                              item.profitMargin >= 30 
                                ? 'bg-green-100 text-green-800'
                                : item.profitMargin >= 15
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {item.profitMargin}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeReport === 'productionCapacity' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900">Capacidade de Produção</h3>
                {reportData.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">Nenhum prato cadastrado</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="text-left p-3 font-bold text-orange-900 text-sm">Prato</th>
                        <th className="text-center p-3 font-bold text-orange-900 text-sm">Capacidade Máxima</th>
                        <th className="text-left p-3 font-bold text-orange-900 text-sm">Ingredientes Limitantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{item.dishName}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black ${
                              item.maxProducible >= 10
                                ? 'bg-green-100 text-green-800'
                                : item.maxProducible >= 5
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {item.maxProducible} unidades
                            </span>
                          </td>
                          <td className="p-3 text-sm text-gray-700">
                            {item.limitingIngredients || 'Todos os ingredientes disponíveis'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
