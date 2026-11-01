import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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
  accessError: string | null;
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
  if (roles.error) throw roles.error;
  if (member.error) throw member.error;
  const s = member.data?.stores as Omit<StoreInfo, "memberRole"> | null | undefined;
  return {
    isAdmin: !!s && (member.data?.role === "owner" || member.data?.role === "admin"),
    store: s && member.data ? { ...s, memberRole: member.data.role as StoreInfo["memberRole"] } : null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [store, setStore] = useState<StoreInfo | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState<string | null>(null);
  const generation = useRef(0);
  const queryClient = useQueryClient();

  const hydrate = useCallback(async (nextSession: Session | null) => {
    const version = ++generation.current;
    setLoading(true);
    setAccessError(null);
    setIsAdmin(false);
    setStore(undefined);
    try {
      if (!nextSession) {
        setSession(null);
        setUser(null);
        setStore(null);
        queryClient.clear();
        return;
      }
      // Revalidate stored tokens with Auth, rather than trusting browser storage.
      const { data, error } = await supabase.auth.getUser();
      if (version !== generation.current) return;
      if (error || !data.user) {
        setSession(null);
        setUser(null);
        setStore(null);
        return;
      }
      setSession(nextSession);
      setUser(data.user);
      const access = await loadAccess(data.user.id);
      if (version !== generation.current) return;
      setIsAdmin(access.isAdmin);
      setStore(access.store);
    } catch {
      if (version === generation.current) {
        setAccessError("Não foi possível verificar seu acesso à loja. Tente novamente.");
        setStore(null);
      }
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    let alive = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoading(true);
      // Defer Auth calls outside the listener to avoid the SDK's auth lock.
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (alive) void hydrate(s);
      }, 0);
      timers.add(timer);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (alive) return hydrate(error ? null : data.session);
    }).catch(() => {
      if (alive) void hydrate(null);
    });

    return () => {
      alive = false;
      generation.current++;
      timers.forEach(clearTimeout);
      sub.subscription.unsubscribe();
    };
  }, [hydrate]);

  const refreshStore = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    await hydrate(error ? null : data.session);
  }, [hydrate]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await hydrate(null);
  };

  return (
    <Ctx.Provider value={{ user, session, isAdmin, loading, accessError, store, refreshStore, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
