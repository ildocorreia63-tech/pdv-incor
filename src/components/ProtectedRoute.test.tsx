import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";

const access = vi.hoisted(() => ({ user: null as { id: string } | null, isAdmin: false, loading: false, store: null as { memberRole: string } | null, accessError: null, refreshStore: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => access }));
function LoginDestination() {
  const location = useLocation();
  return <output>{JSON.stringify(location.state)}</output>;
}
function mount() {
  render(<MemoryRouter initialEntries={["/equipe?dia=1"]}><Routes>
    <Route path="/equipe" element={<ProtectedRoute ownerOnly><h1>Equipe privada</h1></ProtectedRoute>} />
    <Route path="/auth" element={<LoginDestination />} />
    <Route path="/" element={<h1>Início</h1>} />
  </Routes></MemoryRouter>);
}
describe("Private team route", () => {
  it("redirects signed-out users and preserves the destination", async () => {
    access.user = null; access.store = null;
    mount();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent('/equipe?dia=1'));
    expect(screen.queryByText("Equipe privada")).toBeNull();
  });
  it("denies an operator access to owner-only team", async () => {
    access.user = { id: "operator" }; access.store = { memberRole: "operator" };
    mount();
    expect(await screen.findByText("Início")).toBeInTheDocument();
    expect(screen.queryByText("Equipe privada")).toBeNull();
  });
  it("allows an owner to view team", () => {
    access.user = { id: "owner" }; access.store = { memberRole: "owner" };
    mount();
    expect(screen.getByText("Equipe privada")).toBeInTheDocument();
  });
});