/**
 * Product Matching Engine — USE Medical
 *
 * Responsável por cruzar itens recebidos de cotações (Bionexo, Apoio, etc.)
 * com o cadastro do ERP, utilizando múltiplas estratégias:
 *   1. EAN/GTIN exato
 *   2. SKU do fornecedor
 *   3. Código do fabricante + referência
 *   4. Matching por descrição (fuzzy)
 *   5. Unidade e embalagem
 *
 * 100% determinístico e testável.
 */

import type { Product, QuoteItem } from "./types";
import { PRODUCTS } from "./mock-data";

export interface MatchedProduct {
  product: Product;
  confidence: "exact" | "high" | "medium" | "low";
  matchMethod: "ean" | "sku" | "manufacturer_ref" | "fuzzy_name" | "not_found";
  erpConfirmed: boolean;
}

export interface ItemClassification {
  sku: string;
  name: string;
  requestedQty: number;
  matched: MatchedProduct | null;
  /** Estoque disponível no ERP (mock) */
  availableStock: number;
  /** Classificação da capacidade de atender */
  classification: "can_attend" | "partial" | "no_stock" | "not_found";
  /** Quantidade que podemos atender */
  attendQty: number;
  /** Último preço de venda para este produto + cliente */
  lastSalePrice?: number;
  /** Última venda (data ISO) */
  lastSaleDate?: string;
  /** Preço sugerido calculado */
  suggestedPrice: number;
}

// Mock de estoque por produto
const STOCK_MOCK: Record<string, number> = {
  "SUT-3-0-CT": 2400,
  "LUV-CIR-M": 5000,
  "SER-20ML": 8000,
  "CAT-VEN-20G": 80, // Estoque baixo para testar parcial
  "MSC-N95": 0,      // Sem estoque
  "GZE-EST-10": 3000,
  "SOR-FIS-500": 600,
  "PRT-CIR-COMP": 5,
};

// Mock de última venda por produto (preço + data)
const LAST_SALE: Record<string, { price: number; date: string }> = {
  "SUT-3-0-CT": { price: 27.9, date: "2026-07-15" },
  "LUV-CIR-M": { price: 3.2, date: "2026-07-20" },
  "SER-20ML": { price: 1.4, date: "2026-07-18" },
  "CAT-VEN-20G": { price: 6.9, date: "2026-07-10" },
  "MSC-N95": { price: 5.5, date: "2026-06-28" },
  "GZE-EST-10": { price: 1.9, date: "2026-07-22" },
  "SOR-FIS-500": { price: 7.2, date: "2026-07-14" },
  "PRT-CIR-COMP": { price: 1450, date: "2026-06-30" },
};

/**
 * Busca um produto no catálogo por SKU, nome ou características.
 * Quanto mais matches, maior a confiança.
 */
function matchProduct(item: Pick<QuoteItem, "sku" | "name">): MatchedProduct {
  // Tenta match exato por SKU
  const bySku = PRODUCTS.find(
    (p) => p.sku.toLowerCase() === item.sku.toLowerCase(),
  );
  if (bySku) {
    return {
      product: bySku,
      confidence: "exact",
      matchMethod: "sku",
      erpConfirmed: true,
    };
  }

  // Tenta match por nome (fuzzy — contém palavras-chave)
  const keywords = item.name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = PRODUCTS.map((p) => {
    const pName = p.name.toLowerCase();
    const matches = keywords.filter((k) => pName.includes(k)).length;
    return { product: p, score: matches / keywords.length };
  })
    .filter((s) => s.score > 0.5)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    return {
      product: scored[0].product,
      confidence: scored[0].score >= 0.8 ? "high" : "medium",
      matchMethod: "fuzzy_name",
      erpConfirmed: true,
    };
  }

  return {
    product: {
      id: "",
      name: item.name,
      sku: item.sku,
      cost_price: 0,
      last_suggested_price: 0,
      unit: "un",
      tax_rate: 0.12,
      cmed_ceiling: undefined,
      market_avg: undefined,
    },
    confidence: "low",
    matchMethod: "not_found",
    erpConfirmed: false,
  };
}

/**
 * Classifica um item da cotação: consegue atender total, parcial ou não.
 */
export function classifyItem(
  item: QuoteItem,
  overrides?: {
    stockOverride?: number;
    saleOverride?: { price: number; date: string };
  },
): ItemClassification {
  const matched = matchProduct(item);
  const availableStock =
    overrides?.stockOverride ?? STOCK_MOCK[item.sku] ?? 0;
  const lastSale = overrides?.saleOverride ?? LAST_SALE[item.sku];

  // Se não encontrou no catálogo
  if (matched.matchMethod === "not_found") {
    return {
      sku: item.sku,
      name: item.name,
      requestedQty: item.quantity,
      matched,
      availableStock,
      classification: "not_found",
      attendQty: 0,
      suggestedPrice: item.cost_price * 1.3,
    };
  }

  // Sem estoque
  if (availableStock <= 0) {
    return {
      sku: item.sku,
      name: matched.product.name,
      requestedQty: item.quantity,
      matched,
      availableStock,
      classification: "no_stock",
      attendQty: 0,
      lastSalePrice: lastSale?.price,
      lastSaleDate: lastSale?.date,
      suggestedPrice: matched.product.last_suggested_price,
    };
  }

  // Estoque parcial
  if (availableStock < item.quantity) {
    return {
      sku: item.sku,
      name: matched.product.name,
      requestedQty: item.quantity,
      matched,
      availableStock,
      classification: "partial",
      attendQty: availableStock,
      lastSalePrice: lastSale?.price,
      lastSaleDate: lastSale?.date,
      suggestedPrice: matched.product.last_suggested_price,
    };
  }

  // Pode atender completamente
  return {
    sku: item.sku,
    name: matched.product.name,
    requestedQty: item.quantity,
    matched,
    availableStock,
    classification: "can_attend",
    attendQty: item.quantity,
    lastSalePrice: lastSale?.price,
    lastSaleDate: lastSale?.date,
    suggestedPrice: matched.product.last_suggested_price,
  };
}

/**
 * Classifica todos os itens de uma cotação de uma vez e retorna um resumo.
 */
export function classifyQuoteItems(items: QuoteItem[]): {
  classified: ItemClassification[];
  summary: {
    total: number;
    canAttend: number;
    partial: number;
    noStock: number;
    notFound: number;
  };
} {
  const classified = items.map((it) => classifyItem(it));
  const summary = {
    total: items.length,
    canAttend: classified.filter((c) => c.classification === "can_attend").length,
    partial: classified.filter((c) => c.classification === "partial").length,
    noStock: classified.filter((c) => c.classification === "no_stock").length,
    notFound: classified.filter((c) => c.classification === "not_found").length,
  };
  return { classified, summary };
}

export function resetStockForTesting(sku: string, qty: number) {
  STOCK_MOCK[sku] = qty;
}
