// Integration Sandbox (Fase 3): mapeamento JSON de payloads ERP arbitrários
// para o shape interno de Quote. Suporta JSONPath simples (a.b.c[0].d).

export interface ErpMappingConfig {
  quote: {
    customer_name: string;
    customer_segment: string;
    source_type?: string;
    original_payload?: string;
  };
  items: {
    path: string; // caminho para array de itens
    fields: {
      sku: string;
      name: string;
      quantity: string;
      unit_price: string;
      cost_price?: string;
    };
  };
}

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export interface MappedQuoteDraft {
  customer_name: string;
  customer_segment: string;
  source_type: string;
  original_payload: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
  }>;
}

export interface MappingResult {
  ok: boolean;
  draft?: MappedQuoteDraft;
  errors: string[];
}

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function applyMapping(payload: unknown, cfg: ErpMappingConfig): MappingResult {
  const errors: string[] = [];
  const customer_name = String(getPath(payload, cfg.quote.customer_name) ?? "").trim();
  if (!customer_name) errors.push(`Campo obrigatório vazio: ${cfg.quote.customer_name}`);

  const raw = getPath(payload, cfg.items.path);
  const arr = Array.isArray(raw) ? raw : [];
  if (arr.length === 0) errors.push(`Nenhum item encontrado em ${cfg.items.path}`);

  const items = arr.map((it, idx) => {
    const sku = String(getPath(it, cfg.items.fields.sku) ?? "").trim();
    if (!sku) errors.push(`Item #${idx + 1}: SKU vazio`);
    return {
      sku,
      name: String(getPath(it, cfg.items.fields.name) ?? sku),
      quantity: num(getPath(it, cfg.items.fields.quantity)),
      unit_price: num(getPath(it, cfg.items.fields.unit_price)),
      cost_price: cfg.items.fields.cost_price ? num(getPath(it, cfg.items.fields.cost_price)) : 0,
    };
  });

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    draft: {
      customer_name,
      customer_segment: String(getPath(payload, cfg.quote.customer_segment) ?? "Não informado"),
      source_type: String(getPath(payload, cfg.quote.source_type ?? "") ?? "portal"),
      original_payload: String(
        getPath(payload, cfg.quote.original_payload ?? "") ?? JSON.stringify(payload).slice(0, 500),
      ),
      items,
    },
  };
}

export const SAMPLE_ERP_PAYLOAD = {
  cliente: { razao_social: "Hospital Beta", tipo: "Hospital privado" },
  origem: "portal_erp",
  observacao: "Reposição mensal automática",
  produtos: [
    { codigo: "SUT-3-0-CT", descricao: "Fio Sutura", qtd: 30, preco: 26.5, custo: 18.5 },
    { codigo: "GZE-EST-10", descricao: "Gaze", qtd: 500, preco: 1.85, custo: 1.1 },
  ],
};

export const SAMPLE_MAPPING: ErpMappingConfig = {
  quote: {
    customer_name: "cliente.razao_social",
    customer_segment: "cliente.tipo",
    source_type: "origem",
    original_payload: "observacao",
  },
  items: {
    path: "produtos",
    fields: {
      sku: "codigo",
      name: "descricao",
      quantity: "qtd",
      unit_price: "preco",
      cost_price: "custo",
    },
  },
};
