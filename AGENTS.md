
- Playwright + sessão do app: além da chave de auth, gravar também a chave `-user` (localStorage) com `{user}` — sem ela o supabase-js lança `Cannot create property 'user' on string` e o app cai em /auth.
