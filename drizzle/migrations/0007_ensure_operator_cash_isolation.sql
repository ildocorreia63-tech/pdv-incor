DROP INDEX IF EXISTS public.uniq_single_open_register;
CREATE UNIQUE INDEX IF NOT EXISTS cash_registers_one_open_per_operator_idx ON public.cash_registers (store_id, opened_by) WHERE status = 'open';
DROP POLICY IF EXISTS "Operator cash register isolation" ON public.cash_registers;
CREATE POLICY "Operator cash register isolation" ON public.cash_registers AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_store_admin(store_id) OR opened_by = auth.uid())
  WITH CHECK (public.is_store_admin(store_id) OR opened_by = auth.uid());
DROP POLICY IF EXISTS "Operator cash movement isolation" ON public.cash_movements;
CREATE POLICY "Operator cash movement isolation" ON public.cash_movements AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cash_registers cr WHERE cr.id = cash_movements.cash_register_id AND (public.is_store_admin(cr.store_id) OR cr.opened_by = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.cash_registers cr WHERE cr.id = cash_movements.cash_register_id AND (public.is_store_admin(cr.store_id) OR cr.opened_by = auth.uid())));
NOTIFY pgrst, 'reload schema';