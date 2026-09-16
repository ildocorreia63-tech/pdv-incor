import {
  createContext,
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

const CHAVE = "recuperacao:v1";

interface StoreCtx {
  state: AppState;
  pronto: boolean;
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
      autenticado: true,
    };
  } catch {
    return estadoInicial();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => estadoInicial());
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setState({ ...carregar(), autenticado: true });
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(state));
    } catch {
      /* quota indisponível: segue apenas em memória */
    }
  }, [state, pronto]);

  const api = useMemo<StoreCtx>(() => {
    const patch = (fn: (s: AppState) => AppState) => setState((s) => fn(s));
    return {
      state,
      pronto,
      salvarConfig: (p) => patch((s) => ({ ...s, config: { ...s.config, ...p } })),
      adicionarClientes: (novos) =>
        patch((s) => {
          const existentes = new Set(s.clientes.map((c) => c.telefone.replace(/\D/g, "")));
          const filtrados = novos.filter((c) => {
            const tel = c.telefone.replace(/\D/g, "");
            if (!tel || existentes.has(tel)) return false;
            existentes.add(tel);
            return true;
          });
          return { ...s, clientes: [...filtrados, ...s.clientes] };
        }),
      atualizarCliente: (id, p) =>
        patch((s) => ({
          ...s,
          clientes: s.clientes.map((c) => (c.id === id ? { ...c, ...p } : c)),
        })),
      removerCliente: (id) =>
        patch((s) => ({ ...s, clientes: s.clientes.filter((c) => c.id !== id) })),
      salvarCampanha: async (campanha) => {
        patch((s) => ({
          ...s,
          campanhas: s.campanhas.some((c) => c.id === campanha.id)
            ? s.campanhas.map((c) => (c.id === campanha.id ? campanha : c))
            : [campanha, ...s.campanhas],
        }));
      },
      removerCampanha: async (id) => {
        patch((s) => ({ ...s, campanhas: s.campanhas.filter((c) => c.id !== id) }));
      },
      registrarExecucao: async (execucao) => {
        patch((s) => ({ ...s, execucoes: [execucao, ...s.execucoes] }));
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
      restaurarDemo: () => setState(() => ({ ...estadoInicial(), autenticado: true })),
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
