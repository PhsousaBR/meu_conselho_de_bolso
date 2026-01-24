
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES Table
create table if not exists profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  created_at timestamptz default now()
);

-- --- WORKSPACES SYSTEM (NEW) ---

-- 1a. WORKSPACES
create table if not exists workspaces (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references profiles(id) not null,
  created_at timestamptz default now()
);

-- 1b. WORKSPACE MEMBERS
create table if not exists workspace_members (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text check (role in ('owner', 'viewer')) not null,
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 1c. WORKSPACE INVITES
create table if not exists workspace_invites (
  id uuid default uuid_generate_v4() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  invited_email text not null,
  role text default 'viewer' check (role in ('viewer')),
  token text unique not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- --- ENTITIES (Updated with workspace_id) ---

-- Helper to add workspace_id column if not exists
create or replace function add_workspace_col(tbl text) returns void as $$
begin
  execute format('alter table %I add column if not exists workspace_id uuid references workspaces(id) on delete cascade', tbl);
end;
$$ language plpgsql;

select add_workspace_col('clients');
select add_workspace_col('services');
select add_workspace_col('campaigns');
select add_workspace_col('sales');
select add_workspace_col('income');
select add_workspace_col('expenses');
select add_workspace_col('goals');
select add_workspace_col('fixed_costs');
select add_workspace_col('pricing_settings');

-- 2. CLIENTS Table
create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users, -- Keep for audit
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  contact_optional text,
  cnpj text,
  whatsapp text,
  notes text, 
  created_at timestamptz default now()
);

-- 3. SERVICES Table
create table if not exists services (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  default_price_optional numeric,
  base_price numeric,
  description text,
  default_hours numeric default 0,
  created_at timestamptz default now()
);

-- 4. CAMPAIGNS Table
create table if not exists campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  channel text not null,
  start_date date not null,
  end_date date,
  spend numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

-- 4.5 SALES Table
create table if not exists sales (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  client_id uuid references clients(id),
  service_id uuid references services(id),
  gross_total numeric not null,
  payment_method text,
  created_at timestamptz default now()
);

-- 5. INCOME Table
create table if not exists income (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  date date not null,
  amount numeric not null,
  status text check (status in ('received', 'pending')),
  client_id uuid references clients(id),
  service_id uuid references services(id),
  source text,
  payment_method text,
  notes text,
  import_key text,
  campaign_id uuid references campaigns(id),
  customer_acquired boolean default false,
  sale_id uuid references sales(id) on delete cascade,
  gross_amount numeric,
  fee_percent numeric default 0,
  fee_amount numeric default 0,
  net_amount numeric,
  installment_no int default 1,
  installment_count int default 1,
  created_at timestamptz default now()
);

-- 6. EXPENSES Table
create table if not exists expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  date date not null,
  amount numeric not null,
  category text not null,
  description text not null,
  payment_method text,
  is_recurring boolean default false,
  recurring_frequency text check (recurring_frequency in ('monthly', 'yearly', 'none')),
  recurring_day int,
  card_name text,
  is_template boolean default false,
  created_at timestamptz default now()
);

-- 7. GOALS Table
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  year int not null,
  month int not null,
  target_amount numeric not null,
  target_type text check (target_type in ('conservative', 'realistic', 'aggressive')),
  created_at timestamptz default now(),
  unique(workspace_id, year, month)
);

-- 8. FIXED COSTS Table
create table if not exists fixed_costs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  category text,
  monthly_amount numeric not null,
  notes text,
  created_at timestamptz default now()
);

-- 9. PRICING SETTINGS Table
create table if not exists pricing_settings (
  user_id uuid references auth.users not null, -- Keep user_id as PK for now to simplify legacy check, but logically it's per user preference OR workspace.
  workspace_id uuid references workspaces(id) on delete cascade,
  tax_percent numeric default 6,
  default_margin_percent numeric default 30,
  workable_hours_month numeric default 120,
  nonbillable_percent numeric default 30,
  monthly_goal numeric default 0,
  mp_default_fee_percent numeric default 4.99,
  updated_at timestamptz default now(),
  primary key (user_id) -- Simplified for now
);

-- --- MIGRATION: DATA BACKFILL ---
-- For every user, ensure they have a workspace and move their data
do $$
declare
  r record;
  w_id uuid;
begin
  for r in select id, email from profiles loop
    -- Check if user has a workspace where they are owner
    select id into w_id from workspaces where owner_id = r.id limit 1;
    
    if w_id is null then
      insert into workspaces (name, owner_id) values ('Meu Conselho', r.id) returning id into w_id;
      insert into workspace_members (workspace_id, user_id, role) values (w_id, r.id, 'owner');
    end if;

    -- Backfill ID to tables where it is null and user_id matches
    update clients set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update services set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update campaigns set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update sales set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update income set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update expenses set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update goals set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update fixed_costs set workspace_id = w_id where user_id = r.id and workspace_id is null;
    update pricing_settings set workspace_id = w_id where user_id = r.id and workspace_id is null;
  end loop;
end $$;


-- --- RLS POLICIES ---

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table income enable row level security;
alter table expenses enable row level security;
alter table goals enable row level security;
alter table campaigns enable row level security;
alter table fixed_costs enable row level security;
alter table pricing_settings enable row level security;
alter table sales enable row level security;

-- WORKSPACES
create policy "Select Workspace if Member" on workspaces for select 
using (exists (select 1 from workspace_members where workspace_id = workspaces.id and user_id = auth.uid()));

create policy "Update Workspace if Owner" on workspaces for update 
using (owner_id = auth.uid());

-- MEMBERS
create policy "Select Members if Member" on workspace_members for select 
using (exists (select 1 from workspace_members wm where wm.workspace_id = workspace_members.workspace_id and wm.user_id = auth.uid()));

create policy "Manage Members if Owner" on workspace_members for all 
using (exists (select 1 from workspaces w where w.id = workspace_members.workspace_id and w.owner_id = auth.uid()));

-- INVITES
create policy "Select Invites if Owner" on workspace_invites for select 
using (exists (select 1 from workspaces w where w.id = workspace_invites.workspace_id and w.owner_id = auth.uid()));

create policy "Create Invites if Owner" on workspace_invites for insert 
with check (exists (select 1 from workspaces w where w.id = workspace_invites.workspace_id and w.owner_id = auth.uid()));

create policy "Delete Invites if Owner" on workspace_invites for delete 
using (exists (select 1 from workspaces w where w.id = workspace_invites.workspace_id and w.owner_id = auth.uid()));

-- ENTITIES (Generic Policy Logic)
-- Select: If user is member of row's workspace
-- Mutate: If user is member AND role is owner (or workspace owner)

-- Helper to simplify policies
-- Note: 'pricing_settings' is a bit unique due to PK user_id, but we'll try to stick to workspace_id logic for future proofing.

-- GENERIC POLICIES
create or replace function is_workspace_member(ws_id uuid) returns boolean as $$
  select exists (select 1 from workspace_members where workspace_id = ws_id and user_id = auth.uid());
$$ language sql security definer;

create or replace function is_workspace_owner(ws_id uuid) returns boolean as $$
  select exists (select 1 from workspace_members where workspace_id = ws_id and user_id = auth.uid() and role = 'owner');
$$ language sql security definer;

-- Apply to Client
drop policy if exists "Users can CRUD own clients" on clients;
create policy "View Clients" on clients for select using (is_workspace_member(workspace_id));
create policy "Mutate Clients" on clients for all using (is_workspace_owner(workspace_id));

-- Apply to Services
drop policy if exists "Users can CRUD own services" on services;
create policy "View Services" on services for select using (is_workspace_member(workspace_id));
create policy "Mutate Services" on services for all using (is_workspace_owner(workspace_id));

-- Apply to Income
drop policy if exists "Users can CRUD own income" on income;
create policy "View Income" on income for select using (is_workspace_member(workspace_id));
create policy "Mutate Income" on income for all using (is_workspace_owner(workspace_id));

-- Apply to Expenses
drop policy if exists "Users can CRUD own expenses" on expenses;
create policy "View Expenses" on expenses for select using (is_workspace_member(workspace_id));
create policy "Mutate Expenses" on expenses for all using (is_workspace_owner(workspace_id));

-- Apply to Campaigns
drop policy if exists "Users can CRUD own campaigns" on campaigns;
create policy "View Campaigns" on campaigns for select using (is_workspace_member(workspace_id));
create policy "Mutate Campaigns" on campaigns for all using (is_workspace_owner(workspace_id));

-- Apply to Sales
drop policy if exists "Users can CRUD own sales" on sales;
create policy "View Sales" on sales for select using (is_workspace_member(workspace_id));
create policy "Mutate Sales" on sales for all using (is_workspace_owner(workspace_id));

-- Apply to Goals
drop policy if exists "Users can CRUD own goals" on goals;
create policy "View Goals" on goals for select using (is_workspace_member(workspace_id));
create policy "Mutate Goals" on goals for all using (is_workspace_owner(workspace_id));

-- Apply to Fixed Costs
drop policy if exists "Users can CRUD own fixed_costs" on fixed_costs;
create policy "View Fixed Costs" on fixed_costs for select using (is_workspace_member(workspace_id));
create policy "Mutate Fixed Costs" on fixed_costs for all using (is_workspace_owner(workspace_id));

-- Apply to Pricing Settings
drop policy if exists "Users can CRUD own pricing_settings" on pricing_settings;
create policy "View Settings" on pricing_settings for select using (is_workspace_member(workspace_id));
create policy "Mutate Settings" on pricing_settings for all using (is_workspace_owner(workspace_id));

-- --- USER CREATION TRIGGER (Updated) ---
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  w_id uuid;
begin
  -- 1. Create Profile
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  
  -- 2. Create Default Workspace
  insert into public.workspaces (name, owner_id) values ('Conselho de Bolso', new.id) returning id into w_id;
  
  -- 3. Add as Owner
  insert into public.workspace_members (workspace_id, user_id, role) values (w_id, new.id, 'owner');

  -- 4. Create Settings
  insert into public.pricing_settings (user_id, workspace_id) values (new.id, w_id) on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;
