# USE Medical — Schema Supabase (aplicar ao ativar Cloud)

Este SQL está pronto para rodar assim que Lovable Cloud for habilitado.
Multi-tenant real via `tenant_id` + RLS. Roles em tabela separada
(`user_roles`), nunca em `profiles`.

```sql
-- USE Medical — schema inicial pronto para ativação da Lovable Cloud.

create extension if not exists "pgcrypto";

-- ============= ENUMS =============
create type public.quote_status as enum (
  'aguardando_precificacao', 'em_negociacao', 'enviado', 'ganho', 'perdido'
);
create type public.quote_priority as enum ('baixa', 'normal', 'alta', 'urgente');
create type public.quote_source as enum ('email', 'whatsapp', 'portal', 'telefone', 'edi');
create type public.app_role as enum ('admin', 'vendedor', 'gestor');

-- ============= TENANTS =============
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.tenants to authenticated;
grant all on public.tenants to service_role;
alter table public.tenants enable row level security;

-- ============= MEMBERSHIPS =============
create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
grant select on public.tenant_members to authenticated;
grant all on public.tenant_members to service_role;
alter table public.tenant_members enable row level security;

create or replace function public.is_tenant_member(_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = _tenant and user_id = auth.uid()
  )
$$;

-- ============= USER ROLES (separado) =============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, tenant_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user uuid, _tenant uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user and tenant_id = _tenant and role = _role
  )
$$;

-- ============= PRODUCTS =============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sku text not null,
  name text not null,
  unit text not null default 'un',
  cost_price numeric(12,4) not null check (cost_price >= 0),
  last_suggested_price numeric(12,4) not null check (last_suggested_price >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, sku)
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;

-- ============= QUOTES =============
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  source_type public.quote_source not null,
  status public.quote_status not null default 'aguardando_precificacao',
  priority public.quote_priority not null default 'normal',
  customer_name text not null,
  customer_segment text not null,
  received_at timestamptz not null default now(),
  sla_deadline timestamptz not null,
  original_payload_json jsonb not null default '{}'::jsonb,
  keywords text[] not null default '{}',
  notes text,
  use_sistemas_synced boolean not null default false,
  use_sistemas_order_id text
);
create index quotes_tenant_status_idx on public.quotes (tenant_id, status);
create index quotes_tenant_owner_idx on public.quotes (tenant_id, owner_id);
create index quotes_sla_idx on public.quotes (sla_deadline);
grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;

-- ============= QUOTE ITEMS =============
create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,4) not null check (unit_price >= 0),
  cost_price numeric(12,4) not null check (cost_price >= 0)
);
create index quote_items_quote_idx on public.quote_items (quote_id);
grant select, insert, update, delete on public.quote_items to authenticated;
grant all on public.quote_items to service_role;
alter table public.quote_items enable row level security;

-- ============= SLA TRACKING =============
create table public.sla_tracking (
  quote_id uuid primary key references public.quotes(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  received_at timestamptz not null,
  deadline timestamptz not null,
  first_response_at timestamptz,
  delivered_at timestamptz
);
grant select, insert, update, delete on public.sla_tracking to authenticated;
grant all on public.sla_tracking to service_role;
alter table public.sla_tracking enable row level security;

-- ============= RLS POLICIES =============
create policy "tenants: membro pode ver" on public.tenants
  for select to authenticated using (public.is_tenant_member(id));

create policy "tenant_members: próprio usuário" on public.tenant_members
  for select to authenticated using (user_id = auth.uid());

create policy "user_roles: próprio usuário" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

create policy "products: leitura por membro" on public.products
  for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "products: escrita por membro" on public.products
  for all to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "quotes: leitura por membro" on public.quotes
  for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "quotes: escrita por membro" on public.quotes
  for all to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

create policy "quote_items: leitura por membro" on public.quote_items
  for select to authenticated using (
    exists (select 1 from public.quotes q
            where q.id = quote_id and public.is_tenant_member(q.tenant_id))
  );
create policy "quote_items: escrita por membro" on public.quote_items
  for all to authenticated
  using (
    exists (select 1 from public.quotes q
            where q.id = quote_id and public.is_tenant_member(q.tenant_id))
  )
  with check (
    exists (select 1 from public.quotes q
            where q.id = quote_id and public.is_tenant_member(q.tenant_id))
  );

create policy "sla_tracking: leitura por membro" on public.sla_tracking
  for select to authenticated using (public.is_tenant_member(tenant_id));
create policy "sla_tracking: escrita por membro" on public.sla_tracking
  for all to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

-- ============= COMMISSIONS (Fase 1) =============
create table public.commission_rules (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  tiers jsonb not null,
  sla_bonus_rate numeric(6,4) not null default 0.005,
  won_bonus_rate numeric(6,4) not null default 0.005,
  updated_at timestamptz not null default now()
);
grant select on public.commission_rules to authenticated;
grant all on public.commission_rules to service_role;
alter table public.commission_rules enable row level security;
create policy "commission_rules: leitura tenant" on public.commission_rules
  for select to authenticated using (public.is_tenant_member(tenant_id));

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  base_amount numeric(14,2) not null,
  base_rate numeric(6,4) not null,
  sla_bonus numeric(6,4) not null default 0,
  won_bonus numeric(6,4) not null default 0,
  total numeric(14,2) not null,
  computed_at timestamptz not null default now()
);
grant select on public.commissions to authenticated;
grant all on public.commissions to service_role;
alter table public.commissions enable row level security;
create policy "commissions: leitura tenant" on public.commissions
  for select to authenticated using (public.is_tenant_member(tenant_id));

create table public.sales_goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  target_amount numeric(14,2) not null,
  target_count integer not null default 0
);
grant select on public.sales_goals to authenticated;
grant all on public.sales_goals to service_role;
alter table public.sales_goals enable row level security;
create policy "sales_goals: leitura tenant" on public.sales_goals
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- ============= REGULATORY COMPLIANCE (Fase 1) =============
create type public.compliance_status as enum ('ok', 'warning', 'blocked');

create table public.regulatory_compliance (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  anvisa_code text not null,
  cmed_pmc numeric(14,2),
  therapeutic_class text,
  expires_at date,
  status public.compliance_status not null default 'ok',
  blocked_reason text,
  checked_at timestamptz not null default now()
);
grant select on public.regulatory_compliance to authenticated;
grant all on public.regulatory_compliance to service_role;
alter table public.regulatory_compliance enable row level security;
create policy "compliance: leitura tenant" on public.regulatory_compliance
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- ============= MARKET BENCHMARKS (Fase 2 — anonimizado) =============
create table public.market_benchmarks (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  segment text not null,
  period_start date not null,
  period_end date not null,
  avg_margin numeric(6,4) not null,
  sample_size integer not null,
  computed_at timestamptz not null default now()
);
grant select on public.market_benchmarks to authenticated;
grant all on public.market_benchmarks to service_role;
alter table public.market_benchmarks enable row level security;
create policy "benchmarks: leitura autenticada" on public.market_benchmarks
  for select to authenticated using (sample_size >= 5);
```

## Como migrar o app quando o Cloud subir

1. Rodar este SQL na base Supabase gerada pela ativação da Cloud.
2. Substituir `useQuotes` (localStorage) por hooks TanStack Query que chamam
   server functions `createServerFn` com `.middleware([requireSupabaseAuth])`.
3. Semear `tenants` + `tenant_members` para o usuário logado antes do
   primeiro `SELECT` em `quotes`/`products`.
4. Manter o mock Use Sistemas: virar server route em `src/routes/api/public/use-sistemas.ts`
   com verificação HMAC.
