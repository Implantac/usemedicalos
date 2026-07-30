/**
 * Product History Engine — USE Medical
 *
 * Recupera o histórico comercial de um produto para um determinado cliente:
 *   - Última venda (preço, data, quantidade)
 *   - Últimas N vendas (tendência)
 *   - Histórico de cotações (recebidas, respondidas, ganhas, perdidas)
 *   - Melhor preço vencedor conhecido
 *   - Melhor margem obtida
 *   - Inteligência de produto (tendência de preço, taxa de vitória, etc.)
 */

import type { Quote, QuoteItem } from "./types";
import { itemMargin } from "./pricing";

export interface SaleRecord {
  date: string;
  price: number;
  quantity: number;
  customerName: string;
  quoteId: string;
}

export interface QuoteHistory {
  received: number;
  responded: number;
  won: number;
  lost: number;
}

export interface ProductIntelligence {
  /** Tendência de preço nos últimos 60 dias (positivo = subindo) */
  priceTrend: number;
  /** Taxa de vitória para este produto */
  winRate: number;
  /** Margem média obtida */
  avgMargin: number;
  /** Melhor preço vencedor conhecido */
  bestWonPrice: number;
  /** Melhor margem obtida */
  bestMargin: number;
  /** Recomendação de preço para esta cotação */
  recommendationPrice: number;
  /** Probabilidade estimada de vitória */
  estimatedWinProbability: number;
}

export interface ProductHistory {
  sku: string;
  productName: string;
  lastSale?: SaleRecord;
  recentSales: SaleRecord[];
  quoteHistory: QuoteHistory;
  intelligence: ProductIntelligence;
}

/**
 * Monta o histórico completo de um produto a partir de todas as cotações.
 */
export function buildProductHistory(
  sku: string,
  productName: string,
  allQuotes: Quote[],
): ProductHistory {
  // Todas as ocorrências deste produto em cotações
  const occurrences = allQuotes.flatMap((q) =>
    q.items
      .filter((it) => it.sku === sku)
      .map((it) => ({ item: it, quote: q })),
  );

  // Vendas (cotações ganhas)
  const sales: SaleRecord[] = occurrences
    .filter((o) => o.quote.status === "ganho")
    .map((o) => ({
      date: o.quote.received_at,
      price: o.item.unit_price,
      quantity: o.item.quantity,
      customerName: o.quote.customer_name,
      quoteId: o.quote.id,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Últimas 5 vendas
  const recentSales = sales.slice(0, 5);

  // Histórico de cotações
  const received = occurrences.length;
  const responded = occurrences.filter(
    (o) =>
      o.quote.status !== "pending_review" &&
      o.quote.status !== "aguardando_precificacao",
  ).length;
  const won = occurrences.filter((o) => o.quote.status === "ganho").length;
  const lost = occurrences.filter((o) => o.quote.status === "perdido").length;

  // Inteligência
  const wonItems = occurrences
    .filter((o) => o.quote.status === "ganho")
    .map((o) => o.item);
  const avgMargin =
    wonItems.length > 0
      ? wonItems.reduce((s, it) => s + itemMargin(it), 0) / wonItems.length
      : 0;
  const bestMargin = wonItems.length > 0
    ? Math.max(...wonItems.map((it) => itemMargin(it)))
    : 0;
  const bestWonPrice = wonItems.length > 0
    ? Math.max(...wonItems.map((it) => it.unit_price))
    : 0;

  // Tendência: compara últimos 3 preços com os 3 anteriores
  let priceTrend = 0;
  if (sales.length >= 4) {
    const recent = sales.slice(0, 3);
    const older = sales.slice(3, 6);
    if (older.length > 0) {
      const recentAvg = recent.reduce((s, r) => s + r.price, 0) / recent.length;
      const olderAvg = older.reduce((s, r) => s + r.price, 0) / older.length;
      priceTrend = olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
    }
  }

  const winRate = responded > 0 ? won / responded : 0;

  // Recomendação: preço médio das últimas 3 vendas, com ajuste
  const lastPrices = recentSales.slice(0, 3).map((s) => s.price);
  const avgLastPrice =
    lastPrices.length > 0
      ? lastPrices.reduce((a, b) => a + b, 0) / lastPrices.length
      : 0;

  // Probabilidade estimada (simplificada)
  const estimatedWinProbability = winRate * 0.6 + (1 - priceTrend) * 0.2 + 0.2;

  return {
    sku,
    productName,
    lastSale: sales[0],
    recentSales,
    quoteHistory: { received, responded, won, lost },
    intelligence: {
      priceTrend,
      winRate,
      avgMargin,
      bestWonPrice,
      bestMargin,
      recommendationPrice: avgLastPrice || bestWonPrice,
      estimatedWinProbability: Math.min(estimatedWinProbability, 0.95),
    },
  };
}
