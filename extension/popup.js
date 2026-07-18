const els = {
  endpoint: document.getElementById("endpoint"),
  apiKey: document.getElementById("apiKey"),
  portal: document.getElementById("portal"),
  autoCapture: document.getElementById("autoCapture"),
  status: document.getElementById("status"),
  save: document.getElementById("save"),
  capture: document.getElementById("capture"),
};

const DEFAULT_ENDPOINT = "https://usemedicalos.lovable.app/api/v1/ingest";

chrome.storage.sync.get(
  { endpoint: DEFAULT_ENDPOINT, apiKey: "", portal: "bionexo", autoCapture: false },
  (cfg) => {
    els.endpoint.value = cfg.endpoint;
    els.apiKey.value = cfg.apiKey;
    els.portal.value = cfg.portal;
    els.autoCapture.checked = cfg.autoCapture;
  },
);

function setStatus(msg, cls = "") {
  els.status.textContent = msg;
  els.status.className = "status " + cls;
}

els.save.addEventListener("click", () => {
  const cfg = {
    endpoint: els.endpoint.value.trim() || DEFAULT_ENDPOINT,
    apiKey: els.apiKey.value.trim(),
    portal: els.portal.value,
    autoCapture: els.autoCapture.checked,
  };
  chrome.storage.sync.set(cfg, () => setStatus("Configuração salva.", "ok"));
});

els.capture.addEventListener("click", async () => {
  setStatus("Capturando página atual...");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return setStatus("Nenhuma aba ativa.", "err");
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "USE_MEDICAL_CAPTURE" });
    if (result?.ok) setStatus(`RFQ enviada (${result.item_count} itens).`, "ok");
    else setStatus(result?.error ?? "Falha ao capturar.", "err");
  } catch (err) {
    setStatus("Content-script não disponível nesta página.", "err");
  }
});
