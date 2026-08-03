import { useState } from "react";
import { PackagePlus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatBRL } from "@/lib/medical/pricing";
import { addProduct, getProductBySku } from "@/lib/medical/product-catalog";
import type { Product } from "@/lib/medical/types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** SKU sugerido vindo do item da cotação */
  sku: string;
  /** Nome sugerido vindo do item da cotação */
  name: string;
  /** Chamado quando o produto for criado com sucesso */
  onCreated: (product: Product) => void;
}

const UNITS = ["un", "par", "cx", "pc", "fr", "amp", "bisnaga", "rolo", "tubo"];

export function QuickProductDialog({ open, onClose, sku, name, onCreated }: Props) {
  const [formSku, setFormSku] = useState(sku);
  const [formName, setFormName] = useState(name);
  const [formCost, setFormCost] = useState("");
  const [formUnit, setFormUnit] = useState("un");
  const [busy, setBusy] = useState(false);

  // Reset form when dialog opens with new props
  if (open && formSku !== sku && sku) {
    setFormSku(sku);
    setFormName(name);
    setFormCost("");
    setFormUnit("un");
  }

  const handleCreate = () => {
    const trimmedSku = formSku.trim().toUpperCase();
    const trimmedName = formName.trim();
    const cost = parseFloat(formCost);

    if (!trimmedSku) {
      toast.error("SKU é obrigatório.");
      return;
    }
    if (!trimmedName) {
      toast.error("Nome do produto é obrigatório.");
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      toast.error("Custo deve ser um valor positivo.");
      return;
    }

    // Verifica se já existe
    const existing = getProductBySku(trimmedSku);
    if (existing) {
      toast.info(`Produto ${trimmedSku} já existe no catálogo. Usando o existente.`);
      onCreated(existing);
      onClose();
      return;
    }

    setBusy(true);
    try {
      const product = addProduct(trimmedSku, trimmedName, cost, formUnit);
      toast.success(`${trimmedName} cadastrado com sucesso (custo: ${formatBRL(cost)}).`);
      onCreated(product);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-5 w-5 text-brand" />
            Cadastrar produto rapidamente
          </DialogTitle>
          <DialogDescription className="text-xs">
            O produto não foi encontrado no catálogo. Preencha os dados abaixo para criar e já
            aplicar na cotação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                SKU
              </Label>
              <Input
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="Ex: NOVO-SKU-001"
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Nome do produto
              </Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Novo Produto Hospitalar"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Custo de aquisição (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
                placeholder="Ex: 15.50"
                className="mt-1 h-8 text-xs num"
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Unidade
              </Label>
              <Select value={formUnit} onValueChange={setFormUnit}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">
                      {u === "un"
                        ? "Unidade"
                        : u === "par"
                          ? "Par"
                          : u === "cx"
                            ? "Caixa"
                            : u === "pc"
                              ? "Peça"
                              : u === "fr"
                                ? "Frasco"
                                : u === "amp"
                                  ? "Ampola"
                                  : u.charAt(0).toUpperCase() + u.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Preço sugerido automático
            </div>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Ao cadastrar, o preço sugerido será calculado como custo × 1.30 (margem padrão 30%).
              Ajuste manualmente no drawer após criar.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button size="sm" variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={busy} className="gap-1.5">
            <PackagePlus className="h-4 w-4" />
            {busy ? "Cadastrando..." : "Cadastrar e aplicar na cotação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
