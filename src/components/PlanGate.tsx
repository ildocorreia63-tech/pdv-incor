import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { canUse, FEATURE_MIN_PLAN, type Feature } from "@/lib/planAccess";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Hook: true quando a loja atual pode usar o recurso. */
export function usePlanAccess(feature: Feature): boolean {
  const { store } = useAuth();
  if (!store) return true;
  return canUse(store.plan, store.subscription_status, feature);
}

/** Bloqueia uma página inteira quando o recurso não faz parte do plano. */
export function PlanGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const allowed = usePlanAccess(feature);
  if (allowed) return <>{children}</>;
  const needed = PLANS.find((p) => p.id === FEATURE_MIN_PLAN[feature])?.name;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <Lock className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Recurso bloqueado</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Este recurso faz parte do plano <strong>{needed}</strong>. Troque de plano para liberar.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" asChild><Link to="/admin">Voltar</Link></Button>
        <Button asChild><Link to="/assinatura">Ver planos</Link></Button>
      </div>
    </main>
  );
}

/** Cadeadinho sobreposto a um ícone de atalho. */
export function LockBadge({ feature, className }: { feature: Feature; className?: string }) {
  const allowed = usePlanAccess(feature);
  if (allowed) return null;
  return (
    <span className={cn("pointer-events-none absolute -right-0.5 -top-0.5 rounded-full bg-background p-0.5", className)} aria-label="Bloqueado no seu plano">
      <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
    </span>
  );
}
