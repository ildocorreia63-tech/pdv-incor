import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LgpdAviso } from "@/components/LgpdAviso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import type { StatusIntegracao } from "@/lib/types";

export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: "Integrações — DirectSmash" },
      {
        name: "description",
        content:
          "Conecte WhatsApp Business API, PDV, Make, Typebot, ManyChat e webhooks ao DirectSmash.",
      },
      { property: "og:title", content: "Integrações — DirectSmash" },
      {
        property: "og:description",
        content: "Requisitos técnicos e status simulado de cada conexão.",
      },
    ],
  }),
  component: Integracoes,
});

const ROTULO: Record<StatusIntegracao, string> = {
  "nao-conectado": "Não conectado",
  "em-teste": "Em teste",
  conectado: "Conectado",
};

function Integracoes() {
  const { state, setIntegracao } = useStore();
  const [testando, setTestando] = useState<string | null>(null);

  function testar(id: string, nome: string) {
    setTestando(id);
    window.setTimeout(() => {
      setIntegracao(id, "em-teste");
      setTestando(null);
      toast.success(`Teste simulado concluído em ${nome}. Nenhum dado real foi trafegado.`);
    }, 800);
  }

  return (
    <AppShell
      titulo="Integrações"
      descricao="Conexões simuladas: nenhuma credencial real é solicitada ou armazenada"
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {state.integracoes.map((i) => (
            <Card key={i.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate">{i.nome}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{i.descricao}</p>
                </div>
                <Badge
                  variant={
                    i.status === "conectado"
                      ? "default"
                      : i.status === "em-teste"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {ROTULO[i.status]}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    O que é necessário
                  </p>
                  <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                    {i.requisitos.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  {i.status === "conectado" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIntegracao(i.id, "nao-conectado");
                        toast.success(`${i.nome} desconectado.`);
                      }}
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setIntegracao(i.id, "conectado");
                        toast.success(`${i.nome} conectado (simulação).`);
                      }}
                    >
                      Conectar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testando === i.id}
                    onClick={() => testar(i.id, i.nome)}
                  >
                    {testando === i.id ? "Testando…" : "Testar conexão"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <LgpdAviso />
      </div>
    </AppShell>
  );
}
