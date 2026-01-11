import React, { useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Phone, User, History } from 'lucide-react';
import type { Customer, Sale } from '../types';
import CustomerPurchaseHistory from './CustomerPurchaseHistory';

interface CustomersManagerProps {
  customers: Customer[];
  sales?: Sale[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => void;
  onUpdateCustomer?: (id: string, customer: Partial<Customer>) => void;
  onDeleteCustomer?: (id: string) => void;
}

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const CustomersManager: React.FC<CustomersManagerProps> = ({ 
  customers,
  sales = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    fone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome) return alert('Nome é obrigatório');
    
    if (editingId && onUpdateCustomer) {
      onUpdateCustomer(editingId, formData);
      setEditingId(null);
    } else {
      onAddCustomer(formData);
    }
    
    setFormData({ nome: '', sobrenome: '', fone: '' });
    setShowForm(false);
  };

  const handleEdit = (customer: Customer) => {
    setFormData({
      nome: customer.nome,
      sobrenome: customer.sobrenome || '',
      fone: customer.fone || ''
    });
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setFormData({ nome: '', sobrenome: '', fone: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const filteredCustomers = (customers || []).filter(customer =>
    customer.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.sobrenome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.fone?.includes(searchTerm)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {selectedCustomer && (
        <CustomerPurchaseHistory 
          customer={selectedCustomer}
          sales={sales}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          Clientes
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white placeholder-gray-600"
                placeholder="Nome"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Sobrenome
              </label>
              <input
                type="text"
                value={formData.sobrenome}
                onChange={e => setFormData({ ...formData, sobrenome: e.target.value })}
                className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white placeholder-gray-600"
                placeholder="Sobrenome"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.fone}
                onChange={e => setFormData({ ...formData, fone: formatPhone(e.target.value) })}
                className="w-full border border-gray-400 p-2 rounded-lg text-black bg-white placeholder-gray-600"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
              >
                {editingId ? 'Atualizar Cliente' : 'Salvar Cliente'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-bold transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, sobrenome ou telefone..."
            className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-600 text-black bg-white placeholder-gray-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 text-gray-900 font-bold text-sm">
              <tr>
                <th className="p-4 text-left">Nome</th>
                <th className="p-4 text-left">Sobrenome</th>
                <th className="p-4 text-left">Telefone</th>
                <th className="p-4 text-center">Pontos</th>
                <th className="p-4 text-left">Cadastrado em</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-bold text-gray-900">{customer.nome}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 font-medium">{customer.sobrenome || '-'}</td>
                    <td className="p-4">
                      {customer.fone ? (
                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                          <Phone className="w-4 h-4 text-gray-500" />
                          {customer.fone}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold text-sm">
                        <span>⭐</span>
                        <span>{customer.loyaltyPoints || 0}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm font-medium">
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ver Histórico"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCustomer && onDeleteCustomer(customer.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl text-white">
          <p className="text-sm font-semibold opacity-90">Total de Clientes</p>
          <p className="text-3xl font-black mt-1">{customers?.length || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white">
          <p className="text-sm font-semibold opacity-90">Com Telefone</p>
          <p className="text-3xl font-black mt-1">{customers?.filter(c => c.fone).length || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white">
          <p className="text-sm font-semibold opacity-90">Cadastrados Hoje</p>
          <p className="text-3xl font-black mt-1">
            {customers?.filter(c => c.created_at && new Date(c.created_at).toDateString() === new Date().toDateString()).length || 0}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomersManager;
