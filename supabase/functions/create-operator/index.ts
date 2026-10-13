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

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return response({ error: "Faça login como proprietário da loja" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Serviço de autenticação indisponível" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let createdUserId: string | null = null;
  let storeId = "";

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const owner = authData.user;
    if (authError || !owner) return response({ error: "Sessão inválida. Entre novamente." }, 401);

    let payload: { storeId?: unknown; name?: unknown; email?: unknown; password?: unknown };
    try {
      payload = await req.json();
    } catch {
      return response({ error: "Dados inválidos" }, 400);
    }

    storeId = typeof payload.storeId === "string" ? payload.storeId : "";
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    if (!/^[0-9a-f-]{36}$/i.test(storeId)) return response({ error: "Loja inválida" }, 400);
    if (name.length < 2 || name.length > 80) return response({ error: "Informe um nome entre 2 e 80 caracteres" }, 400);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({ error: "Informe um e-mail válido" }, 400);
    if (password.length < 8 || password.length > 72) return response({ error: "A senha inicial deve ter entre 8 e 72 caracteres" }, 400);

    // Never trust the submitted store ID or role; verify the caller is its owner.
    const { data: membership, error: memberError } = await admin
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", owner.id)
      .maybeSingle();

    if (memberError || membership?.role !== "owner") {
      return response({ error: "Somente o proprietário pode cadastrar operadores nesta loja" }, 403);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (createError || !created.user) {
      return response({ error: createError?.message ?? "Não foi possível criar o acesso" }, 400);
    }
    createdUserId = created.user.id;

    // A database trigger locks the store and enforces the plan's seat limit atomically.
    const { error: membershipInsertError } = await admin.from("store_members").insert({
      store_id: storeId,
      user_id: createdUserId,
      role: "operator",
    });
    if (membershipInsertError) {
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      const isLimit = membershipInsertError.message.toLowerCase().includes("limite de usuários");
      return response({ error: isLimit ? membershipInsertError.message : "Não foi possível vincular o operador à loja" }, isLimit ? 409 : 400);
    }

    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: createdUserId, role: "operator" },
      { onConflict: "user_id,role" },
    );
    if (roleError) {
      await admin.from("store_members").delete().eq("store_id", storeId).eq("user_id", createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      return response({ error: "Não foi possível configurar as permissões do operador" }, 400);
    }

    const { data: operator, error: operatorError } = await admin.from("store_operators").insert({
      store_id: storeId,
      user_id: createdUserId,
      display_name: name,
      email,
      created_by: owner.id,
    }).select("id,user_id,display_name,email,created_at").single();

    if (operatorError || !operator) {
      await admin.from("store_members").delete().eq("store_id", storeId).eq("user_id", createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
      createdUserId = null;
      return response({ error: "Não foi possível salvar o cadastro do operador" }, 400);
    }

    return response({ operator }, 201);
  } catch (error) {
    if (createdUserId) {
      if (storeId) await admin.from("store_members").delete().eq("store_id", storeId).eq("user_id", createdUserId);
      await admin.auth.admin.deleteUser(createdUserId);
    }
    console.error("[create-operator]", error);
    return response({ error: "Erro interno ao criar o operador" }, 500);
  }
});
