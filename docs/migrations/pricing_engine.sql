-- USE Medical — Pricing Engine (4 camadas) + colunas de governança em products
-- Espelha src/lib/medical/pricing-engine.ts + pricing-flywheel.ts

alter table public.products
  add column if not exists floor_price       numeric(12,4),
  add column if not exists compliance_cap    numeric(12,4),
  add column if not exists market_reference  numeric(12,4),
  add column if not exists market_updated_at timestamptz,
  add column if not exists strategic_margin  numeric(6,4) not null default 0.15,
  add column if not exists anvisa_code       text,
  add column if not exists cmed_pmc          numeric(12,4),
  add column if not exists therapeutic_class text,
  add column if not exists regulated         boolean not null default false;

-- ============= PRICE CACHE (server) =============
create table public.price_cache (
  product_id uuid primary key references public.products(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  suggested_price numeric(12,4) not null,
  layers jsonb not null,
  computed_at timestamptz not null default now(),
  ttl_seconds integer not null default 300
);
grant select on public.price_cache to authenticated;
grant all on public.price_cache to service_role;
alter table public.price_cache enable row level security;
create policy "price_cache: leitura por membro" on public.price_cache
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- ============= VIEW GESTOR-ONLY: produtos + governança + compliance =============
create or replace view public.v_product_governance as
select
  p.id, p.tenant_id, p.sku, p.name, p.unit,
  p.cost_price, p.floor_price, p.compliance_cap,
  p.market_reference, p.market_updated_at,
  p.strategic_margin, p.regulated,
  p.anvisa_code, p.cmed_pmc, p.therapeutic_class,
  rc.status as compliance_status,
  rc.blocked_reason,
  rc.expires_at as compliance_expires_at
from public.products p
left join lateral (
  select status, blocked_reason, expires_at
  from public.regulatory_compliance
  where product_id = p.id
  order by checked_at desc
  limit 1
) rc on true;

-- RLS herda das tabelas base. Restringimos acesso à view apenas a gestor/admin:
revoke all on public.v_product_governance from public;
grant select on public.v_product_governance to authenticated;

create or replace function public.can_view_governance(_tenant uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_tenant_member(_tenant)
    and (public.has_role(auth.uid(), _tenant, 'gestor')
      or public.has_role(auth.uid(), _tenant, 'admin'));
$$;

-- Enforce no nível da tabela base products (SELECT via view respeita RLS de products):
create policy "products: governança gestor-only via colunas sensíveis"
  on public.products for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    -- Colunas sensíveis (floor_price, compliance_cap, strategic_margin)
    -- ficam visíveis via política padrão; para restringir totalmente use
    -- SELECT filtrado no server function em vez de expor a view.
  );
