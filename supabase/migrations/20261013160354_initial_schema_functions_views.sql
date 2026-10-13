CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() = _user_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$function$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT auth.uid() = _user_id AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$function$;
CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.store_members WHERE store_id = _store_id AND user_id = auth.uid());
$function$;
CREATE OR REPLACE FUNCTION public.is_store_admin(_store_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.store_members WHERE store_id = _store_id AND user_id = auth.uid() AND role IN ('owner','admin'));
$function$;
CREATE OR REPLACE FUNCTION public.current_store_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_slug text; v_id uuid;
BEGIN
  BEGIN
    v_slug := lower(nullif(current_setting('request.headers', true), '')::json->>'x-store-slug');
  EXCEPTION WHEN others THEN v_slug := NULL;
  END;
  IF v_slug IS NOT NULL AND v_slug <> '' THEN
    SELECT id INTO v_id FROM public.stores WHERE slug = v_slug;
    -- slug desconhecido nunca cai para outra loja
    RETURN v_id;
  END IF;
  SELECT store_id INTO v_id FROM public.store_members WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  SELECT id INTO v_id FROM public.stores WHERE is_default LIMIT 1;
  RETURN v_id;
END;
$function$;
CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$function$;
CREATE OR REPLACE FUNCTION public.get_store_by_slug(_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('id', id, 'slug', slug, 'name', name,
    'active', subscription_status IN ('trialing','active') AND (subscription_status <> 'trialing' OR trial_ends_at > now()))
  FROM public.stores WHERE slug = lower(_slug);
$function$;
CREATE OR REPLACE FUNCTION public.get_public_store_settings()
 RETURNS TABLE(id uuid, store_name text, logo_url text, banner_url text, banner_enabled boolean, welcome_message text, whatsapp_number text, business_hours jsonb, menu_open boolean, delivery_mode text, delivery_km_tiers jsonb, store_address text, store_lat numeric, store_lng numeric, min_order_value numeric, show_min_order boolean, rating numeric, show_rating boolean, show_whatsapp_link boolean, show_login_button boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.store_name, s.logo_url, s.banner_url, s.banner_enabled,
    s.welcome_message, s.whatsapp_number, s.business_hours, s.menu_open,
    s.delivery_mode, s.delivery_km_tiers, s.store_address, s.store_lat,
    s.store_lng, s.min_order_value, s.show_min_order, s.rating,
    s.show_rating, s.show_whatsapp_link, s.show_login_button
  FROM public.store_settings AS s
  WHERE s.store_id = public.current_store_id()
  LIMIT 1
$function$;
CREATE OR REPLACE FUNCTION public.get_online_order_status(_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', id,
    'status', status,
    'payment_confirmed_at', payment_confirmed_at,
    'cancellation_reason', cancellation_reason,
    'cancelled_at', cancelled_at,
    'accepted_at', accepted_at,
    'sale_id', sale_id
  )
  FROM public.online_orders
  WHERE id = _id
    AND created_at > now() - interval '30 days';
$function$;
CREATE OR REPLACE FUNCTION public.get_online_order(_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order jsonb;
  v_items jsonb;
BEGIN
  SELECT to_jsonb(o) - 'asaas_api_response' INTO v_order
  FROM public.online_orders o
  WHERE o.id = _id
    AND o.created_at > now() - interval '30 days';

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.id), '[]'::jsonb) INTO v_items
  FROM public.online_order_items i
  WHERE i.online_order_id = _id;

  RETURN jsonb_build_object('order', v_order, 'items', v_items);
END;
$function$;
CREATE OR REPLACE FUNCTION public.platform_list_stores()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC) FROM (
    SELECT s.id, s.slug, s.name, s.plan, s.subscription_status, s.trial_ends_at, s.current_period_end,
      s.is_default, s.created_at, u.email AS owner_email,
      (SELECT count(*) FROM public.products p WHERE p.store_id = s.id) AS products,
      (SELECT count(*) FROM public.sales x WHERE x.store_id = s.id AND x.created_at > now() - interval '30 days') AS sales_30d,
      (SELECT coalesce(sum(x.total),0) FROM public.sales x WHERE x.store_id = s.id AND x.status <> 'cancelled' AND x.created_at > now() - interval '30 days') AS revenue_30d
    FROM public.stores s LEFT JOIN auth.users u ON u.id = s.owner_id) t), '[]'::jsonb);
END; $function$;
CREATE OR REPLACE FUNCTION public.platform_update_store(_id uuid, _plan text, _status text, _extend_days integer DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'acesso negado'; END IF;
  IF _plan NOT IN ('essencial','pro','premium') THEN RAISE EXCEPTION 'plano inválido'; END IF;
  IF _status NOT IN ('trialing','active','past_due','canceled') THEN RAISE EXCEPTION 'status inválido'; END IF;
  IF _extend_days < 0 OR _extend_days > 365 THEN RAISE EXCEPTION 'dias inválidos'; END IF;
  UPDATE public.stores SET plan = _plan, subscription_status = _status,
    trial_ends_at = CASE WHEN _extend_days > 0 THEN greatest(trial_ends_at, now()) + make_interval(days => _extend_days) ELSE trial_ends_at END
  WHERE id = _id;
END; $function$;
CREATE OR REPLACE FUNCTION public.create_store(_name text, _slug text, _whatsapp text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_slug text := lower(btrim(_slug));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'faça login para criar a loja'; END IF;
  IF EXISTS (SELECT 1 FROM public.store_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'você já possui uma loja';
  END IF;
  IF v_slug !~ '^[a-z0-9](-?[a-z0-9])*$' OR length(v_slug) NOT BETWEEN 3 AND 40 THEN
    RAISE EXCEPTION 'link inválido: use letras minúsculas, números e hífen';
  END IF;
  IF EXISTS (SELECT 1 FROM public.stores WHERE slug = v_slug) THEN RAISE EXCEPTION 'esse link já está em uso'; END IF;

  INSERT INTO public.stores (slug, name, owner_id) VALUES (v_slug, btrim(_name), v_uid) RETURNING id INTO v_id;
  INSERT INTO public.store_members (store_id, user_id, role) VALUES (v_id, v_uid, 'owner');
  -- papel de administrador (isolado pela política restritiva de loja)
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  INSERT INTO public.store_settings (store_id, store_name, whatsapp_number) VALUES (v_id, btrim(_name), nullif(btrim(coalesce(_whatsapp,'')), ''));
  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
END;
$function$;
CREATE OR REPLACE FUNCTION public.upsert_customer_profile(_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text; v_phone text; v_email text; v_cpf text; v_birth date; v_id uuid;
  v_store uuid := public.current_store_id();
BEGIN
  v_name  := btrim(coalesce(_data->>'name',''));
  v_phone := regexp_replace(coalesce(_data->>'phone',''), '\D', '', 'g');
  v_email := nullif(btrim(coalesce(_data->>'email','')), '');
  v_cpf   := nullif(regexp_replace(coalesce(_data->>'cpf',''), '\D', '', 'g'), '');
  v_birth := nullif(_data->>'birth_date','')::date;
  IF v_store IS NULL THEN RAISE EXCEPTION 'loja não encontrada'; END IF;
  IF length(v_name) < 2 OR length(v_name) > 120 THEN RAISE EXCEPTION 'nome inválido'; END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 13 THEN RAISE EXCEPTION 'WhatsApp inválido'; END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'e-mail inválido'; END IF;
  IF v_cpf IS NOT NULL AND length(v_cpf) <> 11 THEN RAISE EXCEPTION 'CPF inválido'; END IF;

  INSERT INTO public.customers (store_id, name, phone, email, cpf, birth_date,
    address_street, address_number, address_complement, address_reference)
  VALUES (v_store, v_name, v_phone, v_email, v_cpf, v_birth,
    nullif(btrim(coalesce(_data->>'address_street','')), ''),
    nullif(btrim(coalesce(_data->>'address_number','')), ''),
    nullif(btrim(coalesce(_data->>'address_complement','')), ''),
    nullif(btrim(coalesce(_data->>'address_reference','')), ''))
  ON CONFLICT (store_id, phone) WHERE phone IS NOT NULL DO UPDATE SET
    name = EXCLUDED.name,
    email = COALESCE(EXCLUDED.email, public.customers.email),
    cpf = COALESCE(EXCLUDED.cpf, public.customers.cpf),
    birth_date = COALESCE(EXCLUDED.birth_date, public.customers.birth_date),
    address_street = COALESCE(EXCLUDED.address_street, public.customers.address_street),
    address_number = COALESCE(EXCLUDED.address_number, public.customers.address_number),
    address_complement = COALESCE(EXCLUDED.address_complement, public.customers.address_complement),
    address_reference = COALESCE(EXCLUDED.address_reference, public.customers.address_reference),
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id);
END;
$function$;
CREATE OR REPLACE FUNCTION public.create_online_order(_order jsonb, _items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_store uuid := public.current_store_id();
  v_id uuid; v_number bigint; v_status online_order_status; v_pm text; v_type online_order_type;
  v_zone_id uuid; v_zone_fee numeric; v_subtotal numeric; v_total numeric; v_delivery_fee numeric;
  v_items_sum numeric; v_name text; v_phone text; v_item jsonb; v_pid uuid; v_real_price numeric;
  v_real_name text; v_qty numeric; v_unit numeric; v_sub numeric; v_mode text; v_count int;
  v_valid jsonb := '[]'::jsonb;
BEGIN
  IF v_store IS NULL THEN RAISE EXCEPTION 'loja não encontrada'; END IF;
  v_name := coalesce(_order->>'customer_name','');
  v_phone := coalesce(_order->>'customer_phone','');
  IF length(v_name) < 1 OR length(v_name) > 120 THEN RAISE EXCEPTION 'nome inválido'; END IF;
  IF length(v_phone) < 1 OR length(v_phone) > 30 THEN RAISE EXCEPTION 'telefone inválido'; END IF;
  v_pm := _order->>'payment_method';
  IF v_pm IS NOT NULL AND v_pm NOT IN ('cash','pix','card_delivery','credit','debit') THEN
    RAISE EXCEPTION 'forma de pagamento inválida';
  END IF;
  v_type := (_order->>'order_type')::online_order_type;
  v_subtotal := coalesce((_order->>'subtotal')::numeric, 0);
  v_total := coalesce((_order->>'total')::numeric, 0);
  v_delivery_fee := coalesce((_order->>'delivery_fee')::numeric, 0);
  IF v_subtotal < 0 OR v_total < 0 OR v_delivery_fee < 0 THEN RAISE EXCEPTION 'valores inválidos'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' THEN RAISE EXCEPTION 'itens do pedido ausentes ou em formato inválido'; END IF;
  v_count := jsonb_array_length(_items);
  IF v_count = 0 THEN RAISE EXCEPTION 'o pedido precisa ter ao menos um item'; END IF;
  IF v_count > 100 THEN RAISE EXCEPTION 'quantidade de itens acima do limite'; END IF;

  SELECT delivery_mode INTO v_mode FROM store_settings WHERE store_id = v_store LIMIT 1;

  IF v_type = 'delivery' THEN
    IF coalesce(v_mode,'zones') = 'km' THEN
      v_zone_id := NULL;
    ELSE
      v_zone_id := nullif(_order->>'delivery_zone_id','')::uuid;
      IF v_zone_id IS NULL THEN RAISE EXCEPTION 'zona de entrega obrigatória'; END IF;
      SELECT fee INTO v_zone_fee FROM delivery_zones WHERE id = v_zone_id AND active = true AND store_id = v_store;
      IF v_zone_fee IS NULL THEN RAISE EXCEPTION 'zona de entrega inválida'; END IF;
      IF v_zone_fee <> v_delivery_fee THEN RAISE EXCEPTION 'taxa de entrega divergente'; END IF;
    END IF;
  END IF;

  v_items_sum := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    v_pid := nullif(v_item->>'product_id','')::uuid;
    v_qty := (v_item->>'quantity')::numeric;
    v_unit := (v_item->>'unit_price')::numeric;
    v_sub := (v_item->>'subtotal')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN RAISE EXCEPTION 'quantidade inválida'; END IF;
    IF v_unit IS NULL OR v_unit < 0 THEN RAISE EXCEPTION 'preço inválido'; END IF;
    IF v_pid IS NULL THEN RAISE EXCEPTION 'item inválido'; END IF;
    SELECT price, name INTO v_real_price, v_real_name
    FROM products WHERE id = v_pid AND active = true AND store_id = v_store;
    IF v_real_price IS NULL THEN RAISE EXCEPTION 'produto indisponível'; END IF;
    IF round(v_real_price, 2) <> round(v_unit, 2) THEN RAISE EXCEPTION 'preço do produto divergente do cardápio'; END IF;
    IF round(v_sub, 2) <> round(v_unit * v_qty, 2) THEN RAISE EXCEPTION 'subtotal do item não confere'; END IF;
    v_items_sum := v_items_sum + v_sub;
    v_valid := v_valid || jsonb_build_object('product_id', v_pid, 'product_name', v_real_name,
      'unit_price', v_real_price, 'quantity', v_qty, 'subtotal', round(v_real_price * v_qty, 2));
  END LOOP;

  IF round(v_items_sum,2) <> round(v_subtotal,2) THEN
    RAISE EXCEPTION 'subtotal não confere com itens (% vs %)', v_subtotal, v_items_sum;
  END IF;
  IF round(v_total,2) <> round(v_subtotal + v_delivery_fee, 2) THEN
    RAISE EXCEPTION 'total não confere com subtotal+frete';
  END IF;

  v_status := (CASE WHEN v_pm IN ('pix','credit','debit') THEN 'pending_payment' ELSE 'pending' END)::online_order_status;

  INSERT INTO online_orders (store_id,
    customer_name, customer_phone, order_type, delivery_zone_id, delivery_zone_name,
    delivery_fee, address_street, address_number, address_complement, address_reference,
    subtotal, total, notes, payment_method, payment_change_for, status
  ) VALUES (v_store,
    v_name, v_phone, v_type, v_zone_id, nullif(_order->>'delivery_zone_name',''),
    v_delivery_fee,
    nullif(_order->>'address_street',''), nullif(_order->>'address_number',''),
    nullif(_order->>'address_complement',''), nullif(_order->>'address_reference',''),
    v_subtotal, v_total, nullif(_order->>'notes',''), v_pm,
    nullif(_order->>'payment_change_for','')::numeric, v_status
  ) RETURNING id, order_number INTO v_id, v_number;

  INSERT INTO online_order_items (store_id, online_order_id, product_id, product_name, unit_price, quantity, subtotal)
  SELECT v_store, v_id, (it->>'product_id')::uuid, it->>'product_name', (it->>'unit_price')::numeric,
    (it->>'quantity')::numeric, (it->>'subtotal')::numeric
  FROM jsonb_array_elements(v_valid) AS it;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN RAISE EXCEPTION 'falha ao gravar itens do pedido'; END IF;
  RETURN jsonb_build_object('id', v_id, 'order_number', v_number, 'items_count', v_count);
END;
$function$;
CREATE OR REPLACE FUNCTION public.reset_operational_data(_reset_stock boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_sales int; v_expenses int; v_orders int; v_store uuid := public.current_store_id();
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_store_admin(v_store) THEN
    RAISE EXCEPTION 'apenas administradores da loja podem reiniciar os dados';
  END IF;
  SELECT count(*) INTO v_sales FROM public.sales WHERE store_id = v_store;
  SELECT count(*) INTO v_expenses FROM public.expenses WHERE store_id = v_store;
  SELECT count(*) INTO v_orders FROM public.online_orders WHERE store_id = v_store;
  DELETE FROM public.ingredient_movements WHERE store_id = v_store;
  DELETE FROM public.online_order_items WHERE store_id = v_store;
  DELETE FROM public.online_orders WHERE store_id = v_store;
  DELETE FROM public.payments WHERE store_id = v_store;
  DELETE FROM public.sale_items WHERE store_id = v_store;
  DELETE FROM public.sales WHERE store_id = v_store;
  DELETE FROM public.expenses WHERE store_id = v_store;
  DELETE FROM public.cash_movements WHERE store_id = v_store;
  DELETE FROM public.cash_registers WHERE store_id = v_store;
  UPDATE public.customers SET credit_balance = 0 WHERE store_id = v_store AND credit_balance <> 0;
  IF _reset_stock THEN
    UPDATE public.ingredients SET stock_quantity = 0 WHERE store_id = v_store AND stock_quantity <> 0;
  END IF;
  RETURN jsonb_build_object('sales', v_sales, 'expenses', v_expenses, 'orders', v_orders);
END;
$function$;
CREATE OR REPLACE FUNCTION public.consume_ingredients_for_sale_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_consume numeric;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  FOR r IN
    SELECT pr.ingredient_id, pr.quantity, i.cost_per_unit
    FROM public.product_recipes pr
    JOIN public.ingredients i ON i.id = pr.ingredient_id
    WHERE pr.product_id = NEW.product_id
  LOOP
    v_consume := r.quantity * NEW.quantity;
    UPDATE public.ingredients
      SET stock_quantity = stock_quantity - v_consume
      WHERE id = r.ingredient_id;
    INSERT INTO public.ingredient_movements
      (ingredient_id, type, quantity, unit_cost, sale_id, sale_item_id, notes)
    VALUES
      (r.ingredient_id, 'sale', -v_consume, r.cost_per_unit, NEW.sale_id, NEW.id,
       'Baixa automática de venda');
  END LOOP;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.validate_online_order_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_order online_orders%ROWTYPE;
  v_items_sum numeric;
  v_expected_total numeric;
BEGIN
  IF TG_TABLE_NAME = 'online_order_items' THEN
    v_order_id := NEW.online_order_id;
  ELSE
    v_order_id := NEW.id;
  END IF;

  SELECT * INTO v_order FROM online_orders WHERE id = v_order_id;
  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Skip validation for staff-managed updates (accepted orders)
  IF v_order.accepted_by IS NOT NULL OR v_order.sale_id IS NOT NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_items_sum
  FROM online_order_items WHERE online_order_id = v_order.id;

  -- If no items yet (initial order insert), skip — the items trigger will validate later.
  IF v_items_sum = 0 THEN
    RETURN NULL;
  END IF;

  v_expected_total := round(v_items_sum + COALESCE(v_order.delivery_fee, 0), 2);

  IF round(v_order.subtotal, 2) <> round(v_items_sum, 2) THEN
    RAISE EXCEPTION 'Subtotal do pedido (%) não confere com soma dos itens (%)', v_order.subtotal, v_items_sum;
  END IF;

  IF round(v_order.total, 2) <> v_expected_total THEN
    RAISE EXCEPTION 'Total do pedido (%) não confere com subtotal+frete (%)', v_order.total, v_expected_total;
  END IF;

  RETURN NULL;
END;
$function$;
CREATE OR REPLACE FUNCTION public.validate_sale_item_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Se o produto_id for nulo (ex: taxa de entrega manual), permite.
  -- Senão, garante que o preço não é negativo.
  IF NEW.product_id IS NOT NULL AND NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'preço unitário não pode ser negativo';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  -- subsequent users start with no role; admin must promote them explicitly
  RETURN NEW;
END;
$function$;

-- Keep freshly created SECURITY DEFINER functions inaccessible until final grants are applied.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER TABLE public."cash_movements" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."cash_registers" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."categories" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."customers" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."delivery_zones" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."expenses" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."ingredient_movements" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."ingredients" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."online_order_items" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."online_orders" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."payments" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."product_recipes" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."products" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."sale_items" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."sales" ALTER COLUMN "store_id" SET DEFAULT current_store_id();
ALTER TABLE public."store_settings" ALTER COLUMN "store_id" SET DEFAULT current_store_id();

CREATE INDEX cash_movements_store_idx ON public.cash_movements USING btree (store_id);
CREATE INDEX idx_cash_movements_register ON public.cash_movements USING btree (cash_register_id);
CREATE INDEX cash_registers_store_idx ON public.cash_registers USING btree (store_id);
CREATE INDEX idx_cash_registers_status ON public.cash_registers USING btree (status);
CREATE UNIQUE INDEX uniq_single_open_register ON public.cash_registers USING btree (status) WHERE (status = 'open'::text);
CREATE INDEX categories_store_idx ON public.categories USING btree (store_id);
CREATE INDEX customers_store_idx ON public.customers USING btree (store_id);
CREATE UNIQUE INDEX customers_store_phone_unique_idx ON public.customers USING btree (store_id, phone) WHERE (phone IS NOT NULL);
CREATE INDEX delivery_zones_store_idx ON public.delivery_zones USING btree (store_id);
CREATE INDEX expenses_store_idx ON public.expenses USING btree (store_id);
CREATE INDEX idx_expenses_created_by ON public.expenses USING btree (created_by);
CREATE INDEX idx_expenses_date ON public.expenses USING btree (expense_date DESC);
CREATE INDEX idx_mov_ingredient ON public.ingredient_movements USING btree (ingredient_id, created_at DESC);
CREATE INDEX ingredient_movements_store_idx ON public.ingredient_movements USING btree (store_id);
CREATE INDEX ingredients_store_idx ON public.ingredients USING btree (store_id);
CREATE INDEX online_order_items_store_idx ON public.online_order_items USING btree (store_id);
CREATE INDEX idx_online_orders_asaas_payment_id ON public.online_orders USING btree (asaas_payment_id) WHERE (asaas_payment_id IS NOT NULL);
CREATE INDEX idx_online_orders_customer_phone ON public.online_orders USING btree (customer_phone);
CREATE UNIQUE INDEX online_orders_external_unique ON public.online_orders USING btree (external_platform, external_order_id) WHERE ((external_platform IS NOT NULL) AND (external_order_id IS NOT NULL));
CREATE INDEX online_orders_source_idx ON public.online_orders USING btree (source);
CREATE INDEX online_orders_store_idx ON public.online_orders USING btree (store_id);
CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);
CREATE INDEX idx_payments_customer ON public.payments USING btree (customer_id);
CREATE INDEX idx_payments_sale ON public.payments USING btree (sale_id);
CREATE INDEX payments_store_idx ON public.payments USING btree (store_id);
CREATE INDEX idx_recipes_product ON public.product_recipes USING btree (product_id);
CREATE INDEX product_recipes_store_idx ON public.product_recipes USING btree (store_id);
CREATE INDEX idx_products_category ON public.products USING btree (category_id);
CREATE INDEX products_store_idx ON public.products USING btree (store_id);
CREATE INDEX idx_sale_items_sale ON public.sale_items USING btree (sale_id);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items USING btree (sale_id);
CREATE INDEX sale_items_store_idx ON public.sale_items USING btree (store_id);
CREATE INDEX idx_sales_created ON public.sales USING btree (created_at DESC);
CREATE INDEX idx_sales_customer_created_at ON public.sales USING btree (customer_id, created_at DESC) WHERE (customer_id IS NOT NULL);
CREATE INDEX idx_sales_customer_id ON public.sales USING btree (customer_id) WHERE (customer_id IS NOT NULL);
CREATE INDEX idx_sales_operator_id ON public.sales USING btree (operator_id);
CREATE INDEX sales_store_idx ON public.sales USING btree (store_id);
CREATE INDEX store_members_user_idx ON public.store_members USING btree (user_id);
CREATE INDEX store_settings_store_idx ON public.store_settings USING btree (store_id);
CREATE INDEX stores_owner_idx ON public.stores USING btree (owner_id);
CREATE UNIQUE INDEX stores_single_default ON public.stores USING btree (is_default) WHERE is_default;

CREATE TRIGGER trg_cash_registers_updated_at BEFORE UPDATE ON cash_registers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ingredients_updated BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE CONSTRAINT TRIGGER validate_online_order_totals_items AFTER INSERT ON online_order_items DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_online_order_totals();
CREATE TRIGGER online_orders_updated_at BEFORE UPDATE ON online_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE CONSTRAINT TRIGGER validate_online_order_totals_order AFTER INSERT ON online_orders DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_online_order_totals();
CREATE TRIGGER trg_recipes_updated BEFORE UPDATE ON product_recipes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_consume_ingredients AFTER INSERT ON sale_items FOR EACH ROW EXECUTE FUNCTION consume_ingredients_for_sale_item();
CREATE TRIGGER trg_validate_sale_item_price BEFORE INSERT OR UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION validate_sale_item_price();
CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW public.public_store_settings WITH (security_invoker=true) AS SELECT id,
    store_name,
    logo_url,
    banner_url,
    banner_enabled,
    welcome_message,
    whatsapp_number,
    business_hours,
    menu_open,
    delivery_mode,
    delivery_km_tiers,
    store_address,
    store_lat,
    store_lng,
    min_order_value,
    show_min_order,
    rating,
    show_rating,
    show_whatsapp_link,
    show_login_button
   FROM get_public_store_settings() get_public_store_settings(id, store_name, logo_url, banner_url, banner_enabled, welcome_message, whatsapp_number, business_hours, menu_open, delivery_mode, delivery_km_tiers, store_address, store_lat, store_lng, min_order_value, show_min_order, rating, show_rating, show_whatsapp_link, show_login_button);
