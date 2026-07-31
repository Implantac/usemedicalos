import { useState } from "react";
import { FileText, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  itemsCount: number;
  totalValue: number;
  // now async: caller should return a Promise resolving when the request completes
  onRequestApproval: (reason: string) => Promise<void>;
}

export function ApprovalRequestDialog({ open, onOpenChange, quoteId, itemsCount, totalValue, onRequestApproval }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      await onRequestApproval(reason);
      setReason("");
      onOpenChange(false);
    } catch (err) {
      toast.error("Falha ao enviar solicitação de aprovação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Solicitar aprovação
          </DialogTitle>
          <DialogDescription>
            A proposta #{quoteId} tem margem abaixo do piso. Envie uma solicitação de aprovação ao gerente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-3 text-sm">
            <div className="text-[11px] text-muted-foreground">Itens enviados</div>
            <div className="mt-1 text-base font-semibold text-foreground">{itemsCount} itens · {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
          </div>

          <div>
            <label className="text-xs font-semibold">Mensagem para o gerente (opcional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 h-24 w-full rounded-md border p-2 text-sm"
              placeholder="Explique por que precisa de aprovação..."
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button size="sm" className="gap-1.5" onClick={handleSend} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {loading ? "Enviando..." : "Solicitar aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
