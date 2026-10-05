import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PLANS, annualPrice, brl, TRIAL_DAYS } from "@/lib/plans";

/** Página pública de vendas do SaaS. */
export default function Planos() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <section className="mx-auto max-w-5xl text-center">
        <h1 className="text-3xl font-bold text-foreground md:text-5xl">O sistema completo da sua hamburgueria</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          PDV, cardápio online com link próprio, delivery por km, cozinha e recuperação de clientes. Teste {TRIAL_DAYS} dias grátis.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link to="/auth">Começar teste grátis</Link>
        </Button>
      </section>
      <section className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3" aria-label="Planos">
        {PLANS.map((p) => (
          <Card key={p.id} className={cn(p.highlight && "border-primary shadow-lg")}>
            <CardHeader>
              {p.highlight && <span className="text-xs font-semibold uppercase text-primary">Mais escolhido</span>}
              <CardTitle>{p.name}</CardTitle>
              <p className="text-3xl font-bold text-foreground">
                {brl(p.monthly)}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground">ou {brl(annualPrice(p.monthly))}/ano (2 meses grátis)</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
