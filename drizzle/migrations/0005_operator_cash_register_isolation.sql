-- Keep operator cash sessions private and independent within each store.
ALTER TABLE public.store_operators
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Replace any partial unique index that allowed only one open till per store.
DO $$
DECLARE v_index record;
BEGIN
  FOR v_index IN
    SELECT indexrelid::regclass AS index_name
    FROM pg_index
    WHERE indrelid = 'public.cash_registers'::regclass
      AND indisunique
      AND indpred IS NOT NULL
      AND pg_get_expr(indpred, indrelid) ILIKE '%open%'
  LOOP
    EXECUTE format('DROP INDEX %s', v_index.index_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS cash_registers_one_open_per_operator_idx
  ON public.cash_registers (store_id, opened_by)
  WHERE status = 'open';

-- A logged-in operator can only see and operate their own cash register.
CREATE POLICY "Operator cash register isolation"
  ON public.cash_registers AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.is_store_admin(store_id) OR opened_by = auth.uid())
  WITH CHECK (public.is_store_admin(store_id) OR opened_by = auth.uid());

CREATE POLICY "Operator cash movement isolation"
  ON public.cash_movements AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cash_registers cr
      WHERE cr.id = cash_movements.cash_register_id
        AND (public.is_store_admin(cr.store_id) OR cr.opened_by = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cash_registers cr
      WHERE cr.id = cash_movements.cash_register_id
        AND (public.is_store_admin(cr.store_id) OR cr.opened_by = auth.uid())
    )
  );
