# Plano de Implementação — USE Medical Motor Operacional

## Fase 1: Tela Operacional de Cotação (Core)
- [ ] **1.1** Criar `src/routes/cotacao.$quoteId.tsx` — Rota dedicada para a tela operacional full-screen
- [ ] **1.2** Criar `src/components/medical/quote-operational-workspace.tsx` — Componente principal da tela de cotação
- [ ] **1.3** Criar `src/components/medical/quote-item-table.tsx` — Tabela de itens com classificação automática
- [ ] **1.4** Criar `src/components/medical/product-history-panel.tsx` — Histórico do produto ao clicar
- [ ] **1.5** Criar `src/components/medical/price-slider.tsx` — Slider de preço com impacto na margem
- [ ] **1.6** Criar `src/components/medical/quote-summary-bar.tsx` — Barra de resumo (itens atendidos, valor, margem)
- [ ] **1.7** Atualizar `src/routeTree.gen.ts` — Registrar nova rota

## Fase 2: Classificação Inteligente de Itens
- [ ] **2.1** Criar `src/lib/medical/product-matching.ts` — Motor de matching produto vs ERP
- [ ] **2.2** Criar `src/lib/medical/item-classifier.ts` — Classificador: atende, parcial, sem estoque, não localizado
- [ ] **2.3** Atualizar `src/lib/medical/mock-data.ts` — Adicionar dados mock de estoque, ERP, histórico

## Fase 3: Motor de Precificação Configurável
- [ ] **3.1** Criar `src/lib/medical/pricing-rules.ts` — Regras de precificação (margem min, alvo, desconto max)
- [ ] **3.2** Atualizar `src/lib/medical/pricing-engine.ts` — Integrar regras configuráveis
- [ ] **3.3** Criar `src/components/medical/pricing-config-panel.tsx` — Painel de configuração de preço

## Fase 4: Envio e Acompanhamento
- [ ] **4.1** Criar `src/lib/medical/response-builder.ts` — Montagem da proposta para envio
- [ ] **4.2** Criar `src/components/medical/send-proposal-dialog.tsx` — Diálogo de confirmação de envio
- [ ] **4.3** Criar `src/components/medical/order-status-tracker.tsx` — Acompanhamento pós-venda

## Fase 5: Resultado e Aprendizado
- [ ] **5.1** Criar `src/components/medical/win-loss-reason.tsx` — Coleta de motivo de perda/ganho
- [ ] **5.2** Atualizar `src/lib/medical/analytics.ts` — Alimentar aprendizado da IA

## Fase 6: Modo Produção
- [ ] **6.1** Criar `src/components/medical/production-mode.tsx` — Modo "Próxima" para linha de produção
- [ ] **6.2** Criar `src/hooks/use-production-queue.ts` — Hook para fila de produção

## Fase 7: Automação
- [ ] **7.1** Criar `src/lib/medical/auto-responder.ts` — Regras para resposta automática
- [ ] **7.2** Criar `src/components/medical/auto-responder-config.tsx` — Configuração de automação
