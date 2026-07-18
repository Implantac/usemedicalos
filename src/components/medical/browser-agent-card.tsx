import { Chrome, Download, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// Sprint D — extensão MV3 que captura RFQs em portais hospitalares
// (Bionexo, Apoio Cotação) e envia via POST /api/v1/ingest.
// O zip é gerado no build (`extension/` → `public/use-medical-extension.zip`).

export function BrowserAgentCard() {
  async function download() {
    try {
      const res = await fetch("/use-medical-extension.zip");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "use-medical-extension.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert(`Falha ao baixar: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 card-shadow">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand/10 p-2 text-brand">
          <Chrome className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Browser Agent — Extensão Chrome/Edge
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Captura RFQs diretamente dos portais Bionexo e Apoio Cotação e envia para o
            Commercial OS via API key. Suporta modo manual e auto-capture.
          </p>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Manifest V3, permissões mínimas
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-brand" />
              Envio em &lt; 300ms
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Chrome className="h-3.5 w-3.5 text-primary" />
              Chrome / Edge / Brave / Arc
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={download} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Baixar extensão (.zip)
            </Button>
          </div>

          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">
              Instalação (unpacked)
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Descompacte o arquivo baixado.</li>
              <li>Abra <code>chrome://extensions</code> e ative <strong>Modo desenvolvedor</strong>.</li>
              <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta.</li>
              <li>Abra o popup e cole a API key gerada em <code>/api-keys</code>.</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
