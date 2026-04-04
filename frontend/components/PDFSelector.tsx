'use client';

import React, { useState, useEffect } from 'react' with { type: 'module' };
import type { FC } from 'react';
import { FileText, Download, Search, Eye, Trash2, Calendar, User, Filter, MessageCircle } from 'lucide-react';

interface PDFFile {
  filename: string;
  customerName: string;
  monthYear: string;
  createdAt: string;
  size: number;
  downloadUrl: string;
}

interface PDFSelectorProps {}

const PDFSelector: FC<PDFSelectorProps> = () => {
  // Estados principais
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthYear, setSelectedMonthYear] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'customer' | 'month'>('date_desc');

  // Carregar PDFs do backend
  const loadPDFs = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://snackbartio.com.br/api/comandas/crediario/pdfs');
      if (!res.ok) throw new Error('Erro ao carregar PDFs');
      const data = await res.json();
      setPdfs(data);
    } catch (err) {
      console.error('Erro ao carregar PDFs:', err);
      alert('Erro ao carregar lista de PDFs');
    } finally {
      setLoading(false);
    }
  };

  // Carregar na inicialização
  useEffect(() => {
    loadPDFs();
  }, []);

  // Filtrar e ordenar PDFs
  const filteredAndSortedPdfs = React.useMemo(() => {
    let filtered = pdfs;

    // Filtro por busca (cliente)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(pdf => 
        pdf.customerName.toLowerCase().includes(search)
      );
    }

    // Filtro por mês/ano
    if (selectedMonthYear) {
      filtered = filtered.filter(pdf => pdf.monthYear === selectedMonthYear);
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'customer':
          return a.customerName.localeCompare(b.customerName);
        case 'month':
          return b.monthYear.localeCompare(a.monthYear);
        default:
          return 0;
      }
    });

    return filtered;
  }, [pdfs, searchTerm, selectedMonthYear, sortBy]);

  // Obter lista única de meses/anos para filtro
  const availableMonthYears = React.useMemo(() => {
    const months = [...new Set(pdfs.map(pdf => pdf.monthYear))].sort().reverse();
    return months;
  }, [pdfs]);

  // Handler: Download PDF
  const handleDownload = (pdf: PDFFile) => {
    window.open(`https://snackbartio.com.br${pdf.downloadUrl}`, '_blank');
  };

  // Handler: Preview PDF (nova aba)
  const handlePreview = (pdf: PDFFile) => {
    window.open(`https://snackbartio.com.br${pdf.downloadUrl}`, '_blank');
  };

  // Handler: Enviar via WhatsApp
  const handleSendWhatsApp = async (pdf: PDFFile) => {
    try {
      const phoneNumber = prompt('Digite o número do WhatsApp (ex: 5511999887766):');
      if (!phoneNumber) return;
      
      if (!confirm(`Enviar ${pdf.customerName} (${pdf.monthYear}) para ${phoneNumber}?`)) {
        return;
      }
      
      const res = await fetch('https://snackbartio.com.br/api/comandas/crediario/send-pdf-whatsapp-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: pdf.filename,
          phoneNumber: phoneNumber
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
      
    } catch (err) {
      console.error('Erro ao enviar WhatsApp:', err);
      alert('Erro ao enviar via WhatsApp');
    }
  };

  // Formatação de tamanho de arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatação de data
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PDFs do Crediário</h1>
            <p className="text-sm text-gray-600">
              {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} encontrado{pdfs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={loadPDFs}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Busca por cliente */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtro por mês/ano */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todos os meses</option>
              {availableMonthYears.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="date_desc">Mais recentes</option>
              <option value="date_asc">Mais antigos</option>
              <option value="customer">Cliente A-Z</option>
              <option value="month">Mês/Ano</option>
            </select>
          </div>

          {/* Limpar filtros */}
          {(searchTerm || selectedMonthYear) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedMonthYear('');
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista de PDFs */}
      <div className="bg-white rounded-xl shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando PDFs...</p>
          </div>
        ) : filteredAndSortedPdfs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum PDF encontrado</h3>
            <p className="text-gray-600">
              {searchTerm || selectedMonthYear
                ? 'Tente ajustar os filtros de busca'
                : 'Nenhum PDF de crediário foi gerado ainda'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-900">Cliente</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Mês/Ano</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Data de Criação</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Tamanho</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedPdfs.map((pdf) => (
                  <tr key={pdf.filename} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{pdf.customerName}</div>
                          <div className="text-sm text-gray-500">{pdf.filename}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {pdf.monthYear}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatDate(pdf.createdAt)}
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatFileSize(pdf.size)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(pdf)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Visualizar PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(pdf)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Baixar PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(pdf)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Enviar via WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estatísticas rodapé */}
      {!loading && filteredAndSortedPdfs.length > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Mostrando {filteredAndSortedPdfs.length} de {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''}
          {(searchTerm || selectedMonthYear) && (
            <span> (filtrado{filteredAndSortedPdfs.length !== 1 ? 's' : ''})</span>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFSelector;