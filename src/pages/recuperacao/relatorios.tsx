import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, Download, PiggyBank, Send, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calcularMetricas, useStore } from "@/lib/store";
import { brl, pct } from "@/lib/format";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — DirectSmash" },
      {
        name: "description",
        content:
          "Receita recuperada, economia em comissões, ROI e desempenho por campanha do seu delivery próprio.",
      },
      { property: "og:title", content: "Relatórios — DirectSmash" },
      {
        property: "og:description",
        content: "Acompanhe resultados de recuperação e exporte os dados em CSV.",
      },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { state } = useStore();
  const [periodo, setPeriodo] = useState("30");

  const serie = useMemo(
    () => state.serie.slice(-Number(periodo)),
    [state.serie, periodo],
  );
  const m = calcularMetricas(state);
  const fator = Number(periodo) / 30;

  function exportar() {
    const linhas = [
      ["campanha", "enviados", "entregues", "cliques", "pedidos", "receita", "economia"],
      ...state.campanhas.map((c) => [
        c.nome,
        c.stats.enviados,
        c.stats.entregues,
        c.stats.cliques,
        c.stats.pedidos,
        c.stats.pedidos * state.config.ticketMedio,
        Math.round(c.stats.pedidos * state.config.ticketMedio * (state.config.comissao / 100)),
      ]),
    ];
    const csv = linhas.map((l) => l.join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "directsmash-relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado em CSV.");
  }

  return (
    <AppShell
      titulo="Relatórios"
      descricao="Resultados da recuperação e economia frente aos marketplaces"
      acoes={
        <div className="flex items-center gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-36" aria-label="Período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={exportar}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            titulo="Receita recuperada"
            valor={brl(m.receitaRecuperada * fator)}
            detalhe={`${Math.round(m.recuperados * fator)} pedidos diretos`}
            icone={Banknote}
            tom="positivo"
          />
          <StatCard
            titulo="Economia em comissões"
            valor={brl(m.economia * fator)}
            detalhe={`Comissão de ${state.config.comissao}% evitada`}
            icone={PiggyBank}
            tom="positivo"
          />
          <StatCard
            titulo="Mensagens enviadas"
            valor={String(Math.round(m.enviados * fator))}
            detalhe={`${Math.round(m.entregues * fator)} entregues`}
            icone={Send}
          />
          <StatCard
            titulo="ROI estimado"
            valor={pct(m.roi)}
            detalhe={`Lucro incremental ${brl(m.lucroIncremental * fator)}`}
            icone={TrendingUp}
            tom={m.roi > 0 ? "positivo" : "alerta"}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Receita direta por dia</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie}>
                  <defs>
                    <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="hsl(var(--primary))"
                    fill="url(#gr)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mensagens x conversões</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="dia" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={32} />
                  <Tooltip />
                  <Bar dataKey="mensagens" fill="hsl(var(--muted-foreground))" radius={3} />
                  <Bar dataKey="conversoes" fill="hsl(var(--primary))" radius={3} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Desempenho por campanha</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Conversão</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Economia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.campanhas.map((c) => {
                  const receita = c.stats.pedidos * state.config.ticketMedio;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-right">{c.stats.enviados}</TableCell>
                      <TableCell className="text-right">{c.stats.cliques}</TableCell>
                      <TableCell className="text-right">{c.stats.pedidos}</TableCell>
                      <TableCell className="text-right">
                        {pct(c.stats.enviados ? (c.stats.pedidos / c.stats.enviados) * 100 : 0)}
                      </TableCell>
                      <TableCell className="text-right">{brl(receita)}</TableCell>
                      <TableCell className="text-right text-success">
                        {brl(receita * (state.config.comissao / 100))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
