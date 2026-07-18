// Content-script — roda em páginas de portais hospitalares e extrai dados
// de RFQs para enviar ao endpoint /api/v1/ingest do USE Medical.
//
// Estratégia: parsers DOM específicos por host (Bionexo, Apoio Cotação).
// Cada parser retorna um payload no formato IngestPayloadSchema.

const HOST_PARSERS = {
  "bionexo.com.br": parseBionexo,
  "apoiocotacao.com.br": parseApoioCotacao,
};

function detectSource() {
  const host = location.hostname;
  const entry = Object.entries(HOST_PARSERS).find(([suffix]) => host.endsWith(suffix));
  return entry ? { source_platform: entry[0].split(".")[0], parser: entry[1] } : null;
}

function textOf(sel, root = document) {
  return root.querySelector(sel)?.textContent?.trim() ?? "";
}

function parseBionexo() {
  // Heurística genérica — Bionexo renderiza cotação em cards `.cotacao-item`.
  const itemsNodes = document.querySelectorAll("[data-item-cotacao], .cotacao-item, tr.item-row");
  const items = Array.from(itemsNodes).map((row) => ({
    sku: textOf("[data-sku], .sku, td.sku", row) || `BXN-${Math.random().toString(36).slice(2, 8)}`,
    description: textOf("[data-descricao], .descricao, td.descricao", row) || row.textContent.trim().slice(0, 120),
    quantity: Number((textOf("[data-qtd], .qtd, td.qtd", row) || "1").replace(/\D/g, "")) || 1,
    unit: textOf("[data-unidade], .unidade, td.unidade", row) || "UN",
  }));
  return {
    source_platform: "bionexo",
    portal_reference: textOf("h1, .cotacao-numero, [data-cotacao-id]") || document.title.slice(0, 60),
    customer_name: textOf(".hospital-nome, .cliente-nome, [data-hospital]") || "Hospital não identificado",
    customer_segment: "hospital",
    deadline_at: null,
    items: items.length ? items : [{ sku: "SEM-ITEM", description: "Nenhum item detectado", quantity: 1, unit: "UN" }],
    raw_url: location.href,
  };
}

function parseApoioCotacao() {
  const rows = document.querySelectorAll("table tbody tr");
  const items = Array.from(rows).map((row) => {
    const cells = row.querySelectorAll("td");
    return {
      sku: cells[0]?.textContent.trim() || `APC-${Math.random().toString(36).slice(2, 8)}`,
      description: cells[1]?.textContent.trim() || "",
      quantity: Number(cells[2]?.textContent.replace(/\D/g, "")) || 1,
      unit: cells[3]?.textContent.trim() || "UN",
    };
  });
  return {
    source_platform: "apoio_cotacao",
    portal_reference: textOf("h1, .numero-cotacao") || document.title.slice(0, 60),
    customer_name: textOf(".instituicao, .comprador") || "Instituição não identificada",
    customer_segment: "hospital",
    deadline_at: null,
    items: items.filter((i) => i.description).slice(0, 200),
    raw_url: location.href,
  };
}

async function sendPayload(payload) {
  const { endpoint, apiKey } = await chrome.storage.sync.get({ endpoint: "", apiKey: "" });
  if (!endpoint || !apiKey) return { ok: false, error: "Endpoint/API key não configurados." };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    return { ok: true, event_id: data.event_id, item_count: payload.items.length };
  } catch (err) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "USE_MEDICAL_CAPTURE") return;
  const detected = detectSource();
  if (!detected) {
    sendResponse({ ok: false, error: "Portal não suportado nesta página." });
    return true;
  }
  const payload = detected.parser();
  sendPayload(payload).then(sendResponse);
  return true; // async
});

// Auto-capture: ao detectar nova RFQ, notifica background para envio silencioso.
(async () => {
  const { autoCapture } = await chrome.storage.sync.get({ autoCapture: false });
  if (!autoCapture) return;
  const detected = detectSource();
  if (!detected) return;
  // Debounce simples — só dispara 3s após load para o DOM estabilizar.
  setTimeout(async () => {
    const payload = detected.parser();
    if (!payload.items.length) return;
    const result = await sendPayload(payload);
    chrome.runtime.sendMessage({ type: "USE_MEDICAL_AUTO_RESULT", result, portal: detected.source_platform });
  }, 3000);
})();
