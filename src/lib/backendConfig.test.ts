import { describe, expect, it } from "vitest";
import { validateBackendConfig } from "./backendConfig";

const target = "https://riqjuxmdoyqmveieskty.supabase.co";
describe("Authorized backend configuration", () => {
  it("accepts the project's Lovable Cloud backend with a public key", () => {
    expect(validateBackendConfig(target, "sb_publishable_test")).toEqual({ ok: true, url: target, publishableKey: "sb_publishable_test" });
  });
  it("blocks the unreachable external address that was requested earlier", () => {
    expect(validateBackendConfig("https://kuclsqujxdljazsxvxkn.supabase.co", "sb_publishable_test").ok).toBe(false);
  });
  it("rejects missing environment variables", () => {
    expect(validateBackendConfig(undefined, undefined).ok).toBe(false);
    expect(validateBackendConfig(target, "").ok).toBe(false);
  });
  it("rejects secret and service-role keys", () => {
    expect(validateBackendConfig(target, "sb_secret_test").ok).toBe(false);
    const jwt = `header.${btoa(JSON.stringify({ role: "service_role", ref: "riqjuxmdoyqmveieskty" }))}.signature`;
    expect(validateBackendConfig(target, jwt).ok).toBe(false);
  });
  it("rejects deceptive hosts and insecure connections", () => {
    for (const url of [target + ".example.com", target.replace("https", "http"), target + "/rest/v1", target + "?redirect=other"]) {
      expect(validateBackendConfig(url, "sb_publishable_test").ok).toBe(false);
    }
  });
});
