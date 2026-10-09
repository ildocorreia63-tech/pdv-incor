import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PRICES, json } from "../_shared/stripePlans.ts";

/** Consulta a assinatura no Stripe e sincroniza plano/situação da loja do dono. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error } = await admin.auth.getUser(token);
    if (error || !u.user?.email) return json({ error: "Não autenticado" }, 401, corsHeaders);

    const { data: store } = await admin.from("stores").select("id,is_default,subscription_status,trial_ends_at")
      .eq("owner_id", u.user.id).limit(1).maybeSingle();
    if (!store) return json({ subscribed: false }, 200, corsHeaders);
    if (store.is_default) return json({ subscribed: true, managed: true }, 200, corsHeaders);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: u.user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) return json({ subscribed: false }, 200, corsHeaders);

    const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
    const sub = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
    if (!sub) {
      // Tinha assinatura e ela acabou: marca como cancelada (não mexe em quem está só no teste grátis).
      if (subs.data.length > 0 && store.subscription_status === "active") {
        await admin.from("stores").update({ subscription_status: "canceled" }).eq("id", store.id);
      }
      return json({ subscribed: false }, 200, corsHeaders);
    }

    const item = sub.items.data[0];
    const info = PRICES[item.price.id];
    const endTs = (item as unknown as { current_period_end?: number }).current_period_end
      ?? (sub as unknown as { current_period_end?: number }).current_period_end;
    const periodEnd = endTs ? new Date(endTs * 1000).toISOString() : null;
    const status = sub.status === "past_due" ? "past_due" : "active";

    await admin.from("stores").update({
      ...(info ? { plan: info.plan } : {}),
      subscription_status: status,
      current_period_end: periodEnd,
    }).eq("id", store.id);

    return json({ subscribed: true, plan: info?.plan, cycle: info?.cycle, status, current_period_end: periodEnd, cancel_at_period_end: sub.cancel_at_period_end }, 200, corsHeaders);
  } catch (e) {
    console.error("[check-subscription]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500, corsHeaders);
  }
});
