# Fase 2 — Vantagem Competitiva

## Data Flywheel (Benchmarking)
- Tabela `market_benchmarks` (region, segment, avg_margin, sample_size, period).
- Job noturno anonimiza cotações fechadas (`ganho`) e agrega por região/segmento.
- Rota `/inteligencia` compara margem do tenant vs média regional.

## Regulated AI
- `regulated-ai.ts` define contrato do prompt (input: quote + compliance report + histórico ANVISA/CMED).
- Chamada real via Lovable AI Gateway (`google/gemini-2.5-flash`) só quando Cloud ativo.
- Response deve incluir: preço sugerido, justificativa regulatória, riscos.

## Métricas de sucesso
- % de cotações com IA aplicada.
- Delta de margem vs benchmark regional.
- Cancelamento anualizado (< 3% target).
