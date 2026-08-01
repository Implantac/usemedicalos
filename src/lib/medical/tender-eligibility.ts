/**
 * Tender Eligibility Engine — USE Medical
 *
 * Transforma a Central de Cotações em um painel de licitações:
 * para cada cotação disponível, avaliamos se o usuário CONSEGUE participar
 * (há pelo menos um item atendível) e quanto da receita/margem é alcançável.
 *
 * A decisão final de participar ou não é sempre do usuário — este motor apenas
 * expõe a elegibilidade técnica (produto cadastrado, estoque e margem).
 */

import type { Quote, QuoteItem } from "./types";
import { classifyItem, classifyQuoteItems, type ItemClassification } from "./product-matching";
import { itemMargin, itemTotal } from "./pricing";

export interface TenderItemEligibility {
  index: number;
  item: QuoteItem;
  classification: ItemClassification;
  /** Item que podemos faturar integralmente */
  canAttend: boolean;
  /** Item com estoque parcial (podemos faturar só parte) */
  canPartiallyAttend: boolean;
  /** Item sem estoque no ERP */
  noStock: boolean;
  /** Item que não existe no catálogo (não trabalhamos com ele) */
  notFound: boolean;
  margin: number;
  revenue: number;
}

export interface TenderEligibility {
  quote: Quote;
  /** Se há ao menos um item atendível (total ou parcial) → dá para participar */
  canParticipate: boolean;
  /** Todos os itens da cotação são atendíveis integralmente */
  fullyAttendable: boolean;
  /** Itens que conseguimos atender */
  attendableItems: TenderItemEligibility[];
  /** Itens que NÃO conseguimos atender (sem estoque / não localizado) */
  nonAttendableItems: TenderItemEligibility[];
  /** Número de itens atendíveis */
  attendableCount: number;
  /** Total de itens da cotação */
  totalItems: number;
  /** Receita potencial dos itens atendíveis (a que podemos capturar) */
  attendableRevenue: number;
  /** Receita total da cotação */
  totalRevenue: number;
  /** Margem média ponderada dos itens atendíveis */
  attendableMargin: number;
  /** Resumo por classificação (atender / parcial / sem estoque / não localizado) */
  summary: { canAttend: number; partial: number; noStock: number; notFound: number };
}

/**
 * Avalia a elegibilidade de participação em uma cotação (licitação).
 */
export function evaluateTenderEligibility(quote: Quote): TenderEligibility {
  const classified = classifyQuoteItems(quote.items);

  const detailed: TenderItemEligibility[] = quote.items.map((item, index) => {
    const classification = classified.classified[index] ?? classifyItem(item);
    const canAttend = classification.classification === "can_attend";
    const canPartiallyAttend = classification.classification === "partial";
    const noStock = classification.classification === "no_stock";
    const notFound = classification.classification === "not_found";
    return {
      index,
      item,
      classification,
      canAttend,
      canPartiallyAttend,
      noStock,
      notFound,
      margin: itemMargin(item),
      revenue: itemTotal(item),
    };
  });

  const attendableItems = detailed.filter((d) => d.canAttend || d.canPartiallyAttend);
  const nonAttendableItems = detailed.filter((d) => !d.canAttend && !d.canPartiallyAttend);

  const attendableRevenue = attendableItems.reduce((s, d) => s + d.revenue, 0);
  const totalRevenue = detailed.reduce((s, d) => s + d.revenue, 0);
  const attendableMargin =
    attendableItems.length > 0
      ? attendableItems.reduce((s, d) => s + d.margin, 0) / attendableItems.length
      : 0;

  const summary = classified.summary;

  return {
    quote,
    canParticipate: attendableItems.length > 0,
    // Só é "100% atendível" se há pelo menos 1 item E todos são atendíveis.
    // Cotação sem itens → não é atendível integralmente.
    fullyAttendable: attendableItems.length > 0 && attendableItems.length === quote.items.length,
    attendableItems,
    nonAttendableItems,
    attendableCount: attendableItems.length,
    totalItems: quote.items.length,
    attendableRevenue,
    totalRevenue,
    attendableMargin,
    summary,
  };
}

/**
 * Avalia uma lista de cotações de uma vez, preservando a ordem de chegada.
 */
export function evaluateTenderEligibilityForQuotes(quotes: Quote[]): TenderEligibility[] {
  return quotes.map((q) => evaluateTenderEligibility(q));
}

/**
 * Filtra apenas as cotações em que o usuário PODE participar (≥1 item atendível).
 */
export function onlyParticipable(quotes: Quote[]): Quote[] {
  return quotes.filter((q) => evaluateTenderEligibility(q).canParticipate);
}
