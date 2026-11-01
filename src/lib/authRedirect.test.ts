import { describe, expect, it } from "vitest";
import { requestedRoute } from "./authRedirect";

describe("Login return route", () => {
  it("preserves the requested private route and query", () => {
    expect(requestedRoute({ from: "/equipe?dia=1#escala" })).toBe("/equipe?dia=1#escala");
  });
  it("rejects external redirects and login loops", () => {
    for (const from of ["https://example.com", "//example.com", "/\\example.com", "/auth", "/reset-password#token"]) {
      expect(requestedRoute({ from })).toBe("/");
    }
  });
  it("defaults to home without a requested route", () => {
    expect(requestedRoute(null)).toBe("/");
  });
});