# Plano de Auditoria Técnica e Otimização - 1980 Burguer PDV

Este documento detalha o plano de auditoria profunda e correção de bugs solicitado pelo usuário para garantir a estabilidade e performance do sistema.

## 1. Fase de Análise e Diagnóstico
Realizar uma varredura completa em todos os domínios do sistema.

### Infraestrutura e Backend (Supabase Engineer)
- **RLS & Security:** Verificar se 100% das tabelas têm RLS ativo e políticas corretas.
- **RPCs:** Auditar `create_online_order`, `upsert_customer_profile` e `reset_operational_data` para segurança e integridade de dados.
- **Realtime:** Testar se as inscrições de realtime em `products` e `categories` estão funcionando sem memory leaks.
- **Database Performance:** Verificar índices em colunas de filtro frequente (ex: `sale_id` em `sale_items`).

### Frontend e UI (UI Architect)
- **Estado Global:** Auditar `usePersistentState` para evitar corrupção de dados no `localStorage`.
- **Renderização:** Identificar re-renderizações desnecessárias em listas grandes (PDV e Pedidos Online).
- **Responsividade:** Testar fluxos críticos (checkout, carrinho) em diferentes viewports mobile.
- **Erros de Console:** Eliminar todos os warnings de `key` e props inválidas no DOM.

### Integrações (API Integrator)
- **Asaas:** Testar fluxo completo de PIX e Cartão em ambiente Sandbox.
- **Webhooks:** Validar recebimento de sinais e transição de status de pedidos.
- **Google Maps:** Verificar cálculo de frete por KM e fallback Haversine.

---

## 2. Implementação e Correções
Corrigir os problemas identificados com foco em soluções definitivas.

### Estabilidade e Resiliência
- **Error Boundaries:** Garantir que falhas em componentes isolados não derrubem a aplicação inteira.
- **Input Validation:** Reforçar validações Zod em formulários e payloads de Edge Functions.
- **Race Conditions:** Implementar cancelamento de requisições obsoletas via TanStack Query.

### Performance e UX
- **Code Splitting:** Otimizar chunks para carregamento inicial rápido (< 2s).
- **Asset Optimization:** Garantir que imagens sejam redimensionadas e servidas em formato WebP.
- **Feedback Visual:** Adicionar skeleton loaders consistentes em todas as transições assíncronas.

---

## 3. Verificação Final e Quality Gate
Garantir que o sistema está pronto para produção.

- **Fluxo de Autenticação:** Testar login, logout e persistência de sessão.
- **CRUD Crítico:** Realizar vendas completas no PDV e pedidos no Cardápio Digital.
- **Mobile Check:** Validar funcionamento PWA e Capacitor.
- **Scan de Segurança:** Auditoria final de chaves expostas e permissões de banco.

---

## Detalhes Técnicos

| Domínio | Ação Principal | Objetivo |
| :--- | :--- | :--- |
| **Arquitetura** | Lazy Loading & React.Suspense | Melhorar TBT (Total Blocking Time) |
| **Segurança** | Security Definer RPCs | Prevenir acesso não autorizado a preços/estoque |
| **Dados** | TanStack Query Cache | Reduzir consumo de banda e redundância de requests |
| **Mobile** | PWA Manifest & Service Workers | Garantir funcionamento offline básico e instalação |
