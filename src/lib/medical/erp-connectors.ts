// Registry de conectores ERP para o wizard de integração.
// Implementações reais entram quando Lovable Cloud estiver ativo.

export type ErpAuthType = "token" | "basic" | "oauth2" | "hmac";

export interface ErpAuthField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
}

import type { ErpMappingConfig } from "./erp-mapping";

export interface ErpConnector {
  id: string;
  name: string;
  vendor: string;
  status: "beta" | "estavel" | "planejado";
  description: string;
  authType: ErpAuthType;
  authFields: ErpAuthField[];
  docsUrl?: string;
  defaultEndpoint?: string;
  /** Template de mapping pré-configurado para este ERP. */
  mappingTemplate?: ErpMappingConfig;
}

export const ERP_CONNECTORS: ErpConnector[] = [
  {
    id: "use-sistemas",
    name: "Use Sistemas",
    vendor: "Use Sistemas",
    status: "estavel",
    description: "Integração nativa via webhook assinado (HMAC-SHA256). Ideal para operações do próprio ecossistema.",
    authType: "hmac",
    authFields: [
      { key: "tenant_token", label: "Tenant token", placeholder: "tenant-xxxx" },
      { key: "hmac_secret", label: "Secret HMAC", placeholder: "chave compartilhada", secret: true },
    ],
    defaultEndpoint: "/api/public/use-sistemas",
    mappingTemplate: {
      quote: {
        customer_name: "cliente.razao_social",
        customer_segment: "cliente.segmento",
        source_type: "'use-sistemas'",
        original_payload: "id_pedido",
      },
      items: {
        path: "itens",
        fields: { sku: "codigo", name: "descricao", quantity: "qtd", unit_price: "preco", cost_price: "custo" },
      },
    },
  },
  {
    id: "totvs-protheus",
    name: "TOTVS Protheus",
    vendor: "TOTVS",
    status: "beta",
    description: "Adapter para REST API Protheus. Requer usuário técnico com escopo somente-leitura em SB1/SC5.",
    authType: "basic",
    authFields: [
      { key: "endpoint", label: "Endpoint REST", placeholder: "https://erp.cliente.com/rest" },
      { key: "user", label: "Usuário técnico" },
      { key: "password", label: "Senha", secret: true },
    ],
    docsUrl: "https://tdn.totvs.com/display/public/framework/REST",
  },
  {
    id: "sankhya",
    name: "Sankhya Om",
    vendor: "Sankhya",
    status: "beta",
    description: "Autenticação por token JWT com refresh automático. Mapeia Parceiro/NotaVenda para quotes.",
    authType: "token",
    authFields: [
      { key: "endpoint", label: "Endpoint", placeholder: "https://api.sankhya.com.br" },
      { key: "token", label: "Bearer token", secret: true },
    ],
    docsUrl: "https://developer.sankhya.com.br/",
  },
  {
    id: "senior",
    name: "Senior X",
    vendor: "Senior Sistemas",
    status: "planejado",
    description: "Suporte planejado para Q2. Interesse? Registre o tenant e priorizamos a fila.",
    authType: "oauth2",
    authFields: [
      { key: "client_id", label: "Client ID" },
      { key: "client_secret", label: "Client secret", secret: true },
    ],
  },
  {
    id: "generic-webhook",
    name: "Webhook genérico",
    vendor: "Custom",
    status: "estavel",
    description: "Qualquer sistema que faça POST no endpoint público com payload + mapping JSONPath.",
    authType: "hmac",
    authFields: [
      { key: "tenant_token", label: "Tenant token" },
      { key: "hmac_secret", label: "Secret HMAC", secret: true },
    ],
    defaultEndpoint: "/api/public/erp/ingest",
  },
];

export function getConnector(id: string): ErpConnector | undefined {
  return ERP_CONNECTORS.find((c) => c.id === id);
}
