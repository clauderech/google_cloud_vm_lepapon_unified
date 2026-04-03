const CashModel = require('../models/cash');
const express = require('express');
const router = express.Router();
const SaleModel = require('../models/sale');
const SaleItemModel = require('../models/sale_item');
const ProductModel = require('../models/product');
const CrediarioModel = require('../models/crediario');
const CozinhaItem = require('../models/cozinha_item');
const StockService = require('../services/stockService');
const pdfService = require('../services/pdfService');
const ReceiptImageService = require('../services/receiptImageService');
const WhatsAppCrediarioService = require('../services/whatsappCrediarioService');
const path = require('path');
// Finalizar comanda (pagamento normal ou crediário)
router.post('/:id/close', async (req, res) => {
  /*
    Espera body:
    {
      paymentMethod: 'cash' | 'card' | 'pix' | 'credit' | 'crediario',
      customerId?: string (opcional, obrigatório para crédito),
      closeDate?: string (opcional, default: now)
    }
  */
  try {
    const comandaId = req.params.id;
    const { paymentMethod, customerId, closeDate } = req.body;
    
    // Para crédito, customer_id é obrigatório
    if ((paymentMethod === 'credit' || paymentMethod === 'crediario') && !customerId) {
      return res.status(400).json({ 
        error: 'Customer ID é obrigatório para pagamentos no crédito' 
      });
    }
    
    const comanda = await ComandaModel.getById(comandaId);
    if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' });
    if (comanda.status === 'closed') return res.status(400).json({ error: 'Comanda já está fechada' });
    const items = await ComandaModel.getItems(comandaId);
    if (!items || items.length === 0) return res.status(400).json({ error: 'Comanda sem itens' });

    // Calcula total
    const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);

    // Usa customerId do request se fornecido, senão usa o da comanda
    const finalCustomerId = customerId || comanda.customer_id;

    // Atualiza comanda para fechada
    await ComandaModel.update(comandaId, {
      status: 'closed',
      payment_method: paymentMethod,
      customer_id: finalCustomerId, // Atualiza customer_id se fornecido
      closed_at: closeDate ? formatDateForMySQL(closeDate) : formatDateForMySQL(new Date()),
      total
    });
// Utilitário para formatar datas no padrão MySQL DATETIME
function formatDateForMySQL(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}


    // Se for crediário (venda a prazo), registra no crediário
    if (paymentMethod === 'crediario' || paymentMethod === 'credit') {
      // Descobre mês/ano e data de vencimento (exemplo: último dia do mês)
      const now = new Date();
      const monthYear = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês

      // Cria ou busca conta mensal
      const acc = await CrediarioModel.findOrCreateMonthlyAccount(finalCustomerId, monthYear, dueDate);

      // Registra a compra vinculada à conta mensal
      await CrediarioModel.addMonthlyPurchase(
        acc.id,
        null, // saleId ainda não existe
        formatDateForMySQL(now),
        `Comanda ${comandaId}`,
        total,
        JSON.stringify(items)
      );

      return res.json({ success: true, comandaId, total, crediario: true });
    }

    // Gera venda (sales)
    const saleData = {
      date: closeDate ? formatDateForMySQL(closeDate) : formatDateForMySQL(new Date()),
      total,
      discount: 0,
      payment_method: paymentMethod,
      customer_id: finalCustomerId,
      customer_name: comanda.customer_name
    };
    const [saleId] = await SaleModel.create(saleData);

    // Salva itens em sale_items
    await SaleItemModel.addItems(saleId, items);

    // Registrar movimento de entrada no caixa
    const cashRegister = await CashModel.getCurrentRegister();
    if (cashRegister) {
      await CashModel.addMovement({
        registerId: cashRegister.id,
        type: 'entrada',
        amount: total,
        paymentMethod,
        description: `Venda comanda ${comandaId}`
      });
    }

    // Obs: Estoque já foi descontado ao adicionar itens
    // Não precisa descontar novamente no fechamento
    console.log('[COMANDA][CLOSE] Estoque já processado anteriormente');

    res.json({ success: true, comandaId, saleId, total });
  } catch (err) {
    console.error('[COMANDA][CLOSE][ERROR]', { id: req.params.id, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao fechar comanda', details: err.message, stack: err.stack });
  }
});

const ComandaModel = require('../models/comanda');

// Listar todas as comandas
router.get('/', async (req, res) => {
  try {
    const comandas = await ComandaModel.list();
    res.json(comandas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar comandas', details: err.message });
  }
});

// Buscar comanda por ID
router.get('/:id', async (req, res) => {
  try {
    console.log('[COMANDA][OPEN][INFO]', {
      id: req.params.id,
      user: req.user ? req.user.id : undefined,
      timestamp: new Date().toISOString()
    });
    const comanda = await ComandaModel.getById(req.params.id);
    if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' });
    // Buscar itens da comanda
    const items = await ComandaModel.getItems(req.params.id);
    comanda.items = items;
    res.json(comanda);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar comanda', details: err.message });
  }
});

// Criar comanda
router.post('/', async (req, res) => {
  try {
    console.log('[COMANDA][CREATE][REQ]', { payload: req.body });
    
    // Separa itens dos dados da comanda
    const { items, ...comandaPayload } = req.body;
    
    // Garante que customer_fone será preenchido se houver customer ou telefone no body
    const finalComandaPayload = {
      ...comandaPayload,
      customer_fone: comandaPayload.customer_fone || (comandaPayload.customer ? comandaPayload.customer.phone : undefined)
    };
    
    const result = await ComandaModel.create(finalComandaPayload);
    const comandaId = result[0];
    
    console.log('[COMANDA][CREATE][RESULT]', { result, comandaId });
    
    // Adiciona itens se fornecidos
    if (Array.isArray(items) && items.length > 0) {
      console.log('[COMANDA][CREATE][ADDING_ITEMS]', { comandaId, itemsCount: items.length });
      await ComandaModel.addItems(comandaId, items);
      
      // Descontar estoque imediatamente
      try {
        await StockService.processComanda({
          items: items,
          comandaId: comandaId,
          userId: req.body.userId || null
        });
        console.log('[COMANDA][CREATE][STOCK][SUCCESS]', { comandaId, itemCount: items.length });
      } catch (stockError) {
        console.error('[COMANDA][CREATE][STOCK][ERROR]', {
          comandaId,
          error: stockError.message
        });
      }
      
      // Envia itens do tipo 'prato' para a cozinha imediatamente
      await CozinhaItem.manageCozinhaItems(comandaId, items, null);
    }
    
    res.status(201).json({ success: true, id: comandaId });
  } catch (err) {
    console.error('[COMANDA][CREATE][ERROR]', { payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao criar comanda', details: err.message, stack: err.stack });
  }
});

// Atualizar comanda
router.put('/:id', async (req, res) => {
  try {
    console.log('[COMANDA][UPDATE][REQ]', { id: req.params.id, payload: req.body });
    // Atualiza dados da comanda (exceto itens)
    const { items, ...comandaData } = req.body;
    
    // Validação e auto-população de customer_id se fornecido
    if (comandaData.hasOwnProperty('customer_id')) {
      const validation = await ComandaModel.validateAndPopulateCustomer(comandaData.customer_id);
      
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Erro ao validar cliente', 
          details: validation.error 
        });
      }
      
      // Auto-populate customer_name se customer_id válido
      if (validation.customer_name) {
        comandaData.customer_name = validation.customer_name;
        console.log('[COMANDA][UPDATE][CUSTOMER]', { 
          customer_id: comandaData.customer_id, 
          customer_name: validation.customer_name 
        });
      }
    }
    
    if (Object.keys(comandaData).length > 0) {
      await ComandaModel.update(req.params.id, comandaData);
    }
    // Atualiza itens da comanda se enviados
    if (Array.isArray(items)) {
      // Remove itens antigos e insere novos (simples)
      await ComandaModel.clearItems(req.params.id);
      await ComandaModel.addItems(req.params.id, items);
      
      // Descontar estoque imediatamente
      try {
        await StockService.processComanda({
          items: items,
          comandaId: req.params.id,
          userId: req.body.userId || null
        });
        console.log('[COMANDA][UPDATE][STOCK][SUCCESS]', { comandaId: req.params.id, itemCount: items.length });
      } catch (stockError) {
        console.error('[COMANDA][UPDATE][STOCK][ERROR]', {
          comandaId: req.params.id,
          error: stockError.message
        });
      }
      
      // Gerencia itens da cozinha usando função centralizada
      // Faz diff inteligente para evitar duplicações
      await CozinhaItem.manageCozinhaItems(req.params.id, items, null);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[COMANDA][UPDATE][ERROR]', { id: req.params.id, payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao atualizar comanda', details: err.message, stack: err.stack });
  }
});

// Remover comanda
router.delete('/:id', async (req, res) => {
  try {
    console.log('[COMANDA][DELETE][REQ]', { id: req.params.id });
    
    // Verifica se comanda existe
    const comanda = await ComandaModel.getById(req.params.id);
    if (!comanda) {
      return res.status(404).json({ error: 'Comanda não encontrada' });
    }
    
    // Valida que apenas comandas abertas podem ser deletadas
    if (comanda.status !== 'open') {
      return res.status(400).json({ 
        error: 'Apenas comandas abertas podem ser deletadas', 
        currentStatus: comanda.status 
      });
    }
    
    // Busca itens da comanda para reverter estoque
    const items = await ComandaModel.getItems(req.params.id);
    console.log('[COMANDA][DELETE][ITEMS]', { comandaId: req.params.id, itemCount: items.length });
    
    // Reverte estoque dos produtos usando StockService
    try {
      await StockService.revertComanda({
        items: items,
        comandaId: req.params.id,
        userId: req.body.userId || null
      });
      console.log('[COMANDA][DELETE][STOCK_REVERT][SUCCESS]', { 
        comandaId: req.params.id, 
        itemCount: items.length 
      });
    } catch (stockError) {
      console.error('[COMANDA][DELETE][STOCK_REVERT][ERROR]', {
        comandaId: req.params.id,
        error: stockError.message
      });
      // Continua com a deleção mesmo se houver erro de estoque
    }
    
    // Remove itens da cozinha se existirem
    try {
      const { db } = require('../config/knex');
      const deletedCozinhaItems = await db('cozinha_items')
        .where({ comanda_id: req.params.id })
        .del();
      
      if (deletedCozinhaItems > 0) {
        console.log('[COMANDA][DELETE][COZINHA]', { 
          comandaId: req.params.id, 
          removedItems: deletedCozinhaItems 
        });
      }
    } catch (cozinhaError) {
      console.warn('[COMANDA][DELETE][COZINHA_WARNING]', { 
        error: cozinhaError.message 
      });
    }
    
    // Remove todos os itens da comanda
    await ComandaModel.clearItems(req.params.id);
    
    // Remove a comanda
    await ComandaModel.remove(req.params.id);
    
    console.log('[COMANDA][DELETE][SUCCESS]', { 
      comandaId: req.params.id,
      itemsReverted: items.length
    });
    
    res.json({ 
      success: true, 
      message: 'Comanda cancelada com sucesso',
      itemsReverted: items.length
    });
    
  } catch (err) {
    console.error('[COMANDA][DELETE][ERROR]', { 
      id: req.params.id, 
      error: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ error: 'Erro ao cancelar comanda', details: err.message });
  }
});

// Registrar pagamento mensal de crediário
router.post('/crediario/:monthlyAccountId/pay', async (req, res) => {
  /*
    Espera body:
    {
      paymentDate: string (YYYY-MM-DD ou timestamp),
      amount: number,
      paymentMethod: 'cash' | 'card' | 'pix' | 'transfer',
      receiptNumber?: string,
      receivedBy?: string,
      notes?: string
    }
  */
  try {
    const { monthlyAccountId } = req.params;
    const { paymentDate, amount, paymentMethod, receiptNumber, receivedBy, notes } = req.body;
    
    // Validações aprimoradas
    if (!paymentDate || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando: paymentDate, amount, paymentMethod' });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ error: 'Valor do pagamento deve ser positivo' });
    }
    
    if (!['cash', 'card', 'pix', 'transfer'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Método de pagamento inválido' });
    }
    
    // Verificar se conta existe
    const { db } = require('../config/knex');
    const account = await db('monthly_accounts').where('id', monthlyAccountId).first();
    if (!account) {
      return res.status(404).json({ error: 'Conta mensal não encontrada' });
    }
    
    // Verificar se pagamento não excede saldo devedor
    if (amount > account.balance) {
      return res.status(400).json({ error: `Valor do pagamento (R$ ${amount.toFixed(2)}) excede saldo devedor (R$ ${account.balance.toFixed(2)})` });
    }
    
    await CrediarioModel.addMonthlyPayment(
      monthlyAccountId,
      paymentDate,
      amount,
      paymentMethod,
      receiptNumber,
      receivedBy,
      notes
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[CREDIARIO][MONTHLY][PAY][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao registrar pagamento mensal', details: err.message });
  }
});

// Consultar contas mensais de crediário
router.get('/crediario/accounts', async (req, res) => {
  try {
    const { customerId, monthYear } = req.query;
    const { db } = require('../config/knex');
    let query = db('monthly_accounts')
      .join('customers', 'monthly_accounts.customer_id', 'customers.id')
      .select('monthly_accounts.*', 'customers.nome as customer_name', 'customers.sobrenome as customer_surname', 'customers.fone as customer_phone');
    if (customerId) query = query.where('monthly_accounts.customer_id', customerId);
    if (monthYear) query = query.where('monthly_accounts.month_year', monthYear);
    const accounts = await query.orderBy('monthly_accounts.due_date', 'desc');
    
    // Mapear dados para compatibilidade com frontend
    const mappedAccounts = accounts.map(account => ({
      ...account,
      amount_remaining: account.balance, // Frontend espera amount_remaining
      status: account.status === 'open' ? 'active' : account.status === 'closed' ? 'cancelled' : account.status // Mapear status
    }));
    
    res.json(mappedAccounts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar contas mensais', details: err.message });
  }
});

// Consultar compras mensais de crediário
router.get('/crediario/:monthlyAccountId/purchases', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const { db } = require('../config/knex');
    const purchases = await db('monthly_purchases').where('monthly_account_id', monthlyAccountId).orderBy('purchase_date', 'desc');
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar compras mensais', details: err.message });
  }
});

// Consultar pagamentos mensais de crediário
router.get('/crediario/:monthlyAccountId/payments', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const { db } = require('../config/knex');
    const payments = await db('monthly_payments').where('monthly_account_id', monthlyAccountId).orderBy('payment_date', 'desc');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar pagamentos mensais', details: err.message });
  }
});

// Gerar PDF do extrato mensal de crediário
router.post('/crediario/generate-pdf', async (req, res) => {
  /*
    Espera body:
    {
      customerId: string,
      monthYear: string (YYYY-MM),
      generatedBy?: string (opcional)
    }
  */
  try {
    const { customerId, monthYear, generatedBy } = req.body;
    
    if (!customerId || !monthYear) {
      return res.status(400).json({ error: 'customerId e monthYear são obrigatórios' });
    }
    
    console.log('[CREDIARIO][PDF][GENERATE]', { customerId, monthYear, generatedBy });
    
    const { db } = require('../config/knex');
    
    // Busca dados da conta mensal
    const accountData = await db('monthly_accounts')
      .join('customers', 'monthly_accounts.customer_id', 'customers.id')
      .select(
        'monthly_accounts.*',
        'customers.nome as customer_name',
        'customers.sobrenome as customer_surname',
        'customers.fone as customer_phone'
      )
      .where({
        'monthly_accounts.customer_id': customerId,
        'monthly_accounts.month_year': monthYear
      })
      .first();
    
    if (!accountData) {
      return res.status(404).json({ error: 'Conta mensal não encontrada para este cliente e período' });
    }
    
    // Busca compras e pagamentos do mês
    const [purchases, payments] = await Promise.all([
      db('monthly_purchases')
        .where('monthly_account_id', accountData.id)
        .orderBy('purchase_date', 'desc'),
      db('monthly_payments')
        .where('monthly_account_id', accountData.id)
        .orderBy('payment_date', 'desc')
    ]);
    
    // Formata dados para template
    const templateData = pdfService.formatCrediarioData(
      accountData,
      purchases,
      payments,
      generatedBy || 'Sistema'
    );
    
    // Gera PDF
    const pdfBuffer = await pdfService.generatePDF('crediario-report', templateData);
    
    // Gera nome único do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const customerName = accountData.customer_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `conta_${customerName}_${monthYear}_${timestamp}.pdf`;
    
    console.log('[CREDIARIO][PDF][FILENAME][DEBUG]', {
      originalCustomerName: accountData.customer_name,
      cleanedCustomerName: customerName,
      monthYear,
      timestamp,
      generatedFilename: filename,
      downloadUrl: `/api/comandas/crediario/pdf/${filename}`
    });
    
    // Salva PDF
    await pdfService.savePDF(pdfBuffer, filename, 'crediario');
    
    // Limpa PDFs antigos em background
    pdfService.cleanupOldPDFs('crediario', 7).catch(err => {
      console.error('Erro na limpeza de PDFs:', err);
    });
    
    console.log('[CREDIARIO][PDF][GENERATE][SUCCESS]', { filename, size: pdfBuffer.length });
    
    res.json({ 
      success: true,
      filename,
      downloadUrl: `/api/comandas/crediario/pdf/${filename}`,
      size: pdfBuffer.length
    });
    
  } catch (err) {
    console.error('[CREDIARIO][PDF][GENERATE][ERROR]', {
      error: err.message,
      stack: err.stack,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Erro ao gerar PDF do extrato',
      details: err.message
    });
  }
});

// Download/visualização do PDF gerado
router.get('/crediario/pdf/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { download } = req.query; // ?download=true para força download
    
    console.log('[CREDIARIO][PDF][DOWNLOAD][DEBUG]', { 
      filename, 
      download,
      rawParams: req.params,
      fullUrl: req.originalUrl 
    });
    
    // Valida nome do arquivo por segurança
    if (!filename.match(/^conta_[a-zA-Z0-9_-]+_\d{4}-\d{2}_[0-9T\-Z]+\.pdf$/)) {
      console.log('[CREDIARIO][PDF][DOWNLOAD][INVALID_FILENAME]', {
        filename,
        regex: '/^conta_[a-zA-Z0-9_-]+_\\d{4}-\\d{2}_[0-9T\\-Z]+\\.pdf$/',
        matched: false
      });
      return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }
    
    const filePath = path.join(__dirname, '..', 'uploads', 'reports', 'crediario', filename);
    
    // Verifica se arquivo existe
    const fs = require('fs').promises;
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Arquivo PDF não encontrado' });
    }
    
    // Define headers apropriados
    res.setHeader('Content-Type', 'application/pdf');
    
    if (download === 'true') {
      // Force download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      // Visualização inline no browser
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    
    // Envia arquivo
    res.sendFile(filePath);
    
    console.log('[CREDIARIO][PDF][DOWNLOAD]', { filename, download: download === 'true' });
    
  } catch (err) {
    console.error('[CREDIARIO][PDF][DOWNLOAD][ERROR]', {
      error: err.message,
      filename: req.params.filename
    });
    res.status(500).json({ error: 'Erro ao acessar PDF', details: err.message });
  }
});

// ================================
// ENDPOINTS WHATSAPP CREDIÁRIO
// ================================

// Listar clientes com WhatsApp configurado
router.get('/crediario/customers/whatsapp', async (req, res) => {
  try {
    const customers = await CrediarioModel.getCustomersWithWhatsApp();
    res.json(customers);
  } catch (err) {
    console.error('[CREDIARIO][CUSTOMERS][WHATSAPP][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao listar clientes com WhatsApp', details: err.message });
  }
});

// Configurar/atualizar número de telefone de um cliente para WhatsApp
router.post('/crediario/customers/:customerId/whatsapp', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { whatsappPhone } = req.body;

    if (!whatsappPhone) {
      return res.status(400).json({ error: 'Campo whatsappPhone é obrigatório' });
    }

    const formattedPhone = await CrediarioModel.setCustomerWhatsApp(customerId, whatsappPhone);
    res.json({ success: true, fone: formattedPhone });
  } catch (err) {
    console.error('[CREDIARIO][CUSTOMERS][WHATSAPP][SET][ERROR]', { 
      customerId: req.params.customerId, 
      error: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ error: 'Erro ao configurar telefone do cliente', details: err.message });
  }
});

// Buscar contas prontas para envio via WhatsApp
router.get('/crediario/accounts/ready-to-send', async (req, res) => {
  try {
    const { status, monthYear } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (monthYear) filters.monthYear = monthYear;

    const accounts = await CrediarioModel.getAccountsReadyToSend(filters);
    res.json(accounts);
  } catch (err) {
    console.error('[CREDIARIO][ACCOUNTS][READY_TO_SEND][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao buscar contas prontas para envio', details: err.message });
  }
});

// Gerar prévia da imagem da conta (sem enviar)
router.get('/crediario/:monthlyAccountId/preview-image', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    
    console.log('[CREDIARIO][PREVIEW_IMAGE][REQUEST]', { monthlyAccountId });
    
    // Buscar dados da conta mensal
    const accountData = await CrediarioModel.getAccountWithDetails(monthlyAccountId);
    
    if (!accountData) {
      console.log('[CREDIARIO][PREVIEW_IMAGE][NOT_FOUND]', { monthlyAccountId });
      return res.status(404).json({ error: 'Conta mensal não encontrada' });
    }

    // Gerar a imagem usando getInstance
    const { getInstance } = require('../services/receiptImageService');
    const imageService = getInstance();
    const imagePath = await imageService.generateReceiptImage(accountData);
    
    // Verificar tipo de arquivo gerado
    const fileExt = path.extname(imagePath).toLowerCase();
    
    if (fileExt === '.html') {
      // Fallback HTML - enviar com content-type apropriado
      console.log('[CREDIARIO][PREVIEW_IMAGE][FALLBACK_HTML]', { monthlyAccountId, imagePath });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.sendFile(imagePath);
    } else {
      // Imagem PNG normal
      console.log('[CREDIARIO][PREVIEW_IMAGE][SUCCESS]', { monthlyAccountId, imagePath });
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(imagePath);
    }
    
  } catch (err) {
    console.error('[CREDIARIO][PREVIEW_IMAGE][ERROR]', { 
      monthlyAccountId: req.params.monthlyAccountId,
      error: err.message, 
      stack: err.stack 
    });
    
    const errorMessage = err.message.includes('libnss3') 
      ? 'Erro do Puppeteer: Execute "bash install_chrome_deps.sh" no servidor'
      : 'Erro ao gerar prévia da imagem';
    
    res.status(500).json({ 
      error: errorMessage, 
      details: err.message,
      suggestion: err.message.includes('libnss3') 
        ? 'Execute o script install_chrome_deps.sh para instalar dependências do Chrome'
        : null
    });
  }
});

// Buscar contas que precisam de lembrete
router.get('/crediario/accounts/need-reminder', async (req, res) => {
  try {
    const accounts = await CrediarioModel.getAccountsNeedingReminder();
    res.json(accounts);
  } catch (err) {
    console.error('[CREDIARIO][ACCOUNTS][NEED_REMINDER][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao buscar contas que precisam de lembrete', details: err.message });
  }
});

// Endpoint de teste do sistema de imagens
router.get('/crediario/test-image-system', async (req, res) => {
  try {
    console.log('[CREDIARIO][TEST_IMAGE_SYSTEM][START]');
    
    const { getInstance } = require('../services/receiptImageService');
    const imageService = getInstance();
    
    // Teste rápido de inicialização do Puppeteer
    let puppeteerStatus = 'unknown';
    let chromeVersion = 'unknown';
    let fallbackStatus = 'unknown';
    
    try {
      await imageService.init();
      puppeteerStatus = 'success';
      
      // Tentar detectar versão do Chrome
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      chromeVersion = await browser.version();
      await browser.close();
      
    } catch (initError) {
      puppeteerStatus = 'failed';
      fallbackStatus = 'active';
      console.log('[CREDIARIO][TEST_IMAGE_SYSTEM][PUPPETEER_FAILED]', { error: initError.message });
    }
    
    res.json({
      status: 'ok',
      imageSystem: {
        puppeteerStatus,
        chromeVersion,
        fallbackStatus: puppeteerStatus === 'failed' ? 'active' : 'not_needed',
        suggestions: puppeteerStatus === 'failed' ? [
          'Execute: bash install_chrome_deps.sh',
          'Ou instale Google Chrome: sudo apt install google-chrome-stable',
          'Sistema funcionará com HTML como fallback'
        ] : [
          'Sistema funcionando corretamente',
          'Gerando imagens PNG'
        ]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('[CREDIARIO][TEST_IMAGE_SYSTEM][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ 
      error: 'Erro ao testar sistema de imagens', 
      details: err.message 
    });
  }
});

// Buscar histórico de mensagens WhatsApp de uma conta
router.get('/crediario/:monthlyAccountId/whatsapp-messages', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const { limit } = req.query;
    
    const messages = await CrediarioModel.getMessageHistory(monthlyAccountId, limit ? parseInt(limit) : 50);
    res.json(messages);
  } catch (err) {
    console.error('[CREDIARIO][ACCOUNT][WHATSAPP_MESSAGES][ERROR]', { 
      monthlyAccountId: req.params.monthlyAccountId, 
      error: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ error: 'Erro ao buscar histórico de mensagens WhatsApp', details: err.message });
  }
});

// Buscar conta mensal com detalhes completos (para geração de imagem/PDF)
router.get('/crediario/:monthlyAccountId/details', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    
    const accountDetails = await CrediarioModel.getAccountWithDetails(monthlyAccountId);
    res.json(accountDetails);
  } catch (err) {
    console.error('[CREDIARIO][ACCOUNT][DETAILS][ERROR]', { 
      monthlyAccountId: req.params.monthlyAccountId, 
      error: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ error: 'Erro ao buscar detalhes da conta', details: err.message });
  }
});

// Gerar imagem da conta mensal para envio via WhatsApp
router.get('/crediario/:monthlyAccountId/receipt-image', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const { format = 'png', forceRegenerate = false } = req.query;

    // Validar formato
    if (!['png', 'jpg', 'jpeg'].includes(format.toLowerCase())) {
      return res.status(400).json({ error: 'Formato inválido. Use: png, jpg ou jpeg' });
    }

    // Buscar dados completos da conta
    const accountData = await CrediarioModel.getAccountWithDetails(monthlyAccountId);

    // Verificar se conta tem saldo > 0 para envio
    if (accountData.balance <= 0 && accountData.status === 'paid') {
      return res.status(400).json({ 
        error: 'Conta já está quitada', 
        balance: accountData.balance,
        status: accountData.status 
      });
    }

    // Gerar imagem
    const receiptService = ReceiptImageService.getInstance();
    const imagePath = await receiptService.generateReceiptImage(accountData, {
      format: format.toLowerCase(),
      forceRegenerate: forceRegenerate === 'true'
    });

    // Configurar headers para download/visualização
    const filename = `conta-${monthlyAccountId}-${accountData.month_year}.${format}`;
    res.setHeader('Content-Type', `image/${format === 'jpg' ? 'jpeg' : format}`);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Enviar arquivo
    res.sendFile(path.resolve(imagePath));

    console.log('[CREDIARIO][RECEIPT_IMAGE]', { 
      monthlyAccountId, 
      filename,
      format,
      cached: !forceRegenerate
    });

  } catch (err) {
    console.error('[CREDIARIO][RECEIPT_IMAGE][ERROR]', { 
      monthlyAccountId: req.params.monthlyAccountId, 
      error: err.message, 
      stack: err.stack 
    });
    res.status(500).json({ error: 'Erro ao gerar imagem da conta', details: err.message });
  }
});

// Enviar conta específica via WhatsApp
router.post('/crediario/:monthlyAccountId/send-whatsapp', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const { messageType = 'account_receipt', forceRegenerate = false } = req.body;

    const whatsappService = WhatsAppCrediarioService.getInstance();
    const result = await whatsappService.sendAccountReceipt(monthlyAccountId, {
      messageType,
      forceRegenerate: forceRegenerate === 'true' || forceRegenerate === true
    });

    res.json(result);
  } catch (err) {
    console.error('[CREDIARIO][SEND_WHATSAPP][ERROR]', {
      monthlyAccountId: req.params.monthlyAccountId,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao enviar conta via WhatsApp', details: err.message });
  }
});

// Enviar múltiplas contas via WhatsApp
router.post('/crediario/send-batch', async (req, res) => {
  try {
    const { accountIds, messageType = 'account_receipt', forceRegenerate = false } = req.body;

    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({ error: 'accountIds deve ser um array com pelo menos um ID' });
    }

    if (accountIds.length > 10) {
      return res.status(400).json({ error: 'Máximo de 10 contas por lote para evitar sobrecarga' });
    }

    const whatsappService = WhatsAppCrediarioService.getInstance();
    const results = await whatsappService.sendBatchAccounts(accountIds, {
      messageType,
      forceRegenerate: forceRegenerate === 'true' || forceRegenerate === true
    });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (err) {
    console.error('[CREDIARIO][SEND_BATCH][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao enviar contas em lote via WhatsApp', details: err.message });
  }
});

// Enviar lembretes automáticos para contas vencidas
router.post('/crediario/send-reminders', async (req, res) => {
  try {
    const whatsappService = WhatsAppCrediarioService.getInstance();
    const results = await whatsappService.sendOverdueReminders();

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    });
  } catch (err) {
    console.error('[CREDIARIO][SEND_REMINDERS][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao enviar lembretes via WhatsApp', details: err.message });
  }
});

// Limpar cache de imagens antigas
router.post('/crediario/cleanup-cache', async (req, res) => {
  try {
    const whatsappService = WhatsAppCrediarioService.getInstance();
    await whatsappService.cleanupCache();

    res.json({ success: true, message: 'Cache limpo com sucesso' });
  } catch (err) {
    console.error('[CREDIARIO][CLEANUP_CACHE][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao limpar cache', details: err.message });
  }
});

// ================================
// ENDPOINTS ADMINISTRATIVOS SCHEDULER
// ================================

// Status do scheduler de lembretes
router.get('/crediario/scheduler/status', async (req, res) => {
  try {
    const CrediarioScheduler = require('../services/crediarioScheduler');
    const scheduler = CrediarioScheduler.getInstance();
    
    const status = scheduler.getStatus();
    const nextExecutions = scheduler.getNextExecutions();
    
    res.json({
      success: true,
      status,
      nextExecutions
    });
  } catch (err) {
    console.error('[CREDIARIO][SCHEDULER][STATUS][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao obter status do scheduler', details: err.message });
  }
});

// Executar lembretes manualmente
router.post('/crediario/scheduler/run-now', async (req, res) => {
  try {
    const CrediarioScheduler = require('../services/crediarioScheduler');
    const scheduler = CrediarioScheduler.getInstance();
    
    // Executar em background e retornar resposta imediata
    scheduler.runManualReminders().catch(error => {
      console.error('[CREDIARIO][SCHEDULER][MANUAL][ERROR]', error);
    });
    
    res.json({ 
      success: true, 
      message: 'Lembretes iniciados em background. Verifique logs para acompanhar progresso.' 
    });
  } catch (err) {
    console.error('[CREDIARIO][SCHEDULER][RUN_NOW][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao executar lembretes', details: err.message });
  }
});

// Controlar job de teste (apenas desenvolvimento)
router.post('/crediario/scheduler/test/:action', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Endpoint disponível apenas em ambiente de desenvolvimento' });
    }
    
    const { action } = req.params;
    const CrediarioScheduler = require('../services/crediarioScheduler');
    const scheduler = CrediarioScheduler.getInstance();
    
    if (action === 'start') {
      scheduler.startTestJob();
      res.json({ success: true, message: 'Job de teste ativado - lembretes a cada 10 minutos' });
    } else if (action === 'stop') {
      scheduler.stopTestJob();
      res.json({ success: true, message: 'Job de teste desativado' });
    } else {
      res.status(400).json({ error: 'Ação inválida. Use: start ou stop' });
    }
  } catch (err) {
    console.error('[CREDIARIO][SCHEDULER][TEST][ERROR]', {
      action: req.params.action,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: 'Erro ao controlar job de teste', details: err.message });
  }
});

module.exports = router;
