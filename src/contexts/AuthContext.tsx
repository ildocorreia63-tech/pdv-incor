import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Loja (assinante) à qual o usuário pertence. */
export interface StoreInfo {
  id: string;
  slug: string;
  name: string;
  plan: "trial" | "essencial" | "pro" | "premium";
  subscription_status: "trialing" | "active" | "past_due" | "canceled" | "expired";
  trial_ends_at: string;
  current_period_end: string | null;
  is_default: boolean;
  memberRole: "owner" | "admin" | "operator";
}

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  /** undefined = ainda carregando; null = usuário sem loja */
  store: StoreInfo | null | undefined;
  refreshStore: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

async function loadAccess(userId: string): Promise<{ isAdmin: boolean; store: StoreInfo | null }> {
  const [roles, member] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase
      .from("store_members")
      .select("role, stores(id, slug, name, plan, subscription_status, trial_ends_at, current_period_end, is_default)")
      .eq("user_id", userId)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
  ]);
  const s = member.data?.stores as Omit<StoreInfo, "memberRole"> | null | undefined;
  return {
    isAdmin: !!roles.data?.some((r) => r.role === "admin"),
    store: s ? { ...s, memberRole: member.data!.role as StoreInfo["memberRole"] } : null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [store, setStore] = useState<StoreInfo | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const apply = useCallback(async (u: User | null) => {
    if (!u) {
      setIsAdmin(false);
      setStore(null);
      return;
    }
    const access = await loadAccess(u.id);
    setIsAdmin(access.isAdmin);
    setStore(access.store);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // adia para fora do callback (evita deadlock do supabase-js)
      setTimeout(() => void apply(s?.user ?? null), 0);
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      await apply(s?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [apply]);

  const refreshStore = useCallback(async () => {
    await apply(user);
  }, [apply, user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ user, session, isAdmin, loading, store, refreshStore, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
