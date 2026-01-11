import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { id: string; name: string; role: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verificar credenciais
    const user = demoUsers.find(u => u.username === username && u.password === password);

    if (user) {
      // Salvar sessão
      const session = {
        id: user.id,
        name: user.name,
        role: user.role,
        loginAt: new Date().toISOString()
      };
      
      localStorage.setItem('lanchonete_session', JSON.stringify(session));
      onLogin(session);
    } else {
      setError('Usuário ou senha incorretos');
    }

    setLoading(false);
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

          {/* Demo Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs font-bold text-gray-600 mb-3">Usuários de demonstração:</p>
            <div className="space-y-2 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-bold text-gray-800">Admin: <span className="font-mono text-blue-600">admin / admin123</span></p>
                <p className="text-gray-600 mt-1">Acesso total ao sistema</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-bold text-gray-800">Operador: <span className="font-mono text-green-600">operador / op123</span></p>
                <p className="text-gray-600 mt-1">PDV, estoque e compras</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-bold text-gray-800">Caixa: <span className="font-mono text-purple-600">caixa / caixa123</span></p>
                <p className="text-gray-600 mt-1">PDV e controle de caixa</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
