const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
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
   * Gera PDF usando PDFKit (alternativa leve para servidores)
   * @param {Object} data - Dados formatados para o PDF
   * @returns {Promise<Buffer>} - Buffer do PDF gerado
   */
  async generatePDFWithKit(data) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          info: {
            Title: `Extrato Mensal - ${data.customer_name}`,
            Subject: 'Conta de Crediário Mensal',
            Author: 'LePapon-Laches-Claudemir'
          }
        });

        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header da empresa
        doc.fontSize(20).fillColor('#1e40af').text('LePapon-Laches-Claudemir', { align: 'center' });
        doc.fontSize(10).fillColor('#666666')
           .text('João Venâcio Girarde 260', { align: 'center' })
           .text('Telefone: (55) 5499125-3180', { align: 'center' })
           .text('CNPJ: 33.794.253/0001-33', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(16).fillColor('#1e40af').text('EXTRATO DE CONTA MENSAL', { align: 'center' });
        doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).strokeColor('#2563eb').lineWidth(2).stroke();
        
        doc.moveDown(1);

        // Informações do Cliente
        const clientY = doc.y;
        doc.rect(50, clientY, 495, 60).fillColor('#f8fafc').fill()
           .rect(50, clientY, 495, 60).strokeColor('#2563eb').lineWidth(1).stroke();
        
        doc.fillColor('#1e40af').fontSize(14).text(`Cliente: ${data.customer_name}`, 60, clientY + 15);
        if (data.customer_phone) {
          doc.fontSize(10).text(`Telefone: ${data.customer_phone}`, 60, clientY + 35);
        }
        
        doc.moveDown(2);

        // Período
        doc.fillColor('#1e40af').fontSize(12).text(`Período: ${data.month_year_formatted}`, 60, doc.y);
        doc.text(`Vencimento: ${data.due_date_formatted}`, 300, doc.y - 12);
        doc.moveDown(1);

        // Resumo financeiro - 3 caixas lado a lado
        const summaryY = doc.y + 10;
        const boxWidth = 150;
        const boxHeight = 60;
        
        // Total
        doc.rect(50, summaryY, boxWidth, boxHeight).fillColor('#eff6ff').fill()
           .rect(50, summaryY, boxWidth, boxHeight).strokeColor('#3b82f6').lineWidth(2).stroke();
        doc.fillColor('#1e40af').fontSize(10).text('TOTAL DO MÊS', 60, summaryY + 10);
        doc.fontSize(16).text(`R$ ${data.total_amount}`, 60, summaryY + 30);

        // Pago
        doc.rect(220, summaryY, boxWidth, boxHeight).fillColor('#f0fdf4').fill()
           .rect(220, summaryY, boxWidth, boxHeight).strokeColor('#22c55e').lineWidth(2).stroke();
        doc.fillColor('#059669').fontSize(10).text('TOTAL PAGO', 230, summaryY + 10);
        doc.fontSize(16).text(`R$ ${data.amount_paid}`, 230, summaryY + 30);

        // Pendente
        doc.rect(390, summaryY, boxWidth, boxHeight).fillColor('#fef2f2').fill()
           .rect(390, summaryY, boxWidth, boxHeight).strokeColor('#ef4444').lineWidth(2).stroke();
        doc.fillColor('#dc2626').fontSize(10).text('SALDO PENDENTE', 400, summaryY + 10);
        doc.fontSize(16).text(`R$ ${data.balance}`, 400, summaryY + 30);

        doc.y = summaryY + boxHeight + 20;

        // Tabela de Compras
        if (data.has_purchases) {
          doc.fillColor('#1e40af').fontSize(14).text('📋 Compras Realizadas no Período', 50, doc.y);
          doc.moveDown(0.5);
          
          const tableTop = doc.y;
          doc.y = tableTop + 25;
          
          // Headers da tabela
          doc.rect(50, tableTop, 495, 25).fillColor('#1e40af').fill();
          doc.fillColor('white').fontSize(11)
             .text('Data', 60, tableTop + 8)
             .text('Descrição / Itens', 150, tableTop + 8)              
             .text('Valor', 450, tableTop + 8);

          // Linhas de dados
          let currentY = tableTop + 25;
          data.purchases.forEach((purchase, index) => {
            const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            
            // Calcula altura da linha baseada no conteúdo
            const hasItems = purchase.items_detail && purchase.items_detail.length > 0;
            let rowHeight = 20; // Altura base
            
            if (hasItems) {
              // Calcula altura necessária para os itens detalhados
              const itemsText = `→ ${purchase.items_detail}`;
              const textHeight = doc.heightOfString(itemsText, {
                width: 300, // Largura disponível para o texto
                fontSize: 8,
                lineGap: 2
              });
              rowHeight = Math.max(20, 6 + textHeight + 6); // Margens superior/inferior
            }
            
            doc.rect(50, currentY, 495, rowHeight).fillColor(rowColor).fill()
               .rect(50, currentY, 495, rowHeight).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
               
            doc.fillColor('#333333').fontSize(9)
               .text(purchase.date_formatted, 60, currentY + 6)
               .text(`R$ ${purchase.amount}`, 450, currentY + 6);
            
            // Exibe descrição principal
            const baseDescription = purchase.description.split('(')[0].trim(); // Remove itens detalhados se já incluídos
            doc.text(baseDescription, 150, currentY + 6);
            
            // Exibe itens detalhados em linha separada se existirem
            if (hasItems) {
              doc.fillColor('#666666').fontSize(8)
                 .text(`→ ${purchase.items_detail}`, 155, currentY + 6, {
                   width: 300,
                   lineGap: 2
                 });
            }
            
            currentY += rowHeight;
          });
          
          doc.y = currentY + 10;
        }

        // Tabela de Pagamentos
        if (data.has_payments) {
          doc.fillColor('#1e40af').fontSize(14).text('💰 Pagamentos Realizados', 50, doc.y);
          doc.moveDown(0.5);
          
          const tableTop = doc.y;
          doc.y = tableTop + 25;
          
          // Headers
          doc.rect(50, tableTop, 495, 25).fillColor('#1e40af').fill();
          doc.fillColor('white').fontSize(11)
             .text('Data', 60, tableTop + 8)
             .text('Forma', 130, tableTop + 8)
             .text('Recibo', 220, tableTop + 8)
             .text('Recebido por', 290, tableTop + 8)
             .text('Valor', 450, tableTop + 8);

          // Dados
          let currentY = tableTop + 25;
          data.payments.forEach((payment, index) => {
            const rowColor = index % 2 === 0 ? '#ffffff' : '#f9fafb';
            doc.rect(50, currentY, 495, 20).fillColor(rowColor).fill()
               .rect(50, currentY, 495, 20).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
               
            doc.fillColor('#333333').fontSize(9)
               .text(payment.date_formatted, 60, currentY + 6)
               .text(payment.payment_method_formatted, 130, currentY + 6)
               .text(payment.receipt_number, 220, currentY + 6)
               .text(payment.received_by, 290, currentY + 6);
            
            doc.fillColor('#059669').text(`R$ ${payment.amount}`, 450, currentY + 6);
            
            currentY += 20;
          });
          
          doc.y = currentY + 10;
        }

        // Caso não tenha movimentações
        if (!data.has_activity) {
          doc.rect(50, doc.y, 495, 80).fillColor('#f9fafb').fill()
             .rect(50, doc.y, 495, 80).strokeColor('#e5e7eb').lineWidth(1).stroke();
          doc.fillColor('#6b7280').fontSize(14)
             .text('Nenhuma movimentação encontrada para este período', 60, doc.y + 30, {
               align: 'center',
               width: 475
             });
          doc.y += 80;
        }

        // Footer
        doc.y = 720; // Posição fixa no final da página
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
        doc.moveDown(0.5);
        doc.fillColor('#6b7280').fontSize(8)
           .text(`Relatório gerado em ${data.generated_at} por ${data.generated_by}`, { align: 'center' })
           .moveDown(0.3)
           .text('Sistema de Gestão LePapon - Este documento é válido sem assinatura', { 
             align: 'center',
             oblique: true 
           });

        doc.end();
        
      } catch (error) {
        reject(error);
      }
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
    // Primeiro tenta com PDFKit (mais confiável para servidores)
    if (templateName === 'crediario-report') {
      try {
        console.log('Gerando PDF com PDFKit...');
        return await this.generatePDFWithKit(data);
      } catch (error) {
        console.warn('Falha no PDFKit, tentando Puppeteer:', error.message);
      }
    }

    // Fallback para Puppeteer (se PDFKit falhar ou outro template)
    try {
      console.log('Gerando PDF com Puppeteer...');
      
      // Carrega template
      const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Processa template com dados
      const html = this.renderTemplate(templateContent, data);
      
      // Configura puppeteer
      const browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-jpeg-decoding',
          '--disable-accelerated-mjpeg-decode',
          '--disable-app-list-dismiss-on-blur',
          '--disable-accelerated-video-decode',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-client-side-phishing-detection',
          '--disable-component-update',
          '--disable-default-apps',
          '--disable-domain-reliability',
          '--disable-extensions',
          '--disable-features=TranslateUI',
          '--disable-hang-monitor',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking',
          '--disable-prompt-on-repost',
          '--disable-renderer-backgrounding',
          '--disable-sync',
          '--force-color-profile=srgb',
          '--metrics-recording-only',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--enable-automation',
          '--password-store=basic',
          '--use-mock-keychain',
          '--single-process'
        ],
        executablePath: process.env.CHROME_BIN || undefined,
        timeout: 60000
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
      console.error('Erro ao gerar PDF com Puppeteer:', error);
      
      // Se for crediario-report e Puppeteer falhou, tenta PDFKit como último recurso
      if (templateName === 'crediario-report') {
        try {
          console.log('Fallback final: tentando PDFKit novamente...');
          return await this.generatePDFWithKit(data);
        } catch (kitError) {
          console.error('PDFKit também falhou:', kitError);
        }
      }
      
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
      purchases: purchases.map(purchase => {
        let description = purchase.description;
        let itemsDetail = '';
        
        // Processa items_json para exibir itens detalhados
        if (purchase.items_json) {
          try {
            const items = JSON.parse(purchase.items_json);
            if (Array.isArray(items) && items.length > 0) {
              const itemsList = items.map(item => {
                const qty = item.quantity || 1;
                const name = item.product_name || item.name || 'Item';
                const price = item.price || item.unit_price || 0;
                return `${qty} ${name} (R$ ${parseFloat(price).toFixed(2)})`;
              }).join(', ');
              itemsDetail = itemsList;
              description = `${purchase.description} (${itemsList})`;
            }
          } catch (error) {
            console.warn('Erro ao processar items_json:', error);
          }
        }
        
        return {
          date_formatted: new Date(purchase.purchase_date).toLocaleDateString('pt-BR'),
          description: description,
          items_detail: itemsDetail,
          amount: parseFloat(purchase.amount).toFixed(2)
        };
      }),
      
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