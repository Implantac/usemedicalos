// Bridge ERP Offline via CSV (Melhoria #6).
// Sincroniza cotações com ERPs legados (Protheus, Sankhya, Use Sistemas, etc.)
// que não expõem API REST — usando CSV bidirecional.
//
// - Exportar: Quote[] -> CSV no formato que o ERP espera (template).
// - Importar: CSV do ERP -> rascunho de cotação (cliente, itens, custo, status).

import type { Quote, QuoteItem, QuoteStatus } from "./types";

export type CsvTemplateId = "protheus" | "sankhya" | "use-sistemas" | "generic";

export interface CsvColumn {
  key: string;
  label: string;
  /** Caminho de leitura para exportar (a.b.c) ou vazio para campo fixo. */
}

export interface CsvTemplate {
  id: CsvTemplateId;
  name: string;
  vendor: string;
  /** Colunas esperadas na exportação (para o ERP). */
  columns: CsvColumn[];
  /** Mapeamento de colunas do CSV do ERP para o shape interno (importação). */
  importMap: {
    customer_name: string;
    customer_segment?: string;
    sku: string;
    name: string;
    quantity: string;
    unit_price: string;
    cost_price?: string;
    status?: string;
  };
}

export const CSV_TEMPLATES: Record<CsvTemplateId, CsvTemplate> = {
  protheus: {
    id: "protheus",
    name: "TOTVS Protheus",
    vendor: "TOTVS",
    columns: [
      { key: "cliente", label: "Cliente" },
      { key: "segmento", label: "Segmento" },
      { key: "sku", label: "SKU" },
      { key: "descricao", label: "Descrição" },
      { key: "qtd", label: "Quantidade" },
      { key: "preco", label: "Preço" },
      { key: "custo", label: "Custo" },
      { key: "margem", label: "Margem" },
      { key: "status", label: "Status" },
    ],
    importMap: {
      customer_name: "cliente",
      customer_segment: "segmento",
      sku: "sku",
      name: "descricao",
      quantity: "qtd",
      unit_price: "preco",
      cost_price: "custo",
      status: "status",
    },
  },
  sankhya: {
    id: "sankhya",
    name: "Sankhya Om",
    vendor: "Sankhya",
    columns: [
      { key: "cliente", label: "Parceiro" },
      { key: "segmento", label: "Classificação" },
      { key: "sku", label: "Código Produto" },
      { key: "descricao", label: "Descrição" },
      { key: "qtd", label: "Quantidade" },
      { key: "preco", label: "Valor Unitário" },
      { key: "custo", label: "Custo" },
      { key: "margem", label: "Margem" },
      { key: "status", label: "Status" },
    ],
    importMap: {
      customer_name: "parceiro",
      customer_segment: "classificacao",
      sku: "codigoproduto",
      name: "descricao",
      quantity: "quantidade",
      unit_price: "valorunitario",
      cost_price: "custo",
      status: "status",
    },
  },
  "use-sistemas": {
    id: "use-sistemas",
    name: "Use Sistemas",
    vendor: "Use Sistemas",
    columns: [
      { key: "cliente", label: "Cliente" },
      { key: "segmento", label: "Segmento" },
      { key: "sku", label: "Código" },
      { key: "descricao", label: "Descrição" },
      { key: "qtd", label: "Quantidade" },
      { key: "preco", label: "Preço" },
      { key: "custo", label: "Custo" },
      { key: "margem", label: "Margem" },
      { key: "status", label: "Status" },
    ],
    importMap: {
      customer_name: "cliente",
      customer_segment: "segmento",
      sku: "codigo",
      name: "descricao",
      quantity: "quantidade",
      unit_price: "preco",
      cost_price: "custo",
      status: "status",
    },
  },
  generic: {
    id: "generic",
    name: "Genérico",
    vendor: "Custom",
    columns: [
      { key: "cliente", label: "Cliente" },
      { key: "segmento", label: "Segmento" },
      { key: "sku", label: "SKU" },
      { key: "descricao", label: "Descrição" },
      { key: "qtd", label: "Quantidade" },
      { key: "preco", label: "Preço" },
      { key: "custo", label: "Custo" },
      { key: "margem", label: "Margem" },
      { key: "status", label: "Status" },
    ],
    importMap: {
      customer_name: "cliente",
      customer_segment: "segmento",
      sku: "sku",
      name: "descricao",
      quantity: "quantidade",
      unit_price: "preco",
      cost_price: "custo",
      status: "status",
    },
  },
};

export function getCsvTemplate(id: CsvTemplateId): CsvTemplate {
  return CSV_TEMPLATES[id];
}

/** Escapa um valor para CSV (aspas, vírgula, quebra de linha). */
export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Converte um array de objetos em CSV (com BOM UTF-8). */
export function generateCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const header = columns.map((c) => c.label).join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c.key])).join(",")).join("\n");
  return "\uFEFF" + [header, body].filter(Boolean).join("\n");
}

/** Parser CSV robusto (suporta aspas, vírgulas e quebras de linha dentro de campo). */
export function parseCsv(text: string): string[][] {
  if (!text) return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Última linha/coluna
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Normaliza um cabeçalho para chave (minúsculas, sem acentos, sem espaços). */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Detecta o preset de template a partir das colunas do CSV (header). */
export function detectTemplate(headers: string[]): CsvTemplateId {
  const norm = headers.map(normalizeHeader);
  // Peso das colunas marcadoras por template.
  const score: Record<CsvTemplateId, number> = {
    protheus: 0,
    sankhya: 0,
    "use-sistemas": 0,
    generic: 0,
  };
  const markers: Record<CsvTemplateId, string[]> = {
    protheus: ["cliente", "descricao", "qtd", "preco", "custo"],
    sankhya: ["parceiro", "codigoproduto", "valorunitario", "quantidade"],
    "use-sistemas": ["cliente", "codigo", "descricao", "quantidade", "preco"],
    generic: [],
  };
  for (const [id, keys] of Object.entries(markers)) {
    for (const k of keys) if (norm.includes(k)) score[id as CsvTemplateId]++;
  }
  let best: CsvTemplateId = "generic";
  let bestScore = 0;
  for (const [id, s] of Object.entries(score)) {
    if (s > bestScore) {
      best = id as CsvTemplateId;
      bestScore = s;
    }
  }
  return best;
}

/** Converte header (linha de colunas) em um mapa chave -> índice. */
function headerIndex(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => map.set(normalizeHeader(h), i));
  return map;
}

function num(v: string | undefined): number {
  if (v == null) return 0;
  const raw = String(v).trim();
  if (!raw) return 0;
  let normalized: string;
  if (raw.includes(",")) {
    // Formato brasileiro: "1.000,50" → "1000.50"
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else {
    // Formato com ponto decimal: "5.5", "3.0" ou milhar "1000"
    normalized = raw;
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export interface CsvQuoteDraft {
  customer_name: string;
  customer_segment: string;
  source_type: "edi";
  items: QuoteItem[];
}

export interface CsvImportResult {
  ok: boolean;
  templateId: CsvTemplateId;
  draft?: CsvQuoteDraft;
  errors: string[];
  report: {
    rows: number;
    importedItems: number;
    skipped: number;
  };
}

/** Converte o conteúdo de um CSV do ERP em um rascunho de cotação opinável. */
export function parseCsvToQuoteDraft(csv: string, templateId?: CsvTemplateId): CsvImportResult {
  const rows = parseCsv(csv);
  if (rows.length < 2)
    return {
      ok: false,
      templateId: templateId ?? "generic",
      errors: ["CSV vazio ou sem dados."],
      report: { rows: 0, importedItems: 0, skipped: 0 },
    };

  const headers = rows[0];
  const id = templateId ?? detectTemplate(headers);
  const tpl = getCsvTemplate(id);
  const idx = headerIndex(headers);
  const im = tpl.importMap;

  const errors: string[] = [];
  const items: QuoteItem[] = [];
  let customer = "";
  let segment = "Não informado";
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const get = (key: string): string => {
      const i = idx.get(normalizeHeader(key));
      return i == null ? "" : (line[i] ?? "").trim();
    };

    const sku = get(im.sku) || get("sku");
    const name = get(im.name) || get("descricao") || sku;
    const qty = num(get(im.quantity) || get("qtd") || get("quantidade"));
    const price = num(get(im.unit_price) || get("preco"));
    const cost = im.cost_price ? num(get(im.cost_price) || get("custo")) : 0;

    if (!sku) {
      skipped++;
      continue;
    }
    if (!customer) {
      customer = get(im.customer_name) || get("cliente") || "Cliente do ERP";
      segment = get(im.customer_segment || "segmento") || "Não informado";
    }
    items.push({
      product_id: sku,
      sku,
      name,
      quantity: qty,
      unit_price: price,
      cost_price: cost,
    });
  }

  if (items.length === 0) {
    errors.push("Nenhum item válido encontrado no CSV (SKU ausente).");
    return {
      ok: false,
      templateId: id,
      errors,
      report: { rows: rows.length - 1, importedItems: 0, skipped },
    };
  }

  return {
    ok: true,
    templateId: id,
    draft: { customer_name: customer, customer_segment: segment, source_type: "edi", items },
    errors,
    report: { rows: rows.length - 1, importedItems: items.length, skipped },
  };
}

export interface CsvExportRow {
  cliente: string;
  segmento: string;
  sku: string;
  descricao: string;
  qtd: number;
  preco: number;
  custo: number;
  margem: string;
  status: string;
}

/** Exporta uma lista de cotações para o CSV de um template ERP. */
export function exportQuotesToCsv(quotes: Quote[], templateId: CsvTemplateId): string {
  const tpl = getCsvTemplate(templateId);
  const rows: Record<string, unknown>[] = [];
  for (const q of quotes) {
    for (const it of q.items) {
      const margin = it.unit_price > 0 ? (it.unit_price - it.cost_price) / it.unit_price : 0;
      rows.push({
        cliente: q.customer_name,
        segmento: q.customer_segment,
        sku: it.sku,
        descricao: it.name,
        qtd: it.quantity,
        preco: it.unit_price,
        custo: it.cost_price,
        margem: `${(margin * 100).toFixed(1)}%`,
        status: q.status,
      });
    }
  }
  return generateCsv(rows, tpl.columns);
}

// ============================================================================
// Melhoria #7 — Retorno do ERP (fechar o ciclo)
// Processa o CSV de retorno do ERP: preço de custo atualizado, estoque e status
// do pedido. É o que traz valor de volta para o sistema.
// ============================================================================

export interface CsvReturnRow {
  sku: string;
  /** Preço de custo atualizado informado pelo ERP. */
  cost_price?: number;
  /** Estoque disponível informado pelo ERP. */
  stock?: number;
  /** Status do pedido no ERP (ex.: faturado, separado, entregue). */
  order_status?: string;
  /** Observação livre do ERP. */
  note?: string;
}

export interface CsvReturnResult {
  ok: boolean;
  rows: CsvReturnRow[];
  errors: string[];
  report: {
    total: number;
    withCost: number;
    withStock: number;
    withStatus: number;
  };
}

const RETURN_COLUMN_ALIASES: Record<
  keyof CsvReturnRow,
  string[]
> = {
  sku: ["sku", "codigo", "codigoproduto", "codigodoproduto", "produto"],
  cost_price: ["custo", "custoatualizado", "custonovo", "precocusto"],
  stock: ["estoque", "saldo", "disponivel", "qtdestoque"],
order_status: [
    "status",
    "statuspedido",
    "statusdopedido",
    "situacao",
    "situacaopedido",
  ],
  note: ["obs", "observacao", "nota"],
};

/** Normaliza um cabeçalho para chave (sem acentos, minúsculas, sem espaços). */
function normalizeHeaderKey(h: string): string {
  return normalizeHeader(h);
}

/**
 * Interpreta colunas de um CSV de retorno do ERP usando aliases flexíveis.
 * Aceita cabeçalhos como "Custo Atualizado", "Estoque", "Status do Pedido", etc.
 */
export function parseCsvReturn(csv: string): CsvReturnResult {
  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return {
      ok: false,
      rows: [],
      errors: ["CSV de retorno vazio ou sem dados."],
      report: { total: 0, withCost: 0, withStock: 0, withStatus: 0 },
    };
  }

  const headers = rows[0];
  const idx = new Map<string, number>();
  headers.forEach((h, i) => idx.set(normalizeHeaderKey(h), i));

  // Mapa de coluna destino -> índice real (via aliases).
  const colIdx: Partial<Record<keyof CsvReturnRow, number>> = {};
  (Object.keys(RETURN_COLUMN_ALIASES) as (keyof CsvReturnRow)[]).forEach((key) => {
    for (const alias of RETURN_COLUMN_ALIASES[key]) {
      const norm = normalizeHeaderKey(alias);
      if (idx.has(norm)) {
        colIdx[key] = idx.get(norm);
        break;
      }
    }
  });

  // Ao menos o SKU é obrigatório.
  if (colIdx.sku == null) {
    return {
      ok: false,
      rows: [],
      errors: ["Coluna de SKU não encontrada no CSV de retorno."],
      report: { total: 0, withCost: 0, withStock: 0, withStatus: 0 },
    };
  }

  const errors: string[] = [];
  const parsed: CsvReturnRow[] = [];
  let withCost = 0;
  let withStock = 0;
  let withStatus = 0;

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const getCell = (key: keyof CsvReturnRow): string => {
      const i = colIdx[key];
      return i == null ? "" : (line[i] ?? "").trim();
    };

    const sku = getCell("sku");
    if (!sku) {
      errors.push(`Linha ${r + 1}: SKU ausente, linha ignorada.`);
      continue;
    }

    const costRaw = getCell("cost_price");
    const stockRaw = getCell("stock");
    const status = getCell("order_status");

    const row: CsvReturnRow = { sku };
    if (costRaw) {
      row.cost_price = num(costRaw);
      withCost++;
    }
    if (stockRaw) {
      row.stock = num(stockRaw);
      withStock++;
    }
    if (status) {
      row.order_status = status;
      withStatus++;
    }
    const note = getCell("note");
    if (note) row.note = note;

    parsed.push(row);
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      rows: [],
      errors: errors.length ? errors : ["Nenhuma linha válida no CSV de retorno."],
      report: { total: 0, withCost: 0, withStock: 0, withStatus: 0 },
    };
  }

  return {
    ok: true,
    rows: parsed,
    errors,
    report: { total: parsed.length, withCost, withStock, withStatus },
  };
}

export interface CsvReturnApplyItem {
  sku: string;
  cost_price?: number;
  stock?: number;
  order_status?: string;
  note?: string;
}

export interface CsvReturnApplyResult {
  updatedItems: number;
  /** Novos valores aplicados por SKU (para log/auditoria). */
  applied: {
    sku: string;
    cost_price?: number;
    stock?: number;
    order_status?: string;
  }[];
  updatedStatuses: { from: QuoteStatus; to: QuoteStatus }[];
}

const STATUS_MAP: Record<string, QuoteStatus> = {
  faturado: "ganho",
  "faturado parcial": "em_negociacao",
  entregue: "ganho",
  separado: "enviado",
  "em separacao": "enviado",
  enviado: "enviado",
  cotacao: "em_negociacao",
  "em cotacao": "em_negociacao",
  perdido: "perdido",
  cancelado: "perdido",
  aprovado: "ganho",
};

/**
 * Aplica o retorno do ERP a uma cotação (atualiza custo, estoque e status).
 * Retorna os itens atualizados e as transições de status para auditoria.
 */
export function applyReturnToQuote(
  quote: Quote,
  returns: CsvReturnApplyItem[],
): CsvReturnApplyResult {
  const skuIndex = new Map<string, CsvReturnApplyItem>();
  for (const r of returns) skuIndex.set(r.sku, r);

  const applied: CsvReturnApplyResult["applied"] = [];
  let updatedItems = 0;

  for (const item of quote.items) {
    const ret = skuIndex.get(item.sku);
    if (!ret) continue;
    updatedItems++;
    if (ret.cost_price != null) item.cost_price = ret.cost_price;
    applied.push({
      sku: item.sku,
      cost_price: ret.cost_price,
      stock: ret.stock,
      order_status: ret.order_status,
    });
  }

  const updatedStatuses: CsvReturnApplyResult["updatedStatuses"] = [];
  // Determina um status de pedido agregado a partir das linhas que o citam.
  const statusSeen = returns.map((r) => r.order_status).filter(Boolean) as string[];
  if (statusSeen.length > 0) {
    const canonical = statusSeen[0].toLowerCase().trim();
    const target = STATUS_MAP[canonical];
    if (target && target !== quote.status) {
      updatedStatuses.push({ from: quote.status, to: target });
      quote.status = target;
    }
  }

  return { updatedItems, applied, updatedStatuses };
}
