-- Pin the trigger function's search_path to avoid role-controlled object resolution.
ALTER FUNCTION public.validate_sale_item_price() SET search_path = public;
