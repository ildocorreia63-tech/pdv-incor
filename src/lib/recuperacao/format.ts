export function brl(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(valor) ? valor : 0);
}

export function brlPreciso(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(valor) ? valor : 0,
  );
}

export function pct(valor: number, casas = 1): string {
  if (!Number.isFinite(valor)) return "0%";
  return `${valor.toFixed(casas).replace(".", ",")}%`;
}

export function dataBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function dataHoraBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function diasSemComprar(iso: string): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/** Mascara o telefone preservando DDD e os 2 últimos dígitos. */
export function telefoneMascarado(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 6) return "•••••";
  const ddd = digitos.slice(0, 2);
  const fim = digitos.slice(-2);
  return `(${ddd}) •••••-••${fim}`;
}

export function isoDiasAtras(dias: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}
