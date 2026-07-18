# USE Medical — Extensão de Captura de Portais

Chrome/Edge/Brave MV3 extension que captura RFQs dos portais Bionexo e Apoio
Cotação e envia para `POST /api/v1/ingest` do Commercial OS.

## Instalação (unpacked)

1. Baixe o zip `use-medical-extension.zip` em `/integracoes`.
2. Descompacte em uma pasta.
3. Abra `chrome://extensions` e ative **Modo desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta.
5. Abra o popup e cole a **API key** gerada em `/api-keys`.

## Fluxo

- **Captura manual:** clique em "Capturar página atual" na página da RFQ.
- **Auto-capture:** marque o checkbox — a extensão dispara 3s após o load.

## Segurança

- API key é salva em `chrome.storage.sync` (nunca em `localStorage`).
- Rate-limit de 60 req/min por (IP + fragmento da key) aplicado no endpoint.
- Nenhum dado é enviado se endpoint/API key não estiverem configurados.
