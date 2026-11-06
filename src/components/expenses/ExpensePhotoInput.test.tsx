import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi } from "vitest";
const { readPhoto } = vi.hoisted(() => ({ readPhoto: vi.fn() }));
vi.mock("@/lib/expensePhoto", () => ({ readExpensePhoto: readPhoto }));
import { ExpensePhotoInput } from "./ExpensePhotoInput";

describe("revisão da nota antes de salvar", () => {
  it("entrega o resultado para revisão sem gravar uma despesa", async () => {
    const result = { supplier: "Fornecedor teste", description: "Compra", category: "Insumos", amount: 123.45, expense_date: "2026-11-06", notes: null, warnings: [] };
    readPhoto.mockResolvedValue(result);
    URL.createObjectURL = vi.fn(() => "blob:nota-teste"); URL.revokeObjectURL = vi.fn();
    const onResult = vi.fn(); const onBusyChange = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><ExpensePhotoInput storeId="loja-teste" categories={["Insumos"]} onResult={onResult} onBusyChange={onBusyChange} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("Enviar foto da nota"), { target: { files: [new File(["photo"], "nota.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(result, expect.anything(), expect.anything(), expect.anything()));
    expect(readPhoto).toHaveBeenCalledTimes(1);
    expect(onBusyChange).toHaveBeenCalledWith(false);
  });
});