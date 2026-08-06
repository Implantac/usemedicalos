import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileUp,
  UploadCloud,
  FileSpreadsheet,
  Database,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CSV_TEMPLATES,
  exportQuotesToCsv,
  parseCsvToQuoteDraft,
  type CsvTemplateId,
  type CsvImportResult,
} from "@/lib/medical/csv-bridge";
import { appendActivity } from "@/lib/medical/activity";
import type { Quote } from "@/lib/medical/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Cotações ativas para exportar para o ERP. */
  quotes: Quote[];
  /** Chamado quando o usuário ingere um rascunho importado do CSV do ERP. */
  onImport: (draft: {
    customer_name: string;
    customer_segment: string;
    items: Quote["items"];
  }) => void;
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvImportDialog({ open, onClose, quotes, onImport }: Props) {
  const [tab, setTab] = useState<"export" | "import">("export");
  const [exportTemplate, setExportTemplate] = useState<CsvTemplateId>("protheus");
  const [importTemplate, setImportTemplate] = useState<CsvTemplateId | "auto">("auto");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setResult(null);
      setFileName("");
    }
  }, [open]);

  function doExport() {
    const csv = exportQuotesToCsv(quotes, exportTemplate);
    const tpl = CSV_TEMPLATES[exportTemplate];
    download(`cotações-${tpl.id}.csv`, csv, "text/csv;charset=utf-8");
    toast.success(`Exportado ${quotes.length} cotação(ões) para ${tpl.name}.`);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const res = parseCsvToQuoteDraft(
        text,
        importTemplate === "auto" ? undefined : importTemplate,
      );
      setResult(res);
      if (res.ok) {
        toast.success(`${res.report.importedItems} item(ns) lidos do CSV.`);
      } else {
        toast.error(res.errors.join(" ") || "Falha ao processar CSV.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function confirmImport() {
    if (!result?.ok || !result.draft) return;
    onImport({
      customer_name: result.draft.customer_name,
      customer_segment: result.draft.customer_segment,
      items: result.draft.items,
    });
    appendActivity({
      quote_id: "csv",
      type: "csv_imported",
      message: `Importado CSV do ERP (${result.templateId}) — ${result.report.importedItems} item(ns)`,
      meta: { source_platform: "csv" },
    });
    toast.success(`Cotação criada a partir do CSV (${result.draft.customer_name}).`);
    setResult(null);
    setFileName("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-brand" />
            Bridge ERP Offline (CSV)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sincronize cotações com ERPs legados (Protheus, Sankhya, Use Sistemas) que não expõem
            API REST — exportando e importando CSV bidirecionalmente.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("export")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === "export" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <Download className="h-3.5 w-3.5" /> Exportar para o ERP
          </button>
          <button
            type="button"
            onClick={() => setTab("import")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === "import" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <UploadCloud className="h-3.5 w-3.5" /> Importar do ERP
          </button>
        </div>

        {tab === "export" ? (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Template do ERP
              </Label>
              <Select
                value={exportTemplate}
                onValueChange={(v) => setExportTemplate(v as CsvTemplateId)}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CSV_TEMPLATES) as CsvTemplateId[]).map((id) => (
                    <SelectItem key={id} value={id} className="text-xs">
                      {CSV_TEMPLATES[id].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              Gera um CSV pronto para importar no{" "}
              <strong className="text-foreground">{CSV_TEMPLATES[exportTemplate].vendor}</strong>{" "}
              com as colunas esperadas (cliente, SKU, descrição, qtd, preço, custo, margem, status).
            </p>
            <div className="flex items-center justify-between rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <strong className="text-foreground">{quotes.length}</strong> cotação(ões) ativa(s)
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Pronto para exportar
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-[11px] font-semibold uppercase text-muted-foreground">
                Template de origem (opcional)
              </Label>
              <Select
                value={importTemplate}
                onValueChange={(v) => setImportTemplate(v as CsvTemplateId)}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs">
                    Detectar automaticamente
                  </SelectItem>
                  {(Object.keys(CSV_TEMPLATES) as CsvTemplateId[]).map((id) => (
                    <SelectItem key={id} value={id} className="text-xs">
                      {CSV_TEMPLATES[id].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border border-dashed border-border p-4 text-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFile}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-xs transition-colors hover:bg-primary/10"
              >
                <FileUp className="h-6 w-6 text-primary" />
                <span className="font-semibold text-foreground">
                  {fileName || "Clique para selecionar o CSV do ERP"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  O detector identifica o template (Protheus, Sankhya, Use, Genérico) sozinho.
                </span>
              </button>
            </div>

            {result && (
              <div
                className={cn(
                  "rounded-md border p-3",
                  result.ok
                    ? "border-success/40 bg-success/5"
                    : "border-destructive/40 bg-destructive/5",
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {result.ok ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      CSV lido — template {CSV_TEMPLATES[result.templateId].name}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Falha ao processar CSV
                    </>
                  )}
                </div>
                {result.ok && result.draft ? (
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <div>
                      Cliente:{" "}
                      <strong className="text-foreground">{result.draft.customer_name}</strong>
                    </div>
                    <div>
                      Segmento:{" "}
                      <strong className="text-foreground">{result.draft.customer_segment}</strong>
                    </div>
                    <div>
                      Itens:{" "}
                      <strong className="text-foreground">{result.report.importedItems}</strong> ·
                      linhas {result.report.rows} · puladas {result.report.skipped}
                    </div>
                  </div>
                ) : (
                  <ul className="mt-2 list-disc pl-5 text-[11px] text-destructive">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          {tab === "export" ? (
            <Button size="sm" onClick={doExport} className="gap-1.5">
              <Download className="h-4 w-4" /> Baixar CSV
            </Button>
          ) : (
            <Button size="sm" onClick={confirmImport} disabled={!result?.ok} className="gap-1.5">
              <UploadCloud className="h-4 w-4" /> Criar cotação da importação
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
