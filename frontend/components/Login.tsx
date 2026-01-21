import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { authService } from '../services/authService';

interface LoginProps {
  onLogin: (user: { id: string; name: string; role: string; token?: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Configuração: URL da API e modo demo
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  
  // Usuários de demonstração (apenas para modo demo)
  const getDemoUsers = () => {
    if (!demoMode) return [];
    
    return [
      { 
        id: 'admin_1', 
        username: import.meta.env.VITE_DEMO_USER_ADMIN || 'admin', 
        password: import.meta.env.VITE_DEMO_PASS_ADMIN || '', 
        name: 'Administrador', 
        role: 'admin' 
      },
      { 
        id: 'op_1', 
        username: import.meta.env.VITE_DEMO_USER_OPERADOR || 'operador', 
        password: import.meta.env.VITE_DEMO_PASS_OPERADOR || '', 
        name: 'Operador', 
        role: 'operador' 
      },
      { 
        id: 'caixa_1', 
        username: import.meta.env.VITE_DEMO_USER_CAIXA || 'caixa', 
        password: import.meta.env.VITE_DEMO_PASS_CAIXA || '', 
        name: 'Caixa', 
        role: 'caixa' 
      }
    ];
  };
  
  const demoUsers = getDemoUsers();

  // Autenticação via backend API
  const authenticateViaAPI = async () => {
    try {
      const loginResponse = await authService.login(username, password);
      
      // Salvar sessão
      authService.saveSession(loginResponse);

      // Preparar dados para callback
      const session = {
        id: loginResponse.user.id,
        name: loginResponse.user.name,
        role: loginResponse.user.role,
        token: loginResponse.token
      };
      
      onLogin(session);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Erro ao conectar ao servidor');
    }
  };

  // Autenticação via modo demo (fallback)
  const authenticateViaDemo = async () => {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = demoUsers.find(u => u.username === username && u.password === password);
    if (!user) {
      throw new Error('Usuário ou senha incorretos');
    }

    // Salvar sessão (sem token em modo demo)
    const session = {
      id: user.id,
      name: user.name,
      role: user.role,
      loginAt: new Date().toISOString()
    };
    
    localStorage.setItem('lanchonete_session', JSON.stringify(session));
    onLogin(session);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (demoMode) {
        // Modo demo: usar credenciais locais
        await authenticateViaDemo();
      } else {
        // Produção: usar API do backend
        await authenticateViaAPI();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-black text-blue-700">L</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Lanchonete AI</h1>
          <p className="text-blue-100 text-sm font-medium">Sistema de Gestão Inteligente</p>
          {demoMode && (
            <div className="mt-3 bg-yellow-400/20 border border-yellow-300/50 rounded px-3 py-1 inline-block">
              <p className="text-yellow-100 text-xs font-bold">Modo Demonstração</p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 text-black bg-white placeholder-gray-400"
                  placeholder="Digite seu usuário"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 text-black bg-white placeholder-gray-400"
                  placeholder="Digite sua senha"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm font-bold text-red-700">{error}</p>
              </div>
            )}

            {/* Demo Hints */}
            {demoMode && demoUsers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-xs">
                <p className="font-bold text-blue-900 mb-2">Credenciais de demonstração:</p>
                <ul className="space-y-1 text-blue-800">
                  <li>👤 admin / {demoUsers.find(u => u.role === 'admin')?.password}</li>
                  <li>👤 operador / {demoUsers.find(u => u.role === 'operador')?.password}</li>
                  <li>👤 caixa / {demoUsers.find(u => u.role === 'caixa')?.password}</li>
                </ul>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3 rounded-lg font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

export default Login;
