CREATE OR REPLACE FUNCTION public.is_store_owner(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_members WHERE store_id = _store_id AND user_id = auth.uid() AND role = 'owner');
$$;
REVOKE ALL ON FUNCTION public.is_store_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.store_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT public.current_store_id() REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 80),
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id),
  UNIQUE (id, store_id)
);
ALTER TABLE public.store_operators ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS store_operators_store_idx ON public.store_operators (store_id);

CREATE TABLE IF NOT EXISTS public.store_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT public.current_store_id() REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 60),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at <> ends_at),
  UNIQUE (id, store_id)
);
CREATE INDEX IF NOT EXISTS store_shifts_store_day_idx ON public.store_shifts (store_id, day_of_week);

CREATE TABLE IF NOT EXISTS public.store_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL DEFAULT public.current_store_id() REFERENCES public.stores(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (shift_id, store_id) REFERENCES public.store_shifts(id, store_id) ON DELETE CASCADE,
  FOREIGN KEY (operator_id, store_id) REFERENCES public.store_operators(id, store_id) ON DELETE CASCADE,
  UNIQUE (shift_id, operator_id)
);
CREATE INDEX IF NOT EXISTS store_shift_assignments_store_idx ON public.store_shift_assignments (store_id);

REVOKE ALL PRIVILEGES ON public.store_operators, public.store_shifts, public.store_shift_assignments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_operators, public.store_shifts, public.store_shift_assignments TO authenticated;
GRANT ALL ON public.store_operators, public.store_shifts, public.store_shift_assignments TO service_role;

ALTER TABLE public.store_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_shift_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage store operators" ON public.store_operators;
CREATE POLICY "Owners manage store operators" ON public.store_operators FOR ALL TO authenticated
  USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));
DROP POLICY IF EXISTS "Owners manage store shifts" ON public.store_shifts;
CREATE POLICY "Owners manage store shifts" ON public.store_shifts FOR ALL TO authenticated
  USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));
DROP POLICY IF EXISTS "Owners manage shift assignments" ON public.store_shift_assignments;
CREATE POLICY "Owners manage shift assignments" ON public.store_shift_assignments FOR ALL TO authenticated
  USING (public.is_store_owner(store_id)) WITH CHECK (public.is_store_owner(store_id));

NOTIFY pgrst, 'reload schema';