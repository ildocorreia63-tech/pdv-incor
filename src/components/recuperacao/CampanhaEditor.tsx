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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppPreview } from "@/components/recuperacao/WhatsAppPreview";
import { useStore } from "@/lib/recuperacao/store";
import { MODELOS_MENSAGEM, VARIAVEIS, previaCampanha } from "@/lib/recuperacao/message";
import type { Campanha } from "@/lib/recuperacao/types";

export function campanhaVazia(linkCardapio: string, beneficio: string): Campanha {
  return {
    id: `cmp-${Date.now()}`,
    nome: "",
    gatilhoDias: 7,
    horaInicio: "11:00",
    horaFim: "21:00",
    segmento: "todos",
    beneficio,
    linkCardapio,
    mensagem: MODELOS_MENSAGEM[0]!.texto,
    ativa: true,
    criadaEm: new Date().toISOString(),
    stats: { enviados: 0, entregues: 0, cliques: 0, pedidos: 0 },
  };
}

export interface CampanhaEditorProps {
  campanha: Campanha | null;
  onOpenChange: (aberto: boolean) => void;
}

export function CampanhaEditor({ campanha, onOpenChange }: CampanhaEditorProps) {
  const { salvarCampanha } = useStore();
  const [form, setForm] = useState<Campanha | null>(campanha);
  const [erro, setErro] = useState("");

  // Sincroniza quando o diálogo abre com outra campanha.
  if (campanha && form?.id !== campanha.id) setForm(campanha);

  if (!form) return null;
  const set = (p: Partial<Campanha>) => setForm({ ...form, ...p });

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return setErro("Dê um nome para a campanha.");
    if (form.gatilhoDias < 1) return setErro("O gatilho deve ser de pelo menos 1 dia.");
    if (!/^https?:\/\/.+/.test(form.linkCardapio.trim()))
      return setErro("Informe um link de cardápio válido.");
    if (!form.mensagem.includes("{{nome}}"))
      return setErro("A mensagem precisa conter a variável {{nome}}.");
    if (form.horaInicio >= form.horaFim)
      return setErro("O horário final precisa ser maior que o inicial.");
    setErro("");
    try {
      await salvarCampanha(form);
      onOpenChange(false);
      toast.success("Campanha salva na sua conta.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a campanha.");
    }
  }

  return (
    <Dialog open={!!campanha} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campanha?.nome ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          <DialogDescription>
            Defina gatilho, segmento, oferta e mensagem. A prévia mostra como o cliente recebe.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cnome">Nome da campanha</Label>
            <Input id="cnome" value={form.nome} onChange={(e) => set({ nome: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cgatilho">Dias sem comprar (gatilho)</Label>
            <Input
              id="cgatilho"
              type="number"
              min={1}
              value={form.gatilhoDias}
              onChange={(e) => set({ gatilhoDias: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="csegmento">Segmento</Label>
            <Select
              value={form.segmento}
              onValueChange={(v) => set({ segmento: v as Campanha["segmento"] })}
            >
              <SelectTrigger id="csegmento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                <SelectItem value="alto-ticket">Alto ticket (R$ 70+)</SelectItem>
                <SelectItem value="inativos">Inativos (15+ dias)</SelectItem>
                <SelectItem value="aniversariantes">Aniversariantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cbeneficio">Benefício</Label>
            <Input
              id="cbeneficio"
              value={form.beneficio}
              onChange={(e) => set({ beneficio: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clink">Link do cardápio</Label>
            <Input
              id="clink"
              value={form.linkCardapio}
              onChange={(e) => set({ linkCardapio: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cini">Envio a partir de</Label>
            <Input
              id="cini"
              type="time"
              value={form.horaInicio}
              onChange={(e) => set({ horaInicio: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfim">Envio até</Label>
            <Input
              id="cfim"
              type="time"
              value={form.horaFim}
              onChange={(e) => set({ horaFim: e.target.value })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="cmensagem">Mensagem</Label>
            <Textarea
              id="cmensagem"
              rows={5}
              value={form.mensagem}
              onChange={(e) => set({ mensagem: e.target.value })}
            />
            <div className="flex flex-wrap gap-1.5">
              {VARIAVEIS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-accent/10"
                  onClick={() => set({ mensagem: `${form.mensagem} ${v}` })}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MODELOS_MENSAGEM.map((m) => (
                <button
                  key={m.titulo}
                  type="button"
                  className="rounded-md border border-dashed px-2 py-1 text-xs hover:bg-accent/10"
                  onClick={() => set({ mensagem: m.texto })}
                  title={m.tom}
                >
                  {m.titulo}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <WhatsAppPreview texto={previaCampanha(form)} titulo="Marina (exemplo)" />
          </div>
        </div>

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void salvar()}>Salvar campanha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
