# Melhorias Funcionais e Operacionais — Roda de Melhorias 2

## Contexto
Baseado no feedback, implementar as melhorias sugeridas. Prioridade por impacto e viabilidade no arquivo atual (client-side + PWA + estrutura cloud já preparada).

## Itens a implementar (implementáveis no ambiente atual)

### A. Motivo da perda no ciclo da cotação ✅ lógica
- [x] `types.ts`: adicionar `loss_reason` em Quote (opcional)
- [x] `activity.ts`: tipo `quote_lost` com meta reason
- [x] `quote-timeline.tsx` + `auditoria.tsx`: label/ícone `quote_lost`
- [x] `quote-drawer.tsx`: ao marcar como perdida, capturar motivo (preço, prazo, estoque, concorrente, outro)

### B. Autopreenchimento de itens repetidos (histórico por cliente) ✅ lógica
- [x] `lib/medical/quote-history.ts`: sugerir itens/quantidades/preços da última cotação do mesmo cliente
- [x] `src/lib/medical/quote-history.test.ts`: 6 testes unitários
- [x] `quote-drawer.tsx`: botão "Reusar última cotação" quando aplicável

### C. Métricas de conversão por fonte ✅ lógica
- [x] `analytics.ts`: `sourceConversion()` — taxa de resposta, prazo médio, taxa de vitória por fonte
- [x] dashboard.tsx: card "Conversão por fonte"

### D. Dashboard "margem deixada na mesa" ✅ lógica
- [x] `analytics.ts`: `marginLeftOnTable()` — diff entre preço sugerido pela IA e preço fechado
- [x] dashboard.tsx: card "Margem deixada na mesa"
- [x] executivo.tsx: métrica "Margem deixada na mesa" no card "Saúde operacional"

### E. Leaderboard de equipe (tenant) ✅ lógica
- [x] `analytics.ts`: `teamLeaderboard()` agregando owners por tenant
- [x] dashboard.tsx: ranking por equipe (leaderboard de equipe)

### F. Automação por regras (nível automático) ✅ lógica
- [x] `lib/medical/auto-rules.ts`: motor de regras "se cliente Tier X e margem ≥ Y → responder automaticamente" (com suporte `marginOperator` gte/lt)
- [x] `src/lib/medical/auto-rules.test.ts`: 7 testes unitários
- [ ] integração no pipeline de resposta — PENDENTE (UI)

## Verificação (lote de lógica + UI)
- [x] `tsc --noEmit` 0 erros
- [x] `vitest run` — todos os novos testes passando (quote-history 6, auto-rules 7, analytics-novas 4 = 17 novos)
- [ ] `eslint` 0 erros
- [x] docs TODO.md / PLANO-MELHORIAS.md atualizadas
- [ ] commit do lote de lógica + UI

## Integração pendente (próximo lote)
- `quote-drawer.tsx`: selo de regras automáticas já exibido; aplicar `evaluateAutoRules` / `shouldAutoRespond` no pipeline de resposta automática (auto-resposta real)
- `executivo.tsx`: card "Margem deixada na mesa" (já no dashboard)

