import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método não permitido" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return response({ error: "Faça login como proprietário da loja" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Serviço de operadores indisponível" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const owner = authData.user;
    if (authError || !owner) return response({ error: "Sessão inválida. Entre novamente." }, 401);

    let payload: { storeId?: unknown; operatorId?: unknown; action?: unknown; password?: unknown };
    try { payload = await req.json(); } catch { return response({ error: "Dados inválidos" }, 400); }

    const storeId = typeof payload.storeId === "string" ? payload.storeId : "";
    const operatorId = typeof payload.operatorId === "string" ? payload.operatorId : "";
    const action = payload.action;
    if (!/^[0-9a-f-]{36}$/i.test(storeId) || !/^[0-9a-f-]{36}$/i.test(operatorId)) {
      return response({ error: "Loja ou operador inválido" }, 400);
    }
    if (action !== "remove" && action !== "reset_password") return response({ error: "Ação inválida" }, 400);

    const { data: membership, error: ownerError } = await admin
      .from("store_members").select("role").eq("store_id", storeId).eq("user_id", owner.id).maybeSingle();
    if (ownerError || membership?.role !== "owner") {
      return response({ error: "Somente o proprietário pode gerenciar os operadores" }, 403);
    }

    const { data: operator, error: operatorError } = await admin
      .from("store_operators").select("id,user_id,active")
      .eq("store_id", storeId).eq("id", operatorId).maybeSingle();
    if (operatorError || !operator || !operator.active) return response({ error: "Operador não encontrado ou já removido" }, 404);

    const { data: operatorMembership, error: memberError } = await admin
      .from("store_members").select("role")
      .eq("store_id", storeId).eq("user_id", operator.user_id).maybeSingle();
    if (memberError || operatorMembership?.role !== "operator") return response({ error: "Vínculo do operador não encontrado" }, 404);

    if (action === "reset_password") {
      const password = typeof payload.password === "string" ? payload.password : "";
      if (password.length < 8 || password.length > 72) return response({ error: "A senha deve ter entre 8 e 72 caracteres" }, 400);
      const { error } = await admin.auth.admin.updateUserById(operator.user_id, { password });
      if (error) return response({ error: "Não foi possível redefinir a senha" }, 400);
      return response({ success: true });
    }

    const { error: deactivateError } = await admin.from("store_operators")
      .update({ active: false }).eq("store_id", storeId).eq("id", operatorId);
    if (deactivateError) return response({ error: "Não foi possível remover o operador" }, 400);

    const { error: assignmentsError } = await admin.from("store_shift_assignments")
      .delete().eq("store_id", storeId).eq("operator_id", operatorId);
    if (assignmentsError) return response({ error: "Operador inativado; não foi possível atualizar a escala" }, 400);

    const { error: membershipDeleteError } = await admin.from("store_members")
      .delete().eq("store_id", storeId).eq("user_id", operator.user_id).eq("role", "operator");
    if (membershipDeleteError) return response({ error: "Operador inativado; não foi possível revogar o acesso" }, 400);

    return response({ success: true });
  } catch (error) {
    console.error("[manage-operator]", error);
    return response({ error: "Erro interno ao gerenciar o operador" }, 500);
  }
});
