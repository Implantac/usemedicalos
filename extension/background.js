// Service worker — recebe resultados de auto-capture e dispara notificações
// do sistema para o vendedor não perder RFQs recém-detectadas.

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "USE_MEDICAL_AUTO_RESULT") return;
  const { result, portal } = msg;
  const title = result?.ok ? "USE Medical • RFQ capturada" : "USE Medical • Falha na captura";
  const message = result?.ok
    ? `Nova cotação de ${portal} enviada ao Commercial OS.`
    : `Erro em ${portal}: ${result?.error ?? "desconhecido"}`;
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title,
    message,
    priority: 1,
  });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[USE Medical] Extensão instalada. Configure API key no popup.");
});
