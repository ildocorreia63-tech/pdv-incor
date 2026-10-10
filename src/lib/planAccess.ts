import type { PlanDef } from "@/lib/plans";

/** Recursos que dependem do plano da loja. */
export type Feature = "cardapio_online" | "cozinha" | "aniversariantes" | "recuperacao" | "insumos";

const RANK: Record<string, number> = { essencial: 1, pro: 2, premium: 3 };

/** Plano mínimo exigido por recurso. */
export const FEATURE_MIN_PLAN: Record<Feature, PlanDef["id"]> = {
  cardapio_online: "pro",
  cozinha: "pro",
  aniversariantes: "pro",
  recuperacao: "premium",
  insumos: "premium",
};

/** Durante o teste grátis a loja usa tudo; depois vale o plano contratado. */
export function canUse(plan: string, status: string, feature: Feature): boolean {
  if (status === "trialing" || plan === "trial") return true;
  return (RANK[plan] ?? 0) >= RANK[FEATURE_MIN_PLAN[feature]];
}
