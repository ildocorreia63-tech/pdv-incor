/** Mapa de preços do Stripe por plano/ciclo. Mantido igual a src/lib/plans.ts. */
export const PRICES: Record<string, { plan: "essencial" | "pro" | "premium"; cycle: "monthly" | "annual" }> = {
  price_1UOTEiK6dWpoRPc0slHmzcfC: { plan: "essencial", cycle: "monthly" },
  price_1UOTFCK6dWpoRPc0eQqljwhA: { plan: "essencial", cycle: "annual" },
  price_1UOTFGK6dWpoRPc0YPABsDzJ: { plan: "pro", cycle: "monthly" },
  price_1UOTFNK6dWpoRPc0ISUex4OO: { plan: "pro", cycle: "annual" },
  price_1UOTFHK6dWpoRPc0pv8u8bTn: { plan: "premium", cycle: "monthly" },
  price_1UOTFOK6dWpoRPc07v2i3oMO: { plan: "premium", cycle: "annual" },
};

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
