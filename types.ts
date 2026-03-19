
export enum IncomeStatus {
  RECEIVED = 'received',
  PENDING = 'pending',
}

export enum PaymentMethodType {
  CASH = 'cash',
  CARD_MP = 'card_mp',
  SPLIT_50_50 = 'split_50_50'
}

export enum ExpenseFrequency {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  NONE = 'none',
}

export enum GoalType {
  CONSERVATIVE = 'conservative',
  REALISTIC = 'realistic',
  AGGRESSIVE = 'aggressive',
}

export enum MarketingChannel {
  META_ADS = 'meta_ads',
  GOOGLE_ADS = 'google_ads',
  THREADS = 'threads',
  INSTAGRAM = 'instagram',
  INDICACAO = 'indicacao',
  OUTROS = 'outros',
}

export enum Role {
  OWNER = 'owner',
  VIEWER = 'viewer'
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: Role;
  profile?: Profile; // Joined
  created_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  invited_email: string;
  role: Role;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string; // Legacy/Audit
  workspace_id?: string;
  name: string;
  cnpj?: string;
  whatsapp?: string;
  notes?: string;
  contact_optional?: string;
  created_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  description?: string;
  base_price?: number;
  default_hours?: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  channel: MarketingChannel;
  start_date: string;
  end_date?: string;
  spend: number;
  notes?: string;
  created_at: string;
  attributed_revenue?: number;
  roas?: number;
  cac?: number;
  acquired_customers?: number;
  leads_count?: number; // NEW: For conversion rate tracking
  conversion_rate?: number; // Computed: acquired_customers / leads_count
}

export interface Sale {
  id: string;
  user_id: string;
  workspace_id?: string;
  client_id?: string;
  service_id?: string;
  gross_total: number;
  payment_method: PaymentMethodType;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  workspace_id?: string;
  date: string;
  amount: number; 
  status: IncomeStatus;
  client_id?: string;
  service_id?: string;
  source?: string;
  payment_method?: string; 
  notes?: string;
  import_key?: string;
  created_at: string;
  client?: Client;
  service?: Service;
  
  // Marketing Attribution
  campaign_id?: string;
  customer_acquired?: boolean;
  campaign?: Campaign;

  // New Fields (Receivables)
  sale_id?: string;
  gross_amount?: number;
  fee_percent?: number;
  fee_amount?: number;
  net_amount?: number;
  installment_no?: number;
  installment_count?: number;
}

export interface Expense {
  id: string;
  user_id: string;
  workspace_id?: string;
  date: string;
  amount: number;
  category: string;
  description: string;
  payment_method?: string;
  is_recurring: boolean;
  recurring_frequency: ExpenseFrequency;
  recurring_day?: number;
  card_name?: string;
  is_template?: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  workspace_id?: string;
  year: number;
  month: number;
  target_amount: number;
  target_type: GoalType;
  created_at: string;
}

export interface FixedCost {
  id: string;
  user_id: string;
  workspace_id?: string;
  name: string;
  category: string;
  monthly_amount: number;
  notes?: string;
  created_at: string;
}

export interface PricingSettings {
  user_id: string;
  workspace_id?: string; // Although currently PK is user_id, logically should attach to workspace
  tax_percent: number;
  default_margin_percent: number;
  workable_hours_month: number;
  nonbillable_percent: number;
  monthly_goal: number;
  mp_default_fee_percent: number;
  updated_at: string;
}

// --- NEW: Audit Log ---
export interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  user_email?: string;
  action: 'create' | 'update' | 'delete';
  entity_type: string; // 'income' | 'expense' | 'campaign' | 'client' | 'service' | 'goal' | 'fixed_cost'
  entity_id: string;
  entity_label?: string; // Human-readable label (e.g., client name, expense description)
  changes?: Record<string, { old: any; new: any }>; // Only for updates
  created_at: string;
}

// --- NEW: Expense Category (Configurable) ---
export interface ExpenseCategory {
  id: string;
  workspace_id: string;
  name: string;
  color?: string;
  created_at: string;
}
