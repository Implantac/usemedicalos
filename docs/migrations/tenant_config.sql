-- USE Medical — Overrides de configuração por tenant
-- Espelha src/lib/medical/tenant-config.ts

create table public.tenant_config (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  min_margin numeric(6,4) not null default 0.12,
  target_margin numeric(6,4) not null default 0.28,
  retention_days integer not null default 90 check (retention_days between 7 and 3650),
  -- SLA por prioridade (horas até o deadline). Chaves: urgente/alta/normal/baixa.
  sla_hours jsonb not null default '{"urgente":2,"alta":8,"normal":24,"baixa":72}'::jsonb,
  commission_bonus_sla numeric(6,4) not null default 0.005,
  commission_bonus_won numeric(6,4) not null default 0.005,
  slack_webhook text,
  whatsapp_webhook text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint tenant_config_margin_order check (target_margin >= min_margin)
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

-- Auto-touch de updated_at em qualquer update.
create or replace function public.tenant_config_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tenant_config_touch
  before update on public.tenant_config
  for each row execute function public.tenant_config_touch();
