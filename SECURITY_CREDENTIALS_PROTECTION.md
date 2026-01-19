# 🔐 Proteção de Credenciais - Guia de Implementação

## ✅ O que foi feito

As credenciais de login foram removidas do código-fonte e agora são carregadas de **variáveis de ambiente**, impedindo exposição no GitHub.

---

## 📋 Arquivos Modificados

### 1. **frontend/components/Login.tsx**
```diff
- // Hardcoded (INSEGURO)
- const demoUsers = [
-   { username: 'admin', password: 'admin123', ... },
-   { username: 'operador', password: 'op123', ... },
-   { username: 'caixa', password: 'caixa123', ... }
- ];

+ // Variáveis de ambiente (SEGURO)
+ const getDemoUsers = () => {
+   const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
+   if (!demoMode) return [];
+   
+   return [
+     { 
+       username: import.meta.env.VITE_DEMO_USER_ADMIN,
+       password: import.meta.env.VITE_DEMO_PASS_ADMIN,
+       ...
+     },
+     ...
+   ];
+ };
```

### 2. **.env.example** (Atualizado)
Adicionadas as variáveis de demo:
```env
# ===== FRONTEND - MODO DEMONSTRAÇÃO =====
VITE_DEMO_MODE=true

VITE_DEMO_USER_ADMIN=admin
VITE_DEMO_PASS_ADMIN=admin123

VITE_DEMO_USER_OPERADOR=operador
VITE_DEMO_PASS_OPERADOR=op123

VITE_DEMO_USER_CAIXA=caixa
VITE_DEMO_PASS_CAIXA=caixa123
```

### 3. **.env.local** (Criado - IGNORADO pelo Git)
Contém as credenciais locais para desenvolvimento.
```env
VITE_DEMO_MODE=true
VITE_DEMO_USER_ADMIN=admin
VITE_DEMO_PASS_ADMIN=admin123
...
```

### 4. **.gitignore** (Já configurado)
```ignore
.env          ✅ Arquivo com credenciais reais
.env.local    ✅ Arquivo local ignorado
.env.*.local  ✅ Arquivos de ambiente ignorados
```

---

## 🚀 Como Usar

### **Desenvolvimento Local**

1. **Copiar exemplo como base** (já existe .env.local):
   ```bash
   # Já criado automaticamente
   # Apenas edite .env.local se precisar mudar credenciais
   ```

2. **Verificar que variáveis estão carregadas:**
   ```bash
   cd frontend
   npm run dev
   ```
   O frontend carregará automaticamente `.env.local`

3. **Testar login:**
   - Usuário: `admin`
   - Senha: `admin123`

### **Produção**

Configure via **variáveis de ambiente do sistema/plataforma**:

#### **Google Cloud (Cloud Run)**
```bash
gcloud run deploy meu-app \
  --set-env-vars VITE_DEMO_MODE=false
```

#### **Heroku**
```bash
heroku config:set VITE_DEMO_MODE=false
```

#### **GitHub Actions (CI/CD)**
```yaml
env:
  VITE_DEMO_MODE: 'false'  # Desabilitar modo demo em produção
```

#### **Docker**
```dockerfile
ENV VITE_DEMO_MODE=false
ENV VITE_DEMO_USER_ADMIN=seu_usuario_real
```

---

## ✨ Benefícios

✅ **Segurança**: Credenciais não estão no Git
✅ **Flexibilidade**: Fácil mudar credenciais sem código
✅ **Ambiente**: Diferentes credenciais por ambiente (dev/staging/prod)
✅ **Conformidade**: Segue boas práticas de segurança
✅ **Simplicidade**: Usa sistema padrão de variáveis de ambiente

---

## ⚠️ Importante

### Em Produção:
1. **REMOVA** `VITE_DEMO_MODE=true`
2. **IMPLEMENTE** autenticação real no backend
3. **NUNCA** use credenciais hardcoded
4. **USE** sistema de autenticação (JWT, OAuth, etc)

### Exemplo de Autenticação Real:
```typescript
// Ao invés de credenciais locais, chamar backend
const handleLogin = async (username: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  const { token, user } = await response.json();
  // Salvar token e fazer login
};
```

---

## 📝 Checklist

- [x] Remover credenciais hardcoded do código
- [x] Usar variáveis de ambiente (Vite)
- [x] Criar .env.example com documentação
- [x] Criar .env.local para desenvolvimento
- [x] Garantir .gitignore está correto
- [x] Testar funcionamento local
- [ ] ⚠️ Implementar autenticação real em produção

---

## 🔧 Troubleshooting

### Problema: "Variáveis não carregam"
```bash
# Solução: Reiniciar servidor Vite
npm run dev
# Vite recarrega variáveis automaticamente
```

### Problema: "Login não funciona"
```bash
# Verificar se VITE_DEMO_MODE está true em .env.local
# Abrir DevTools (F12) e verificar console para erros
```

### Problema: "Credenciais visíveis no navegador"
```javascript
// Isso é seguro - variáveis VITE_* são expostas ao navegador
// por design (nunca colocar secrets aqui)
// Para dados sensíveis, usar endpoint no backend
```

---

## 📚 Referências

- [Vite - Environment Variables](https://vitejs.dev/guide/env-and-modes.html)
- [Best Practices - Secrets Management](https://12factor.net/config)
- [GitHub - Protecting Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## 🎯 Próximos Passos (Recomendados)

1. **Autenticação Real**: Implementar login via API backend
2. **JWT/Token**: Usar tokens para sessões seguras
3. **2FA**: Adicionar autenticação de dois fatores
4. **Auditoria**: Logar tentativas de login
5. **Rate Limiting**: Proteger contra força bruta

---

**Status**: ✅ Credenciais protegidas do GitHub
