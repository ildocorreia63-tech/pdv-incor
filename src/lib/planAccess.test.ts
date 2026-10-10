import { describe, it, expect } from "vitest";
import { canUse } from "./planAccess";

describe("canUse", () => {
  it("teste grátis libera tudo", () => expect(canUse("essencial", "trialing", "recuperacao")).toBe(true));
  it("Essencial não tem cozinha", () => expect(canUse("essencial", "active", "cozinha")).toBe(false));
  it("Pro tem aniversariantes", () => expect(canUse("pro", "active", "aniversariantes")).toBe(true));
  it("Pro não tem recuperação", () => expect(canUse("pro", "active", "recuperacao")).toBe(false));
  it("Premium tem insumos", () => expect(canUse("premium", "active", "insumos")).toBe(true));
});
