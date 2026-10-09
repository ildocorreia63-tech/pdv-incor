import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { json } from "../_shared/stripePlans.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: u, error } = await admin.auth.getUser(token);
    if (error || !u.user?.email) return json({ error: "Não autenticado" }, 401, corsHeaders);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: u.user.email, limit: 1 });
    if (!customers.data[0]) return json({ error: "Você ainda não tem assinatura" }, 404, corsHeaders);

    const portal = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${req.headers.get("origin") ?? ""}/assinatura`,
    });
    return json({ url: portal.url }, 200, corsHeaders);
  } catch (e) {
    console.error("[customer-portal]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500, corsHeaders);
  }
});
