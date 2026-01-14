import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        strictPort: true,
        allowedHosts: [
          'lanchoneteaimanager.server',
          'localhost',
          '127.0.0.1',
          '0.0.0.0'
        ]
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Aumentar o limite de aviso para chunks grandes
        chunkSizeWarningLimit: 1000, // 1MB em vez de 500KB
        
        // Otimizar o rollup
        rollupOptions: {
          output: {
            // Estratégia de chunking melhorada
            manualChunks: {
              // Separar react e dependências
              'react-vendor': ['react', 'react-dom'],
              
              // Separar lucide icons
              'lucide-icons': ['lucide-react'],
              
              // Componentes principais em chunks separados
              // (Isso ajuda a carregar seletivamente)
            }
          }
        },
        // Configurações adicionais
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true, // Remover console.log em produção
          }
        }
      }
    };
});
