import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PRICES, json } from "../_shared/stripePlans.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { price_id } = await req.json().catch(() => ({}));
    if (typeof price_id !== "string" || !PRICES[price_id]) return json({ error: "Plano inválido" }, 400, corsHeaders);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error } = await admin.auth.getUser(token);
    if (error || !u.user?.email) return json({ error: "Não autenticado" }, 401, corsHeaders);

    const { data: store } = await admin.from("stores").select("id").eq("owner_id", u.user.id).limit(1).maybeSingle();
    if (!store) return json({ error: "Somente o dono da loja pode assinar" }, 403, corsHeaders);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: u.user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = req.headers.get("origin") ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : u.user.email,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
      metadata: { store_id: store.id },
      subscription_data: { metadata: { store_id: store.id } },
      success_url: `${origin}/assinatura?checkout=ok`,
      cancel_url: `${origin}/assinatura`,
    });
    return json({ url: session.url }, 200, corsHeaders);
  } catch (e) {
    console.error("[create-checkout]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500, corsHeaders);
  }
});
