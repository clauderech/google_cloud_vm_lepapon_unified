// =========================================
// LANCHONETE AI MANAGER - TIPOS UNIFICADOS
// =========================================
// Tipos TypeScript alinhados com database_unified.sql
// =========================================

export interface Customer {
  id: string;
  nome: string;
  sobrenome?: string;
  fone?: string;
  loyaltyPoints?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
}

export type MeasurementUnit = 'un' | 'kg' | 'g' | 'l' | 'ml';

export interface RecipeItem {
  ingredientId: string;
  quantity: number;
  unit?: string;
}

export interface Product {
  id: string;
  name: string;
  type: 'insumo' | 'prato' | 'drinks';
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  unit: MeasurementUnit;
  supplierId: string;
  category: string;
  description?: string;
  barcode?: string;
  isActive?: boolean;
  recipe?: RecipeItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export type ShoppingListPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ShoppingListItem {
  id: string;
  productId: string;
  quantity: number;
  priority?: ShoppingListPriority;
  isPurchased?: boolean;
  purchasedAt?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'credit';
export type PurchasePaymentMethod = 'cash' | 'card' | 'transfer' | 'check' | 'credit';

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  discount?: number;
  discountPercent?: number;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  paymentMethod: PaymentMethod;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  comandaId?: string;
  notes?: string;
  created_at?: string;
}

export type ComandaStatus = 'open' | 'closed' | 'cancelled';
export type ComandaItemStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface ComandaItem extends CartItem {
  status?: ComandaItemStatus;
}

export interface Comanda {
  id: string;
  customerId?: string;
  customerName: string;
  tableNumber?: string;
  openedAt: string;
  closedAt?: string;
  items: ComandaItem[];
  total: number;
  status: ComandaStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type PurchaseStatus = 'ordered' | 'received' | 'cancelled';

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  items: CartItem[];
  total: number;
  status: PurchaseStatus;
  invoiceNumber?: string;
  paymentMethod?: PurchasePaymentMethod;
  paymentDate?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DailyAssets {
  id?: number;
  date: string;
  totalInicial: number;
  totalFinal: number;
  salesCash: number;
  salesCard: number;
  salesPix: number;
  salesCredit: number;
  totalSales: number;
  purchasesTotal: number;
  expensesTotal: number;
  lossesTotal: number;
  totalExpenses: number;
  netBalance: number;
  salesCount: number;
  itemsSold: number;
  averageTicket: number;
  isClosed: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type ExpenseCategory = 
  | 'salarios' 
  | 'aluguel' 
  | 'energia' 
  | 'agua' 
  | 'gas' 
  | 'telefone' 
  | 'manutencao' 
  | 'impostos' 
  | 'outros';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: Exclude<PurchasePaymentMethod, 'credit'>;
  supplierName?: string;
  invoiceNumber?: string;
  isRecurring: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  closedBy?: string;
  initialAmount: number;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  status: CashRegisterStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type MovementType = 'entrada' | 'saida' | 'ajuste' | 'perda' | 'devolucao';
export type ReferenceType = 'sale' | 'purchase' | 'adjustment' | 'recipe' | 'loss' | 'return';

export interface StockMovement {
  id?: number;
  productId: string;
  movementType: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType?: ReferenceType;
  referenceId?: string;
  costImpact?: number;
  notes?: string;
  createdBy?: string;
  created_at?: string;
}

export type CrediarioStatus = 'active' | 'paid' | 'overdue' | 'cancelled';
export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'partial';

export interface Crediario {
  id: string;
  customer_id: string;
  sale_id?: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  installments_total: number;
  installments_paid: number;
  installment_value: number;
  start_date: string;
  first_due_date: string;
  status: CrediarioStatus;
  interest_rate: number;
  late_fee: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CrediarioInstallment {
  id: number;
  crediario_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  amount_paid: number;
  paid_date?: string;
  payment_method?: PaymentMethod;
  status: InstallmentStatus;
  late_days: number;
  late_fee: number;
  interest: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CrediarioPayment {
  id: string;
  crediario_id: string;
  installment_id?: number;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  received_by?: string;
  receipt_number?: string;
  notes?: string;
  created_at?: string;
}

export interface CrediarioStatusView extends Crediario {
  customer_name: string;
  customer_phone?: string;
  total_installments: number;
  overdue_installments: number;
  paid_installments: number;
  next_due_date?: string;
  overdue_amount: number;
  days_overdue?: number;
  payment_progress_percent: number;
}

export interface AppState {
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  shoppingList: ShoppingListItem[];
  activeComandas: Comanda[];
  dailyAssets?: DailyAssets[];
  expenses?: Expense[];
  cashRegister?: CashRegister;
  crediarios?: Crediario[];
}

export type PageView = 
  | 'dashboard' 
  | 'pos' 
  | 'inventory'
  | 'customers' 
  | 'purchases' 
  | 'suppliers' 
  | 'shopping-list'
  | 'financial'
  | 'expenses'
  | 'cash-register'
  | 'reports'
  | 'crediario';
