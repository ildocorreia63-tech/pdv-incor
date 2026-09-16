import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calcularMetricas, useStore } from "@/lib/store";
import { brl } from "@/lib/format";
import type { Config } from "@/lib/types";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — DirectSmash" },
      {
        name: "description",
        content: "Compare os planos Essencial e Crescimento e veja o retorno estimado do seu plano.",
      },
      { property: "og:title", content: "Planos — DirectSmash" },
      { property: "og:description", content: "Planos mensais para recuperação de clientes." },
    ],
  }),
  component: Planos,
});

const PLANOS: {
  nome: Config["plano"];
  preco: number;
  resumo: string;
  recursos: string[];
}[] = [
  {
    nome: "Essencial",
    preco: 97,
    resumo: "Para começar a recuperar clientes com uma campanha por vez.",
    recursos: [
      "Até 500 clientes na base",
      "1 campanha ativa",
      "Importação por CSV",
      "Relatórios básicos de envio",
      "Suporte por e-mail",
    ],
  },
  {
    nome: "Crescimento",
    preco: 197,
    resumo: "Para operações que querem automação completa e mais receita direta.",
    recursos: [
      "Clientes ilimitados",
      "Campanhas ilimitadas com automação",
      "Integrações com PDV e WhatsApp",
      "Relatórios de ROI e economia em taxas",
      "Suporte prioritário no WhatsApp",
    ],
  },
];

function Planos() {
  const { state, salvarConfig } = useStore();
  const m = calcularMetricas(state);

  return (
    <AppShell titulo="Planos" descricao={`Plano atual: ${state.config.plano}`}>
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Com a economia estimada de {brl(m.economia)} em comissões nos últimos 30 dias, o plano
              Crescimento se paga {Math.max(1, Math.round(m.economia / 197))}x no mês.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {PLANOS.map((p) => {
            const atual = state.config.plano === p.nome;
            return (
              <Card key={p.nome} className={atual ? "border-primary" : undefined}>
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div>
                    <CardTitle>{p.nome}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{p.resumo}</p>
                  </div>
                  {atual && <Badge>Plano atual</Badge>}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="font-display text-3xl font-bold">
                    {brl(p.preco)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {p.recursos.map((r) => (
                      <li key={r} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={atual ? "outline" : "default"}
                    disabled={atual}
                    onClick={() => {
                      salvarConfig({ plano: p.nome });
                      toast.success(`Plano alterado para ${p.nome} (demonstração).`);
                    }}
                  >
                    {atual ? "Você está neste plano" : `Mudar para ${p.nome}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Ambiente de demonstração: nenhuma cobrança é realizada.
        </p>
      </div>
    </AppShell>
  );
}
