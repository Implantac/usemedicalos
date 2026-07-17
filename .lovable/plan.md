
# USE Medical — Roadmap Power-Up

Vou executar **Fase 1 completa** agora (código real, sem Cloud — mantendo padrão localStorage + schema SQL pronto para migração) e deixar **Fases 2 e 3** como scaffolds/documentação para não gerar scope creep. Cloud continua bloqueado por créditos; assim que liberar, migro tudo (RLS multi-tenant já modelado em `docs/supabase-schema.md`).

---

## Fase 1 — MVP "Adoção Acelerada" (executo agora)

### 1.1 Gamificação Financeira — Comissão em tempo real
- **Tipos** `Commission`, `CommissionRule`, `SalesGoal` em `src/lib/medical/types.ts`
- **Motor** `src/lib/medical/commission.ts`:
  - Regras por faixa de margem (ex.: <12% = 0%, 12-20% = 2%, 20-30% = 3.5%, >30% = 5%)
  - Bônus por SLA cumprido (+0.5%)
  - `computeCommission(quote, rule)` puro + testado
- **UI**:
  - `CommissionBadge` no `QuoteDrawer` — atualiza ao editar preço/quantidade
  - Novo card no dashboard do vendedor (`vendedor.$ownerId.tsx`): comissão MTD, meta diária, barra de progresso, streak
  - `DailyGoalRing` (SVG) no header quando logado como vendedor
- **Testes**: `commission.test.ts` cobrindo faixas, bônus e edge cases

### 1.2 Compliance ANVISA/CMED
- **Tipos** `ComplianceCheck`, `ComplianceStatus` (`ok` | `warning` | `blocked`)
- **Motor** `src/lib/medical/compliance.ts`:
  - Validação de registro ANVISA (regex + validade fake por SKU)
  - Teto CMED (PMC) — se `unit_price > pmc_max` → `blocked` com motivo
  - Restrição por classe terapêutica em cliente-alvo
- **Mock dataset** `src/lib/medical/compliance-data.ts` com dados regulatórios por SKU
- **UI**:
  - `ComplianceAlert` (verde/amarelo/vermelho) no topo do `QuoteDrawer`
  - Ícone de status em cada item da cotação
  - Bloqueio de "Gerar Proposta" quando `blocked` (com override do gestor + log)
- **IA de Preço atualizada**: `pricing.ts` passa a considerar teto CMED como upper bound
- **Testes**: `compliance.test.ts`

### 1.3 Schema SQL Atualizado
Atualizar `docs/supabase-schema.md` com:
- `commissions` (id, tenant_id, quote_id, owner_id, base_amount, rate, bonus, total, computed_at)
- `commission_rules` (tenant_id, tier_json, bonus_rules)
- `sales_goals` (owner_id, period, target_amount, target_count)
- `regulatory_compliance` (id, tenant_id, product_id, anvisa_code, cmed_pmc, status, checked_at, blocked_reason)
- `market_benchmarks` (region, segment, avg_margin, sample_size, period) — vazio, pronto p/ Fase 2

Todos com RLS por `tenant_id` e GRANTs corretos.

---

## Fase 2 — "Vantagem Competitiva" (scaffolds hoje, ativação depois)

- Rota `/inteligencia` com placeholder do Benchmarking (usa `market_benchmarks` mock agregado)
- Stub `src/lib/medical/regulated-ai.ts` (interface do prompt regulatório) — sem chamada real de IA agora
- Documento `docs/roadmap/fase-2.md`

## Fase 3 — "Ecossistema" (documentação hoje)

- `docs/roadmap/fase-3.md` — Sandbox de integração JSON mapping, contratos API pública, Bionexo
- Contratos TypeScript em `src/lib/medical/ecosystem-types.ts`

---

## Design System
Ajuste em `src/styles.css`: introduzir `--commission` (verde âmbar) e `--compliance-warning` (amarelo) mantendo navy + cobre da logo. Nada de refactor visual amplo.

## Fora de escopo agora
- Ativação Cloud (bloqueada — mantenho stubs prontos)
- Portal Sandbox funcional (Fase 3 — só docs)
- BI real (Fase 2 — só placeholder)
- Ecosystem API (Fase 3 — só contratos)

## Entregáveis Fase 1
1. Motor de comissão + UI gamificada + testes
2. Motor de compliance + alertas + bloqueio + testes
3. Schema SQL atualizado
4. Scaffolds Fase 2/3 + docs

Após aprovação, executo tudo em paralelo (arquivos independentes) e rodo vitest para validar.
