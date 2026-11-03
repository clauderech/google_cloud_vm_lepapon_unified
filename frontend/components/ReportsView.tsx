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

type ReportType = 'monthly' | 'lowStock' | 'bestSellers' | 'profitability' | 'productionCapacity' | 'salesByPeriod';
type PeriodSale = {
  id: string;
  comandaId: string | null;
  date: string;
  customerName: string;
  paymentMethod: string;
  total: number;
  items: { productName: string; quantity: number; unitPrice: number; notes?: string }[];
};
type PeriodReceipt = {
  id: string;
  accountId: string;
  date: string;
  customerName: string;
  paymentMethod: string;
  total: number;
  receiptNumber?: string | null;
  receivedBy?: string | null;
  notes?: string | null;
};
type PeriodReport = {
  sales: PeriodSale[];
  receipts: PeriodReceipt[];
  outstandingCredit: { total: number; accountCount: number };
};

const formatReportDate = (date: string) =>
  new Date(date.includes('T') ? date : date.replace(' ', 'T')).toLocaleString('pt-BR');

const normalizePaymentMethod = (method: string) =>
  method === 'crediario' || method === 'credito' ? 'credit' : method;

const paymentMethodLabel = (method: string) => {
  switch (normalizePaymentMethod(method)) {
    case 'credit': return 'Crédito / crediário';
    case 'cash': return 'Dinheiro';
    case 'card': return 'Cartão';
    case 'pix': return 'Pix';
    case 'transfer': return 'Transferência';
    default: return method;
  }
};

const csvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const ReportsView: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('monthly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const [monthlyFilters, setMonthlyFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [periodFilters, setPeriodFilters] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0);
    const toDateTimeInput = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    return { startDate: toDateTimeInput(firstDay), endDate: toDateTimeInput(now) };
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
        case 'salesByPeriod':
          data = await financialService.getSalesByPeriod(periodFilters.startDate, periodFilters.endDate);
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
          csv += `${item.productName || item.dishName},${item.maxProducible},${item.limitingIngredients || 'N/A'}\n`;
        });
        break;

      case 'salesByPeriod':
        filename = `vendas_${periodFilters.startDate.replace(/\D/g, '')}_${periodFilters.endDate.replace(/\D/g, '')}.csv`;
        csv = 'Tipo,Data,Comanda/Conta,Cliente,Pagamento,Total,Recibo,Recebido por,Observações\n';
        reportData.sales.forEach((sale: PeriodSale) => {
          csv += [
            csvValue('Venda'),
            csvValue(formatReportDate(sale.date)),
            csvValue(sale.comandaId || 'Venda direta'),
            csvValue(sale.customerName),
            csvValue(paymentMethodLabel(sale.paymentMethod)),
            sale.total,
            '', '', ''
          ].join(',') + '\n';
        });
        reportData.receipts.forEach((receipt: PeriodReceipt) => {
          csv += [
            csvValue('Recebimento de conta'),
            csvValue(formatReportDate(receipt.date)),
            csvValue(`Conta ${receipt.accountId}`),
            csvValue(receipt.customerName),
            csvValue(paymentMethodLabel(receipt.paymentMethod)),
            receipt.total,
            csvValue(receipt.receiptNumber || ''),
            csvValue(receipt.receivedBy || ''),
            csvValue(receipt.notes || '')
          ].join(',') + '\n';
        });
        csv += [
          csvValue('Saldo em aberto no crediário (atual)'),
          '', '', '', '',
          reportData.outstandingCredit.total,
          '', '', ''
        ].join(',') + '\n';
        break;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl w-full mx-auto">
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

        <button
          onClick={() => handleReportChange('salesByPeriod')}
          className={`p-4 rounded-xl font-bold transition-all ${
            activeReport === 'salesByPeriod'
              ? 'bg-indigo-600 text-white shadow-lg scale-105'
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300'
          }`}
        >
          <Calendar className="w-6 h-6 mx-auto mb-2" />
          <span className="text-sm">Vendas por Período</span>
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

      {activeReport === 'salesByPeriod' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
              Data e hora inicial
              <input
                type="datetime-local"
                value={periodFilters.startDate}
                onChange={(event) => setPeriodFilters({ ...periodFilters, startDate: event.target.value })}
                className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
              Data e hora final
              <input
                type="datetime-local"
                value={periodFilters.endDate}
                onChange={(event) => setPeriodFilters({ ...periodFilters, endDate: event.target.value })}
                className="p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </label>
            <button
              onClick={() => loadReport('salesByPeriod')}
              disabled={!periodFilters.startDate || !periodFilters.endDate || periodFilters.startDate > periodFilters.endDate || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Consultar vendas
            </button>
          </div>
          {periodFilters.startDate > periodFilters.endDate && (
            <p className="mt-2 text-sm text-red-600">A data e hora inicial não podem ser posteriores às finais.</p>
          )}
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
                    <p className="text-sm text-red-700 font-bold mb-2">Compras no período</p>
                    <p className="text-3xl font-black text-red-900">
                      {financialService.formatCurrency(reportData.totalExpenses || 0)}
                    </p>
                    <p className="text-xs text-red-600 mt-1">Compras registradas</p>
                  </div>
                  <div className={`p-6 rounded-lg border-2 ${
                    (reportData.netProfit || 0) >= 0 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-orange-50 border-orange-300'
                  }`}>
                    <p className="text-sm font-bold mb-2">Vendas menos compras</p>
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
                  <table className="w-full min-w-[600px]">
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
                  <table className="w-full min-w-[600px]">
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
                  <table className="w-full min-w-[600px]">
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
                  <p className="text-center text-gray-600 py-8">Nenhum prato ou drink cadastrado</p>
                ) : (
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-orange-100">
                      <tr>
                        <th className="text-left p-3 font-bold text-orange-900 text-sm">Prato/Drink</th>
                        <th className="text-center p-3 font-bold text-orange-900 text-sm">Capacidade Máxima</th>
                        <th className="text-left p-3 font-bold text-orange-900 text-sm">Ingredientes Limitantes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reportData.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-900">{item.productName || item.dishName}</td>
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

            {activeReport === 'salesByPeriod' && (() => {
              const { sales: periodSales, receipts: periodReceipts, outstandingCredit } = reportData as PeriodReport;
              const creditSales = periodSales.filter(sale => normalizePaymentMethod(sale.paymentMethod) === 'credit');
              const otherSales = periodSales.filter(sale => normalizePaymentMethod(sale.paymentMethod) !== 'credit');
              const total = (sales: PeriodSale[]) => sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
              const receiptsTotal = periodReceipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);
              const methodTotals = periodSales.reduce<Record<string, number>>((totals, sale) => {
                const method = normalizePaymentMethod(sale.paymentMethod);
                totals[method] = (totals[method] || 0) + Number(sale.total || 0);
                return totals;
              }, {});
              const receiptMethodTotals = periodReceipts.reduce<Record<string, number>>((totals, receipt) => {
                const method = normalizePaymentMethod(receipt.paymentMethod);
                totals[method] = (totals[method] || 0) + Number(receipt.total || 0);
                return totals;
              }, {});
              const renderSales = (title: string, sales: PeriodSale[]) => (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-lg font-bold text-gray-900">{title}</h4>
                    <p className="font-bold text-gray-700">
                      {sales.length} vendas · {financialService.formatCurrency(total(sales))}
                    </p>
                  </div>
                  {sales.length === 0 ? (
                    <p className="rounded-lg bg-gray-50 p-5 text-center text-gray-500">Nenhuma venda neste grupo no período.</p>
                  ) : sales.map(sale => (
                    <article key={sale.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h5 className="font-bold text-gray-900">
                            {sale.comandaId ? `Comanda ${sale.comandaId}` : 'Venda direta'}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {sale.customerName} · {formatReportDate(sale.date)}
                          </p>
                          <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                            {paymentMethodLabel(sale.paymentMethod)}
                          </span>
                        </div>
                        <p className="text-lg font-black text-gray-900">{financialService.formatCurrency(sale.total)}</p>
                      </div>
                      {sale.items.length > 0 && (
                        <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                          {sale.items.map((item, index) => (
                            <li key={`${sale.id}-${index}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                              <span className="text-gray-700">
                                {item.quantity} × {item.productName}
                                {item.notes ? <span className="ml-1 text-gray-500">({item.notes})</span> : null}
                              </span>
                              <span className="font-semibold text-gray-800">
                                {financialService.formatCurrency(item.quantity * item.unitPrice)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </section>
              );

              return (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Vendas por período</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(periodFilters.startDate).toLocaleString('pt-BR')} a {new Date(periodFilters.endDate).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
                      <p className="text-sm font-bold text-blue-800">Total geral</p>
                      <p className="mt-1 text-2xl font-black text-blue-950">{financialService.formatCurrency(total(periodSales))}</p>
                      <p className="text-xs text-blue-700">{periodSales.length} vendas</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                      <p className="text-sm font-bold text-amber-800">Total a crédito</p>
                      <p className="mt-1 text-2xl font-black text-amber-950">{financialService.formatCurrency(total(creditSales))}</p>
                      <p className="text-xs text-amber-700">{creditSales.length} vendas</p>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-5">
                      <p className="text-sm font-bold text-green-800">Total dos demais pagamentos</p>
                      <p className="mt-1 text-2xl font-black text-green-950">{financialService.formatCurrency(total(otherSales))}</p>
                      <p className="text-xs text-green-700">{otherSales.length} vendas</p>
                    </div>
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-5">
                      <p className="text-sm font-bold text-purple-800">Saldo em aberto no crediário</p>
                      <p className="mt-1 text-2xl font-black text-purple-950">{financialService.formatCurrency(outstandingCredit.total)}</p>
                      <p className="text-xs text-purple-700">{outstandingCredit.accountCount} contas com saldo · posição atual</p>
                    </div>
                  </div>
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900">Contas recebidas</h4>
                        <p className="text-xs text-gray-500">Pagamentos de contas a prazo separados das vendas. O sistema registra recebimentos por data, sem horário.</p>
                      </div>
                      <p className="font-bold text-gray-700">
                        {periodReceipts.length} recebimentos · {financialService.formatCurrency(receiptsTotal)}
                      </p>
                    </div>
                    {Object.keys(receiptMethodTotals).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(receiptMethodTotals).map(([method, amount]) => (
                          <span key={method} className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
                            {paymentMethodLabel(method)}: <strong>{financialService.formatCurrency(amount)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    {periodReceipts.length === 0 ? (
                      <p className="rounded-lg bg-gray-50 p-5 text-center text-gray-500">Nenhum recebimento de conta neste período.</p>
                    ) : periodReceipts.map(receipt => (
                      <article key={receipt.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-200 p-4">
                        <div>
                          <h5 className="font-bold text-gray-900">{receipt.customerName || 'Cliente não identificado'}</h5>
                          <p className="text-sm text-gray-600">
                            Conta {receipt.accountId} · {formatReportDate(receipt.date)}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {paymentMethodLabel(receipt.paymentMethod)}
                            {receipt.receiptNumber ? ` · Recibo ${receipt.receiptNumber}` : ''}
                            {receipt.receivedBy ? ` · Recebido por ${receipt.receivedBy}` : ''}
                          </p>
                          {receipt.notes && <p className="mt-1 text-sm text-gray-500">{receipt.notes}</p>}
                        </div>
                        <p className="text-lg font-black text-emerald-800">{financialService.formatCurrency(receipt.total)}</p>
                      </article>
                    ))}
                  </section>
                  {Object.keys(methodTotals).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(methodTotals).map(([method, amount]) => (
                        <span key={method} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                          {paymentMethodLabel(method)}: <strong>{financialService.formatCurrency(amount)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                  {renderSales('Vendas a crédito', creditSales)}
                  {renderSales('Demais vendas', otherSales)}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
