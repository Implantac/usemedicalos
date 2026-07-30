// Formulário de edição de campos regulatórios/estratégicos do produto.
// Renderizado apenas para usuários com role "gestor" (ou admin).

import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Product } from "@/lib/medical/types";
import { useProductOverrides, type ProductOverride } from "@/hooks/use-product-overrides";
import { toast } from "sonner";

export function ProductGovernanceForm({ product }: { product: Product }) {
  const { save, clear } = useProductOverrides();
  const [taxRate, setTaxRate] = useState(String((product.tax_rate * 100).toFixed(2)));
  const [logistics, setLogistics] = useState(String(((product.logistics_rate ?? 0.03) * 100).toFixed(2)));
  const [cmed, setCmed] = useState(product.cmed_ceiling?.toString() ?? "");
  const [market, setMarket] = useState(product.market_avg?.toString() ?? "");
  const flags = product.compliance_flags ?? {};
  const [anvisa, setAnvisa] = useState(!!flags.anvisa);
  const [controlled, setControlled] = useState(!!flags.controlled);
  const [refrigerated, setRefrigerated] = useState(!!flags.refrigerated);

  const onSave = () => {
    const patch: ProductOverride = {
      tax_rate: Number(taxRate) / 100,
      logistics_rate: Number(logistics) / 100,
      cmed_ceiling: cmed ? Number(cmed) : undefined,
      market_avg: market ? Number(market) : undefined,
      compliance_flags: { anvisa, controlled, refrigerated },
    };
    save(product.sku, patch);
    toast.success("Parâmetros regulatórios atualizados.");
  };

  const onReset = () => {
    clear(product.sku);
    toast.info("Overrides removidos; voltou ao catálogo base.");
  };

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-primary">Governança do produto</h4>
          <p className="text-[10px] text-muted-foreground">Editável por gestor · alimenta o motor de precificação.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Imposto (%)"    value={taxRate}    onChange={setTaxRate}    step="0.01" />
        <Field label="Logística (%)"  value={logistics}  onChange={setLogistics}  step="0.01" />
        <Field label="Teto CMED (R$)" value={cmed}       onChange={setCmed}       step="0.01" />
        <Field label="Preço médio mercado (R$)" value={market} onChange={setMarket} step="0.01" />
      </div>

      <div className="mt-3 space-y-1.5">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Flags de compliance</Label>
        <div className="flex flex-wrap gap-3 text-xs">
          <Flag label="ANVISA"        checked={anvisa}       onChange={setAnvisa} />
          <Flag label="Controlado"    checked={controlled}   onChange={setControlled} />
          <Flag label="Refrigerado"   checked={refrigerated} onChange={setRefrigerated} />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onSave} className="h-8 gap-1.5">
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset} className="h-8 gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reverter
        </Button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, step,
}: { label: string; value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs"
      />
    </div>
  );
}

function Flag({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      <span>{label}</span>
    </label>
  );
}
