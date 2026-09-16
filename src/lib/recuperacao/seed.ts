import { isoDiasAtras } from "./format";
import { MENSAGEM_PADRAO, MODELOS_MENSAGEM } from "./message";
import type { AppState, Campanha, Cliente, Execucao, Integracao } from "./types";

const PEDIDOS = [
  "Smash Duplo + Batata",
  "Cheddar Bacon + Coca",
  "Combo Família",
  "Smash Simples",
  "Veggie Crocante",
  "Costela BBQ",
  "Triplo Cheddar",
  "Chicken Smash + Fritas",
];

const NOMES = [
  "Marina Albuquerque",
  "Rafael Tavares",
  "Juliana Prado",
  "Diego Menezes",
  "Camila Ferraz",
  "Bruno Siqueira",
  "Larissa Moura",
  "Thiago Barcellos",
  "Patrícia Lemos",
  "Gustavo Rangel",
  "Aline Castilho",
  "Vinícius Duarte",
  "Fernanda Beltrão",
  "Rodrigo Vasques",
  "Beatriz Nogueira",
  "Eduardo Pacheco",
  "Sabrina Rocha",
  "Marcelo Antunes",
  "Tatiane Correia",
  "Henrique Salles",
  "Priscila Amorim",
  "Leonardo Bastos",
  "Carolina Xavier",
  "Otávio Bicalho",
  "Renata Guimarães",
  "Felipe Marchetti",
  "Daniela Furtado",
  "André Quintela",
  "Mariana Cordeiro",
  "Lucas Peçanha",
  "Vanessa Toledo",
  "Igor Bittencourt",
];

/** Gerador determinístico simples para dados de demonstração estáveis. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function gerarClientes(): Cliente[] {
  const r = rng(42);
  return NOMES.map((nome, i) => {
    const dias = Math.floor(r() * 62) + 1;
    const ticket = Math.round((38 + r() * 62) * 100) / 100;
    const origem = (["PDV", "CSV", "Marketplace"] as const)[Math.floor(r() * 3)]!;
    const consentimento = r() > 0.16;
    const optout = consentimento && r() > 0.93;
    const ultimoPedido = PEDIDOS[Math.floor(r() * PEDIDOS.length)]!;
    const compras = Math.floor(r() * 4) + 1;
    return {
      id: `cli-${i + 1}`,
      nome,
      telefone: `(${11 + (i % 20)}) 9${String(80000000 + i * 13571).slice(0, 8)}`,
      ultimaCompra: isoDiasAtras(dias),
      ultimoPedido,
      ticket,
      origem,
      consentimento,
      status: optout ? "optout" : dias > 30 ? "inativo" : "ativo",
      historico: Array.from({ length: compras }).map((_, k) => ({
        data: isoDiasAtras(dias + k * (14 + Math.floor(r() * 20))),
        pedido: PEDIDOS[Math.floor(r() * PEDIDOS.length)]!,
        valor: Math.round((32 + r() * 70) * 100) / 100,
      })),
    } satisfies Cliente;
  });
}

const LINK = "https://pedido.smashdacasa.com.br";

export function gerarCampanhas(): Campanha[] {
  const base = {
    horaInicio: "11:00",
    horaFim: "21:00",
    linkCardapio: LINK,
    criadaEm: isoDiasAtras(40),
  };
  return [
    {
      ...base,
      id: "cmp-7",
      nome: "Volte em 7 dias",
      gatilhoDias: 7,
      segmento: "todos",
      beneficio: "batata grátis",
      mensagem: MENSAGEM_PADRAO,
      ativa: true,
      stats: { enviados: 412, entregues: 398, cliques: 137, pedidos: 64 },
    },
    {
      ...base,
      id: "cmp-15",
      nome: "Sentimos sua falta – 15 dias",
      gatilhoDias: 15,
      segmento: "inativos",
      beneficio: "10% de desconto",
      mensagem: MODELOS_MENSAGEM[1]!.texto,
      ativa: true,
      stats: { enviados: 268, entregues: 259, cliques: 78, pedidos: 31 },
    },
    {
      ...base,
      id: "cmp-30",
      nome: "Reativação – 30 dias",
      gatilhoDias: 30,
      segmento: "inativos",
      beneficio: "frete grátis",
      mensagem: MODELOS_MENSAGEM[2]!.texto,
      ativa: false,
      stats: { enviados: 154, entregues: 147, cliques: 41, pedidos: 15 },
    },
    {
      ...base,
      id: "cmp-niver",
      nome: "Aniversário",
      gatilhoDias: 365,
      segmento: "aniversariantes",
      beneficio: "sobremesa cortesia",
      mensagem:
        "Parabéns, {{nome}}! 🎉 Hoje o combo é por nossa conta em dobro: pedindo direto no Zap você ganha {{beneficio}}. Cardápio: {{link_cardapio}}",
      ativa: true,
      stats: { enviados: 62, entregues: 60, cliques: 29, pedidos: 18 },
    },
  ];
}

export function gerarExecucoes(clientes: Cliente[]): Execucao[] {
  const r = rng(7);
  return Array.from({ length: 14 }).map((_, i) => {
    const cliente = clientes[Math.floor(r() * clientes.length)]!;
    const semConsentimento = !cliente.consentimento;
    const optout = cliente.status === "optout";
    const falha = !semConsentimento && !optout && r() > 0.88;
    const resultado = semConsentimento || optout ? "ignorado" : falha ? "falha" : "sucesso";
    const motivo = optout
      ? "Cliente com opt-out ativo"
      : semConsentimento
        ? "Sem consentimento registrado"
        : falha
          ? "Número inválido no provedor simulado"
          : "Mensagem entregue";
    return {
      id: `exe-${i + 1}`,
      data: isoDiasAtras(Math.floor(r() * 12)),
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      campanhaId: "cmp-7",
      campanhaNome: "Volte em 7 dias",
      resultado,
      motivo,
      convertido: resultado === "sucesso" && i % 3 === 0,
      valorConversao: resultado === "sucesso" && i % 3 === 0 ? cliente.ticket : 0,
      taxaComissao: 27,
      economia: resultado === "sucesso" && i % 3 === 0 ? cliente.ticket * 0.27 : 0,
      etapas: [
        { nome: "Compra registrada", ok: true, detalhe: cliente.ultimoPedido },
        { nome: "Espera configurada", ok: true, detalhe: "7 dias" },
        {
          nome: "Verifica consentimento",
          ok: !semConsentimento && !optout,
          detalhe: motivo,
        },
        { nome: "Verifica horário", ok: true, detalhe: "11:00–21:00" },
        { nome: "Envia mensagem", ok: resultado === "sucesso", detalhe: motivo },
      ],
    } satisfies Execucao;
  });
}

export function gerarSerie() {
  const r = rng(99);
  return Array.from({ length: 30 }).map((_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (29 - i));
    const mensagens = 18 + Math.floor(r() * 26);
    const conversoes = Math.max(1, Math.round(mensagens * (0.12 + r() * 0.1)));
    return {
      dia: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      mensagens,
      conversoes,
      receita: Math.round(conversoes * (58 + r() * 26)),
    };
  });
}

export const INTEGRACOES: Integracao[] = [
  {
    id: "whatsapp",
    nome: "WhatsApp Business API",
    descricao: "Envio das mensagens de recuperação por um provedor oficial.",
    status: "em-teste",
    requisitos: [
      "ID do número de telefone (Phone Number ID)",
      "Token de acesso permanente do provedor",
      "Templates de mensagem aprovados",
      "Webhook de status de entrega",
    ],
  },
  {
    id: "make",
    nome: "Make (Integromat)",
    descricao: "Orquestra cenários entre PDV, DirectSmash e WhatsApp.",
    status: "nao-conectado",
    requisitos: ["URL do webhook do cenário", "Chave de assinatura do payload"],
  },
  {
    id: "typebot",
    nome: "Typebot",
    descricao: "Fluxo conversacional para captar pedido e consentimento.",
    status: "nao-conectado",
    requisitos: ["ID do fluxo publicado", "Token de API", "Mapeamento de variáveis"],
  },
  {
    id: "manychat",
    nome: "ManyChat",
    descricao: "Alternativa de disparo e gestão de assinantes.",
    status: "nao-conectado",
    requisitos: ["API Key da conta", "ID da automação de retorno"],
  },
  {
    id: "pdv",
    nome: "PDV / Sistema de pedidos",
    descricao: "Importa vendas e histórico de clientes do balcão e do delivery próprio.",
    status: "conectado",
    requisitos: ["Endpoint de exportação", "Usuário de integração", "Campos: nome, telefone, data, itens, valor"],
  },
  {
    id: "webhook",
    nome: "Webhook genérico",
    descricao: "Recebe eventos de compra de qualquer sistema.",
    status: "em-teste",
    requisitos: ["URL ilustrativa: https://api.directsmash.demo/v1/eventos/compra", "Segredo HMAC para validar a origem"],
  },
];

export function estadoInicial(): AppState {
  const clientes = gerarClientes();
  return {
    autenticado: false,
    usuario: "",
    config: {
      nomeEmpresa: "Smash da Casa",
      linkCardapio: LINK,
      comissao: 27,
      ticketMedio: 62,
      origemPrincipal: "PDV",
      beneficioTipo: "batata",
      beneficioTexto: "batata grátis",
      horaInicio: "11:00",
      horaFim: "21:00",
      fuso: "America/Sao_Paulo",
      assinatura: "Equipe Smash da Casa",
      textoDescadastro: 'Responda "SAIR" para não receber mais mensagens.',
      retencaoMeses: 12,
      plano: "Crescimento",
      tema: "dark",
      onboardingCompleto: false,
      custoBeneficio: 7,
    },
    clientes,
    campanhas: gerarCampanhas(),
    execucoes: gerarExecucoes(clientes),
    integracoes: INTEGRACOES,
    automacaoAtiva: true,
    etapasAtivas: {
      compra: true,
      espera: true,
      consentimento: true,
      horario: true,
      envio: true,
      clique: true,
      pedido: true,
      economia: true,
    },
    serie: gerarSerie(),
  };
}
