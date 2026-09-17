import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/recuperacao/store";
import type { Cliente } from "@/lib/recuperacao/types";

/** Traz os clientes reais do PDV (nome, WhatsApp e última compra) para a base de recuperação. */
export function ImportarPdvButton() {
  const { adicionarClientes, state } = useStore();
  const [carregando, setCarregando] = useState(false);

  async function importar() {
    setCarregando(true);
    try {
      const [{ data: clientes, error: erroClientes }, { data: vendas, error: erroVendas }] =
        await Promise.all([
          supabase.from("customers").select("id, name, phone, created_at").limit(1000),
          supabase
            .from("sales")
            .select("customer_id, total, created_at, status")
            .not("customer_id", "is", null)
            .order("created_at", { ascending: false })
            .limit(2000),
        ]);
      if (erroClientes) throw erroClientes;
      if (erroVendas) throw erroVendas;

      const ultimaVenda = new Map<string, { total: number; data: string }>();
      for (const venda of vendas ?? []) {
        if (venda.status === "cancelled" || !venda.customer_id) continue;
        if (!ultimaVenda.has(venda.customer_id)) {
          ultimaVenda.set(venda.customer_id, {
            total: Number(venda.total ?? 0),
            data: venda.created_at,
          });
        }
      }

      const existentes = new Set(state.clientes.map((c) => c.telefone.replace(/\D/g, "")));
      const novos: Cliente[] = (clientes ?? [])
        .filter((c) => {
          const tel = (c.phone ?? "").replace(/\D/g, "");
          return tel.length >= 10 && !existentes.has(tel);
        })
        .map((c) => {
          const venda = ultimaVenda.get(c.id);
          return {
            id: `pdv-${c.id}`,
            nome: c.name,
            telefone: c.phone ?? "",
            ultimaCompra: venda?.data ?? c.created_at,
            ultimoPedido: venda ? "Pedido no PDV" : "Sem compras registradas",
            ticket: venda?.total ?? 0,
            origem: "PDV",
            consentimento: true,
            status: "ativo",
            historico: venda ? [{ data: venda.data, pedido: "Pedido no PDV", valor: venda.total }] : [],
          } satisfies Cliente;
        });

      if (novos.length === 0) {
        toast.info("Nenhum cliente novo para importar.");
        return;
      }
      adicionarClientes(novos);
      toast.success(`${novos.length} cliente(s) importado(s) do PDV.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível importar os clientes do PDV.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={importar} disabled={carregando}>
      <Download className="size-4" aria-hidden="true" />
      {carregando ? "Importando..." : "Importar do PDV"}
    </Button>
  );
}
