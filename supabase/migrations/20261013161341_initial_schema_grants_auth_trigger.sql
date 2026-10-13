GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."cash_movements", public."cash_registers", public."categories", public."customers", public."delivery_zones", public."expenses", public."ingredient_movements", public."ingredients", public."online_order_items", public."online_orders", public."payments", public."platform_admins", public."product_recipes", public."products", public."profiles", public."sale_items", public."sales", public."store_members", public."store_settings", public."stores", public."user_roles" TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON TABLE public.categories, public.products, public.delivery_zones, public.public_store_settings TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.online_orders_order_number_seq TO authenticated, service_role;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.current_store_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store_settings() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_order_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_order(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_online_order(jsonb, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer_profile(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_store(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_list_stores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.platform_update_store(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_operational_data(boolean) TO authenticated;

ALTER SEQUENCE public.online_orders_order_number_seq OWNED BY public.online_orders.order_number;

-- Create an app profile and make the first account the initial admin.
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
