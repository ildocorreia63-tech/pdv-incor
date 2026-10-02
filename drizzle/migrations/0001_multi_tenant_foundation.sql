-- 1) Lojas e membros
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9](-?[a-z0-9])*$' AND length(slug) BETWEEN 3 AND 40),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  owner_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','essencial','pro','premium')),
  subscription_status text NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('trialing','active','past_due','canceled','expired')),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  current_period_end timestamptz,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX stores_single_default ON public.stores (is_default) WHERE is_default;
CREATE INDEX stores_owner_idx ON public.stores (owner_id);
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('owner','admin','operator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
CREATE INDEX store_members_user_idx ON public.store_members (user_id);

GRANT SELECT ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
GRANT SELECT ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- 2) Funções auxiliares
CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_members WHERE store_id = _store_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_store_admin(_store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.store_members WHERE store_id = _store_id AND user_id = auth.uid() AND role IN ('owner','admin'));
$$;

-- Loja ativa: a do usuário logado; para visitantes do cardápio, a loja padrão.
CREATE OR REPLACE FUNCTION public.current_store_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT store_id FROM public.store_members WHERE user_id = auth.uid() ORDER BY created_at LIMIT 1),
    (SELECT id FROM public.stores WHERE is_default LIMIT 1)
  );
$$;

CREATE POLICY "Members read own stores" ON public.stores FOR SELECT TO authenticated USING (public.is_store_member(id));
CREATE POLICY "Members read store members" ON public.store_members FOR SELECT TO authenticated USING (public.is_store_member(store_id));

-- 3) Loja nº 1 (1980) a partir dos dados existentes
INSERT INTO public.stores (slug, name, owner_id, plan, subscription_status, trial_ends_at, is_default)
SELECT '1980-burguer', COALESCE((SELECT store_name FROM public.store_settings LIMIT 1), '1980 Burguer'),
       ur.user_id, 'premium', 'active', now() + interval '100 years', true
FROM public.user_roles ur WHERE ur.role = 'admin' ORDER BY ur.created_at LIMIT 1;

INSERT INTO public.store_members (store_id, user_id, role)
SELECT s.id, ur.user_id, CASE WHEN ur.user_id = s.owner_id THEN 'owner' WHEN ur.role = 'admin' THEN 'admin' ELSE 'operator' END
FROM public.stores s CROSS JOIN (SELECT DISTINCT ON (user_id) user_id, role FROM public.user_roles ORDER BY user_id, role) ur
WHERE s.is_default
ON CONFLICT DO NOTHING;

-- 4) store_id em todas as tabelas operacionais + isolamento (política restritiva)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cash_movements','cash_registers','categories','customers','delivery_zones','expenses',
    'ingredient_movements','ingredients','online_order_items','online_orders','payments','product_recipes',
    'products','sale_items','sales','store_settings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE', t);
    EXECUTE format('UPDATE public.%I SET store_id = (SELECT id FROM public.stores WHERE is_default LIMIT 1)', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN store_id SET DEFAULT public.current_store_id()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN store_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX %I ON public.%I (store_id)', t || '_store_idx', t);
    EXECUTE format('CREATE POLICY "Store isolation" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_store_member(store_id)) WITH CHECK (public.is_store_member(store_id))', t);
  END LOOP;
END $$;

-- Visitantes (cardápio) só enxergam a loja padrão até o cardápio por link chegar
CREATE POLICY "Anon default store only" ON public.categories AS RESTRICTIVE FOR SELECT TO anon USING (store_id = public.current_store_id());
CREATE POLICY "Anon default store only" ON public.products AS RESTRICTIVE FOR SELECT TO anon USING (store_id = public.current_store_id());
CREATE POLICY "Anon default store only" ON public.delivery_zones AS RESTRICTIVE FOR SELECT TO anon USING (store_id = public.current_store_id());

-- 5) Cliente único por telefone dentro de cada loja
CREATE UNIQUE INDEX customers_store_phone_unique_idx ON public.customers (store_id, phone) WHERE phone IS NOT NULL;
DROP INDEX public.customers_phone_unique_idx;

CREATE OR REPLACE FUNCTION public.upsert_customer_profile(_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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

-- 6) Configurações públicas da loja ativa
CREATE OR REPLACE FUNCTION public.get_public_store_settings()
 RETURNS TABLE(id uuid, store_name text, logo_url text, banner_url text, banner_enabled boolean, welcome_message text, whatsapp_number text, business_hours jsonb, menu_open boolean, delivery_mode text, delivery_km_tiers jsonb, store_address text, store_lat numeric, store_lng numeric, min_order_value numeric, show_min_order boolean, rating numeric, show_rating boolean, show_whatsapp_link boolean, show_login_button boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
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

-- 7) Zerar sistema afeta apenas a loja do administrador
CREATE OR REPLACE FUNCTION public.reset_operational_data(_reset_stock boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

-- 8) Criação de loja pelo próprio usuário (teste grátis de 7 dias)
CREATE OR REPLACE FUNCTION public.create_store(_name text, _slug text, _whatsapp text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
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
REVOKE EXECUTE ON FUNCTION public.create_store(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_store(text, text, text) TO authenticated;
