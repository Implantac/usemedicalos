// Snapshot de cotação pré-envio — versionamento de itens.
// Captura o estado completo dos itens antes de enviar a proposta ao ERP,
// permite comparar visualmente com a versão atual e restaurar os preços
// enviados originalmente. Persistido em localStorage (por cotação).

import type { Quote, QuoteItem } from "./types";

export interface QuoteSnapshot {
  quote_id: string;
  captured_at: string; // ISO
  items: QuoteItem[];
  /** Total de receita no momento do envio (para o diff). */
  revenue: number;
  /** Total de custo no momento do envio. */
  cost: number;
}

const KEY = "use-medical:quote-snapshots:v1";

export function loadSnapshots(): QuoteSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QuoteSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveSnapshots(list: QuoteSnapshot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
}

/** Captura um snapshot do estado atual dos itens de uma cotação. */
export function captureSnapshot(quote: Quote): QuoteSnapshot {
  const items = quote.items.map((it) => ({ ...it }));
  const revenue = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const cost = items.reduce((s, it) => s + it.quantity * it.cost_price, 0);
  return {
    quote_id: quote.id,
    captured_at: new Date().toISOString(),
    items,
    revenue,
    cost,
  };
}

/** Persiste um snapshot, substituindo o mais recente da mesma cotação. */
export function storeSnapshot(snapshot: QuoteSnapshot): QuoteSnapshot {
  const rest = loadSnapshots().filter((s) => s.quote_id !== snapshot.quote_id);
  saveSnapshots([snapshot, ...rest]);
  return snapshot;
}

/** Retorna o snapshot mais recente de uma cotação (se existir). */
export function getLatestSnapshot(quoteId: string): QuoteSnapshot | null {
  return loadSnapshots().find((s) => s.quote_id === quoteId) ?? null;
}

/** Compara o snapshot enviado com o estado atual dos itens. */
export interface ItemDiff {
  sku: string;
  name: string;
  /** true se o item existe hoje; false se foi removido após o envio. */
  stillPresent: boolean;
  qtyChanged: boolean;
  priceChanged: boolean;
  /** Preço unitário enviado no snapshot. */
  sentPrice: number;
  /** Preço unitário atual (0 se removido). */
  currentPrice: number;
  /** Quantidade enviada. */
  sentQty: number;
  /** Quantidade atual. */
  currentQty: number;
}

export interface QuoteDiff {
  snapshot: QuoteSnapshot;
  /** true quando o estado atual é idêntico ao snapshot. */
  unchanged: boolean;
  items: ItemDiff[];
  /** Delta de receita: atual - enviado. */
  revenueDelta: number;
  /** Delta de custo: atual - enviado. */
  costDelta: number;
}

export function diffSnapshot(snapshot: QuoteSnapshot, current: Quote): QuoteDiff {
  const bySku = new Map(current.items.map((it) => [it.sku, it]));
  const items: ItemDiff[] = snapshot.items.map((snapItem) => {
    const cur = bySku.get(snapItem.sku);
    if (!cur) {
      return {
        sku: snapItem.sku,
        name: snapItem.name,
        stillPresent: false,
        qtyChanged: false,
        priceChanged: false,
        sentPrice: snapItem.unit_price,
        currentPrice: 0,
        sentQty: snapItem.quantity,
        currentQty: 0,
      };
    }
    return {
      sku: cur.sku,
      name: cur.name,
      stillPresent: true,
      qtyChanged: cur.quantity !== snapItem.quantity,
      priceChanged: cur.unit_price !== snapItem.unit_price,
      sentPrice: snapItem.unit_price,
      currentPrice: cur.unit_price,
      sentQty: snapItem.quantity,
      currentQty: cur.quantity,
    };
  });

  const currentRevenue = current.items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const currentCost = current.items.reduce((s, it) => s + it.quantity * it.cost_price, 0);

  return {
    snapshot,
    unchanged: items.every((d) => d.stillPresent && !d.qtyChanged && !d.priceChanged),
    items,
    revenueDelta: currentRevenue - snapshot.revenue,
    costDelta: currentCost - snapshot.cost,
  };
}

/** Aplica os preços/quantidades do snapshot de volta na cotação atual. */
export function restoreFromSnapshot(snapshot: QuoteSnapshot, current: Quote): QuoteItem[] {
  const snapBySku = new Map(snapshot.items.map((it) => [it.sku, it]));
  return current.items.map((cur) => {
    const snap = snapBySku.get(cur.sku);
    if (!snap) return { ...cur };
    return {
      ...cur,
      quantity: snap.quantity,
      unit_price: snap.unit_price,
      cost_price: snap.cost_price,
    };
  });
}
