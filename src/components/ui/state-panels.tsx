import { Loader2, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const baseFont = { fontFamily: '"Open Sans", Inter, sans-serif', fontSize: 16 };

type BaseProps = {
  message?: string;
  className?: string;
};

export function LoadingState({ message = "Carregando...", className }: BaseProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-full aspect-square w-40 mx-auto p-6",
        className,
      )}
      style={{ ...baseFont, backgroundColor: "#333", color: "#666" }}
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" style={{ color: "#666" }} />
      <span style={{ color: "#666" }}>{message}</span>
    </div>
  );
}

export function EmptyState({ message = "Nenhum resultado encontrado", className }: BaseProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg p-8 w-full",
        className,
      )}
      style={{ ...baseFont, backgroundColor: "#f7f7f7", color: "#666" }}
    >
      <ChevronDown className="h-8 w-8" aria-hidden="true" style={{ color: "#666" }} />
      <span>{message}</span>
    </div>
  );
}

export function ErrorState({
  message = "Ocorreu um erro inesperado",
  className,
}: BaseProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex items-center gap-3 rounded-lg p-4 w-full",
        className,
      )}
      style={{ ...baseFont, backgroundColor: "#f44336", color: "#fff" }}
    >
      <X className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function SuccessState({
  message = "Operação concluída com sucesso",
  className,
}: BaseProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-3 rounded-lg p-4 w-full",
        className,
      )}
      style={{ ...baseFont, backgroundColor: "#4CAF50", color: "#fff" }}
    >
      <Check className="h-6 w-6 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Feedback contextual conforme regra de negócio:
 * - Usuário logado + sucesso → SuccessState
 * - Usuário deslogado + sucesso → ErrorState (sessão inválida)
 * - Erro inesperado → ErrorState com mensagem específica
 */
export function OperationFeedback({
  isLoggedIn,
  status,
  successMessage = "Operação concluída com sucesso",
  errorMessage = "Ocorreu um erro inesperado",
  unauthenticatedMessage = "Você precisa estar logado para concluir esta operação",
}: {
  isLoggedIn: boolean;
  status: "success" | "error";
  successMessage?: string;
  errorMessage?: string;
  unauthenticatedMessage?: string;
}) {
  if (status === "error") return <ErrorState message={errorMessage} />;
  if (!isLoggedIn) return <ErrorState message={unauthenticatedMessage} />;
  return <SuccessState message={successMessage} />;
}
