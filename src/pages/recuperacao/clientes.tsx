import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Ban, Check, Search, Trash2 } from "lucide-react";
import { RecuperacaoShell } from "@/components/recuperacao/RecuperacaoShell";
import { ImportarCsvDialog } from "@/components/recuperacao/ImportarCsvDialog";
import { ImportarPdvButton } from "@/components/recuperacao/ImportarPdvButton";
import { AdicionarCampanhaDialog } from "@/components/recuperacao/AdicionarCampanhaDialog";
import { LgpdAviso } from "@/components/recuperacao/LgpdAviso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useStore } from "@/lib/recuperacao/store";
import { brl, dataBR, diasSemComprar, telefoneMascarado } from "@/lib/recuperacao/format";
import type { Cliente, Origem, StatusCliente } from "@/lib/recuperacao/types";


const PERIODOS = [
  { valor: "todos", label: "Qualquer período" },
  { valor: "7", label: "7+ dias sem comprar" },
  { valor: "15", label: "15+ dias sem comprar" },
  { valor: "30", label: "30+ dias sem comprar" },
  { valor: "recentes", label: "Compraram nos últimos 7 dias" },
] as const;

const STATUS_LABEL: Record<StatusCliente, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  optout: "Opt-out",
};

function StatusBadge({ status }: { status: StatusCliente }) {
  const variante = status === "optout" ? "destructive" : status === "ativo" ? "default" : "outline";
  return <Badge variant={variante}>{STATUS_LABEL[status]}</Badge>;
}

function Clientes() {
  const { state, atualizarCliente, removerCliente } = useStore();
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<string>("todos");
  const [origem, setOrigem] = useState<string>("todas");
  const [status, setStatus] = useState<string>("todos");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [dialogoCampanha, setDialogoCampanha] = useState(false);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return state.clientes.filter((c) => {
      const dias = diasSemComprar(c.ultimaCompra);
      if (termo && !`${c.nome} ${c.telefone} ${c.ultimoPedido}`.toLowerCase().includes(termo))
        return false;
      if (periodo === "recentes" && dias > 7) return false;
      if (["7", "15", "30"].includes(periodo) && dias < Number(periodo)) return false;
      if (origem !== "todas" && c.origem !== origem) return false;
      if (status !== "todos" && c.status !== status) return false;
      return true;
    });
  }, [state.clientes, busca, periodo, origem, status]);

  const selecionadosClientes = state.clientes.filter((c) => selecionados.includes(c.id));
  const economiaPorCliente = useMemo(() => {
    const totais = new Map<string, number>();
    state.execucoes.forEach((execucao) => {
      totais.set(execucao.clienteId, (totais.get(execucao.clienteId) ?? 0) + execucao.economia);
    });
    return totais;
  }, [state.execucoes]);
  const todosMarcados = filtrados.length > 0 && filtrados.every((c) => selecionados.includes(c.id));

  function alternar(id: string) {
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function alternarTodos() {
    setSelecionados(todosMarcados ? [] : filtrados.map((c) => c.id));
  }

  function marcarOptOut(cliente: Cliente) {
    const voltando = cliente.status === "optout";
    atualizarCliente(cliente.id, {
      status: voltando ? "ativo" : "optout",
      consentimento: voltando ? true : false,
    });
    toast.success(
      voltando
        ? `${cliente.nome} voltou a receber mensagens.`
        : `${cliente.nome} marcado como opt-out. Nenhuma mensagem será enviada.`,
    );
  }

  function limparFiltros() {
    setBusca("");
    setPeriodo("todos");
    setOrigem("todas");
    setStatus("todos");
  }

  return (
    <RecuperacaoShell
      titulo="Clientes"
      descricao={`${state.clientes.length} contatos na base · ${filtrados.length} no filtro atual`}
      acoes={
        <>
          <ImportarPdvButton />
          <ImportarCsvDialog />
          <Button
            size="sm"
            disabled={selecionados.length === 0}
            onClick={() => setDialogoCampanha(true)}
          >
            Adicionar à campanha ({selecionados.length})
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="busca">Buscar</Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="busca"
                  className="pl-9"
                  placeholder="Nome, telefone ou pedido"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodo">Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger id="periodo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger id="origem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as origens</SelectItem>
                  {(["PDV", "CSV", "Marketplace"] as Origem[]).map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="optout">Opt-out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filtrados.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-medium">Nenhum cliente encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste os filtros ou importe uma lista de clientes do seu PDV.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                  <ImportarCsvDialog />
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={todosMarcados}
                          onCheckedChange={alternarTodos}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="hidden md:table-cell">Último pedido</TableHead>
                      <TableHead className="hidden sm:table-cell">Última compra</TableHead>
                      <TableHead>Ticket</TableHead>
                       <TableHead className="text-right">Economia</TableHead>
                      <TableHead className="hidden lg:table-cell">Origem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((c) => {
                      const dias = diasSemComprar(c.ultimaCompra);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Checkbox
                              checked={selecionados.includes(c.id)}
                              onCheckedChange={() => alternar(c.id)}
                              aria-label={`Selecionar ${c.nome}`}
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{c.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {telefoneMascarado(c.telefone)}
                              {!c.consentimento && " · sem consentimento"}
                            </p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {c.ultimoPedido}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {dataBR(c.ultimaCompra)}
                            <span className="block text-xs text-muted-foreground">
                              há {dias} dias
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{brl(c.ticket)}</TableCell>
                           <TableCell className="text-right text-sm font-medium text-success">
                             {brl(economiaPorCliente.get(c.id) ?? 0)}
                           </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">{c.origem}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={c.status} />
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={
                                c.status === "optout"
                                  ? `Reativar ${c.nome}`
                                  : `Marcar opt-out de ${c.nome}`
                              }
                              onClick={() => marcarOptOut(c)}
                            >
                              {c.status === "optout" ? (
                                <Check className="size-4" />
                              ) : (
                                <Ban className="size-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Remover ${c.nome}`}
                              onClick={() => {
                                removerCliente(c.id);
                                setSelecionados((s) => s.filter((x) => x !== c.id));
                                toast.success(`${c.nome} removido da base.`);
                              }}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <LgpdAviso />
      </div>

      <AdicionarCampanhaDialog
        clientes={selecionadosClientes}
        aberto={dialogoCampanha}
        onOpenChange={setDialogoCampanha}
      />
    </RecuperacaoShell>
  );
}

export default Clientes;
