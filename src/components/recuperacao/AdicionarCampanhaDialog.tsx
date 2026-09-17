import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { elegivel, useStore } from "@/lib/recuperacao/store";
import type { Cliente } from "@/lib/recuperacao/types";

export interface AdicionarCampanhaDialogProps {
  clientes: Cliente[];
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}

export function AdicionarCampanhaDialog({
  clientes,
  aberto,
  onOpenChange,
}: AdicionarCampanhaDialogProps) {
  const { state, registrarExecucao } = useStore();
  const [campanhaId, setCampanhaId] = useState(state.campanhas[0]?.id ?? "");

  const campanha = state.campanhas.find((c) => c.id === campanhaId);

  async function confirmar() {
    if (!campanha) {
      toast.error("Selecione uma campanha.");
      return;
    }
    let incluidos = 0;
    let ignorados = 0;
    await Promise.all(clientes.map(async (cliente) => {
      const check = elegivel(cliente);
      if (check.ok) incluidos += 1;
      else ignorados += 1;
      await registrarExecucao({
        id: `exec-${Date.now()}-${cliente.id}`,
        data: new Date().toISOString(),
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        campanhaId: campanha.id,
        campanhaNome: campanha.nome,
        resultado: check.ok ? "sucesso" : "ignorado",
        motivo: check.ok ? "Adicionado manualmente à fila da campanha" : check.motivo,
        convertido: false,
        valorConversao: 0,
        taxaComissao: state.config.comissao,
        economia: 0,
        etapas: [
          { nome: "Consentimento", ok: cliente.consentimento, detalhe: check.motivo },
          { nome: "Opt-out", ok: cliente.status !== "optout", detalhe: "Verificação de opt-out" },
          { nome: "Fila", ok: check.ok, detalhe: "Entrada na fila da campanha" },
        ],
      });
    }));
    onOpenChange(false);
    toast.success(
      `${incluidos} cliente(s) na fila de "${campanha.nome}"${ignorados ? ` · ${ignorados} bloqueado(s) por consentimento/opt-out` : ""}`,
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à campanha</DialogTitle>
          <DialogDescription>
            {clientes.length} cliente(s) selecionado(s). Quem não tem consentimento ou pediu opt-out
            é automaticamente bloqueado.
          </DialogDescription>
        </DialogHeader>

        {state.campanhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha criada ainda. Crie uma campanha para montar a fila de envios.
          </p>
        ) : (
          <Select value={campanhaId} onValueChange={setCampanhaId}>
            <SelectTrigger aria-label="Campanha">
              <SelectValue placeholder="Escolha a campanha" />
            </SelectTrigger>
            <SelectContent>
              {state.campanhas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} · {c.gatilhoDias} dias
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} disabled={state.campanhas.length === 0}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
