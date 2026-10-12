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

CREATE TABLE public.store_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT public.current_store_id()
    REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 80),
  email text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id),
  UNIQUE (id, store_id)
);
CREATE INDEX store_operators_store_idx ON public.store_operators (store_id);

CREATE TABLE public.store_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT public.current_store_id()
    REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at <> ends_at),
  UNIQUE (id, store_id)
);
CREATE INDEX store_shifts_store_day_idx ON public.store_shifts (store_id, day_of_week);

CREATE TABLE public.store_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT public.current_store_id()
    REFERENCES public.stores(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (shift_id, store_id)
    REFERENCES public.store_shifts(id, store_id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id, store_id)
    REFERENCES public.store_operators(id, store_id) ON DELETE CASCADE,
  UNIQUE (shift_id, operator_id)
);
CREATE INDEX store_shift_assignments_store_idx ON public.store_shift_assignments (store_id);
CREATE INDEX store_shift_assignments_operator_idx ON public.store_shift_assignments (operator_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_operators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_shift_assignments TO authenticated;
GRANT ALL ON public.store_operators, public.store_shifts, public.store_shift_assignments TO service_role;

ALTER TABLE public.store_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage store operators" ON public.store_operators
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

CREATE POLICY "Owners manage store shifts" ON public.store_shifts
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));

CREATE POLICY "Owners manage shift assignments" ON public.store_shift_assignments
  FOR ALL TO authenticated
  USING (public.is_store_owner(store_id))
  WITH CHECK (public.is_store_owner(store_id));
