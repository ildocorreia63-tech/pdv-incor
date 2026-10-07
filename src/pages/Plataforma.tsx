import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Store, Users, Wallet, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, brl } from "@/lib/plans";
import { toast } from "sonner";

interface PlatformStore {
  id: string; slug: string; name: string; plan: string; subscription_status: string;
  trial_ends_at: string; created_at: string; is_default: boolean; owner_email: string | null;
  products: number; sales_30d: number; revenue_30d: number;
}

const STATUS: Record<string, string> = {
  trialing: "Teste grátis", active: "Ativa", past_due: "Pagamento pendente", canceled: "Cancelada",
};

/** Painel do dono da plataforma: todas as lojas, receita mensal estimada e controle de planos. */
export default function Plataforma() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");

  const access = useQuery({
    queryKey: ["is-platform-admin"],
    queryFn: async () => (await supabase.rpc("is_platform_admin")).data === true,
  });
  const lojas = useQuery({
    queryKey: ["platform-stores"],
    enabled: access.data === true,
    queryFn: async (): Promise<PlatformStore[]> => {
      const { data, error } = await supabase.rpc("platform_list_stores");
      if (error) throw error;
      return (data as unknown as PlatformStore[]) ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; plan: string; status: string; days?: number }) => {
      const { error } = await supabase.rpc("platform_update_store", {
        _id: v.id, _plan: v.plan, _status: v.status, _extend_days: v.days ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Loja atualizada"); qc.invalidateQueries({ queryKey: ["platform-stores"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = lojas.data ?? [];
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? list.filter((s) => `${s.name} ${s.slug} ${s.owner_email ?? ""}`.toLowerCase().includes(q)) : list;
  }, [list, busca]);
  const pagantes = list.filter((s) => s.subscription_status === "active" && !s.is_default);
  const mrr = pagantes.reduce((t, s) => t + (PLANS.find((p) => p.id === s.plan)?.price ?? 0), 0);
  const emTeste = list.filter((s) => s.subscription_status === "trialing").length;

  if (access.isLoading) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!access.data) return <Navigate to="/admin" replace />;

  const kpis = [
    { icon: Store, label: "Lojas", value: String(list.length) },
    { icon: Users, label: "Pagantes", value: String(pagantes.length) },
    { icon: Clock, label: "Em teste", value: String(emTeste) },
    { icon: Wallet, label: "Receita mensal", value: brl(mrr) },
  ];

  return (
    <AppShell title="Painel da plataforma">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}><CardContent className="p-4">
              <k.icon className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold">{k.value}</p>
            </CardContent></Card>
          ))}
        </div>
        <Input placeholder="Buscar loja, link ou e-mail do dono" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {lojas.isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin" />}
        {lojas.error && <p className="text-sm text-destructive">{(lojas.error as Error).message}</p>}
        {filtradas.map((s) => (
          <Card key={s.id}><CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{s.name} {s.is_default && <Badge variant="outline">Principal</Badge>}</p>
                <p className="text-xs text-muted-foreground">/loja/{s.slug} · {s.owner_email ?? "sem dono"}</p>
                <p className="text-xs text-muted-foreground">
                  Criada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  {s.subscription_status === "trialing" && ` · teste até ${new Date(s.trial_ends_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <Badge variant={s.subscription_status === "past_due" ? "destructive" : "secondary"}>{STATUS[s.subscription_status] ?? s.subscription_status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{s.products} produtos · {s.sales_30d} vendas em 30 dias · {brl(Number(s.revenue_30d))}</p>
            <div className="flex flex-wrap gap-2">
              <Select value={s.plan} onValueChange={(plan) => update.mutate({ id: s.id, plan, status: s.subscription_status })}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={s.subscription_status} onValueChange={(status) => update.mutate({ id: s.id, plan: s.plan, status })}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="sm" disabled={update.isPending}
                onClick={() => update.mutate({ id: s.id, plan: s.plan, status: "trialing", days: 7 })}>+7 dias de teste</Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </AppShell>
  );
}
