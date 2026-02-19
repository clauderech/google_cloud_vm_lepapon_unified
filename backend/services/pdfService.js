const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
  
  /**
   * Renderiza template HTML com dados usando um sistema simples de substituição
   * @param {string} templateContent - Conteúdo do template HTML
   * @param {Object} data - Dados para substituição
   * @returns {string} - HTML processado
   */
  renderTemplate(templateContent, data) {
    let html = templateContent;
    
    // Substituição simples de variáveis {{variable}}
    const simpleVars = templateContent.match(/{{\s*([^#\/\s}]+)\s*}}/g);
    if (simpleVars) {
      simpleVars.forEach(match => {
        const key = match.replace(/[{}]/g, '').trim();
        const value = this.getNestedProperty(data, key) || '';
        html = html.replace(new RegExp(match.replace(/[{}]/g, '\\{\\}'), 'g'), value);
      });
    }
    
    // Processamento de seções condicionais {{#section}} e {{^section}}
    html = this.processConditionals(html, data);
    
    // Processamento de loops {{#array}}
    html = this.processLoops(html, data);
    
    return html;
  }
  
  /**
   * Obtém propriedade aninhada de um objeto
   * @param {Object} obj - Objeto fonte
   * @param {string} path - Caminho da propriedade (ex: 'user.name')
   * @returns {any} - Valor da propriedade ou null
   */
  getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
  
  /**
   * Processa condicionais {{#condition}} e {{^condition}}
   * @param {string} html - HTML template
   * @param {Object} data - Dados para verificação
   * @returns {string} - HTML processado
   */
  processConditionals(html, data) {
    // Processa {{#condition}}...{{/condition}}
    const positivePattern = /{{\s*#(\w+)\s*}}(.*?){{\s*\/\1\s*}}/gs;
    html = html.replace(positivePattern, (match, condition, content) => {
      const value = this.getNestedProperty(data, condition);
      return (value && value !== false && value !== 0 && value !== '' && 
              (Array.isArray(value) ? value.length > 0 : true)) ? content : '';
    });
    
    // Processa {{^condition}}...{{/condition}}
    const negativePattern = /{{\s*\^(\w+)\s*}}(.*?){{\s*\/\1\s*}}/gs;
    html = html.replace(negativePattern, (match, condition, content) => {
      const value = this.getNestedProperty(data, condition);
      return (!value || value === false || value === 0 || value === '' || 
              (Array.isArray(value) && value.length === 0)) ? content : '';
    });
    
    return html;
  }
  
  /**
   * Processa loops para arrays {{#array}}...{{/array}}
   * @param {string} html - HTML template
   * @param {Object} data - Dados para iteração
   * @returns {string} - HTML processado
   */
  processLoops(html, data) {
    const loopPattern = /{{\s*#(\w+)\s*}}(.*?){{\s*\/\1\s*}}/gs;
    
    return html.replace(loopPattern, (match, arrayName, content) => {
      const array = this.getNestedProperty(data, arrayName);
      
      if (!Array.isArray(array) || array.length === 0) {
        return '';
      }
      
      return array.map(item => {
        let itemContent = content;
        
        // Substitui variáveis dentro do loop
        const itemVars = content.match(/{{\s*([^#\/\s}]+)\s*}}/g);
        if (itemVars) {
          itemVars.forEach(varMatch => {
            const key = varMatch.replace(/[{}]/g, '').trim();
            const value = this.getNestedProperty(item, key) || '';
            itemContent = itemContent.replace(
              new RegExp(varMatch.replace(/[{}]/g, '\\{\\}'), 'g'), 
              value
            );
          });
        }
        
        return itemContent;
      }).join('');
    });
  }
  
  /**
   * Gera PDF a partir de template e dados
   * @param {string} templateName - Nome do arquivo de template (sem extensão)
   * @param {Object} data - Dados para preenchimento
   * @param {Object} options - Opções do PDF
   * @returns {Promise<Buffer>} - Buffer do PDF gerado
   */
  async generatePDF(templateName, data, options = {}) {
    try {
      // Carrega template
      const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Processa template com dados
      const html = this.renderTemplate(templateContent, data);
      
      // Configura puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await browser.newPage();
      
      // Define conteúdo HTML
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      
      // Configura opções do PDF
      const pdfOptions = {
        format: 'A4',
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        displayHeaderFooter: false,
        ...options
      };
      
      // Gera PDF
      const pdfBuffer = await page.pdf(pdfOptions);
      
      await browser.close();
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error(`Falha na geração do PDF: ${error.message}`);
    }
  }
  
  /**
   * Salva PDF em arquivo
   * @param {Buffer} pdfBuffer - Buffer do PDF
   * @param {string} filename - Nome do arquivo
   * @param {string} subdir - Subdiretório dentro de uploads/reports
   * @returns {Promise<string>} - Caminho completo do arquivo salvo
   */
  async savePDF(pdfBuffer, filename, subdir = '') {
    try {
      const reportsDir = path.join(__dirname, '..', 'uploads', 'reports', subdir);
      
      // Garante que o diretório existe
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filePath = path.join(reportsDir, filename);
      await fs.writeFile(filePath, pdfBuffer);
      
      console.log(`PDF salvo em: ${filePath}`);
      return filePath;
      
    } catch (error) {
      console.error('Erro ao salvar PDF:', error);
      throw new Error(`Falha ao salvar PDF: ${error.message}`);
    }
  }
  
  /**
   * Remove arquivos PDF antigos do diretório
   * @param {string} subdir - Subdiretório dentro de uploads/reports  
   * @param {number} maxAgeInDays - Idade máxima em dias (padrão: 7)
   * @returns {Promise<number>} - Número de arquivos removidos
   */
  async cleanupOldPDFs(subdir = '', maxAgeInDays = 7) {
    try {
      const reportsDir = path.join(__dirname, '..', 'uploads', 'reports', subdir);
      const files = await fs.readdir(reportsDir);
      const maxAge = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
      let removedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.pdf')) continue;
        
        const filePath = path.join(reportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < maxAge) {
          await fs.unlink(filePath);
          removedCount++;
          console.log(`PDF antigo removido: ${file}`);
        }
      }
      
      console.log(`Limpeza concluída: ${removedCount} arquivos removidos de ${subdir}`);
      return removedCount;
      
    } catch (error) {
      console.error('Erro na limpeza de PDFs:', error);
      return 0;
    }
  }
  
  /**
   * Formata dados para o template de relatório de crediário
   * @param {Object} accountData - Dados da conta mensal
   * @param {Array} purchases - Array de compras
   * @param {Array} payments - Array de pagamentos
   * @param {string} generatedBy - Nome do usuário que gerou
   * @returns {Object} - Dados formatados para template
   */
  formatCrediarioData(accountData, purchases = [], payments = [], generatedBy = 'Sistema') {
    // Formata data do mês/ano
    const [year, month] = accountData.month_year.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    
    // Formata formas de pagamento
    const paymentMethods = {
      cash: 'Dinheiro',
      card: 'Cartão',
      pix: 'PIX',
      transfer: 'Transferência'
    };
    
    return {
      // Dados do cliente
      customer_name: accountData.customer_name || 'Nome não informado',
      customer_phone: accountData.customer_phone || '',
      
      // Período e vencimento
      month_year_formatted: `${monthName} de ${year}`,
      due_date_formatted: new Date(accountData.due_date).toLocaleDateString('pt-BR'),
      
      // Valores financeiros formatados
      total_amount: parseFloat(accountData.total_amount || 0).toFixed(2),
      amount_paid: parseFloat(accountData.amount_paid || 0).toFixed(2),
      balance: parseFloat(accountData.balance || 0).toFixed(2),
      
      // Compras formatadas
      purchases: purchases.map(purchase => ({
        date_formatted: new Date(purchase.purchase_date).toLocaleDateString('pt-BR'),
        description: purchase.description,
        amount: parseFloat(purchase.amount).toFixed(2)
      })),
      
      // Pagamentos formatados
      payments: payments.map(payment => ({
        date_formatted: new Date(payment.payment_date).toLocaleDateString('pt-BR'),
        payment_method_formatted: paymentMethods[payment.payment_method] || payment.payment_method,
        receipt_number: payment.receipt_number || '-',
        received_by: payment.received_by || '-',
        amount: parseFloat(payment.amount).toFixed(2)
      })),
      
      // Flags condicionais
      has_purchases: purchases.length > 0,
      has_payments: payments.length > 0,
      has_activity: purchases.length > 0 || payments.length > 0,
      
      // Metadados
      generated_at: new Date().toLocaleString('pt-BR'),
      generated_by: generatedBy
    };
  }
}

module.exports = new PDFService();