import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "./AppHeader";

const access = vi.hoisted(() => ({
  store: null as { memberRole: "owner" | "admin" | "operator" } | null,
  signOut: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => access }));
vi.mock("@/hooks/useStoreLogo", () => ({ useStoreLogo: () => null }));

function mountHeader() {
  render(
    <TooltipProvider>
      <MemoryRouter initialEntries={["/"]}>
        <AppHeader title="Resumo" />
      </MemoryRouter>
    </TooltipProvider>,
  );
}

describe("Store settings shortcut", () => {
  beforeEach(() => {
    access.store = null;
  });

  it.each(["owner", "admin"] as const)("shows settings to a store %s", (memberRole) => {
    access.store = { memberRole };
    mountHeader();
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute(
      "href",
      "/admin?configuracoes=1",
    );
  });

  it("does not show settings to an operator", () => {
    access.store = { memberRole: "operator" };
    mountHeader();
    expect(screen.queryByRole("link", { name: "Configurações" })).toBeNull();
  });
});
