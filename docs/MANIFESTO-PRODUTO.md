# Manifesto da USE Medical — Motor Operacional de Cotação

## Filosofia

> "Eu recebi 500 itens em 20 cotações. Quero descobrir rapidamente o que consigo vender, quanto devo cobrar, responder e acompanhar o resultado sem sair da USE Medical."

**USE Medical não é um dashboard.** É um sistema operacional comercial para distribuidores hospitalares.

## A Espinha Dorsal

```
FONTES (Bionexo, Apoio, Portais, E-mail, APIs, EDI, Excel, Outros)
    ↓
INGESTÃO / CAPTURA
    ↓
NORMALIZAÇÃO
    ↓
IDENTIFICAÇÃO DOS PRODUTOS
    ↓
CRUZAMENTO COM ERP
    ↓
CENTRAL DE COTAÇÕES (Fila Inteligente)
    ↓
VENDEDOR SELECIONA O QUE PODE ATENDER
    ↓
HISTÓRICO + ESTOQUE + CUSTO + PREÇO + MARGEM
    ↓
PREÇO SUGERIDO
    ↓
VENDEDOR APROVA / ALTERA
    ↓
ENVIO À ORIGEM
    ↓
AGUARDA RESULTADO
    ↓
GANHOU?
    ├── NÃO → Histórico / motivo da perda
    └── SIM  → PEDIDO → ERP → FATURAMENTO → EXPEDIÇÃO → ENTREGA
```

## Os 3 Objetos Fundamentais

| Objeto | Definição |
|--------|-----------|
| **Cotação** | O evento comercial recebido de uma plataforma |
| **Oportunidade** | A interpretação comercial daquela cotação dentro da USE Medical |
| **Pedido** | A consequência de uma oportunidade ganha |

A arquitetura DEVE manter esses objetos separados.

## Arquitetura de Serviços

```
CONNECTOR → QUOTE INGESTION → QUOTE NORMALIZER → PRODUCT MATCHING
→ ERP DATA SERVICE → COMMERCIAL ENGINE → PRICING ENGINE
→ AI ENGINE → RESPONSE ENGINE → CONNECTOR
→ RESULT ENGINE → ORDER ORCHESTRATOR → ERP
```

## A Tela Central: COTAÇÃO OPERACIONAL

Antes de:
- ✅ Portal do Fabricante
- ✅ Marketplace
- ✅ Benchmark
- ✅ Dashboards

Construir a tela que permite:
1. **Receber** → identificar produtos
2. **Selecionar** o que atende
3. **Consultar** histórico + ERP
4. **Sugerir** preço
5. **Ajustar** com feedback visual de margem
6. **Enviar** proposta
7. **Acompanhar** resultado
8. **Gerar** pedido

## Níveis de Automação

| Nível | Descrição |
|-------|-----------|
| **Manual** | Vendedor decide tudo |
| **Assistido** | IA recomenda, vendedor confirma |
| **Automático** | Regras definidas pela empresa permitem resposta automática |

## Filosofia de Valor

- **Gerente** compra: Velocidade operacional
- **Vendedor** quer: Saber rapidamente o que pode vender, por quanto e responder
- **Diretor** quer: Saber quanto está deixando de ganhar e por quê
- **Dono** quer: Mais vendas, mais margem e menos custo comercial
