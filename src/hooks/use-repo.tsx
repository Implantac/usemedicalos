import { useMemo } from "react";
import { getRepo, type Repo } from "@/lib/medical/repo";

/**
 * Hook fino para consumir o Repo ativo. Estável entre renders — a fábrica
 * `getRepo()` retorna o mesmo objeto para o backend atual.
 */
export function useRepo(): Repo {
  return useMemo(() => getRepo(), []);
}
