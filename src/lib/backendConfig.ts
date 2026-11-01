export const EXPECTED_BACKEND_HOST = "kuclsqujxdljazsxvxkn.supabase.co";

export type BackendConfigResult =
  | { ok: true; url: string; publishableKey: string }
  | { ok: false; error: string };

export function validateBackendConfig(url: unknown, key: unknown): BackendConfigResult {
  if (typeof url !== "string" || !url.trim()) {
    return { ok: false, error: "VITE_SUPABASE_URL não está configurada." };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.host !== EXPECTED_BACKEND_HOST ||
        parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
      return { ok: false, error: "VITE_SUPABASE_URL não aponta para o banco autorizado. A conexão foi bloqueada para proteger seus dados." };
    }
    if (typeof key !== "string" || !key.trim()) {
      return { ok: false, error: "VITE_SUPABASE_PUBLISHABLE_KEY não está configurada." };
    }
    const normalizedKey = key.trim();
    if (!normalizedKey.startsWith("sb_publishable_")) {
      // Legacy anon JWTs are supported, but privileged/unknown keys are rejected.
      try {
        const payload = JSON.parse(atob(normalizedKey.split(".")[1] ?? "")) as { role?: string; ref?: string };
        if (payload.role !== "anon" || payload.ref !== EXPECTED_BACKEND_HOST.split(".")[0]) throw new Error("invalid");
      } catch {
        return { ok: false, error: "Informe apenas a chave pública do banco autorizado. Chaves secretas não são permitidas." };
      }
    }
    return { ok: true, url: parsed.origin, publishableKey: normalizedKey };
  } catch {
    return { ok: false, error: "VITE_SUPABASE_URL é inválida." };
  }
}

export const backendConfig = validateBackendConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);