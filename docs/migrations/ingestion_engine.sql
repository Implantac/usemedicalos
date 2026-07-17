-- USE Medical — Ingestion Engine (portais, webhooks, rate-limit, quarentena)
-- Espelha src/lib/medical/{ingestion,ingest-log,quarantine,rate-limit}.ts

-- ============= INGEST LOG =============
create type public.ingest_status as enum ('accepted', 'rejected', 'quarantined');
create type public.ingest_channel as enum ('email', 'portal', 'whatsapp', 'edi', 'api');

create table public.ingest_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel public.ingest_channel not null,
  source text not null,
  quote_id uuid references public.quotes(id) on delete set null,
  status public.ingest_status not null,
  latency_ms integer not null default 0,
  error text,
  payload_hash text not null,
  received_at timestamptz not null default now()
);
create index ingest_log_tenant_idx on public.ingest_log (tenant_id, received_at desc);
create index ingest_log_status_idx on public.ingest_log (tenant_id, status);

grant select on public.ingest_log to authenticated;
grant all on public.ingest_log to service_role;
alter table public.ingest_log enable row level security;

create policy "ingest_log: leitura por membro" on public.ingest_log
  for select to authenticated using (public.is_tenant_member(tenant_id));
-- Escrita apenas via server (service_role no endpoint /api/public/ingest).

-- ============= QUARANTINE =============
create table public.quarantine_payloads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  channel public.ingest_channel not null,
  source text not null,
  reason text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution text
);
create index quarantine_tenant_idx on public.quarantine_payloads (tenant_id, received_at desc);

grant select, update on public.quarantine_payloads to authenticated;
grant all on public.quarantine_payloads to service_role;
alter table public.quarantine_payloads enable row level security;

create policy "quarantine: leitura por membro" on public.quarantine_payloads
  for select to authenticated
  using (tenant_id is null or public.is_tenant_member(tenant_id));

create policy "quarantine: resolver por gestor" on public.quarantine_payloads
  for update to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and (public.has_role(auth.uid(), tenant_id, 'gestor')
      or public.has_role(auth.uid(), tenant_id, 'admin'))
  )
  with check (resolved_by = auth.uid());

-- ============= RATE LIMITS (token bucket persistente) =============
create table public.rate_limits (
  bucket_key text primary key,
  tokens numeric not null,
  refill_at timestamptz not null,
  updated_at timestamptz not null default now()
);
grant all on public.rate_limits to service_role;
alter table public.rate_limits enable row level security;
-- Sem policy: acesso exclusivo via service_role no endpoint público.
