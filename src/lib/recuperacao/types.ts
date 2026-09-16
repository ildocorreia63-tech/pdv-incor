export type Origem = "PDV" | "CSV" | "Marketplace";
export type StatusCliente = "ativo" | "inativo" | "optout";

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  ultimaCompra: string; // ISO date
  ultimoPedido: string;
  ticket: number;
  origem: Origem;
  consentimento: boolean;
  status: StatusCliente;
  observacao?: string;
  historico: { data: string; pedido: string; valor: number }[];
}

export interface Campanha {
  id: string;
  nome: string;
  gatilhoDias: number;
  horaInicio: string;
  horaFim: string;
  segmento: "todos" | "alto-ticket" | "inativos" | "aniversariantes";
  beneficio: string;
  linkCardapio: string;
  mensagem: string;
  ativa: boolean;
  criadaEm: string;
  stats: {
    enviados: number;
    entregues: number;
    cliques: number;
    pedidos: number;
  };
}

export type ResultadoExecucao = "sucesso" | "ignorado" | "falha";

export interface Execucao {
  id: string;
  data: string;
  clienteId: string;
  clienteNome: string;
  campanhaId: string;
  campanhaNome: string;
  resultado: ResultadoExecucao;
  motivo: string;
  etapas: { nome: string; ok: boolean; detalhe: string }[];
  convertido: boolean;
  valorConversao: number;
  taxaComissao: number;
  economia: number;
}

export type StatusIntegracao = "nao-conectado" | "em-teste" | "conectado";

export interface Integracao {
  id: string;
  nome: string;
  descricao: string;
  status: StatusIntegracao;
  requisitos: string[];
}

export interface Config {
  nomeEmpresa: string;
  linkCardapio: string;
  comissao: number;
  ticketMedio: number;
  origemPrincipal: Origem;
  beneficioTipo: "batata" | "desconto" | "frete" | "custom";
  beneficioTexto: string;
  horaInicio: string;
  horaFim: string;
  fuso: string;
  assinatura: string;
  textoDescadastro: string;
  retencaoMeses: number;
  plano: "Essencial" | "Crescimento";
  tema: "dark" | "light";
  onboardingCompleto: boolean;
  custoBeneficio: number;
}

export interface AppState {
  autenticado: boolean;
  usuario: string;
  config: Config;
  clientes: Cliente[];
  campanhas: Campanha[];
  execucoes: Execucao[];
  integracoes: Integracao[];
  automacaoAtiva: boolean;
  etapasAtivas: Record<string, boolean>;
  serie: { dia: string; mensagens: number; conversoes: number; receita: number }[];
}
