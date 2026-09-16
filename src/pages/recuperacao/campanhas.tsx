import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleSlash, History, Pencil, Play, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CampanhaEditor, campanhaVazia } from "@/components/CampanhaEditor";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { LgpdAviso } from "@/components/LgpdAviso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  dentroDoHorario,
  elegivel,
  jaRecebeu,
  publicoElegivel,
  useStore,
} from "@/lib/store";
import { previaCampanha } from "@/lib/message";
import { brl, dataBR, dataHoraBR, pct } from "@/lib/format";
import type { Campanha } from "@/lib/types";

export const Route = createFileRoute("/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas — DirectSmash" },
      {
        name: "description",
        content:
          "Crie campanhas de recuperação por 7, 15 e 30 dias com mensagem personalizada e simulação de envio.",
      },
      { property: "og:title", content: "Campanhas — DirectSmash" },
      {
        property: "og:description",
        content: "Gatilhos, segmentos, ofertas e prévia da mensagem no WhatsApp.",
      },
    ],
  }),
  component: Campanhas,
});

function Campanhas() {
  const { state, salvarCampanha, removerCampanha, registrarExecucao } = useStore();
  const [editando, setEditando] = useState<Campanha | null>(null);
  const [simulando, setSimulando] = useState<string | null>(null);

  function simular(campanha: Campanha) {
    const publico = publicoElegivel(state.clientes, campanha);
    if (publico.length === 0) {
      toast.error("Nenhum cliente elegível para esta campanha agora.");
      return;
    }
    setSimulando(campanha.id);
    window.setTimeout(async () => {
      const noHorario = dentroDoHorario(campanha.horaInicio, campanha.horaFim);
      let enviados = 0;
      let adiados = 0;
      const registros = publico.slice(0, 12).map(async (cliente, indice) => {
        const repetido = jaRecebeu(state.execucoes, cliente.id, campanha.id);
        const ok = noHorario && !repetido && elegivel(cliente).ok;
        if (ok) enviados += 1;
        else adiados += 1;
        const convertido = ok && indice % 5 === 0;
        await registrarExecucao({
          id: `exec-${Date.now()}-${cliente.id}`,
          data: new Date().toISOString(),
          clienteId: cliente.id,
          clienteNome: cliente.nome,
          campanhaId: campanha.id,
          campanhaNome: campanha.nome,
          resultado: ok ? "sucesso" : "ignorado",
          motivo: ok
            ? "Mensagem simulada enviada"
            : repetido
              ? "Já recebeu esta campanha nos últimos 7 dias"
              : !noHorario
                ? `Fora da janela ${campanha.horaInicio}–${campanha.horaFim}`
                : elegivel(cliente).motivo,
          convertido,
          valorConversao: convertido ? cliente.ticket : 0,
          taxaComissao: state.config.comissao,
          economia: convertido ? cliente.ticket * (state.config.comissao / 100) : 0,
          etapas: [
            { nome: "Elegibilidade", ok: elegivel(cliente).ok, detalhe: elegivel(cliente).motivo },
            { nome: "Anti-repetição", ok: !repetido, detalhe: "Limite de 1 envio a cada 7 dias" },
            {
              nome: "Janela de horário",
              ok: noHorario,
              detalhe: `${campanha.horaInicio}–${campanha.horaFim}`,
            },
            { nome: "Envio", ok, detalhe: "Simulação: nenhuma mensagem real é enviada" },
          ],
        });
      });
      try {
        await Promise.all(registros);
        await salvarCampanha({
        ...campanha,
        stats: {
          ...campanha.stats,
          enviados: campanha.stats.enviados + enviados,
          entregues: campanha.stats.entregues + Math.round(enviados * 0.96),
          cliques: campanha.stats.cliques + Math.round(enviados * 0.32),
          pedidos: campanha.stats.pedidos + Math.round(enviados * 0.15),
        },
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar a execução.");
        setSimulando(null);
        return;
      }
      setSimulando(null);
      toast.success(`${enviados} envio(s) simulado(s) · ${adiados} bloqueado(s) pelas regras.`);
    }, 800);
  }

  return (
    <AppShell
      titulo="Campanhas"
      descricao={`${state.campanhas.length} campanhas · ${state.campanhas.filter((c) => c.ativa).length} ativas`}
      acoes={
        <Button
          size="sm"
          onClick={() =>
            setEditando(campanhaVazia(state.config.linkCardapio, state.config.beneficioTexto))
          }
        >
          Nova campanha
        </Button>
      }
    >
      <div className="space-y-4">
        {state.campanhas.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <p className="font-medium">Nenhuma campanha criada</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece com o gatilho de 7 dias sem comprar.
              </p>
              <Button
                className="mt-4"
                onClick={() =>
                  setEditando(campanhaVazia(state.config.linkCardapio, state.config.beneficioTexto))
                }
              >
                Criar primeira campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {state.campanhas.map((c) => {
              const publico = publicoElegivel(state.clientes, c).length;
              const taxa = c.stats.enviados ? (c.stats.pedidos / c.stats.enviados) * 100 : 0;
              return (
                <Card key={c.id}>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{c.nome}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.gatilhoDias} dias sem comprar · {c.horaInicio}–{c.horaFim} · criada em{" "}
                        {dataBR(c.criadaEm)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={c.ativa ? "default" : "outline"}>
                        {c.ativa ? "Ativa" : "Pausada"}
                      </Badge>
                      <Switch
                        checked={c.ativa}
                        aria-label={`Ativar campanha ${c.nome}`}
                        onCheckedChange={(v) => {
                          void salvarCampanha({ ...c, ativa: v })
                            .then(() => toast.success(v ? "Campanha ativada." : "Campanha pausada."))
                            .catch((error: unknown) =>
                              toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."),
                            );
                        }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Público elegível</p>
                        <p className="font-semibold">{publico}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Enviados</p>
                        <p className="font-semibold">{c.stats.enviados}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pedidos</p>
                        <p className="font-semibold">{c.stats.pedidos}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Conversão</p>
                        <p className="font-semibold">{pct(taxa)}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Oferta: {c.beneficio} · receita estimada{" "}
                      {brl(c.stats.pedidos * state.config.ticketMedio)}
                    </p>

                    <WhatsAppPreview texto={previaCampanha(c)} titulo="Prévia" />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => simular(c)}
                        disabled={simulando === c.id}
                      >
                        <Play className="size-4" />
                        {simulando === c.id ? "Simulando…" : "Simular envio"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditando(c)}>
                        <Pencil className="size-4" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                           void removerCampanha(c.id)
                             .then(() => toast.success("Campanha removida."))
                             .catch((error: unknown) =>
                               toast.error(error instanceof Error ? error.message : "Não foi possível excluir."),
                             );
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" /> Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" /> Histórico de execução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.execucoes.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                Nenhuma execução registrada nesta conta.
              </p>
            ) : (
              state.execucoes.slice(0, 30).map((execucao) => (
                <div key={execucao.id} className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    {execucao.resultado === "sucesso" ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <CircleSlash className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{execucao.clienteNome} · {execucao.campanhaNome}</p>
                      <p className="truncate text-xs text-muted-foreground">{execucao.motivo}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{dataHoraBR(execucao.data)}</span>
                  <div className="text-right">
                    <p className="font-semibold text-success">{brl(execucao.economia)}</p>
                    <p className="text-xs text-muted-foreground">economia</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <LgpdAviso />
      </div>

      <CampanhaEditor campanha={editando} onOpenChange={(a) => !a && setEditando(null)} />
    </AppShell>
  );
}
