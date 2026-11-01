import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { backendConfig } from "./backendConfig";

if (!backendConfig.ok) throw new Error(backendConfig.error);

/** Never use the Cloud preview session broker with an external project. */
export const supabase = createClient<Database>(backendConfig.url, backendConfig.publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "pdv-incor-external-auth",
  },
  global: {
    fetch: (input, init) => {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
      if (backendConfig.publishableKey.startsWith("sb_publishable_") &&
          headers.get("Authorization") === `Bearer ${backendConfig.publishableKey}`) {
        headers.delete("Authorization");
      }
      headers.set("apikey", backendConfig.publishableKey);
      return fetch(input, { ...init, headers });
    },
  },
});