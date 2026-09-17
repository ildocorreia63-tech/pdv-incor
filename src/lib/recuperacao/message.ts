import type { Campanha, Cliente } from "./types";
import { diasSemComprar } from "./format";

export const VARIAVEIS = [
  "{{nome}}",
  "{{ultimo_pedido}}",
  "{{dias_sem_comprar}}",
  "{{beneficio}}",
  "{{link_cardapio}}",
] as const;

export const MENSAGEM_PADRAO =
  "Fala, {{nome}}! A fome bateu? Seu último {{ultimo_pedido}} foi há {{dias_sem_comprar}} dias. Que tal repetir hoje? Pedindo direto aqui no Zap, você ganha {{beneficio}} e ajuda sua hamburgueria favorita a continuar entregando qualidade. Peça aqui: {{link_cardapio}}";

export const MODELOS_MENSAGEM: { titulo: string; tom: string; texto: string }[] = [
  {
    titulo: "Clássica (promocional)",
    tom: "Direta, com benefício em destaque",
    texto: MENSAGEM_PADRAO,
  },
  {
    titulo: "Leve e pessoal",
    tom: "Baixo apelo comercial, boa para evitar spam",
    texto:
      "Oi, {{nome}}, tudo certo? Aqui é a equipe da casa. Notei que faz {{dias_sem_comprar}} dias desde o seu {{ultimo_pedido}}. Se bater vontade, o cardápio está aqui: {{link_cardapio}}",
  },
  {
    titulo: "Consultiva",
    tom: "Pede opinião antes de ofertar",
    texto:
      "{{nome}}, posso te fazer uma pergunta rápida? Seu último pedido foi {{ultimo_pedido}} e queríamos saber se está tudo certo. Se quiser repetir, temos {{beneficio}} reservado: {{link_cardapio}}",
  },
  {
    titulo: "Novidade do cardápio",
    tom: "Foco em conteúdo, não em desconto",
    texto:
      "Oi, {{nome}}! Mudamos o blend e a batata da casa. Como faz {{dias_sem_comprar}} dias do seu {{ultimo_pedido}}, queria te avisar primeiro. Dá uma olhada: {{link_cardapio}}",
  },
];

export function renderMensagem(
  template: string,
  cliente: Pick<Cliente, "nome" | "ultimoPedido" | "ultimaCompra">,
  beneficio: string,
  linkCardapio: string,
): string {
  return template
    .split("{{nome}}", cliente.nome.split(" ")[0] ?? cliente.nome)
    .split("{{ultimo_pedido}}", cliente.ultimoPedido)
    .split("{{dias_sem_comprar}}", String(diasSemComprar(cliente.ultimaCompra)))
    .split("{{beneficio}}", beneficio)
    .split("{{link_cardapio}}", linkCardapio);
}

export function previaCampanha(campanha: Campanha, cliente?: Cliente): string {
  const exemplo: Pick<Cliente, "nome" | "ultimoPedido" | "ultimaCompra"> = cliente ?? {
    nome: "Marina",
    ultimoPedido: "Smash Duplo + Batata",
    ultimaCompra: new Date(Date.now() - campanha.gatilhoDias * 86_400_000).toISOString(),
  };
  return renderMensagem(campanha.mensagem, exemplo, campanha.beneficio, campanha.linkCardapio);
}
