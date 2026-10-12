import { describe, it, expect } from "vitest";
import { canUse } from "./planAccess";
import { maxUsersForPlan } from "./plans";

describe("canUse", () => {
  it("teste grátis libera tudo", () => expect(canUse("essencial", "trialing", "recuperacao")).toBe(true));
  it("Essencial não tem cozinha", () => expect(canUse("essencial", "active", "cozinha")).toBe(false));
  it("Pro tem aniversariantes", () => expect(canUse("pro", "active", "aniversariantes")).toBe(true));
  it("Pro não tem recuperação", () => expect(canUse("pro", "active", "recuperacao")).toBe(false));
  it("Premium tem insumos", () => expect(canUse("premium", "active", "insumos")).toBe(true));
});


describe("maxUsersForPlan", () => {
  it("Essencial permite uma conta", () => expect(maxUsersForPlan("essencial")).toBe(1));
  it("Pro permite três contas", () => expect(maxUsersForPlan("pro")).toBe(3));
  it("Premium e teste permitem contas ilimitadas", () => {
    expect(maxUsersForPlan("premium")).toBeNull();
    expect(maxUsersForPlan("trial")).toBeNull();
  });
});
