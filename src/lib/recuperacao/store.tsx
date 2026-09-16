import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { estadoInicial } from "./seed";
import { diasSemComprar } from "./format";
import { renderMensagem } from "./message";
import type { AppState, Campanha, Cliente, Config, Execucao, StatusIntegracao } from "./types";
import { supabase } from "@/integrations/supabase/client";

const CHAVE = "directsmash:v1";

interface StoreCtx {
  state: AppState;
  pronto: boolean;
  entrar: (email: string, senha: string, cadastro: boolean) => Promise<"ok" | "confirmar-email">;
  sair: () => Promise<void>;
  salvarConfig: (patch: Partial<Config>) => void;
  adicionarClientes: (novos: Cliente[]) => void;
  atualizarCliente: (id: string, patch: Partial<Cliente>) => void;
  removerCliente: (id: string) => void;
  salvarCampanha: (campanha: Campanha) => Promise<void>;
  removerCampanha: (id: string) => Promise<void>;
  registrarExecucao: (execucao: Execucao) => Promise<void>;
  setIntegracao: (id: string, status: StatusIntegracao) => void;
  toggleEtapa: (id: string) => void;
  setAutomacao: (ativa: boolean) => void;
  restaurarDemo: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

function carregar(): AppState {
  if (typeof window === "undefined") return estadoInicial();
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return estadoInicial();
    const salvo = JSON.parse(bruto) as Partial<AppState>;
    const base = estadoInicial();
    return {
      ...base,
      ...salvo,
      config: { ...base.config, ...(salvo.config ?? {}) },
      etapasAtivas: { ...base.etapasAtivas, ...(salvo.etapasAtivas ?? {}) },
    };
  } catch {
    return estadoInicial();
  }
}

type CampaignRow = {
  client_key: string;
  name: string;
  trigger_days: number;
  start_time: string;
  end_time: string;
  segment: Campanha["segmento"];
  benefit: string;
  menu_url: string;
  message: string;
  active: boolean;
  sent_count: number;
  delivered_count: number;
  click_count: number;
  order_count: number;
  created_at: string;
};

type ExecutionRow = {
  id: string;
  executed_at: string;
  client_key: string;
  client_name: string;
  campaign_key: string;
  campaign_name: string;
  result: Execucao["resultado"];
  reason: string;
  steps: unknown;
  converted: boolean;
  conversion_value: number;
  commission_rate: number;
  savings_amount: number | null;
};

function etapasDoBanco(value: unknown): Execucao["etapas"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const etapa = item as Record<string, unknown>;
    if (
      typeof etapa["nome"] !== "string" ||
      typeof etapa["ok"] !== "boolean" ||
      typeof etapa["detalhe"] !== "string"
    ) return [];
    return [{ nome: etapa["nome"], ok: etapa["ok"], detalhe: etapa["detalhe"] }];
  });
}

function campanhaDoBanco(row: CampaignRow): Campanha {
  return {
    id: row.client_key,
    nome: row.name,
    gatilhoDias: row.trigger_days,
    horaInicio: row.start_time.slice(0, 5),
    horaFim: row.end_time.slice(0, 5),
    segmento: row.segment,
    beneficio: row.benefit,
    linkCardapio: row.menu_url,
    mensagem: row.message,
    ativa: row.active,
    criadaEm: row.created_at,
    stats: {
      enviados: row.sent_count,
      entregues: row.delivered_count,
      cliques: row.click_count,
      pedidos: row.order_count,
    },
  };
}

function execucaoDoBanco(row: ExecutionRow): Execucao {
  return {
    id: row.id,
    data: row.executed_at,
    clienteId: row.client_key,
    clienteNome: row.client_name,
    campanhaId: row.campaign_key,
    campanhaNome: row.campaign_name,
    resultado: row.result,
    motivo: row.reason,
    etapas: etapasDoBanco(row.steps),
    convertido: row.converted,
    valorConversao: Number(row.conversion_value),
    taxaComissao: Number(row.commission_rate),
    economia: Number(row.savings_amount),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => estadoInicial());
  const [pronto, setPronto] = useState(false);

  // Configurações e clientes continuam disponíveis offline; campanhas e execuções vêm da conta.
  useEffect(() => {
    setState(carregar());
    let ativo = true;

    async function aplicarSessao() {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      const usuario = data.session?.user;
      if (!usuario) {
        setState((s) => ({ ...s, autenticado: false, usuario: "" }));
        setPronto(true);
        return;
      }

      const [campanhas, execucoes] = await Promise.all([
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("campaign_executions").select("*").order("executed_at", { ascending: false }),
      ]);
      if (!ativo) return;
      if (campanhas.error) throw campanhas.error;
      if (execucoes.error) throw execucoes.error;
      setState((s) => ({
        ...s,
        autenticado: true,
        usuario: usuario.email ?? "Conta DirectSmash",
        campanhas: (campanhas.data as CampaignRow[]).map(campanhaDoBanco),
        execucoes: execucoes.data.map((row) => execucaoDoBanco(row as ExecutionRow)),
      }));
      setPronto(true);
    }

    void aplicarSessao().catch(() => setPronto(true));
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void aplicarSessao();
    });
    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(state));
    } catch {
      /* quota indisponível: segue apenas em memória */
    }
  }, [state, pronto]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", state.config.tema === "dark");
  }, [state.config.tema]);

  const api = useMemo<StoreCtx>(() => {
    const patch = (fn: (s: AppState) => AppState) => setState((s) => fn(s));
    return {
      state,
      pronto,
      entrar: async (email, senha, cadastro) => {
        const resultado = cadastro
          ? await supabase.auth.signUp({ email, password: senha })
          : await supabase.auth.signInWithPassword({ email, password: senha });
        if (resultado.error) throw resultado.error;
        if (cadastro && !resultado.data.session) return "confirmar-email";
        patch((s) => ({ ...s, autenticado: true, usuario: email, campanhas: [], execucoes: [] }));
        return "ok";
      },
      sair: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        patch((s) => ({ ...s, autenticado: false, usuario: "", campanhas: [], execucoes: [] }));
      },
      salvarConfig: (p) => patch((s) => ({ ...s, config: { ...s.config, ...p } })),
      adicionarClientes: (novos) => patch((s) => ({ ...s, clientes: [...novos, ...s.clientes] })),
      atualizarCliente: (id, p) =>
        patch((s) => ({
          ...s,
          clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...p } : c)),
        })),
      removerCliente: (id) =>
        patch((s) => ({ ...s, clientes: s.clientes.filter((c) => c.id !== id) })),
      salvarCampanha: async (campanha) => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Entre novamente para salvar a campanha.");
        const { error } = await supabase.from("campaigns").upsert(
          {
            user_id: auth.user.id,
            client_key: campanha.id,
            name: campanha.nome,
            trigger_days: campanha.gatilhoDias,
            start_time: campanha.horaInicio,
            end_time: campanha.horaFim,
            segment: campanha.segmento,
            benefit: campanha.beneficio,
            menu_url: campanha.linkCardapio,
            message: campanha.mensagem,
            active: campanha.ativa,
            sent_count: campanha.stats.enviados,
            delivered_count: campanha.stats.entregues,
            click_count: campanha.stats.cliques,
            order_count: campanha.stats.pedidos,
          },
          { onConflict: "user_id,client_key" },
        );
        if (error) throw error;
        patch((s) => ({
          ...s,
          campanhas: s.campanhas.some((c) => c.id === campanha.id)
            ? s.campanhas.map((c) => (c.id === campanha.id ? campanha : c))
            : [campanha, ...s.campanhas],
        }));
      },
      removerCampanha: async (id) => {
        const { error } = await supabase.from("campaigns").delete().eq("client_key", id);
        if (error) throw error;
        patch((s) => ({ ...s, campanhas: s.campanhas.filter((c) => c.id !== id) }));
      },
      registrarExecucao: async (execucao) => {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("Entre novamente para registrar a execução.");
        const { data, error } = await supabase
          .from("campaign_executions")
          .insert({
            user_id: auth.user.id,
            client_key: execucao.clienteId,
            client_name: execucao.clienteNome,
            campaign_key: execucao.campanhaId,
            campaign_name: execucao.campanhaNome,
            result: execucao.resultado,
            reason: execucao.motivo,
            steps: execucao.etapas,
            converted: execucao.convertido,
            conversion_value: execucao.valorConversao,
            commission_rate: execucao.taxaComissao,
            converted_at: execucao.convertido ? execucao.data : null,
            executed_at: execucao.data,
          })
          .select("*")
          .single();
        if (error) throw error;
        patch((s) => ({ ...s, execucoes: [execucaoDoBanco(data as ExecutionRow), ...s.execucoes] }));
      },
      setIntegracao: (id, status) =>
        patch((s) => ({
          ...s,
          integracoes: s.integracoes.map((i) => (i.id === id ? { ...i, status } : i)),
        })),
      toggleEtapa: (id) =>
        patch((s) => ({
          ...s,
          etapasAtivas: { ...s.etapasAtivas, [id]: !s.etapasAtivas[id] },
        })),
      setAutomacao: (ativa) => patch((s) => ({ ...s, automacaoAtiva: ativa })),
      restaurarDemo: () =>
        setState(() => {
          const novo = estadoInicial();
          return { ...novo, autenticado: true, usuario: state.usuario };
        }),
    };
  }, [state, pronto]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore precisa estar dentro de <StoreProvider>");
  return ctx;
}

/* ---------------------- Regras de negócio ---------------------- */

export function elegivel(cliente: Cliente): { ok: boolean; motivo: string } {
  if (!cliente.consentimento) return { ok: false, motivo: "Sem consentimento registrado" };
  if (cliente.status === "optout") return { ok: false, motivo: "Cliente pediu opt-out" };
  return { ok: true, motivo: "Elegível" };
}

export function dentroDoHorario(inicio: string, fim: string, agora = new Date()): boolean {
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  const [hi = 0, mi = 0] = inicio.split(":").map(Number);
  const [hf = 23, mf = 59] = fim.split(":").map(Number);
  return minutos >= hi * 60 + mi && minutos <= hf * 60 + mf;
}

export function jaRecebeu(execucoes: Execucao[], clienteId: string, campanhaId: string): boolean {
  const limite = Date.now() - 7 * 86_400_000;
  return execucoes.some(
    (e) =>
      e.clienteId === clienteId &&
      e.campanhaId === campanhaId &&
      e.resultado === "sucesso" &&
      new Date(e.data).getTime() >= limite,
  );
}

export function publicoElegivel(clientes: Cliente[], campanha: Campanha): Cliente[] {
  return clientes.filter((c) => {
    if (!elegivel(c).ok) return false;
    const dias = diasSemComprar(c.ultimaCompra);
    if (campanha.segmento === "aniversariantes") return true;
    if (campanha.segmento === "alto-ticket" && c.ticket < 70) return false;
    if (campanha.segmento === "inativos" && dias < 15) return false;
    return dias >= campanha.gatilhoDias;
  });
}

export interface Metricas {
  totalClientes: number;
  recuperados: number;
  pedidosDiretos: number;
  economia: number;
  receitaRecuperada: number;
  custoBeneficio: number;
  lucroIncremental: number;
  roi: number;
  enviados: number;
  entregues: number;
  cliques: number;
}

export function calcularMetricas(state: AppState, campanhas = state.campanhas): Metricas {
  const { comissao, ticketMedio, custoBeneficio } = state.config;
  const enviados = campanhas.reduce((a, c) => a + c.stats.enviados, 0);
  const entregues = campanhas.reduce((a, c) => a + c.stats.entregues, 0);
  const cliques = campanhas.reduce((a, c) => a + c.stats.cliques, 0);
  const pedidos = campanhas.reduce((a, c) => a + c.stats.pedidos, 0);
  const ids = new Set(campanhas.map((c) => c.id));
  const conversoes = state.execucoes.filter((e) => ids.has(e.campanhaId) && e.convertido);
  const receitaReal = conversoes.reduce((total, e) => total + e.valorConversao, 0);
  const economiaReal = conversoes.reduce((total, e) => total + e.economia, 0);
  const receita = receitaReal || pedidos * ticketMedio;
  const economia = economiaReal || receita * (comissao / 100);
  const custo = pedidos * custoBeneficio;
  const lucro = economia - custo;
  return {
    totalClientes: state.clientes.length,
    recuperados: pedidos,
    pedidosDiretos: pedidos,
    economia,
    receitaRecuperada: receita,
    custoBeneficio: custo,
    lucroIncremental: lucro,
    roi: custo > 0 ? (lucro / custo) * 100 : 0,
    enviados,
    entregues,
    cliques,
  };
}

export function mensagemFinal(campanha: Campanha, cliente: Cliente, assinatura: string, descadastro: string) {
  return `${renderMensagem(campanha.mensagem, cliente, campanha.beneficio, campanha.linkCardapio)}\n\n— ${assinatura}\n${descadastro}`;
}
