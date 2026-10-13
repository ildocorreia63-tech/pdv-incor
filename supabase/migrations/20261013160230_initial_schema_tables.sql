-- Initial schema-only bootstrap for pdv-incor.
-- Captured from the PDV INCOR schema; no application rows or user accounts are copied.
-- Includes the operator/shift/cash migrations required by the current app.
SET search_path TO public;

CREATE TYPE public."app_role" AS ENUM ('admin', 'operator');
CREATE TYPE public."ingredient_movement_type" AS ENUM ('purchase', 'sale', 'adjustment', 'waste');
CREATE TYPE public."online_order_status" AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'pending_payment');
CREATE TYPE public."online_order_type" AS ENUM ('delivery', 'pickup');
CREATE TYPE public."payment_method" AS ENUM ('cash', 'pix', 'debit', 'credit', 'meal_voucher', 'credit_note');
CREATE TYPE public."payment_status" AS ENUM ('paid', 'pending');
CREATE TYPE public."sale_status" AS ENUM ('open', 'paid', 'partial', 'credit', 'cancelled');

CREATE SEQUENCE public.online_orders_order_number_seq;

CREATE TABLE public."cash_movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cash_register_id" uuid NOT NULL,
  "type" text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "reason" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."cash_registers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "opened_by" uuid NOT NULL,
  "opened_at" timestamptz DEFAULT now() NOT NULL,
  "opening_amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "opening_notes" text,
  "closed_by" uuid,
  "closed_at" timestamptz,
  "closing_amount" numeric(12,2),
  "expected_amount" numeric(12,2),
  "difference" numeric(12,2),
  "closing_notes" text,
  "status" text DEFAULT 'open'::text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."customers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "notes" text,
  "credit_balance" numeric(10,2) DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "email" text,
  "cpf" text,
  "birth_date" date,
  "address_street" text,
  "address_number" text,
  "address_complement" text,
  "address_reference" text,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."delivery_zones" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "fee" numeric(10,2) DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."expenses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "description" text NOT NULL,
  "category" text,
  "amount" numeric(10,2) NOT NULL,
  "expense_date" date DEFAULT CURRENT_DATE NOT NULL,
  "notes" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."ingredient_movements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "type" public."ingredient_movement_type" NOT NULL,
  "quantity" numeric(12,4) NOT NULL,
  "unit_cost" numeric(12,4),
  "sale_id" uuid,
  "sale_item_id" uuid,
  "notes" text,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."ingredients" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "unit" text DEFAULT 'un'::text NOT NULL,
  "cost_per_unit" numeric(12,4) DEFAULT 0 NOT NULL,
  "stock_quantity" numeric(12,4) DEFAULT 0 NOT NULL,
  "min_stock" numeric(12,4) DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."online_order_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "online_order_id" uuid NOT NULL,
  "product_id" uuid,
  "product_name" text NOT NULL,
  "unit_price" numeric(10,2) NOT NULL,
  "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
  "subtotal" numeric(10,2) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."online_orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_number" integer DEFAULT nextval('online_orders_order_number_seq'::regclass) NOT NULL,
  "customer_name" text NOT NULL,
  "customer_phone" text NOT NULL,
  "order_type" public."online_order_type" NOT NULL,
  "delivery_zone_id" uuid,
  "delivery_zone_name" text,
  "delivery_fee" numeric(10,2) DEFAULT 0 NOT NULL,
  "address_street" text,
  "address_number" text,
  "address_complement" text,
  "address_reference" text,
  "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
  "total" numeric(10,2) DEFAULT 0 NOT NULL,
  "notes" text,
  "status" public."online_order_status" DEFAULT 'pending'::online_order_status NOT NULL,
  "sale_id" uuid,
  "accepted_by" uuid,
  "accepted_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "payment_method" text,
  "payment_change_for" numeric,
  "asaas_payment_id" text,
  "asaas_invoice_url" text,
  "payment_confirmed_at" timestamptz,
  "cancellation_reason" text,
  "cancelled_at" timestamptz,
  "cancelled_by" uuid,
  "source" text DEFAULT 'menu'::text NOT NULL,
  "external_platform" text,
  "external_order_id" text,
  "external_payload" jsonb,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."payments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "sale_id" uuid,
  "customer_id" uuid,
  "method" public."payment_method" NOT NULL,
  "amount" numeric(10,2) NOT NULL,
  "status" public."payment_status" DEFAULT 'paid'::payment_status NOT NULL,
  "notes" text,
  "paid_at" timestamptz,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."platform_admins" (
  "user_id" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."product_recipes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity" numeric(12,4) DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(10,2) NOT NULL,
  "image_url" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."profiles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "display_name" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."sale_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "sale_id" uuid NOT NULL,
  "product_id" uuid,
  "product_name" text NOT NULL,
  "unit_price" numeric(10,2) NOT NULL,
  "quantity" numeric(10,3) DEFAULT 1 NOT NULL,
  "subtotal" numeric(10,2) NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."sales" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "operator_id" uuid NOT NULL,
  "customer_id" uuid,
  "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
  "discount" numeric(10,2) DEFAULT 0 NOT NULL,
  "total" numeric(10,2) DEFAULT 0 NOT NULL,
  "paid_amount" numeric(10,2) DEFAULT 0 NOT NULL,
  "credit_amount" numeric(10,2) DEFAULT 0 NOT NULL,
  "status" public."sale_status" DEFAULT 'open'::sale_status NOT NULL,
  "notes" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."store_members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text DEFAULT 'operator'::text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."store_settings" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "store_name" text DEFAULT 'Minha Loja'::text NOT NULL,
  "whatsapp_number" text,
  "welcome_message" text DEFAULT 'Bem-vindo! Faça seu pedido.'::text,
  "menu_open" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "pix_key" text,
  "pix_receiver_name" text,
  "pix_city" text,
  "business_hours" jsonb DEFAULT '{"0": {"to": "23:00", "from": "18:00", "open": false}, "1": {"to": "23:00", "from": "18:00", "open": true}, "2": {"to": "23:00", "from": "18:00", "open": true}, "3": {"to": "23:00", "from": "18:00", "open": true}, "4": {"to": "23:00", "from": "18:00", "open": true}, "5": {"to": "23:00", "from": "18:00", "open": true}, "6": {"to": "23:00", "from": "18:00", "open": true}}'::jsonb NOT NULL,
  "banner_url" text,
  "banner_enabled" boolean DEFAULT true NOT NULL,
  "delivery_mode" text DEFAULT 'zones'::text NOT NULL,
  "store_address" text,
  "store_lat" numeric,
  "store_lng" numeric,
  "delivery_km_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "logo_url" text,
  "min_order_value" numeric DEFAULT 0 NOT NULL,
  "show_min_order" boolean DEFAULT true NOT NULL,
  "rating" numeric DEFAULT 5.0 NOT NULL,
  "show_rating" boolean DEFAULT true NOT NULL,
  "show_whatsapp_link" boolean DEFAULT true NOT NULL,
  "show_login_button" boolean DEFAULT true NOT NULL,
  "store_id" uuid NOT NULL
);
CREATE TABLE public."stores" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "owner_id" uuid NOT NULL,
  "plan" text DEFAULT 'trial'::text NOT NULL,
  "subscription_status" text DEFAULT 'trialing'::text NOT NULL,
  "trial_ends_at" timestamptz DEFAULT (now() + '7 days'::interval) NOT NULL,
  "current_period_end" timestamptz,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE TABLE public."user_roles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" public."app_role" NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public."cash_movements" ADD CONSTRAINT "cash_movements_pkey" PRIMARY KEY (id);
ALTER TABLE public."cash_registers" ADD CONSTRAINT "cash_registers_pkey" PRIMARY KEY (id);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."customers" ADD CONSTRAINT "customers_pkey" PRIMARY KEY (id);
ALTER TABLE public."delivery_zones" ADD CONSTRAINT "delivery_zones_pkey" PRIMARY KEY (id);
ALTER TABLE public."expenses" ADD CONSTRAINT "expenses_pkey" PRIMARY KEY (id);
ALTER TABLE public."ingredient_movements" ADD CONSTRAINT "ingredient_movements_pkey" PRIMARY KEY (id);
ALTER TABLE public."ingredients" ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY (id);
ALTER TABLE public."online_order_items" ADD CONSTRAINT "online_order_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."online_orders" ADD CONSTRAINT "online_orders_pkey" PRIMARY KEY (id);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (id);
ALTER TABLE public."platform_admins" ADD CONSTRAINT "platform_admins_pkey" PRIMARY KEY (user_id);
ALTER TABLE public."product_recipes" ADD CONSTRAINT "product_recipes_pkey" PRIMARY KEY (id);
ALTER TABLE public."product_recipes" ADD CONSTRAINT "product_recipes_product_id_ingredient_id_key" UNIQUE (product_id, ingredient_id);
ALTER TABLE public."products" ADD CONSTRAINT "products_pkey" PRIMARY KEY (id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_user_id_key" UNIQUE (user_id);
ALTER TABLE public."sale_items" ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."sales" ADD CONSTRAINT "sales_pkey" PRIMARY KEY (id);
ALTER TABLE public."store_members" ADD CONSTRAINT "store_members_pkey" PRIMARY KEY (id);
ALTER TABLE public."store_members" ADD CONSTRAINT "store_members_store_id_user_id_key" UNIQUE (store_id, user_id);
ALTER TABLE public."store_settings" ADD CONSTRAINT "store_settings_pkey" PRIMARY KEY (id);
ALTER TABLE public."stores" ADD CONSTRAINT "stores_pkey" PRIMARY KEY (id);
ALTER TABLE public."stores" ADD CONSTRAINT "stores_slug_key" UNIQUE (slug);
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE (user_id, role);
ALTER TABLE public."cash_movements" ADD CONSTRAINT "cash_movements_amount_check" CHECK (amount > 0::numeric);
ALTER TABLE public."cash_movements" ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE CASCADE;
ALTER TABLE public."cash_movements" ADD CONSTRAINT "cash_movements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."cash_movements" ADD CONSTRAINT "cash_movements_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."cash_movements" ADD CONSTRAINT "cash_movements_type_check" CHECK (type = ANY (ARRAY['sangria'::text, 'reforco'::text]));
ALTER TABLE public."cash_registers" ADD CONSTRAINT "cash_registers_closed_by_fkey" FOREIGN KEY (closed_by) REFERENCES auth.users(id);
ALTER TABLE public."cash_registers" ADD CONSTRAINT "cash_registers_opened_by_fkey" FOREIGN KEY (opened_by) REFERENCES auth.users(id);
ALTER TABLE public."cash_registers" ADD CONSTRAINT "cash_registers_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text]));
ALTER TABLE public."cash_registers" ADD CONSTRAINT "cash_registers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."delivery_zones" ADD CONSTRAINT "delivery_zones_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."expenses" ADD CONSTRAINT "expenses_amount_check" CHECK (amount > 0::numeric);
ALTER TABLE public."expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."expenses" ADD CONSTRAINT "expenses_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."ingredient_movements" ADD CONSTRAINT "ingredient_movements_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."ingredients" ADD CONSTRAINT "ingredients_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."online_order_items" ADD CONSTRAINT "online_order_items_online_order_id_fkey" FOREIGN KEY (online_order_id) REFERENCES online_orders(id) ON DELETE CASCADE;
ALTER TABLE public."online_order_items" ADD CONSTRAINT "online_order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE public."online_order_items" ADD CONSTRAINT "online_order_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."online_orders" ADD CONSTRAINT "check_positive_totals" CHECK (subtotal >= 0::numeric AND total >= 0::numeric AND delivery_fee >= 0::numeric);
ALTER TABLE public."online_orders" ADD CONSTRAINT "online_orders_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES auth.users(id);
ALTER TABLE public."online_orders" ADD CONSTRAINT "online_orders_delivery_zone_id_fkey" FOREIGN KEY (delivery_zone_id) REFERENCES delivery_zones(id) ON DELETE SET NULL;
ALTER TABLE public."online_orders" ADD CONSTRAINT "online_orders_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;
ALTER TABLE public."online_orders" ADD CONSTRAINT "online_orders_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."payments" ADD CONSTRAINT "payments_amount_check" CHECK (amount > 0::numeric);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public."payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public."payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
ALTER TABLE public."payments" ADD CONSTRAINT "payments_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."product_recipes" ADD CONSTRAINT "product_recipes_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."products" ADD CONSTRAINT "products_price_check" CHECK (price >= 0::numeric);
ALTER TABLE public."products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE public."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
ALTER TABLE public."sale_items" ADD CONSTRAINT "sale_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE public."sales" ADD CONSTRAINT "sales_operator_id_fkey" FOREIGN KEY (operator_id) REFERENCES auth.users(id);
ALTER TABLE public."sales" ADD CONSTRAINT "sales_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."store_members" ADD CONSTRAINT "store_members_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]));
ALTER TABLE public."store_members" ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."store_settings" ADD CONSTRAINT "store_settings_delivery_mode_check" CHECK (delivery_mode = ANY (ARRAY['zones'::text, 'km'::text]));
ALTER TABLE public."store_settings" ADD CONSTRAINT "store_settings_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE public."stores" ADD CONSTRAINT "stores_name_check" CHECK (length(name) >= 2 AND length(name) <= 80);
ALTER TABLE public."stores" ADD CONSTRAINT "stores_plan_check" CHECK (plan = ANY (ARRAY['trial'::text, 'essencial'::text, 'pro'::text, 'premium'::text]));
ALTER TABLE public."stores" ADD CONSTRAINT "stores_slug_check" CHECK (slug ~ '^[a-z0-9](-?[a-z0-9])*$'::text AND length(slug) >= 3 AND length(slug) <= 40);
ALTER TABLE public."stores" ADD CONSTRAINT "stores_subscription_status_check" CHECK (subscription_status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'expired'::text]));
ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;