# 🎯 Guia Rápido - Padrões Responsivos

## Padrão 1: Padding Responsivo

```tsx
// ❌ Evite (fixo)
<div className="p-6">

// ✅ Use (responsivo)
<div className="p-4 sm:p-6 md:p-8">
// mobile: 16px | tablet: 24px | desktop: 32px
```

## Padrão 2: Grids Adaptáveis

```tsx
// ❌ Evite
<div className="grid grid-cols-4 gap-6">

// ✅ Use (1→2→3→4 colunas)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
```

## Padrão 3: Flexbox Responsivo

```tsx
// ❌ Evite
<div className="flex gap-6">

// ✅ Use (stack mobile, lado-a-lado desktop)
<div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
```

## Padrão 4: Largura Responsiva

```tsx
// ❌ Evite
<input className="w-64">

// ✅ Use (100% mobile, 256px desktop)
<input className="w-full sm:w-64">
```

## Padrão 5: Esconder/Mostrar

```tsx
// ✅ Ocultar em mobile, mostrar em md+
<div className="hidden md:flex">

// ✅ Mostrar em mobile, ocultar em md+
<div className="md:hidden">

// ✅ Mostrar em mobile, hidden em desktop
<div className="block md:hidden">
```

## Padrão 6: Tamanho de Fonte

```tsx
// ❌ Evite
<h1 className="text-3xl">Título</h1>

// ✅ Use (18px mobile, 24px tablet, 30px desktop)
<h1 className="text-lg sm:text-2xl lg:text-3xl">Título</h1>
```

## Padrão 7: Ícones Responsivos

```tsx
// ❌ Evite
<Icon className="w-6 h-6">

// ✅ Use
<Icon className="w-5 h-5 sm:w-6 sm:h-6">
```

## Padrão 8: Modais

```tsx
// ❌ Evite
<div className="max-w-2xl mx-4">

// ✅ Use
<div className="max-w-md w-full px-4">
// Responsivo naturalmente com max-w-md
```

## Padrão 9: Tabelas

```tsx
// ❌ Evite (sem scroll)
<table className="w-full">

// ✅ Use (scroll em mobile)
<div className="overflow-x-auto">
  <table className="w-full text-sm">
```

## Padrão 10: Botões Touch-Friendly

```tsx
// ❌ Evite
<button className="py-1 px-2 text-xs">

// ✅ Use (min 44x44px mobile)
<button className="py-2 sm:py-3 px-4 text-sm sm:text-base">
```

---

## 📋 Checklist: Quando Adicionar Novo Componente

- [ ] Padding: `p-4 sm:p-6`?
- [ ] Gap: `gap-3 sm:gap-6`?
- [ ] Font: `text-base sm:text-lg`?
- [ ] Width: `w-full sm:w-[size]`?
- [ ] Display: `hidden md:block`?
- [ ] Grid: Tem múltiplas colunas? Use `sm:` e `lg:`
- [ ] Ícones: Escalável? `w-5 h-5 sm:w-6 sm:h-6`
- [ ] Botões: Tocável? Min 44x44px

---

## 🔨 Breakpoints Disponiveis

```
xs: 375px   ← Phones muito pequenos
sm: 640px   ← Tablets pequenas
md: 768px   ← Tablets
lg: 1024px  ← Desktops
xl: 1280px
2xl: 1536px
```

---

## 💡 Dicas Práticas

### Regra de Ouro
```
Comece mobile (nenhum prefixo)
Melhore com sm: para tablets
Otimize com lg: para desktop
```

### Exemplo Completo
```tsx
<div className="
  p-4 sm:p-6        // Padding responsivo
  grid 
  grid-cols-2       // 2 colunas base
  sm:grid-cols-3    // 3 em tablet
  lg:grid-cols-4    // 4 em desktop
  gap-3 sm:gap-6    // Gap responsivo
">
  {/* Cards */}
</div>
```

### Testing Rápido
```bash
# Chrome DevTools
1. F12
2. Clique device icon (mobile view)
3. Selecione diferentes viewports
4. Teste interação (menu hamburger, etc)
```

---

## ⚠️ Erros Comuns

### ❌ Esquecer `w-full` em inputs mobile
```tsx
// Ruim
<input className="w-64">

// Bom
<input className="w-full sm:w-64">
```

### ❌ Padding muito pequeno em mobile
```tsx
// Ruim
<div className="p-2">

// Bom
<div className="p-4 sm:p-6">
```

### ❌ Sem gap responsivo
```tsx
// Ruim
<div className="grid grid-cols-2 gap-6">

// Bom
<div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
```

### ❌ Texts muito pequenos
```tsx
// Ruim
<p className="text-xs">Texto importante</p>

// Bom
<p className="text-sm sm:text-base">Texto importante</p>
```

### ❌ Botões muito pequenos
```tsx
// Ruim
<button className="py-1 px-2">Botão</button>

// Bom
<button className="py-2 sm:py-3 px-4">Botão</button>
```

---

## 🎓 Exemplo Completo: Card Responsivo

```tsx
<div className="
  // Tamanho
  w-full sm:w-80
  // Spacing
  p-4 sm:p-6
  // Cores
  bg-white border border-gray-200
  // Radius
  rounded-lg sm:rounded-xl
  // Shadow
  shadow-sm
">
  {/* Cabeçalho */}
  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
    Título
  </h3>
  
  {/* Conteúdo */}
  <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
    Descrição
  </p>
  
  {/* Botão */}
  <button className="
    w-full
    py-2 sm:py-3
    px-4 sm:px-6
    bg-blue-600 hover:bg-blue-700
    text-white text-sm sm:text-base
    rounded-lg font-bold
    transition-colors
  ">
    Ação
  </button>
</div>
```

---

## 🚀 Quick Copy-Paste Snippets

### Container Responsivo
```tsx
<div className="p-4 sm:p-6 max-w-6xl mx-auto">
  {/* Conteúdo */}
</div>
```

### Grid 2-3-4 Colunas
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
  {/* Items */}
</div>
```

### Modal Responsivo
```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg max-w-md w-full p-6">
    {/* Conteúdo */}
  </div>
</div>
```

### Header Responsivo
```tsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
  <h1 className="text-xl sm:text-2xl font-bold">Título</h1>
  <button>Ação</button>
</div>
```

---

## 📞 Dúvidas Frequentes

**P: Por que `p-4 sm:p-6` e não `p-4 md:p-6`?**
R: Porque tablets (sm) já precisam de mais espaço. Desktop é caso especial.

**P: Quanto space usar em mobile?**
R: Regra: `p-4` = 16px é padrão bom para mobile.

**P: Grid sempre começa em 1 coluna?**
R: Não! Se 2 colunas faz sentido em mobile, use `grid-cols-2`.

**P: Como testar sem recarregar?**
R: Resize o navegador (DevTools) - Tailwind é JIT, atualiza dinamicamente.

---

## ✅ Você está pronto!

Agora você consegue:
- ✅ Criar layouts responsivos
- ✅ Seguir os padrões do projeto
- ✅ Testar em diferentes devices
- ✅ Manter código consistente
- ✅ Sem quebras de layout

**Happy coding! 🚀**
