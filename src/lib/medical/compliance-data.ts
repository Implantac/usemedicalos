// Mock dataset simulando integração ANVISA/CMED (PMC = Preço Máximo ao Consumidor).
// TODO(cloud): substituir por tabela `regulatory_compliance` sincronizada via job.

export interface ComplianceRecord {
  sku: string;
  anvisa_code: string;
  cmed_pmc?: number;
  therapeutic_class?: string;
  expires_at?: string; // ISO date
}

export const COMPLIANCE_DATA: Record<string, ComplianceRecord> = {
  "SUT-3-0-CT": { sku: "SUT-3-0-CT", anvisa_code: "8043210000123", cmed_pmc: 32.5, therapeutic_class: "material cirúrgico", expires_at: "2028-06-30" },
  "LUV-CIR-M": { sku: "LUV-CIR-M", anvisa_code: "8043210000456", cmed_pmc: 3.6, therapeutic_class: "EPI", expires_at: "2027-12-31" },
  "SER-20ML": { sku: "SER-20ML", anvisa_code: "8043210000789", cmed_pmc: 1.6, therapeutic_class: "descartável", expires_at: "2029-03-15" },
  "CAT-VEN-20G": { sku: "CAT-VEN-20G", anvisa_code: "8043210001234", cmed_pmc: 7.4, therapeutic_class: "acesso venoso", expires_at: "2028-01-20" },
  "MSC-N95": { sku: "MSC-N95", anvisa_code: "8043210005678", cmed_pmc: 6.2, therapeutic_class: "EPI", expires_at: "2027-08-10" },
  "GZE-EST-10": { sku: "GZE-EST-10", anvisa_code: "8043210009999", cmed_pmc: 2.1, therapeutic_class: "curativo", expires_at: "2029-11-05" },
  "SOR-FIS-500": { sku: "SOR-FIS-500", anvisa_code: "8043210011111", cmed_pmc: 8.0, therapeutic_class: "solução parenteral", expires_at: "2028-05-01" },
  "PRT-CIR-COMP": { sku: "PRT-CIR-COMP", anvisa_code: "8043210022222", cmed_pmc: 1600, therapeutic_class: "implante cirúrgico", expires_at: "2027-04-15" },
};
