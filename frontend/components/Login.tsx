import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { User as UserType, useAuth } from '../hooks/useAuth';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithCredentials } = useAuth();

  // Usuários de demonstração (em produção, verificar no backend)
  const demoUsers = [
    { id: 'admin_1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin' },
    { id: 'op_1', username: 'operador', password: 'op123', name: 'Operador', role: 'operador' },
    { id: 'caixa_1', username: 'caixa', password: 'caixa123', name: 'Caixa', role: 'caixa' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Tentar login via backend
      try {
        await loginWithCredentials(username, password);
        
        // Se sucesso, obter dados do usuário e chamar onLogin
        const user = demoUsers.find(u => u.username === username);
        if (user) {
          const session: UserType = {
            id: user.id,
            name: user.name,
            role: user.role as 'admin' | 'operador' | 'caixa',
            loginAt: new Date().toISOString()
          };
          onLogin(session);
        }
      } catch (backendError) {
        // Se backend falhar, usar validação local (fallback)
        console.warn('Backend login failed, usando validação local:', backendError);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const user = demoUsers.find(u => u.username === username && u.password === password);
        if (user) {
          const session: UserType = {
            id: user.id,
            name: user.name,
            role: user.role as 'admin' | 'operador' | 'caixa',
            loginAt: new Date().toISOString()
          };
          
          // Armazenar sessão localmente (sem token backend)
          localStorage.setItem('lanchonete_session', JSON.stringify(session));
          onLogin(session);
        } else {
          setError('Usuário ou senha incorretos');
        }
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
      console.error('Login error:', err);
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
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white py-3 rounded-lg font-bold text-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>Entrando...</>
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
