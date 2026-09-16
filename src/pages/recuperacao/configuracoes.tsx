import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LgpdAviso } from "@/components/LgpdAviso";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useStore } from "@/lib/store";
import type { Config, Origem } from "@/lib/types";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — DirectSmash" },
      {
        name: "description",
        content:
          "Dados da hamburgueria, comissão do marketplace, horários de envio, assinatura e privacidade.",
      },
      { property: "og:title", content: "Configurações — DirectSmash" },
      {
        property: "og:description",
        content: "Ajuste as regras que alimentam campanhas e relatórios.",
      },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const { state, salvarConfig, restaurarDemo } = useStore();
  const [form, setForm] = useState<Config>(state.config);
  const [erro, setErro] = useState("");
  const set = (p: Partial<Config>) => setForm({ ...form, ...p });

  function salvar() {
    if (!form.nomeEmpresa.trim()) return setErro("Informe o nome da hamburgueria.");
    if (!/^https?:\/\/.+/.test(form.linkCardapio.trim()))
      return setErro("Informe um link de cardápio válido (começando com http).");
    if (form.comissao < 0 || form.comissao > 60)
      return setErro("A comissão deve estar entre 0% e 60%.");
    if (form.ticketMedio <= 0) return setErro("O ticket médio deve ser maior que zero.");
    if (form.horaInicio >= form.horaFim)
      return setErro("O horário final precisa ser maior que o inicial.");
    setErro("");
    salvarConfig(form);
    toast.success("Configurações salvas.");
  }

  return (
    <AppShell titulo="Configurações" descricao="Dados da operação, envio e privacidade">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Hamburgueria</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nomeEmpresa}
                onChange={(e) => set({ nomeEmpresa: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link">Link do cardápio próprio</Label>
              <Input
                id="link"
                value={form.linkCardapio}
                onChange={(e) => set({ linkCardapio: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comissao">Comissão do marketplace (%)</Label>
              <Input
                id="comissao"
                type="number"
                min={0}
                max={60}
                value={form.comissao}
                onChange={(e) => set({ comissao: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ticket">Ticket médio (R$)</Label>
              <Input
                id="ticket"
                type="number"
                min={1}
                value={form.ticketMedio}
                onChange={(e) => set({ ticketMedio: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="origem">Origem principal dos clientes</Label>
              <Select
                value={form.origemPrincipal}
                onValueChange={(v) => set({ origemPrincipal: v as Origem })}
              >
                <SelectTrigger id="origem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDV">PDV</SelectItem>
                  <SelectItem value="Marketplace">Marketplace</SelectItem>
                  <SelectItem value="CSV">Planilha / CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custo">Custo do benefício por pedido (R$)</Label>
              <Input
                id="custo"
                type="number"
                min={0}
                value={form.custoBeneficio}
                onChange={(e) => set({ custoBeneficio: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Oferta e envio</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="beneficio">Benefício padrão</Label>
              <Input
                id="beneficio"
                value={form.beneficioTexto}
                onChange={(e) => set({ beneficioTexto: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assinatura">Assinatura das mensagens</Label>
              <Input
                id="assinatura"
                value={form.assinatura}
                onChange={(e) => set({ assinatura: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ini">Envios a partir de</Label>
              <Input
                id="ini"
                type="time"
                value={form.horaInicio}
                onChange={(e) => set({ horaInicio: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fim">Envios até</Label>
              <Input
                id="fim"
                type="time"
                value={form.horaFim}
                onChange={(e) => set({ horaFim: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacidade e dados</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="descadastro">Texto de descadastro</Label>
              <Textarea
                id="descadastro"
                rows={2}
                value={form.textoDescadastro}
                onChange={(e) => set({ textoDescadastro: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retencao">Retenção dos dados (meses)</Label>
              <Input
                id="retencao"
                type="number"
                min={1}
                max={60}
                value={form.retencaoMeses}
                onChange={(e) => set({ retencaoMeses: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tema">Tema</Label>
              <Select
                value={form.tema}
                onValueChange={(v) => set({ tema: v as Config["tema"] })}
              >
                <SelectTrigger id="tema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={salvar}>Salvar configurações</Button>
          <Button
            variant="outline"
            onClick={() => {
              restaurarDemo();
              toast.success("Dados de demonstração restaurados.");
            }}
          >
            Restaurar dados de demonstração
          </Button>
        </div>

        <LgpdAviso />
      </div>
    </AppShell>
  );
}
