-- USE Medical — Comissões calculadas em servidor (trigger)
-- Rodar após `docs/supabase-schema.md`. Depende de: tenants, quotes, quote_items,
-- commissions, commission_rules, has_role, is_tenant_member.
--
-- Objetivo:
--  1. Toda vez que um item de cotação (quote_items) ou o status da cotação mudar,
--     recalcular a margem bruta agregada + a comissão estimada e persistir em
--     `quotes.estimated_commission` (valor) e `quotes.estimated_margin` (fração).
--  2. Tudo roda no servidor com SECURITY DEFINER — o vendedor não consegue
--     inflar comissão editando o front.
--  3. RLS já ativa nas tabelas base. Aqui só endurecemos comissões: leitura pelo
--     próprio owner ou por gestor/admin do tenant; escrita apenas via trigger
--     (nenhuma policy de INSERT/UPDATE para authenticated).

-- ============= COLUNAS DERIVADAS EM quotes =============
alter table public.quotes
  add column if not exists estimated_revenue   numeric(14,2) not null default 0,
  add column if not exists estimated_cost      numeric(14,2) not null default 0,
  add column if not exists estimated_margin    numeric(6,4)  not null default 0,
  add column if not exists estimated_commission numeric(14,2) not null default 0,
  add column if not exists commission_tier     text          not null default 'sem_comissao',
  add column if not exists commission_computed_at timestamptz;

-- ============= FUNÇÃO: taxa por margem (mesma lógica do front) =============
create or replace function public.commission_rate_for_margin(_margin numeric)
returns numeric language sql immutable as $$
  select case
    when _margin >= 0.30 then 0.050
    when _margin >= 0.20 then 0.035
    when _margin >= 0.12 then 0.020
    else 0.000
  end;
$$;

create or replace function public.commission_tier_label(_rate numeric)
returns text language sql immutable as $$
  select case
    when _rate >= 0.050 then 'ouro'
    when _rate >= 0.035 then 'prata'
    when _rate >= 0.020 then 'bronze'
    else 'sem_comissao'
  end;
$$;

-- ============= FUNÇÃO: recomputar comissão de uma cotação =============
create or replace function public.recompute_quote_commission(_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_owner  uuid;
  v_status public.quote_status;
  v_sla    timestamptz;
  v_rev    numeric(14,2) := 0;
  v_cost   numeric(14,2) := 0;
  v_margin numeric(6,4)  := 0;
  v_base   numeric(6,4)  := 0;
  v_sla_b  numeric(6,4)  := 0;
  v_won_b  numeric(6,4)  := 0;
  v_eff    numeric(6,4)  := 0;
  v_total  numeric(14,2) := 0;
  v_rule   public.commission_rules%rowtype;
begin
  select tenant_id, owner_id, status, sla_deadline
    into v_tenant, v_owner, v_status, v_sla
  from public.quotes where id = _quote_id;
  if not found then return; end if;

  select coalesce(sum(quantity * unit_price), 0),
         coalesce(sum(quantity * cost_price), 0)
    into v_rev, v_cost
  from public.quote_items where quote_id = _quote_id;

  if v_rev > 0 then
    v_margin := ((v_rev - v_cost) / v_rev)::numeric(6,4);
  end if;

  v_base := public.commission_rate_for_margin(v_margin);

  -- regras por tenant (bônus SLA / bônus ganho) — fallback nos defaults
  select * into v_rule from public.commission_rules where tenant_id = v_tenant;
  if not found then
    v_rule.sla_bonus_rate := 0.005;
    v_rule.won_bonus_rate := 0.005;
  end if;

  if v_base > 0 and v_sla > now() then
    v_sla_b := coalesce(v_rule.sla_bonus_rate, 0.005);
  end if;
  if v_base > 0 and v_status = 'ganho' then
    v_won_b := coalesce(v_rule.won_bonus_rate, 0.005);
  end if;

  v_eff := v_base + v_sla_b + v_won_b;
  v_total := round(v_rev * v_eff, 2);

  update public.quotes set
    estimated_revenue      = v_rev,
    estimated_cost         = v_cost,
    estimated_margin       = v_margin,
    estimated_commission   = v_total,
    commission_tier        = public.commission_tier_label(v_base),
    commission_computed_at = now()
  where id = _quote_id;

  -- Snapshot em commissions (append-only) apenas quando ganho.
  if v_status = 'ganho' and v_owner is not null then
    insert into public.commissions (
      tenant_id, quote_id, owner_id,
      base_amount, base_rate, sla_bonus, won_bonus, total
    ) values (
      v_tenant, _quote_id, v_owner,
      v_rev, v_base, v_sla_b, v_won_b, v_total
    )
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.recompute_quote_commission(uuid) from public;
grant execute on function public.recompute_quote_commission(uuid) to authenticated;

-- ============= TRIGGERS =============
-- Recompute quando quote_items mudar
create or replace function public.trg_quote_items_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_quote_commission(coalesce(new.quote_id, old.quote_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists quote_items_recompute on public.quote_items;
create trigger quote_items_recompute
  after insert or update or delete on public.quote_items
  for each row execute function public.trg_quote_items_recompute();

-- Recompute quando status/sla_deadline mudarem em quotes
create or replace function public.trg_quotes_recompute()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT'
     or new.status is distinct from old.status
     or new.sla_deadline is distinct from old.sla_deadline then
    perform public.recompute_quote_commission(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists quotes_recompute on public.quotes;
create trigger quotes_recompute
  after insert or update on public.quotes
  for each row execute function public.trg_quotes_recompute();

-- ============= RLS HARDENING PARA commissions =============
-- Só o próprio owner OU gestor/admin do tenant enxerga.
drop policy if exists "commissions: leitura tenant" on public.commissions;
create policy "commissions: leitura owner ou gestor" on public.commissions
  for select to authenticated
  using (
    public.is_tenant_member(tenant_id)
    and (
      owner_id = auth.uid()
      or public.has_role(auth.uid(), tenant_id, 'gestor')
      or public.has_role(auth.uid(), tenant_id, 'admin')
    )
  );
-- Sem policy de INSERT/UPDATE/DELETE para authenticated → escrita só via
-- SECURITY DEFINER (trigger). service_role continua com GRANT ALL.
