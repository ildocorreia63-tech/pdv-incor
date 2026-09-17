import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import { RecuperacaoShell } from "@/components/recuperacao/RecuperacaoShell";
import { LgpdAviso } from "@/components/recuperacao/LgpdAviso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { dentroDoHorario, elegivel, jaRecebeu, publicoElegivel, useStore } from "@/lib/recuperacao/store";
import { dataHoraBR } from "@/lib/recuperacao/format";


const ETAPAS = [
  { id: "compra", nome: "Compra registrada", detalhe: "Entrada vinda do PDV, CSV ou webhook" },
  { id: "espera", nome: "Espera pelo gatilho", detalhe: "7, 15 ou 30 dias sem comprar" },
  { id: "consentimento", nome: "Verifica consentimento", detalhe: "Opt-in e opt-out respeitados" },
  { id: "horario", nome: "Verifica janela de horário", detalhe: "Envio apenas em horário comercial" },
  { id: "envio", nome: "Envia mensagem", detalhe: "Mensagem personalizada no WhatsApp" },
  { id: "clique", nome: "Registra clique", detalhe: "Acompanha acesso ao cardápio próprio" },
  { id: "pedido", nome: "Registra pedido direto", detalhe: "Pedido feito fora do marketplace" },
  { id: "economia", nome: "Calcula economia", detalhe: "Comissão que deixou de ser paga" },
] as const;

function IconeResultado({ resultado }: { resultado: string }) {
  if (resultado === "sucesso") return <CheckCircle2 className="size-4 text-success" />;
  if (resultado === "falha") return <XCircle className="size-4 text-destructive" />;
  return <CircleSlash className="size-4 text-muted-foreground" />;
}

function Automacoes() {
  const { state, toggleEtapa, setAutomacao, registrarExecucao } = useStore();
  const [rodando, setRodando] = useState(false);

  function simularFluxo() {
    if (!state.automacaoAtiva) {
      toast.error("Ative a automação para simular o fluxo.");
      return;
    }
    const ativas = state.campanhas.filter((c) => c.ativa);
    if (ativas.length === 0) {
      toast.error("Nenhuma campanha ativa para executar.");
      return;
    }
    setRodando(true);
    window.setTimeout(async () => {
      let total = 0;
      const registros = ativas.flatMap((campanha) =>
        publicoElegivel(state.clientes, campanha).slice(0, 4).map(async (cliente, indice) => {
            const check = elegivel(cliente);
            const noHorario =
              !state.etapasAtivas["horario"] ||
              dentroDoHorario(campanha.horaInicio, campanha.horaFim);
            const repetido = jaRecebeu(state.execucoes, cliente.id, campanha.id);
            const ok = check.ok && noHorario && !repetido && !!state.etapasAtivas["envio"];
            const convertido = ok && indice === 0;
            total += 1;
            await registrarExecucao({
              id: `auto-${Date.now()}-${cliente.id}-${campanha.id}`,
              data: new Date().toISOString(),
              clienteId: cliente.id,
              clienteNome: cliente.nome,
              campanhaId: campanha.id,
              campanhaNome: campanha.nome,
              resultado: ok ? "sucesso" : "ignorado",
              motivo: ok
                ? "Fluxo concluído na simulação"
                : repetido
                  ? "Já recebeu nos últimos 7 dias"
                  : !noHorario
                    ? "Fora da janela de horário"
                    : check.motivo,
              convertido,
              valorConversao: convertido ? cliente.ticket : 0,
              taxaComissao: state.config.comissao,
              economia: convertido ? cliente.ticket * (state.config.comissao / 100) : 0,
              etapas: ETAPAS.map((e) => ({
                nome: e.nome,
                ok: !!state.etapasAtivas[e.id] && (e.id === "consentimento" ? check.ok : true),
                detalhe: e.detalhe,
              })),
            });
          }),
      );
      try {
        await Promise.all(registros);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar o histórico.");
        setRodando(false);
        return;
      }
      setRodando(false);
      toast.success(`${total} execução(ões) simuladas. Veja o log abaixo.`);
    }, 900);
  }

  return (
    <RecuperacaoShell
      titulo="Automações"
      descricao="Fluxo de recuperação com regras de consentimento, horário e anti-repetição"
      acoes={
        <Button size="sm" onClick={simularFluxo} disabled={rodando}>
          {rodando ? "Executando…" : "Simular fluxo"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-medium">Automação geral</p>
              <p className="text-sm text-muted-foreground">
                Quando desligada, nenhuma campanha dispara automaticamente.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto">{state.automacaoAtiva ? "Ligada" : "Desligada"}</Label>
              <Switch
                id="auto"
                checked={state.automacaoAtiva}
                onCheckedChange={(v) => {
                  setAutomacao(v);
                  toast.success(v ? "Automação ligada." : "Automação desligada.");
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etapas do fluxo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ETAPAS.map((e, i) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.detalhe}</p>
                  </div>
                </div>
                <Switch
                  checked={!!state.etapasAtivas[e.id]}
                  aria-label={`Ativar etapa ${e.nome}`}
                  onCheckedChange={() => toggleEtapa(e.id)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log de execuções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.execucoes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma execução registrada. Use “Simular fluxo” para gerar exemplos.
              </p>
            ) : (
              state.execucoes.slice(0, 20).map((e) => (
                <details key={e.id} className="rounded-lg border p-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                    <IconeResultado resultado={e.resultado} />
                    <span className="font-medium">{e.clienteNome}</span>
                    <span className="text-muted-foreground">· {e.campanhaNome}</span>
                    <Badge variant="outline" className="ml-auto">
                      {dataHoraBR(e.data)}
                    </Badge>
                  </summary>
                  <p className="mt-2 text-xs text-muted-foreground">{e.motivo}</p>
                  <ul className="mt-2 space-y-1">
                    {e.etapas.map((et) => (
                      <li key={et.nome} className="flex items-center gap-2 text-xs">
                        {et.ok ? (
                          <CheckCircle2 className="size-3.5 text-success" />
                        ) : (
                          <CircleSlash className="size-3.5 text-muted-foreground" />
                        )}
                        <span className="font-medium">{et.nome}</span>
                        <span className="text-muted-foreground">— {et.detalhe}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))
            )}
          </CardContent>
        </Card>

        <LgpdAviso />
      </div>
    </RecuperacaoShell>
  );
}

export default Automacoes;
