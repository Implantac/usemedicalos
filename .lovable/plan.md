# Plano — 4 frentes solicitadas

Antes de codar, quero alinhar escopo e ordem — são 4 frentes grandes e algumas já têm base implementada no projeto. Vou marcar o que **já existe**, o que é **refinamento** e o que é **novo**.

---

## 1. Carga Cognitiva — Inbox "3 colunas + expandir"

Estado atual: `QuoteInbox` mostra ~7 colunas (cliente, segmento, SLA, prioridade, margem, itens, origem, ações) em linhas densas (`py-1.5`).

**Refatoração proposta (só frontend):**
- Modo padrão "Foco": 3 colunas — **Cliente**, **Prazo SLA** (cronômetro colorido), **Margem calculada** (pill verde/amarelo/vermelho).
- Chevron por linha → expande inline uma faixa com segmento, prioridade, itens, origem, ações rápidas (avançar status, abrir drawer completo).
- Toggle no topo: **Foco (3 col)** ↔ **Detalhada (tudo)** — persistido em `localStorage`.
- Prioridade/alerta reforçados por cor da barra lateral esquerda (já existe, vou intensificar em urgente/atrasado).
- Filtro rápido "Somente pendentes urgentes" no topo (aproveita o sino de SLA existente).
- Notificações já cobertas por `use-sla-notifications` + `SlaAlertBell` — só amarro o CTA "ativar alertas" quando `Notification.permission === 'default'`.

Fora do escopo agora: refazer o sistema de filtros salvos (já existe em `use-inbox-views`).

## 2. Precificação Inteligente — regra + alerta de margem negativa

Estado atual: `suggestPrice()` em `pricing.ts` já faz markup ponderado (target 28% + histórico + ajuste de volume) e `isMarginOk` usa `MIN_MARGIN = 12%`. Compliance CMED já limita teto.

**Refinamento (não substituir a IA existente, adicionar guarda):**
- Nova função `basePrice(cost) = cost * 1.25` como **piso comercial** exposto ao lado da sugestão da IA no `QuoteDrawer`.
- Validação por item:
  - `unit_price < cost_price` → campo em vermelho + banner "Margem negativa: ajuste necessário" (bloqueia "Gerar Proposta", igual ao gate de compliance).
  - `unit_price < basePrice` → aviso amarelo "Abaixo do piso de 25%".
- Regras por tipo de produto (serviço vs físico): campo `product.unit` já existe; adiciono `product.pricing_profile` (`fisico` default | `servico`) com targets diferentes (28% físico, 40% serviço).
- Revisão/aprovação e ML ficam **fora deste sprint** — anoto no roadmap; ML precisa de volume de dados que ainda não temos.

## 3. Multi-tenant + RLS

Estado atual: schema completo em `docs/supabase-schema.md` já contempla `tenant_id` em todas as tabelas, `is_tenant_member()` SECURITY DEFINER, `user_roles` separado, políticas RLS por tenant, GRANTs explícitos. Está **pronto para aplicar** assim que Lovable Cloud for ativado.

**Ação neste sprint:**
- **Não** ativar Cloud automaticamente (você decide quando — consome créditos).
- Revisar o schema documentado, adicionar o que faltou nas Fases 2/3 recentes (api_keys, compliance_overrides, erp_mappings) para ficar 100% pronto.
- Adicionar checklist de migração em `docs/supabase-schema.md`: backup, ordem de aplicação, seed inicial de tenant/membership.

Quando você mandar "ativar Cloud", eu chamo `supabase--enable`, rodo o SQL via migration tool e migro os hooks `useQuotes`/`useProducts` para server functions com `requireSupabaseAuth`.

## 4. Conectores ERP — página de configuração

Estado atual: já existe `/integracoes` com sandbox de mapping ERP (`erp-mapping.ts` + `use-erp-mappings`) e webhook HMAC. Falta a **camada de seleção de provedor**.

**Adição:**
- Nova aba em `/integracoes` chamada "Conectores": grid de cards com TOTVS Protheus (renomeado Use Sistemas conforme sua regra anterior), Sankhya, Senior, "Custom (webhook genérico)".
- Cada card abre um wizard de 3 passos: **Selecionar ERP → Credenciais (mock, salvo em `api_keys`) → Mapeamento de campos (reusa o sandbox existente)**.
- Registry `src/lib/medical/erp-connectors.ts` com metadata de cada provedor (nome, campos de auth, endpoint base, docs URL). Fácil plugar novos.
- Adaptador comum `ErpAdapter` interface — implementação real fica para quando Cloud subir; por ora, tudo é mock que grava em localStorage.

---

## Ordem de execução sugerida

Posso fazer tudo em sequência num único sprint, mas recomendo esta ordem:

1. **Inbox foco/detalhada** (impacto imediato de UX, baixo risco)
2. **Precificação com alertas** (evita prejuízo, alta prioridade de negócio)
3. **Registry ERP + wizard** (destrava roadmap comercial)
4. **Revisão do schema** (só docs, sem código de runtime)

Confirma que posso tocar tudo, ou prefere que eu comece só pelas frentes 1 e 2?
