import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { backendConfig } from "./backendConfig";

/**
 * Cliente anônimo do cardápio público de uma loja.
 * Envia o cabeçalho x-store-slug: o banco usa esse link para devolver
 * apenas produtos, preços e configurações daquela loja.
 * Sem sessão (persistSession false) para não misturar com o login da equipe.
 */
const cache = new Map<string, SupabaseClient<Database>>();

export function getStoreClient(slug: string): SupabaseClient<Database> {
  if (backendConfig.ok === false) throw new Error(backendConfig.error);
  const key = slug.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const client = createClient<Database>(
    backendConfig.url,
    backendConfig.publishableKey,
    {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: `menu-${key}` },
      global: { headers: { "x-store-slug": key } },
    },
  );
  cache.set(key, client);
  return client;
}
