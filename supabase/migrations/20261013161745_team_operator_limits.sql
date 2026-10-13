-- Operator accounts, weekly shifts, and cash isolation.
-- Team members, plan seat limits, and weekly shift assignments.
CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid() AND role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.is_store_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid) TO authenticated, service_role;

-- Serialize operator creation per store so concurrent requests cannot exceed the plan.
CREATE OR REPLACE FUNCTION public.enforce_store_member_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_status text;
  v_trial_ends_at timestamptz;
  v_limit integer;
  v_count integer;
BEGIN
  IF NEW.role <> 'operator' THEN
    RETURN NEW;
  END IF;

  SELECT plan, subscription_status, trial_ends_at
    INTO v_plan, v_status, v_trial_ends_at
    FROM public.stores
    WHERE id = NEW.store_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada';
  END IF;

  -- O teste grátis libera os recursos até sua data de término.
  IF v_status = 'trialing' AND v_trial_ends_at > now() THEN
    RETURN NEW;
  END IF;

  v_limit := CASE v_plan
    WHEN 'essencial' THEN 1
    WHEN 'pro' THEN 3
    WHEN 'premium' THEN NULL
    ELSE 1
  END;

  IF v_limit IS NOT NULL THEN
    SELECT count(*)::integer INTO v_count
      FROM public.store_members
      WHERE store_id = NEW.store_id;

    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Limite de usuários do plano atingido (% de %). Faça upgrade para adicionar operadores.', v_count, v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_store_member_user_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_store_member_user_limit ON public.store_members;
CREATE TRIGGER trg_store_member_user_limit
  BEFORE INSERT ON public.store_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_store_member_user_limit();

