/** Catálogo de planos do SaaS. Preços em reais por mês. */
export interface PlanDef {
  id: "essencial" | "pro" | "premium";
  name: string;
  monthly: number;
  highlight?: boolean;
  features: string[];
}

export const TRIAL_DAYS = 7;

export const PLANS: PlanDef[] = [
  {
    id: "essencial",
    name: "Essencial",
    monthly: 49,
    features: ["PDV e caixa", "Produtos e categorias", "Clientes e fiado", "Relatórios básicos", "1 usuário"],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 99,
    highlight: true,
    features: ["Tudo do Essencial", "Cardápio online com link próprio", "Entrega por km ou bairro", "Pix e tela da cozinha", "Aniversariantes", "3 usuários"],
  },
  {
    id: "premium",
    name: "Premium",
    monthly: 179,
    features: ["Tudo do Pro", "Recuperação de clientes", "iFood e webhooks", "Insumos e lista de compras", "Usuários ilimitados"],
  },
];

/** Anual = 10x o mensal (2 meses grátis). */
export const annualPrice = (monthly: number): number => monthly * 10;

/** Preços do Stripe por plano e ciclo de cobrança. */
export const STRIPE_PRICES: Record<PlanDef["id"], { monthly: string; annual: string }> = {
  essencial: { monthly: "price_1UOTEiK6dWpoRPc0slHmzcfC", annual: "price_1UOTFCK6dWpoRPc0eQqljwhA" },
  pro: { monthly: "price_1UOTFGK6dWpoRPc0YPABsDzJ", annual: "price_1UOTFNK6dWpoRPc0ISUex4OO" },
  premium: { monthly: "price_1UOTFHK6dWpoRPc0pv8u8bTn", annual: "price_1UOTFOK6dWpoRPc07v2i3oMO" },
};

export const brl = (v: number): string =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

/** Converte o nome da loja em link (slug) válido. */
export const slugify = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
