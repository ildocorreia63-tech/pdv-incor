import { z } from "zod";
import { backendConfig } from "./backendConfig";
import { supabase } from "./backendClient";

export const expensePhotoResultSchema = z.object({
  supplier: z.string().nullable(), description: z.string().nullable(), category: z.string().nullable(),
  amount: z.number().nullable(), expense_date: z.string().nullable(), notes: z.string().nullable(),
  warnings: z.array(z.string()),
});
export type ExpensePhotoResult = z.infer<typeof expensePhotoResultSchema>;

export function photoToDraft(result: ExpensePhotoResult, categories: string[]) {
  const date = result.expense_date;
  const validDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(new Date(`${date}T12:00:00Z`).getTime()) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
  return {
    description: result.description?.trim() || result.supplier?.trim() || "",
    category: categories.find(c => c.toLowerCase() === result.category?.toLowerCase()) ?? categories.find(c => c === "Outros") ?? categories[0] ?? "Outros",
    amount: result.amount !== null && Number.isFinite(result.amount) && result.amount > 0 ? Math.round(result.amount * 100) / 100 : 0,
    date: validDate ? date : "",
    notes: [result.supplier ? `Fornecedor: ${result.supplier}` : "", result.notes?.trim()].filter(Boolean).join("\n"),
    warnings: [...result.warnings, ...(!validDate ? ["Confira a data: não foi identificada com segurança."] : []),
      ...(result.amount === null || result.amount <= 0 ? ["Confira o valor total: não foi identificado com segurança."] : [])],
  };
}

export async function readExpensePhoto(file: File, storeId: string, categories: string[], signal: AbortSignal): Promise<ExpensePhotoResult> {
  if (backendConfig.ok === false) throw new Error(backendConfig.error);
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Envie uma foto JPEG, PNG ou WebP.");
  if (!file.size || file.size > 8 * 1024 * 1024) throw new Error("Escolha uma foto de até 8 MB.");
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Foto inválida."));
    reader.onerror = () => reject(new Error("Não foi possível abrir a foto."));
    reader.readAsDataURL(file);
  });
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Entre novamente para ler a nota.");
  const response = await fetch(`${backendConfig.url}/functions/v1/analyze-expense-photo`, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", apikey: backendConfig.publishableKey, Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ storeId, image, categories: categories.length ? categories : ["Outros"] }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(body?.error ?? "Não foi possível ler a nota.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("A leitura não retornou dados.");
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      const events = buffer.split("\n\n"); buffer = events.pop() ?? "";
      for (const event of events) {
        const line = event.split("\n").find(l => l.startsWith("data: "));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6)) as { type: string; data?: unknown; error?: string };
        if (payload.type === "error") throw new Error(payload.error ?? "Não foi possível ler a nota.");
        if (payload.type === "result") return expensePhotoResultSchema.parse(payload.data);
      }
      if (chunk.done) break;
    }
    throw new Error("A leitura terminou sem resultado. Nenhuma despesa foi salva.");
  } finally { await reader.cancel(); }
}