# Sistema de PDF do Crediário - Instruções de Implementação

## 📋 O que foi implementado

Sistema completo para geração e visualização de PDFs das contas mensais de crediário, incluindo:

- ✅ Migrations das tabelas de crediário mensal
- ✅ Service de geração de PDF com Puppeteer
- ✅ Rotas backend para gerar e baixar PDFs
- ✅ Botões na interface para gerar PDFs
- ✅ Template PDF com dados da empresa LePapon-Laches-Claudemir

---

## 🚀 Passos para ativar o sistema

### 1. **Executar SQL das tabelas**
Execute o arquivo SQL criado para criar as tabelas:
```bash
# Execute no MySQL:
source /caminho/para/create_crediario_tables.sql
```

### 2. **Instalar dependências**
```bash
cd /home/claus/Projetos/google_cloud/google_cloud_vm_lepapon_unified
npm install
```

**🔧 Para VMs na nuvem**: O sistema agora usa **PDFKit** como método principal (mais leve e confiável). 
- ✅ **Não precisa instalar Chrome/dependências** - PDFKit funciona nativamente
- 🔄 Puppeteer é usado apenas como fallback (se necessário)

Se quiser habilitar Puppeteer como backup:
```bash
chmod +x install_chrome_deps.sh
sudo ./install_chrome_deps.sh
```

### 3. **Reiniciar o servidor backend**
```bash
npm restart
# ou
pm2 restart all
```

---

## 📁 Arquivos criados/modificados

### Novos arquivos:
- `create_crediario_tables.sql` - SQL das tabelas
- `backend/services/pdfService.js` - Service de geração de PDF (PDFKit + Puppeteer)
- `backend/templates/crediario-report.html` - Template HTML (fallback Puppeteer)
- `backend/uploads/reports/crediario/` - Pasta dos PDFs (criada automaticamente)
- `install_chrome_deps.sh` - Script opcional para dependências do Chrome

### Arquivos modificados:
- `package.json` - Adicionado PDFKit + Puppeteer
- `backend/routes/comandas.js` - Novas rotas de PDF
- `frontend/components/CrediarioManager.tsx` - Botões de PDF

---

## 🎯 Como usar

### Na interface do crediário:

1. **Botão na tabela principal**: 
   - Clique no ícone 📄 na coluna "Ações" de qualquer cliente
   
2. **Botão no modal de detalhes**:
   - Abra os detalhes de uma conta mensal
   - Clique em "Gerar PDF" ao lado de "Registrar Pagamento"

3. **O PDF será aberto automaticamente** em nova aba do navegador

---

## 📄 Conteúdo do PDF

O relatório inclui:

### Header da empresa:
- **Nome**: LePapon-Laches-Claudemir
- **Endereço**: João Venâcio Girarde 260  
- **Telefone**: (55) 5499125-3180
- **CNPJ**: 33.794.253/0001-33

### Dados do cliente:
- Nome completo e telefone
- Período da conta (mês/ano)
- Data de vencimento

### Resumo financeiro:
- Total do mês
- Valor já pago  
- Saldo pendente

### Detalhamento:
- Tabela de compras realizadas
- Tabela de pagamentos efetuados
- Data e usuário que gerou o relatório

---

## ⚙️ Configurações técnicas

### Limpeza automática:
- PDFs são removidos automaticamente após **7 dias**
- Executado a cada geração de novo PDF

### Segurança:
- Validação de nomes de arquivo
- Verificação de existência antes do download
- Headers apropriados para visualização/download

### Performance:
- Loading individual por conta (não trava a interface)
- **Duas tecnologias de geração**:
  - 🎯 **PDFKit** (padrão): Nativo, leve, ideal para servidores na nuvem
  - 🔄 **Puppeteer** (fallback): HTML→PDF, usa mais recursos mas mais flexível
- Template otimizado para impressão

---

## 🔧 Troubleshooting

### Se o PDF não gerar:

1. **Verificar logs do servidor**:
```bash
pm2 logs
```

2. **Verificar se as tabelas existem**:
```sql
SHOW TABLES LIKE 'monthly_%';
```

3. **Erro de dependências do Chrome** (libnss3.so):
   - ✅ **Solução**: O sistema agora usa PDFKit por padrão (não precisa de Chrome)
   - 📝 PDFs são gerados nativamente sem dependências externas
   - 🔄 Se ainda quiser Puppeteer: execute `sudo ./install_chrome_deps.sh`

4. **Verificar permissões da pasta**:
```bash
ls -la backend/uploads/reports/
```

### Se o botão não aparece:
- Verificar se o usuário tem permissão `view_financial`
- Recarregar a página após restart do servidor

---

## 📊 APIs disponíveis

### Gerar PDF:
```
POST /api/comandas/crediario/generate-pdf
Body: {
  "customerId": "123",
  "monthYear": "2026-02", 
  "generatedBy": "Nome do usuário"
}
```

### Baixar PDF:
```
GET /api/comandas/crediario/pdf/nome_do_arquivo.pdf
Query: ?download=true (força download)
```

---

## ✨ Próximos passos sugeridos

1. **Adicionar permissão específica** para PDF (`export_crediario_pdf`)
2. **Implementar filtros** de período na interface  
3. **Adicionar logo** da empresa no header do PDF
4. **Configurar envio por email** dos PDFs
5. **Relatórios em lote** (múltiplos clientes)

---

## 🚀 Nova Implementação - VMs na Nuvem

### 🔧 **Problema Resolvido**: 
- ❌ Erro `libnss3.so` (dependências do Chrome)
- ❌ Puppeteer falhando em VMs sem interface gráfica

### ✅ **Solução Implementada**:
- 🎯 **PDFKit como método principal** - bibliotecas nativas JS
- 🔄 **Puppeteer como fallback** - caso específico needed
- ⚡ **Geração mais rápida** e **menor uso de recursos**
- 🛡️ **Maior estabilidade** em ambientes de produção

### 📊 **Tecnologias Ativas**:
1. **PDFKit** ➜ Geração nativa de PDF, sem dependências externas
2. **Puppeteer** ➜ Fallback HTML→PDF (se PDFKit falhar)

**Sistema otimizado para Google Cloud VM! 🎉**

---

**Sistema implementado com sucesso! 🎉**