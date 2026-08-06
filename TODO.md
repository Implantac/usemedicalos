# Plano de Melhorias — USE Medical

## Implementado

### 1. Ecossistema na Interface (Fase 3 — UI)
- [x] PartnerTag em badges.tsx / quote-inbox / quote-drawer / tender-board
- [x] Fallback dev HMAC
- [x] Simulador de Ecossistema (simulator.ts) + card em integracoes.tsx
- [x] Testes: 127/127 passando, tsc limpo, build ok

### 2. Cadastro Rápido de Produto Inline (Melhoria #3)
- [x] product-catalog.ts, quick-product-dialog.tsx, activity.ts (product_quick_created)
- [x] quote-drawer.tsx, quote-timeline.tsx, auditoria.tsx
- [x] Testes: 127/127 passando

### 3. Painel do vendedor (gamificação) — Melhoria #5
- [x] achievements.ts, achievements.test.ts, analytics.ts (performanceTrend)
- [x] use-owner-goals.ts, achievement-badge.tsx, performance-chart.tsx
- [x] vendedor.$ownerId.tsx integrado
- [x] Testes: 133/133 passando

### 4. Versionamento de cotação pré-envio — Melhoria #4
- [x] snapshot.ts, snapshot.test.ts, version-diff.tsx
- [x] quote-drawer.tsx, quote-timeline.tsx, auditoria.tsx
- [x] Testes: 138/138 passando

### 5. Bridge ERP offline via CSV — Melhoria #6
- [x] csv-bridge.ts (import/export, parse, templates Protheus/Sankhya/Use/Genérico)
- [x] csv-bridge.test.ts (10 testes) + parser numérico melhorado (BR + decimal)
- [x] activity.ts tipo `csv_imported`
- [x] csv-import-dialog.tsx (dialog de importação/exportação)
- [x] Seção "Bridge ERP (CSV)" em integracoes.tsx + `handleCsvImport`
- [x] Label `csv_imported` em auditoria.tsx
- [x] Ícone `csv_imported` em quote-timeline.tsx
- [x] Testes: 148/148 passando, tsc limpo, eslint 0 erros

### 6. Notificações SLA reais (Push + WhatsApp) — Melhoria #1
- [x] push-notifications.ts (novo): Push API subscription + alerta sonoro (oscilador Web Audio)
- [x] use-sla-notifications.tsx: integrar Push API subscription + som
- [x] Notificação por som quando SLA crítico (`playAlertSound`)
- [x] Badge de contagem de cotações em risco no favicon/title (`use-sla-title-badge.ts`)
- [x] sla-alert-bell.tsx: toggle de som + badge de contagem
- [ ] Disparo server-side agendado (documentar — requer Lovable Cloud + web-push)

### 7. Retorno do ERP (fechar o ciclo do CSV) — Melhoria #7
- [x] csv-bridge.ts: `parseCsvReturn()` (SKU → custo, estoque, status) + `applyReturnToQuote()`
- [x] csv-bridge.test.ts: testes unitários para `parseCsvReturn` e `applyReturnToQuote` (17 testes)
- [x] csv-import-dialog.tsx: nova aba "Retorno do ERP" (upload de CSV de retorno + aplicação na cotação)
- [x] integracoes.tsx: `handleCsvApplyReturn` + `onApplyReturn` conectado ao dialog
- [x] Testes: 155/155 passando, tsc 0 erros

### 8. Sincronização multi-usuário (Supabase) — Melhoria #2
- [ ] src/lib/medical/repo/supabase.ts (implementação real)
- [ ] src/hooks/use-repo.tsx (context provider)
- [ ] Documentar server functions + seed
- [ ] Migração gradual dos hooks (pós-estrutura)

### 9. Roadmap Fase 2 — Data Flywheel + Regulated AI
- [ ] Data Flywheel / Benchmarking
- [ ] Regulated AI
