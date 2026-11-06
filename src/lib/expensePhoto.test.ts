import { describe, it, expect, vi } from "vitest";
vi.mock("./backendClient", () => ({ supabase: {} }));
import { photoToDraft, type ExpensePhotoResult } from "./expensePhoto";

const nota: ExpensePhotoResult = { supplier: "Fornecedor teste", description: "Compra de insumos", category: "insumos", amount: 123.45, expense_date: "2026-11-06", notes: "Nota 42", warnings: [] };
describe("nota do fornecedor para despesa", () => {
  it("preenche o total da nota e a categoria existente", () => {
    expect(photoToDraft(nota, ["Insumos", "Outros"])).toMatchObject({ amount: 123.45, category: "Insumos", date: "2026-11-06", description: "Compra de insumos" });
  });
  it("deixa valor e data desconhecidos para o dono conferir", () => {
    expect(photoToDraft({ ...nota, amount: null, expense_date: null }, ["Outros"])).toMatchObject({ amount: 0, date: "" });
  });
  it("não inventa uma data quando a data lida não existe", () => {
    expect(photoToDraft({ ...nota, expense_date: "2026-02-30" }, ["Outros"]).date).toBe("");
  });
});