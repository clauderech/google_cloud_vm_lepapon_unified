const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Serviço para gerar imagens de contas mensais do crediário
 * Data: 3 de abril de 2026
 */

class ReceiptImageService {
  constructor() {
    this.browser = null;
    this.cacheDir = path.join(__dirname, '../uploads/receipt-images');
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24 horas em ms
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }

    // Criar diretório de cache se não existir
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  async destroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Gera imagem da conta mensal
   * @param {Object} accountData - Dados completos da conta (vem do CrediarioModel.getAccountWithDetails)
   * @param {Object} options - Opções de configuração
   * @returns {Promise<string>} - Caminho do arquivo da imagem gerada
   */
  async generateReceiptImage(accountData, options = {}) {
    await this.init();

    const {
      format = 'png',
      width = 800,
      height = 1200,
      quality = 80,
      forceRegenerate = false
    } = options;

    // Verificar cache primeiro (baseado em hash dos dados)
    const cacheKey = this.generateCacheKey(accountData);
    const cachedImagePath = path.join(this.cacheDir, `${cacheKey}.${format}`);

    if (!forceRegenerate) {
      const cachedImage = await this.getCachedImage(cachedImagePath);
      if (cachedImage) {
        console.log('[RECEIPT_IMAGE][CACHE_HIT]', { cacheKey, path: cachedImagePath });
        return cachedImagePath;
      }
    }

    try {
      const page = await this.browser.newPage();
      await page.setViewport({ width, height });

      // Gerar HTML da conta
      const html = this.generateReceiptHTML(accountData);

      // Aplicar HTML na página
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Configurar screenshot
      const screenshotOptions = {
        path: cachedImagePath,
        type: format,
        fullPage: true
      };

      if (format === 'jpeg' || format === 'jpg') {
        screenshotOptions.quality = quality;
      }

      // Gerar screenshot
      await page.screenshot(screenshotOptions);
      await page.close();

      console.log('[RECEIPT_IMAGE][GENERATED]', { 
        accountId: accountData.id,
        cacheKey,
        path: cachedImagePath,
        format
      });

      return cachedImagePath;

    } catch (error) {
      console.error('[RECEIPT_IMAGE][ERROR]', {
        accountId: accountData.id,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Erro ao gerar imagem da conta: ${error.message}`);
    }
  }

  /**
   * Verifica se existe imagem em cache válida
   */
  async getCachedImage(imagePath) {
    try {
      const stat = await fs.stat(imagePath);
      const now = Date.now();
      const fileAge = now - stat.mtime.getTime();

      if (fileAge < this.cacheDuration) {
        return imagePath;
      } else {
        // Cache expirado, remover arquivo
        await fs.unlink(imagePath).catch(() => {});
        return null;
      }
    } catch {
      return null; // Arquivo não existe
    }
  }

  /**
   * Gera chave de cache baseada nos dados da conta
   */
  generateCacheKey(accountData) {
    const keyData = {
      id: accountData.id,
      balance: accountData.balance,
      total_amount: accountData.total_amount,
      amount_paid: accountData.amount_paid,
      purchasesLength: accountData.purchases?.length || 0,
      paymentsLength: accountData.payments?.length || 0,
      updated_at: accountData.updated_at
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64').slice(0, 32);
  }

  /**
   * Gera HTML da conta para conversão em imagem
   */
  generateReceiptHTML(accountData) {
    const {
      id,
      customer_id,
      nome,
      sobrenome,
      fone,
      month_year,
      due_date,
      total_amount,
      amount_paid,
      balance,
      status,
      purchases = [],
      payments = [],
      created_at
    } = accountData;

    // Formatação de datas
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    // Formatação de valores
    const formatCurrency = (value) => {
      return parseFloat(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    // Status em português
    const statusLabels = {
      'open': 'Em Aberto',
      'paid': 'Quitado',
      'overdue': 'Em Atraso',
      'cancelled': 'Cancelado'
    };

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conta Mensal - ${nome} ${sobrenome}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }
        
        .receipt-container {
            max-width: 760px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .header p {
            font-size: 16px;
            opacity: 0.9;
        }
        
        .customer-info {
            padding: 25px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .customer-info h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
        }
        
        .info-label {
            font-weight: bold;
            color: #555;
        }
        
        .info-value {
            color: #333;
        }
        
        .balance-summary {
            padding: 25px;
            background: #f8f9ff;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .balance-summary h2 {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 20px;
            text-align: center;
        }
        
        .balance-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            text-align: center;
        }
        
        .balance-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .balance-item.total {
            border-top: 4px solid #3b82f6;
        }
        
        .balance-item.paid {
            border-top: 4px solid #10b981;
        }
        
        .balance-item.pending {
            border-top: 4px solid #f59e0b;
        }
        
        .balance-item.overdue {
            border-top: 4px solid #ef4444;
        }
        
        .balance-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .balance-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        
        .purchases-section, .payments-section {
            padding: 25px;
        }
        
        .section-title {
            color: #667eea;
            margin-bottom: 20px;
            font-size: 20px;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        
        .table th {
            background: #f8f9ff;
            color: #333;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border-bottom: 2px solid #667eea;
        }
        
        .table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        
        .table tr:hover {
            background: #f8f9ff;
        }
        
        .payment-instructions {
            padding: 25px;
            background: #f0f9ff;
            border-top: 2px solid #f0f0f0;
        }
        
        .payment-instructions h3 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .payment-methods {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        
        .payment-method {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        
        .footer {
            padding: 20px;
            text-align: center;
            background: #f8f9ff;
            color: #666;
            font-size: 14px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-open {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-paid {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-overdue {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .status-cancelled {
            background: #f3f4f6;
            color: #374151;
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <!-- Header -->
        <div class="header">
            <h1>Conta Mensal de Crediário</h1>
            <p>Referência: ${month_year}</p>
        </div>
        
        <!-- Customer Info -->
        <div class="customer-info">
            <h2>Informações do Cliente</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">${nome} ${sobrenome}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Telefone:</span>
                    <span class="info-value">${fone || 'Não informado'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Conta N°:</span>
                    <span class="info-value">#${id}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Status:</span>
                    <span class="status-badge status-${status}">${statusLabels[status] || status}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Vencimento:</span>
                    <span class="info-value">${formatDate(due_date)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Criada em:</span>
                    <span class="info-value">${formatDate(created_at)}</span>
                </div>
            </div>
        </div>
        
        <!-- Balance Summary -->
        <div class="balance-summary">
            <h2>Resumo Financeiro</h2>
            <div class="balance-grid">
                <div class="balance-item total">
                    <div class="balance-label">Total do Mês</div>
                    <div class="balance-value">${formatCurrency(total_amount)}</div>
                </div>
                <div class="balance-item paid">
                    <div class="balance-label">Já Pago</div>
                    <div class="balance-value">${formatCurrency(amount_paid)}</div>
                </div>
                <div class="balance-item ${status === 'overdue' ? 'overdue' : 'pending'}">
                    <div class="balance-label">Saldo Devedor</div>
                    <div class="balance-value">${formatCurrency(balance)}</div>
                </div>
            </div>
        </div>
        
        <!-- Purchases Section -->
        ${purchases.length > 0 ? `
        <div class="purchases-section">
            <h2 class="section-title">Compras do Mês (${purchases.length})</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${purchases.map(purchase => `
                    <tr>
                        <td>${formatDate(purchase.purchase_date)}</td>
                        <td>${purchase.description}</td>
                        <td>${formatCurrency(purchase.amount)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- Payments Section -->
        ${payments.length > 0 ? `
        <div class="payments-section">
            <h2 class="section-title">Pagamentos Realizados (${payments.length})</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Método</th>
                        <th>Recibo</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.map(payment => `
                    <tr>
                        <td>${formatDate(payment.payment_date)}</td>
                        <td>${formatCurrency(payment.amount)}</td>
                        <td>${payment.payment_method.toUpperCase()}</td>
                        <td>${payment.receipt_number || 'N/A'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- Payment Instructions -->
        ${balance > 0.01 ? `
        <div class="payment-instructions">
            <h3>Como Pagar</h3>
            <p>Para quitar sua conta, você pode usar uma das formas de pagamento abaixo:</p>
            <div class="payment-methods">
                <div class="payment-method">
                    <strong>💰 Dinheiro</strong><br>
                    Pagamento na loja durante o atendimento
                </div>
                <div class="payment-method">
                    <strong>💳 Cartão</strong><br>
                    Débito ou crédito na loja
                </div>
                <div class="payment-method">
                    <strong>📱 PIX</strong><br>
                    Solicite a chave PIX pelo WhatsApp
                </div>
                <div class="payment-method">
                    <strong>🏦 Transferência</strong><br>
                    Dados bancários disponíveis na loja
                </div>
            </div>
        </div>
        ` : `
        <div class="payment-instructions">
            <h3 style="color: #10b981;">✅ Conta Quitada!</h3>
            <p style="text-align: center; color: #065f46; font-size: 16px; margin-top: 10px;">
                Parabéns! Sua conta está totalmente quitada.
            </p>
        </div>
        `}
        
        <!-- Footer -->
        <div class="footer">
            <p>Esta conta foi gerada automaticamente em ${formatDate(new Date())}</p>
            <p>Para dúvidas, entre em contato pelo WhatsApp</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Limpa arquivos de cache antigos
   */
  async cleanupCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        const fileAge = now - stat.mtime.getTime();

        if (fileAge > this.cacheDuration) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      console.log('[RECEIPT_IMAGE][CLEANUP]', { filesRemoved: cleanedCount });
    } catch (error) {
      console.error('[RECEIPT_IMAGE][CLEANUP][ERROR]', { error: error.message });
    }
  }
}

// Instância singleton para reutilizar o browser
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new ReceiptImageService();
    }
    return instance;
  },
  ReceiptImageService
};