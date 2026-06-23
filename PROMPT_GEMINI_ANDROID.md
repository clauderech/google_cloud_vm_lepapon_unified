# 📱 Prompt para Gemini - App Android de Compras com Kotlin

Cole este prompt inteiro no Gemini do Android Studio para gerar o app completo.

---

## PROMPT PARA GEMINI

Crie um app Android nativo completo em **Kotlin com Jetpack Compose** para registrar compras simples de insumos, com as seguintes funcionalidades:

### 📋 REQUISITOS FUNCIONAIS

#### 1. **Tela de Login**
- Campo de entrada para username e password
- Botão "Entrar"
- Request: `POST http://seu-backend.com/api/auth/login`
- Body: `{ "username": "...", "password": "..." }`
- Resposta esperada: `{ "token": "...", "user": { "id": "...", "name": "...", "role": "..." } }`
- Salvar token em DataStore criptografado com chave `lanchonete_auth_token`
- Exibir erro se credenciais inválidas
- Navegar para tela de Nova Compra após sucesso

#### 2. **Tela Inicial / Nova Compra**
Exibir um formulário com os seguintes campos:

**a) Seletor de Fornecedor**
- Label: "Fornecedor"
- Request: `GET http://seu-backend.com/api/suppliers` com header `Authorization: Bearer {token}`
- Exibir lista em dropdown/modal com nome de cada fornecedor
- Campo obrigatório, inicia vazio

**b) Seletor de Produtos**
- Label: "Produtos Disponíveis"
- Request: `GET http://seu-backend.com/api/products/android` com header `X-API-Key: {api_key}`
- Exibir lista scrollável de produtos com:
  - Nome do produto
  - Preço unitário
  - Estoque atual
  - Botão "+ Adicionar"

**c) Itens da Compra (Carrinho)**
- Tabela/Lista com colunas:
  - Nome do produto
  - Quantidade (campo numérico, pode editar)
  - Valor unitário
  - Subtotal (quantidade × valor unitário, calculado automaticamente)
  - Botão "Remover" (X)
- Total em destaque na parte inferior

**d) Campos Adicionais**
- Campo de texto opcional: "Número da Nota Fiscal"
- Botão "Registrar Compra" (desabilitado enquanto fornecedor ou itens vazios)

#### 3. **Fluxo de Registrar Compra**
- Validar: fornecedor e pelo menos 1 item
- Request: `POST http://seu-backend.com/api/purchases/android`
- Headers obrigatório: `X-API-Key: {api_key}`
- Body:
```json
{
  "supplierId": "...",
  "items": [
    {
      "productId": "...",
      "productName": "...",
      "quantity": 5,
      "unitPrice": 15.00
    }
  ],
  "total": 75.00,
  "invoiceNumber": "NF-001" // opcional
}
```
- Resposta esperada: `{ "success": true, "purchaseId": "..." }`
- Exibir modal de sucesso com ID da compra
- Oferecer botão "Nova Compra" para limpar formulário
- Oferecer botão "Voltar" para logout

#### 4. **Tratamento de Erros**
- **401 Unauthorized**: Limpar token, voltar para tela de Login com mensagem "Sessão expirada"
- **400 Bad Request**: Exibir mensagem de erro do servidor na tela
- **500 Internal Server Error**: Exibir mensagem "Erro no servidor, tente novamente" com botão Retry
- **Sem internet**: Exibir toast "Sem conexão" e oferecer retry com backoff exponencial

#### 5. **Comportamento de Sessão**
- Ao abrir o app, validar se há token salvo
- Se sim, ir direto para Nova Compra
- Se não, ir para Login
- Ao logout (botão na Nova Compra), apagar token e voltar para Login

### 🏗️ ARQUITETURA RECOMENDADA

```
app/
├── ui/
│   ├── screens/
│   │   ├── LoginScreen.kt
│   │   ├── NewPurchaseScreen.kt
│   │   └── SuccessScreen.kt
│   ├── components/
│   │   ├── ProductItem.kt
│   │   ├── PurchaseItemRow.kt
│   │   └── LoadingDialog.kt
│   └── theme/
│       └── Theme.kt
├── viewmodel/
│   ├── LoginViewModel.kt
│   ├── PurchaseViewModel.kt
│   └── SharedViewModel.kt (para compartilhar estado de login)
├── data/
│   ├── api/
│   │   ├── AuthService.kt
│   │   ├── ProductService.kt
│   │   ├── PurchaseService.kt
│   │   └── SupplierService.kt
│   ├── model/
│   │   ├── LoginRequest.kt
│   │   ├── LoginResponse.kt
│   │   ├── Product.kt
│   │   ├── Purchase.kt
│   │   ├── Supplier.kt
│   │   └── User.kt
│   ├── repository/
│   │   ├── AuthRepository.kt
│   │   ├── ProductRepository.kt
│   │   ├── PurchaseRepository.kt
│   │   └── SupplierRepository.kt
│   └── local/
│       └── SessionManager.kt (com DataStore)
└── MainActivity.kt

```

### 📦 DEPENDÊNCIAS

Adicione ao `build.gradle.kts` do módulo `app`:

```kotlin
dependencies {
    // Retrofit + OkHttp
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.11.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.11.0")
    
    // Kotlin Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
    
    // Jetpack Compose
    implementation("androidx.compose.ui:ui:1.6.1")
    implementation("androidx.compose.material3:material3:1.1.2")
    implementation("androidx.compose.foundation:foundation:1.6.1")
    implementation("androidx.navigation:navigation-compose:2.7.5")
    
    // ViewModel + Coroutines
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // DataStore
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    
    // Logging
    implementation("com.jakewharton.timber:timber:5.0.1")
}
```

### 🌍 CONFIGURAÇÃO DE AMBIENTES

Criar arquivo `BuildConfig.kt` ou usar BuildVariants:

```kotlin
object ApiConfig {
    const val BASE_URL = "http://seu-backend.com"  // Mude para seu backend
    const val API_KEY = "sua_chave_api_aqui"       // Mude para sua X-API-Key do .env
    const val CONNECT_TIMEOUT = 30L
    const val READ_TIMEOUT = 30L
}
```

Adicionar ao `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 🔐 INTERCEPTADOR HTTP

Criar classe `AuthInterceptor.kt`:

```kotlin
class AuthInterceptor(private val sessionManager: SessionManager) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = sessionManager.getToken()
        
        val newRequest = if (token != null && !originalRequest.url.encodedPath.contains("/android")) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .header("Content-Type", "application/json")
                .build()
        } else {
            originalRequest
        }
        
        return chain.proceed(newRequest)
    }
}
```

### 🧪 EXEMPLOS DE USO

**Login:**
```kotlin
val response = authService.login(LoginRequest("operador", "op123"))
sessionManager.saveToken(response.token)
```

**Listar Fornecedores:**
```kotlin
val suppliers = supplierService.getSuppliers()
// Exibir em dropdown
```

**Listar Produtos Android:**
```kotlin
val products = productService.getAndroidProducts()
// Filtro já aplicado no backend para insumo, insumo_bebida, revenda
```

**Registrar Compra:**
```kotlin
val purchase = Purchase(
    supplierId = selectedSupplier.id,
    items = cartItems,
    total = totalAmount,
    invoiceNumber = invoiceNumber
)
val result = purchaseService.createAndroidPurchase(purchase)
showSuccessDialog(result.purchaseId)
```

### 📝 NOTAS IMPORTANTES

1. **Autenticação dupla**: 
   - Login usa Bearer token
   - POST de compra usa X-API-Key
   - Produto Android GET usa X-API-Key
   
2. **Filtro de produtos**: Já feito no backend, app recebe somente insumo, insumo_bebida e revenda

3. **Cálculo de total**: Feito no app em tempo real quando itens são alterados

4. **Validação**: Sempre validar localmente antes de enviar ao backend

5. **Logs**: Adicionar logs detalhados para debug (use Timber)

6. **Tratamento de erro com retry**: Implementar exponential backoff para falhas de rede

7. **Estado do app**: Usar ViewModel + StateFlow para compartilhar estado entre telas

---

## PRÓXIMOS PASSOS APÓS GERAR O CÓDIGO

1. Substitua `seu-backend.com` pela URL real do seu backend
2. Substitua `sua_chave_api_aqui` pela X-API-Key do seu `.env`
3. Teste com as credenciais demo: `operador` / `op123` (ou `admin` / `admin123`)
4. Execute o script `/test_android_endpoints.sh` no backend para validar endpoints
5. Adicione assinatura digital ao app para gerar APK de release

---

Gere um projeto Android Studio completo e funcional com essa estrutura.
