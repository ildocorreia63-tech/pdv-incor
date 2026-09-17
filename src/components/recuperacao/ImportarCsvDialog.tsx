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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LgpdAviso } from "@/components/recuperacao/LgpdAviso";
import { useStore } from "@/lib/recuperacao/store";
import type { Cliente } from "@/lib/recuperacao/types";

const EXEMPLO = `nome;telefone;ultima_compra;ultimo_pedido;ticket
Ana Souza;(11) 98888-1122;2026-09-01;Smash Duplo + Batata;68
Carlos Mendes;(11) 97777-3344;2026-08-20;Cheddar Bacon;54`;

interface Linha {
  cliente: Cliente;
  erro?: string;
}

function parse(texto: string): { validos: Linha[]; invalidos: Linha[] } {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const semCabecalho = linhas.filter((l, i) => !(i === 0 && /nome/i.test(l) && /telefone/i.test(l)));
  const validos: Linha[] = [];
  const invalidos: Linha[] = [];

  semCabecalho.forEach((linha, i) => {
    const partes = linha.split(/[;,]/).map((p) => p.trim());
    const [nome, telefone, ultimaCompra, ultimoPedido, ticket] = partes;
    const cliente: Cliente = {
      id: `csv-${Date.now()}-${i}`,
      nome: nome ?? "",
      telefone: telefone ?? "",
      ultimaCompra: new Date(ultimaCompra ?? "").toString() === "Invalid Date"
        ? new Date().toISOString()
        : new Date(ultimaCompra ?? "").toISOString(),
      ultimoPedido: ultimoPedido || "Pedido não informado",
      ticket: Number((ticket ?? "0").replace(",", ".")) || 0,
      origem: "CSV",
      consentimento: true,
      status: "ativo",
      historico: [],
    };
    if (!cliente.nome || (telefone ?? "").replace(/\D/g, "").length < 10) {
      invalidos.push({ cliente, erro: "Nome ou telefone inválido" });
    } else {
      validos.push({ cliente });
    }
  });

  return { validos, invalidos };
}

export function ImportarCsvDialog() {
  const { adicionarClientes } = useStore();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const { validos, invalidos } = parse(texto);

  function importar() {
    if (!consentimento) {
      toast.error("Confirme que possui autorização para usar estes contatos.");
      return;
    }
    if (validos.length === 0) {
      toast.error("Nenhuma linha válida encontrada.");
      return;
    }
    setCarregando(true);
    window.setTimeout(() => {
      adicionarClientes(validos.map((v) => v.cliente));
      setCarregando(false);
      setAberto(false);
      setTexto("");
      setConsentimento(false);
      toast.success(
        `${validos.length} cliente(s) importado(s)${invalidos.length ? ` · ${invalidos.length} ignorado(s)` : ""}`,
      );
    }, 700);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar clientes por CSV</DialogTitle>
          <DialogDescription>
            Cole o conteúdo do arquivo. Colunas: nome; telefone; última compra; último pedido;
            ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            rows={7}
            value={texto}
            placeholder={EXEMPLO}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Conteúdo do CSV"
          />
          <button
            type="button"
            className="text-xs text-primary underline-offset-4 hover:underline"
            onClick={() => setTexto(EXEMPLO)}
          >
            Usar exemplo
          </button>

          {texto.trim() && (
            <p className="text-xs text-muted-foreground">
              {validos.length} linha(s) válida(s) · {invalidos.length} com problema
            </p>
          )}

          <div className="flex items-start gap-2">
            <Checkbox
              id="consent-csv"
              checked={consentimento}
              onCheckedChange={(v) => setConsentimento(v === true)}
            />
            <Label htmlFor="consent-csv" className="text-xs leading-relaxed text-muted-foreground">
              Declaro que tenho autorização destes clientes para enviar mensagens.
            </Label>
          </div>
          <LgpdAviso />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={importar} disabled={carregando}>
            {carregando ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
