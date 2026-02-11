import { Product, Purchase, Sale } from '../types';

type InsightMetric = {
  title: string;
  detail: string;
};

const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2)}`;
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const sumSalesTotal = (sales: Sale[]) => {
  return sales.reduce((acc, sale) => acc + sale.total, 0);
};

const getRecentSales = (sales: Sale[], days: number) => {
  const since = daysAgoIso(days);
  return sales.filter((sale) => sale.date.startsWith(since) || sale.date >= since);
};

const getLowStockItems = (products: Product[]) => {
  return products.filter(
    (product) =>
      (product.type === 'insumo' || product.type === 'insumo_bebida') &&
      product.stock <= product.minStock
  );
};

const buildInsights = (products: Product[], sales: Sale[], purchases: Purchase[]) => {
  const totalSales = sumSalesTotal(sales);
  const recentSales = getRecentSales(sales, 7);
  const recentTotal = sumSalesTotal(recentSales);
  const previousSales = sales.filter((sale) => {
    const start = daysAgoIso(14);
    const end = daysAgoIso(7);
    return sale.date >= start && sale.date < end;
  });
  const previousTotal = sumSalesTotal(previousSales);

  const avgTicket = sales.length > 0 ? totalSales / sales.length : 0;
  const avgRecentTicket =
    recentSales.length > 0 ? recentTotal / recentSales.length : 0;

  const lowStockItems = getLowStockItems(products);
  const lowStockTop = lowStockItems
    .slice()
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3)
    .map((item) => `${item.name} (${item.stock}/${item.minStock})`);

  const purchaseTotal = purchases.reduce((acc, purchase) => acc + purchase.total, 0);

  const metrics: InsightMetric[] = [];

  if (recentSales.length > 0) {
    metrics.push({
      title: 'Vendas semana',
      detail: `${formatCurrency(recentTotal)} em ${recentSales.length} vendas`,
    });
  }

  if (previousTotal > 0) {
    const delta = ((recentTotal - previousTotal) / previousTotal) * 100;
    metrics.push({
      title: 'Evolucao',
      detail: `${delta >= 0 ? '+' : ''}${formatPercent(delta)} vs semana anterior`,
    });
  }

  if (avgTicket > 0) {
    metrics.push({
      title: 'Ticket medio',
      detail: `${formatCurrency(avgTicket)} (7d: ${formatCurrency(avgRecentTicket)})`,
    });
  }

  if (lowStockItems.length > 0) {
    metrics.push({
      title: 'Insumos criticos',
      detail: `${lowStockItems.length} abaixo do minimo`,
    });
  }

  if (purchaseTotal > 0) {
    metrics.push({
      title: 'Compras',
      detail: `${formatCurrency(purchaseTotal)} no periodo`,
    });
  }

  return {
    metrics,
    lowStockTop,
    recentSalesCount: recentSales.length,
  };
};

export const generateBusinessInsight = async (
  products: Product[],
  sales: Sale[],
  purchases: Purchase[]
): Promise<string> => {
  const { metrics, lowStockTop, recentSalesCount } = buildInsights(
    products,
    sales,
    purchases
  );

  if (metrics.length === 0) {
    return 'Sem dados suficientes para gerar insights. Tente registrar algumas vendas.';
  }

  const lines: string[] = [];
  lines.push('Resumo rapido:');
  metrics.forEach((metric) => {
    lines.push(`- ${metric.title}: ${metric.detail}`);
  });

  if (lowStockTop.length > 0) {
    lines.push('');
    lines.push('Reposicao sugerida:');
    lowStockTop.forEach((item) => lines.push(`- ${item}`));
  }

  if (recentSalesCount === 0) {
    lines.push('');
    lines.push('Sem vendas nos ultimos 7 dias. Considere campanhas locais.');
  }

  return lines.join('\n');
};
