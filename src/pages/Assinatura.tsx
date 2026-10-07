import { Link } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { PLANS, TRIAL_DAYS, annualPrice, brl } from "@/lib/plans";
import { Check, Crown, CalendarClock, ArrowUpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  trialing: { label: "Teste grátis", tone: "secondary" },
  active: { label: "Ativa", tone: "default" },
  past_due: { label: "Pagamento pendente", tone: "destructive" },
  canceled: { label: "Cancelada", tone: "outline" },
  expired: { label: "Vencida", tone: "destructive" },
};

const daysLeft = (iso: string): number => {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

/** Tela "Minha assinatura": plano atual da loja, validade e opções de upgrade. */
export default function Assinatura() {
  const { store } = useAuth();

  if (!store) return null;

  const currentPlan = PLANS.find((p) => p.id === store.plan);
  const status = STATUS_LABEL[store.subscription_status] ?? STATUS_LABEL.active;
  const trialDays = store.subscription_status === "trialing" ? daysLeft(store.trial_ends_at) : null;
  const periodEnd = store.current_period_end ? new Date(store.current_period_end).toLocaleDateString("pt-BR") : null;

  return (
    <AppShell title="Minha assinatura">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" aria-hidden />
                Plano {currentPlan?.name ?? store.plan}
              </CardTitle>
              <Badge variant={status.tone}>{status.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {trialDays !== null && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                {trialDays > 0
                  ? `Restam ${trialDays} dia(s) do seu teste grátis de ${TRIAL_DAYS} dias.`
                  : "Seu teste grátis terminou."}
              </p>
            )}
            {periodEnd && store.subscription_status === "active" && (
              <p className="text-sm text-muted-foreground">Próxima cobrança em {periodEnd}.</p>
            )}
            {store.subscription_status === "past_due" && (
              <p className="text-sm text-destructive">
                Não conseguimos cobrar sua assinatura. Regularize o pagamento para manter o cardápio online no ar.
              </p>
            )}
            {currentPlan && (
              <ul className="space-y-1.5 text-sm">
                {currentPlan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold text-foreground">Trocar de plano</h2>
        <div className="grid grid-cols-1 gap-3">
          {PLANS.map((p) => {
            const isCurrent = p.id === store.plan;
            return (
              <Card key={p.id} className={cn(isCurrent && "border-primary")}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-foreground">
                      {p.name}
                      {isCurrent && <span className="ml-2 text-xs font-normal text-primary">(atual)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {brl(p.monthly)}/mês · ou {brl(annualPrice(p.monthly))}/ano
                    </p>
                  </div>
                  {!isCurrent && (
                    <Button size="sm" variant={p.highlight ? "default" : "outline"} asChild>
                      <Link to="/planos">
                        <ArrowUpCircle className="mr-1 h-4 w-4" aria-hidden />
                        Assinar
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Dúvidas sobre cobrança? Fale com o suporte pelo WhatsApp da plataforma.
        </p>
      </div>
    </AppShell>
  );
}
