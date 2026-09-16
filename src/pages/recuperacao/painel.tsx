import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeDollarSign,
  Coins,
  MousePointerClick,
  Percent,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { LgpdAviso } from "@/components/LgpdAviso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { calcularMetricas, elegivel, useStore } from "@/lib/store";
import { brl, diasSemComprar, pct, telefoneMascarado } from "@/lib/format";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard — DirectSmash" },
      {
        name: "description",
        content: "Acompanhe clientes recuperados, pedidos diretos, economia em taxas e ROI.",
      },
      { property: "og:title", content: "Dashboard — DirectSmash" },
      { property: "og:description", content: "Resultados da recuperação de clientes no delivery próprio." },
    ],
  }),
  component: Painel,
});

function Painel() {
  const { state } = useStore();
  const m = calcularMetricas(state);

  const oportunidades = state.clientes
    .filter((c) => elegivel(c).ok)
    .map((c) => ({ c, dias: diasSemComprar(c.ultimaCompra) }))
    .filter(({ dias }) => [7, 15, 30].some((g) => dias >= g && dias <= g + 2))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 6);

  const funil = [
    { label: "Elegíveis", valor: state.clientes.filter((c) => elegivel(c).ok).length * 12 },
    { label: "Mensagens enviadas", valor: m.enviados },
    { label: "Cliques", valor: m.cliques },
    { label: "Pedidos", valor: m.pedidosDiretos },
  ];
  const topo = Math.max(...funil.map((f) => f.valor), 1);

  return (
    <AppShell
      titulo={`Olá, ${state.config.nomeEmpresa}`}
      descricao="Resultados estimados dos últimos 30 dias"
      acoes={
        <Button asChild size="sm">
          <Link to="/campanhas">Nova campanha</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard titulo="Clientes cadastrados" valor={String(m.totalClientes)} icone={Users} detalhe="base ativa na plataforma" />
          <StatCard titulo="Clientes recuperados" valor={String(m.recuperados)} icone={Sparkles} tom="positivo" detalhe="voltaram após campanha" />
          <StatCard titulo="Pedidos diretos estimados" valor={String(m.pedidosDiretos)} icone={ShoppingBag} detalhe="fora do marketplace" />
          <StatCard titulo="Economia estimada em taxas" valor={brl(m.economia)} icone={Coins} tom="positivo" detalhe={`comissão de ${state.config.comissao}%`} />
          <StatCard titulo="Receita recuperada" valor={brl(m.receitaRecuperada)} icone={BadgeDollarSign} detalhe={`ticket médio ${brl(state.config.ticketMedio)}`} />
          <StatCard titulo="ROI estimado" valor={pct(m.roi, 0)} icone={Percent} tom="alerta" detalhe="sobre o custo do benefício" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Últimos 30 dias</CardTitle>
            </CardHeader>
            <CardContent className="h-72 pl-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={state.serie} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} interval={5} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" width={44} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                  />
                  <Area type="monotone" dataKey="mensagens" name="Mensagens" stroke="var(--color-chart-2)" fill="url(#gMsg)" strokeWidth={2} />
                  <Area type="monotone" dataKey="conversoes" name="Conversões" stroke="var(--color-chart-3)" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="receita" name="Receita (R$)" stroke="var(--color-chart-1)" fill="url(#gRec)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de recuperação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {funil.map((f) => (
                <div key={f.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold">{f.valor}</span>
                  </div>
                  <Progress value={(f.valor / topo) * 100} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Valores estimados a partir dos dados de demonstração.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Oportunidades de hoje</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/clientes">Ver clientes</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {oportunidades.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum cliente atingiu 7, 15 ou 30 dias sem comprar hoje.
                </p>
              )}
              {oportunidades.map(({ c, dias }) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {telefoneMascarado(c.telefone)} · {c.ultimoPedido}
                    </p>
                  </div>
                  <Badge variant="secondary">{dias} dias</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Campanhas recentes</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/campanhas">Gerenciar</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.campanhas.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      <MousePointerClick className="mr-1 inline size-3" />
                      {c.stats.cliques} cliques · {c.stats.pedidos} pedidos
                    </p>
                  </div>
                  <Badge variant={c.ativa ? "default" : "outline"}>
                    {c.ativa ? "Ativa" : "Pausada"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <LgpdAviso />
      </div>
    </AppShell>
  );
}
