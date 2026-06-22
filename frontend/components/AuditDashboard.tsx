import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, Download, RefreshCw, Filter, TrendingUp, Users, Activity, Shield } from 'lucide-react';
import { ProtectedRoute } from './ProtectedRoute';
import { ErrorDisplay } from './ErrorDisplay';
import { useAuth } from '../hooks/useAuth';
import { useApiError } from '../hooks/useApiError';

interface AuditLog {
  id: number;
  user_id: string;
  user_role: string;
  action: string;
  method: string;
  endpoint: string;
  http_status: number;
  response_status: string;
  duration_ms: number;
  timestamp: string;
}

interface SecurityEvent {
  id: number;
  event_type: string;
  user_id: string;
  endpoint: string;
  method: string;
  ip_address: string;
  http_status: number;
  timestamp: string;
}

/**
 * Componente de Dashboard de Auditoria
 * Visualiza logs de auditoria, eventos de segurança e estatísticas
 */
const AuditDashboard: React.FC = () => {
  const { user } = useAuth();
  const { error, handleError, clearError } = useApiError();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'events' | 'stats' | 'summary'>('summary');
  
  const [filters, setFilters] = useState({
    action: '',
    endpoint: '',
    status: '',
    startDate: '',
    endDate: ''
  });

  // Carregar dados
  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar logs
      const logsResponse = await fetch('/api/audit/logs?' + new URLSearchParams({
        action: filters.action,
        endpoint: filters.endpoint,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit: '100'
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lanchonete_auth_token') || ''}`
        }
      });
      
      if (logsResponse.ok) {
        const data = await logsResponse.json();
        setLogs(data.logs || []);
      }

      // Carregar estatísticas
      const statsResponse = await fetch('/api/audit/stats?timeRange=24h', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lanchonete_auth_token') || ''}`
        }
      });
      
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data.stats);
      }

      // Carregar resumo
      const summaryResponse = await fetch('/api/audit/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lanchonete_auth_token') || ''}`
        }
      });
      
      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        setSummary(data.summary);
      }

      // Carregar eventos de segurança
      const eventsResponse = await fetch('/api/audit/events?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lanchonete_auth_token') || ''}`
        }
      });
      
      if (eventsResponse.ok) {
        const data = await eventsResponse.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      await handleError(err, 'loadAuditData');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/audit/export?' + new URLSearchParams({
        action: filters.action,
        startDate: filters.startDate,
        endDate: filters.endDate
      }), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lanchonete_auth_token') || ''}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('Remover logs antigos (>90 dias)?')) return;

    try {
      const response = await fetch('/api/audit/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('lanchonete_auth_token') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ daysToKeep: 90 })
      });

      if (response.ok) {
        loadData();
        alert('Cleanup concluído');
      }
    } catch (err) {
      console.error('Erro ao limpar logs:', err);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'bg-green-50' : 'bg-red-50';
  };

  const getEventColor = (eventType: string) => {
    return eventType === 'UNAUTHORIZED_ACCESS' ? 'bg-red-100' : 'bg-orange-100';
  };

  return (
    <ProtectedRoute requiredRole="admin" permission="view_audit">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Cabeçalho */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-8 h-8 text-blue-600" />
                Auditoria & Segurança
              </h1>
              <p className="text-gray-600 mt-1">Monitore atividades e eventos de segurança</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>

          {error && (
            <ErrorDisplay
              type={error.type}
              status={error.status}
              message={error.message}
              onDismiss={clearError}
            />
          )}

          {/* Abas */}
          <div className="flex gap-4 mb-6 border-b">
            {(['summary', 'logs', 'events', 'stats'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'summary' && '📊 Resumo'}
                {tab === 'logs' && '📋 Logs'}
                {tab === 'events' && '⚠️ Eventos'}
                {tab === 'stats' && '📈 Estatísticas'}
              </button>
            ))}
          </div>

          {/* Conteúdo por aba */}
          {activeTab === 'summary' && summary && (
            <div className="space-y-6">
              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Total de Requisições</p>
                      <p className="text-3xl font-bold text-gray-900">{summary.stats?.totalRequests?.count || 0}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Requisições Falhadas</p>
                      <p className="text-3xl font-bold text-red-600">{summary.stats?.failedRequests?.count || 0}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Usuários Ativos</p>
                      <p className="text-3xl font-bold text-green-600">{summary.topUsers?.length || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm">Incidentes de Segurança</p>
                      <p className="text-3xl font-bold text-yellow-600">{summary.stats?.securityIncidents?.count || 0}</p>
                    </div>
                    <Shield className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>

              {/* Atividade recente */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Usuários mais ativos */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">👥 Usuários Mais Ativos</h3>
                  <div className="space-y-2">
                    {summary.topUsers?.slice(0, 5).map((user: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{user.user_id}</span>
                        <span className="text-gray-600">{user.count} ações</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Endpoints mais acessados */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold mb-4">🔗 Endpoints Mais Acessados</h3>
                  <div className="space-y-2">
                    {summary.topEndpoints?.slice(0, 5).map((ep: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-mono text-sm">{ep.endpoint}</span>
                        <span className="text-gray-600">{ep.count} acessos</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Atividade recente */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">🕐 Atividade Recente</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Usuário</th>
                        <th className="text-left py-2">Ação</th>
                        <th className="text-left py-2">Endpoint</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentActivity?.slice(0, 10).map((log: AuditLog, i: number) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="py-2">{log.user_id}</td>
                          <td className="py-2"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{log.action}</span></td>
                          <td className="py-2 font-mono text-sm">{log.endpoint}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded text-sm ${
                              log.response_status === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {log.http_status}
                            </span>
                          </td>
                          <td className="py-2 text-sm text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="bg-white rounded-lg shadow p-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Filtrar por endpoint..."
                  value={filters.endpoint}
                  onChange={(e) => setFilters({ ...filters, endpoint: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="px-3 py-2 border rounded"
                >
                  <option value="">Todas as ações</option>
                  <option value="READ">READ</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 border rounded"
                >
                  <option value="">Todos os status</option>
                  <option value="success">Sucesso</option>
                  <option value="error">Erro</option>
                </select>
                <button
                  onClick={loadData}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Filtrar
                </button>
              </div>

              {/* Tabela de logs */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Usuário</th>
                      <th className="text-left px-4 py-3 font-semibold">Ação</th>
                      <th className="text-left px-4 py-3 font-semibold">Endpoint</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="text-left px-4 py-3 font-semibold">Duration</th>
                      <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className={`border-b hover:bg-gray-50 ${getStatusColor(log.response_status)}`}>
                        <td className="px-4 py-3 font-medium">{log.user_id}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            log.action === 'READ' ? 'bg-blue-100 text-blue-800' :
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm">{log.endpoint}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm ${
                            log.response_status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {log.http_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{log.duration_ms}ms</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold">Usuário</th>
                    <th className="text-left px-4 py-3 font-semibold">Endpoint</th>
                    <th className="text-left px-4 py-3 font-semibold">IP Address</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className={`border-b hover:bg-gray-50 ${getEventColor(event.event_type)}`}>
                      <td className="px-4 py-3 font-medium">
                        {event.event_type === 'UNAUTHORIZED_ACCESS' ? '🔓 Não Autorizado' : '🔒 Acesso Negado'}
                      </td>
                      <td className="px-4 py-3">{event.user_id}</td>
                      <td className="px-4 py-3 font-mono text-sm">{event.endpoint}</td>
                      <td className="px-4 py-3 font-mono text-sm">{event.ip_address}</td>
                      <td className="px-4 py-3">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                          {event.http_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(event.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ações mais comuns */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">📊 Ações Mais Comuns (24h)</h3>
                {stats.byAction && stats.byAction.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.byAction}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="action" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Distribuição de status */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold mb-4">🎯 Distribuição de Status</h3>
                {stats.byStatus && stats.byStatus.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.byStatus}
                        dataKey="count"
                        nameKey="response_status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AuditDashboard;
