-- USE Medical — Activity log imutável com hash-chain
-- Espelha src/lib/medical/activity.ts + src/lib/medical/audit-chain.ts
-- Cada linha guarda o hash da anterior formando uma cadeia verificável.
-- Escrita SOMENTE via função SECURITY DEFINER (o front não pode inserir direto).

create type public.activity_event as enum (
  'quote_created', 'quote_updated', 'status_changed', 'tier_changed',
  'compliance_override', 'price_recalculated', 'ingested',
  'api_key_created', 'api_key_revoked', 'permission_changed', 'note'
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event public.activity_event not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  prev_hash text,
  hash text not null,
  created_at timestamptz not null default now()
);
create index activity_log_tenant_idx on public.activity_log (tenant_id, created_at desc);
create index activity_log_quote_idx on public.activity_log (quote_id, created_at desc);
create index activity_log_chain_idx on public.activity_log (tenant_id, id);

grant select on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;

create policy "activity_log: leitura por membro" on public.activity_log
  for select to authenticated using (public.is_tenant_member(tenant_id));

-- Sem policy de INSERT/UPDATE/DELETE para authenticated — imutável do lado cliente.

-- ============= HASH djb2 (mesmo do src/lib/medical/audit-chain.ts) =============
create or replace function public.djb2_hex(_input text)
returns text language plpgsql immutable as $$
declare
  h bigint := 5381;
  i int;
  ch int;
begin
  for i in 1..length(_input) loop
    ch := ascii(substr(_input, i, 1));
    h := ((h * 33) + ch) % 4294967296; -- mantém 32 bits
  end loop;
  return lpad(to_hex(h), 8, '0');
end;
$$;

-- ============= APPEND com prev_hash automático =============
create or replace function public.append_activity(
  _tenant uuid,
  _quote uuid,
  _event public.activity_event,
  _message text,
  _metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _prev text;
  _payload text;
  _hash text;
  _new_id uuid;
begin
  if not public.is_tenant_member(_tenant) then
    raise exception 'forbidden';
  end if;

  select hash into _prev
  from public.activity_log
  where tenant_id = _tenant
  order by created_at desc, id desc
  limit 1;

  _payload := coalesce(_prev, '') || '|' || _event::text || '|' || _message
              || '|' || coalesce(_quote::text, '') || '|' || _metadata::text;
  _hash := public.djb2_hex(_payload);

  insert into public.activity_log(tenant_id, quote_id, actor_id, event, message, metadata, prev_hash, hash)
  values (_tenant, _quote, auth.uid(), _event, _message, _metadata, _prev, _hash)
  returning id into _new_id;

  return _new_id;
end;
$$;

grant execute on function public.append_activity(uuid, uuid, public.activity_event, text, jsonb) to authenticated;

-- ============= Verificação de integridade (uso do painel /auditoria) =============
create or replace function public.verify_activity_chain(_tenant uuid)
returns table(total int, verified int, broken_at uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  _prev text;
  _payload text;
  _expected text;
  _total int := 0;
  _ok int := 0;
  _broken uuid;
begin
  if not public.is_tenant_member(_tenant) then
    raise exception 'forbidden';
  end if;

  for r in
    select id, quote_id, event, message, metadata, prev_hash, hash
    from public.activity_log
    where tenant_id = _tenant
    order by created_at asc, id asc
  loop
    _total := _total + 1;
    _payload := coalesce(_prev, '') || '|' || r.event::text || '|' || r.message
                || '|' || coalesce(r.quote_id::text, '') || '|' || r.metadata::text;
    _expected := public.djb2_hex(_payload);
    if r.hash = _expected and coalesce(r.prev_hash, '') = coalesce(_prev, '') then
      _ok := _ok + 1;
      _prev := r.hash;
    else
      _broken := r.id;
      exit;
    end if;
  end loop;

  return query select _total, _ok, _broken;
end;
$$;

grant execute on function public.verify_activity_chain(uuid) to authenticated;
