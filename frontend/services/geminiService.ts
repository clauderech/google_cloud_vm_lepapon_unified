import { GoogleGenAI } from "@google/genai";
import { Product, Sale, Purchase } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateBusinessInsight = async (
  products: Product[],
  sales: Sale[],
  purchases: Purchase[]
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Erro: Chave de API não configurada.";

  // Summarize data to keep token usage efficient
  const lowStockItems = products.filter(p => p.stock <= p.minStock).map(p => `${p.name} (${p.stock})`);
  const recentSales = sales.slice(-10);
  const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
  
  const prompt = `
    Atue como um consultor sênior de negócios para uma lanchonete. Analise os dados abaixo e forneça um resumo executivo curto e estratégico (máximo 3 parágrafos).
    Foque em:
    1. Itens críticos que precisam de reposição (Estoque baixo).
    2. Tendências de vendas recentes.
    3. Sugestão de ação imediata (ex: promoção, compra, mudança de preço).

    Dados Atuais:
    - Itens com estoque baixo/crítico: ${lowStockItems.join(', ') || 'Nenhum'}
    - Receita total acumulada: R$ ${totalRevenue.toFixed(2)}
    - Últimas ${recentSales.length} vendas: ${JSON.stringify(recentSales.map(s => ({ total: s.total, items: s.items.map(i => i.productName) })))}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Erro ao conectar com o assistente IA. Verifique sua conexão ou chave de API.";
  }
};

export const suggestRestockOrder = async (
  products: Product[],
  supplierName: string
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "";

  const supplierProducts = products.filter(p => p.supplierId === supplierName); // simplistic mapping for demo
  
  const prompt = `
    Crie uma sugestão de pedido de compra para o fornecedor "${supplierName}".
    Baseie-se nestes produtos que compramos dele e seus níveis atuais de estoque:
    ${JSON.stringify(supplierProducts.map(p => ({ name: p.name, stock: p.stock, minStock: p.minStock, cost: p.cost })))}
    
    Retorne apenas uma lista formatada com os itens e quantidades sugeridas para atingir um nível seguro (minStock + 20%).
    Se o estoque estiver bom, diga que não é necessário comprar nada.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    console.error(error);
    return "Erro ao gerar sugestão.";
  }
};