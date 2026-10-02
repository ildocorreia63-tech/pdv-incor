# Transformar o 1980 Burguer PDV em micro SaaS para hamburguerias

## Objetivo
Qualquer hamburgueria cria a conta, monta a loja, recebe um link próprio do cardápio (`/loja/nome-da-loja`) e paga uma assinatura mensal pelo Stripe. A 1980 Burguer vira a primeira loja da plataforma, sem perder nenhum dado.

## Planos propostos (podem ser ajustados)
| Plano | Preço/mês | O que inclui |
|---|---|---|
| Teste grátis | 7 dias | Tudo do Pro, sem cartão |
| Essencial | R$ 49 | PDV, caixa, produtos, clientes, relatórios básicos, 1 usuário |
| Pro | R$ 99 | Essencial + cardápio online com delivery por km, Pix, cozinha, aniversariantes, 3 usuários |
| Premium | R$ 179 | Pro + Recuperação de Clientes, iFood/webhooks, insumos e lista de compras, usuários ilimitados |

Plano anual com 2 meses grátis (10x o mensal).

## O que muda para o usuário
1. **Página de vendas** nova em `/` com os planos e botão "Começar teste grátis".
2. **Cadastro da loja**: nome, link desejado, WhatsApp, logo — em 1 minuto.
3. **Cada loja só enxerga os próprios dados** (produtos, vendas, clientes, caixa, pedidos).
4. **Cardápio público** em `/loja/<link>`; o link antigo `/cardapio` continua levando para a 1980.
5. **Tela "Minha assinatura"**: plano atual, trocar plano, cancelar, faturas.
6. **Bloqueios por plano**: recursos fora do plano aparecem com cadeado e botão "Fazer upgrade". Ao vencer o teste ou falhar o pagamento, a loja entra em modo somente leitura.
7. **Painel do dono da plataforma** (você): lista de lojas, plano, status e faturamento.
8. **Equipe**: o dono da loja convida operadores por e-mail.

## Etapas
1. Base multi-loja (separação dos dados) + migração da 1980 como loja nº 1.
2. Cadastro de loja, link próprio e cardápio por loja.
3. Stripe: produtos, checkout, assinatura, webhook e bloqueios por plano.
4. Página de vendas, "Minha assinatura" e painel da plataforma.
5. Testes de isolamento entre lojas e verificação no navegador.

## Pontos de atenção
- Pagamentos integrados exigem plano pago do Lovable; se o seu plano não permitir, a alternativa é conectar a sua própria conta Stripe.
- Empresa no Brasil: o Stripe calcula impostos, mas a emissão de nota fiscal continua com você.
- Asaas (Pix dos pedidos de cada loja): cada loja precisará da própria chave Asaas; até lá o Pix manual com chave da loja continua funcionando.
- iFood e Google Maps hoje usam as suas credenciais; no SaaS cada loja informa o próprio ID iFood.

## Detalhes técnicos
- Nova tabela `stores` (slug único, owner, plano, status da assinatura, trial_ends_at) e `store_members` (user_id, store_id, role). Papel de plataforma separado em `user_roles` (`platform_admin`).
- Coluna `store_id` em todas as tabelas operacionais (products, categories, sales, sale_items, payments, customers, cash_registers, cash_movements, expenses, ingredients, ingredient_movements, product_recipes, delivery_zones, online_orders, online_order_items, store_settings), preenchida com a loja 1980 e depois NOT NULL + índice.
- Função `is_store_member(store_id)` security definer; todas as políticas RLS reescritas para filtrar por loja. RPCs públicas (`create_online_order`, `get_public_store_settings`) passam a receber slug.
- Contexto `StoreProvider` no front; todas as consultas incluem `store_id`.
- Recuperação de Clientes migra do localStorage para tabelas por loja.
- Stripe via integração nativa: tabela `subscriptions`, edge functions de checkout, portal e webhook; `automatic_tax` (vendedor no Brasil).
- Registrar decisões em AGENTS.md.
