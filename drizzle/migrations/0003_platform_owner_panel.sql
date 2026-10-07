CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own row" ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.platform_list_stores()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC) FROM (
    SELECT s.id, s.slug, s.name, s.plan, s.subscription_status, s.trial_ends_at, s.current_period_end,
      s.is_default, s.created_at, u.email AS owner_email,
      (SELECT count(*) FROM public.products p WHERE p.store_id = s.id) AS products,
      (SELECT count(*) FROM public.sales x WHERE x.store_id = s.id AND x.created_at > now() - interval '30 days') AS sales_30d,
      (SELECT coalesce(sum(x.total),0) FROM public.sales x WHERE x.store_id = s.id AND x.status <> 'cancelled' AND x.created_at > now() - interval '30 days') AS revenue_30d
    FROM public.stores s LEFT JOIN auth.users u ON u.id = s.owner_id) t), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.platform_update_store(_id uuid, _plan text, _status text, _extend_days int DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'acesso negado'; END IF;
  IF _plan NOT IN ('essencial','pro','premium') THEN RAISE EXCEPTION 'plano inválido'; END IF;
  IF _status NOT IN ('trialing','active','past_due','canceled') THEN RAISE EXCEPTION 'status inválido'; END IF;
  IF _extend_days < 0 OR _extend_days > 365 THEN RAISE EXCEPTION 'dias inválidos'; END IF;
  UPDATE public.stores SET plan = _plan, subscription_status = _status,
    trial_ends_at = CASE WHEN _extend_days > 0 THEN greatest(trial_ends_at, now()) + make_interval(days => _extend_days) ELSE trial_ends_at END
  WHERE id = _id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.platform_list_stores() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.platform_update_store(uuid, text, text, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_stores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_update_store(uuid, text, text, int) TO authenticated;