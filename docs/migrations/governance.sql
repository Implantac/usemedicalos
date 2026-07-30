-- USE Medical — Governança granular (permissões por usuário, além do role)
-- Espelha src/lib/medical/governance.ts (9 permissões).

create type public.governance_permission as enum (
  'quotes.read', 'quotes.write', 'quotes.send',
  'pricing.override', 'compliance.override',
  'api_keys.manage', 'integrations.manage',
  'governance.manage', 'audit.read'
);

create table public.permission_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission public.governance_permission not null,
  granted boolean not null,
  reason text,
  set_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, permission)
);
create index perm_overrides_user_idx on public.permission_overrides (tenant_id, user_id);

grant select on public.permission_overrides to authenticated;
grant all on public.permission_overrides to service_role;
alter table public.permission_overrides enable row level security;

create policy "perm_overrides: leitura próprio ou gestor"
  on public.permission_overrides for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and (user_id = auth.uid()
      or public.has_role(auth.uid(), tenant_id, 'gestor')
      or public.has_role(auth.uid(), tenant_id, 'admin'))
  );

create policy "perm_overrides: escrita apenas admin"
  on public.permission_overrides for all to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and public.has_role(auth.uid(), tenant_id, 'admin')
  )
  with check (
    public.is_tenant_member(tenant_id)
    and public.has_role(auth.uid(), tenant_id, 'admin')
    and set_by = auth.uid()
  );

-- ============= Resolver permissão efetiva (role default + override) =============
create or replace function public.effective_permissions(_tenant uuid, _user uuid)
returns setof public.governance_permission
language sql stable security definer set search_path = public as $$
  with role_defaults as (
    -- viewer: audit.read; vendedor: +quotes.read/write/send;
    -- gestor: +pricing.override, compliance.override, integrations.manage;
    -- admin: tudo.
    select unnest(case
      when public.has_role(_user, _tenant, 'admin') then
        enum_range(null::public.governance_permission)
      when public.has_role(_user, _tenant, 'gestor') then
        array['quotes.read','quotes.write','quotes.send','pricing.override',
              'compliance.override','integrations.manage','audit.read']::public.governance_permission[]
      when public.has_role(_user, _tenant, 'vendedor') then
        array['quotes.read','quotes.write','quotes.send','audit.read']::public.governance_permission[]
      else
        array['audit.read']::public.governance_permission[]
    end) as perm
  ),
  overrides_grant as (
    select permission from public.permission_overrides
    where tenant_id = _tenant and user_id = _user and granted = true
  ),
  overrides_deny as (
    select permission from public.permission_overrides
    where tenant_id = _tenant and user_id = _user and granted = false
  )
  select perm from role_defaults
  where perm not in (select permission from overrides_deny)
  union
  select permission from overrides_grant;
$$;

grant execute on function public.effective_permissions(uuid, uuid) to authenticated;
