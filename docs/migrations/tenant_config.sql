-- USE Medical — Overrides de configuração por tenant
-- Espelha src/lib/medical/tenant-config.ts

create table public.tenant_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  min_margin numeric(6,4) not null default 0.12,
  max_margin numeric(6,4) not null default 0.60,
  sla_hours integer not null default 24,
  commission_bonus_sla numeric(6,4) not null default 0.005,
  commission_bonus_won numeric(6,4) not null default 0.005,
  slack_webhook text,
  whatsapp_webhook text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

grant select on public.tenant_config to authenticated;
grant all on public.tenant_config to service_role;
alter table public.tenant_config enable row level security;

create policy "tenant_config: leitura por membro"
  on public.tenant_config for select to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "tenant_config: escrita admin"
  on public.tenant_config for all to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_role(auth.uid(), tenant_id, 'admin')
  )
  with check (
    public.is_tenant_member(tenant_id)
    and public.has_role(auth.uid(), tenant_id, 'admin')
    and updated_by = auth.uid()
  );
