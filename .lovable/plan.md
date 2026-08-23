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

comforme vai clicando os de traz vai desaparecendo
opçao de aplicar modo escuro
mplementação do modo escuro (Dark Mode)
siga
sim implementação de Dark Mode).
implante o botao para o modo dark

Analise toda a aplicação antes de realizar qualquer alteração e torne TODAS as páginas, componentes e fluxos 100% responsivos em todos os dispositivos.

Seu objetivo é garantir que o sistema funcione perfeitamente em qualquer tamanho de tela, incluindo mobile (pequenos smartphones), tablets, notebooks, desktops e telas ultrawide, sem quebras de layout, overflow ou perda de usabilidade.

━━━━━━━━━━━━━━━━━━━
OBJETIVO PRINCIPAL
━━━━━━━━━━━━━━━━━━━

Transformar toda a aplicação em uma interface totalmente responsiva, fluida e adaptativa, com excelente experiência de uso em qualquer dispositivo.

━━━━━━━━━━━━━━━━━━━
ANÁLISE OBRIGATÓRIA
━━━━━━━━━━━━━━━━━━━

Antes de qualquer alteração, analise:

- Todas as páginas e rotas do sistema
- Layouts principais e secundários
- Componentes reutilizáveis
- Containers e grids
- Breakpoints atuais (ou ausência deles)
- Uso de width/height fixos (px)
- Overflow horizontal ou vertical
- Elementos quebrando em telas pequenas
- Tipografia em diferentes tamanhos de tela
- Botões e áreas clicáveis em mobile
- Formulários e inputs
- Modais, dropdowns e menus
- Imagens e assets
- Tabelas e listas complexas
- Navegação e sidebar
- Espaçamentos fixos vs flexíveis

━━━━━━━━━━━━━━━━━━━
OBJETIVOS DE RESPONSIVIDADE
━━━━━━━━━━━━━━━━━━━

- Eliminar qualquer overflow horizontal
- Garantir leitura perfeita em telas pequenas
- Adaptar todos os layouts dinamicamente
- Manter consistência visual entre dispositivos
- Garantir usabilidade total no mobile
- Otimizar interação por toque (touch)
- Garantir boa hierarquia visual em qualquer tela

━━━━━━━━━━━━━━━━━━━
MELHORIAS OBRIGATÓRIAS
━━━━━━━━━━━━━━━━━━━

LAYOUT E ESTRUTURA:
- Substituir widths fixos por layouts flexíveis
- Usar Flexbox e Grid corretamente
- Aplicar containers responsivos
- Ajustar breakpoints consistentes
- Reorganizar layouts para mobile-first quando necessário

MOBILE (PRIORIDADE MÁXIMA):
- Ajustar espaçamentos para telas pequenas
- Garantir botões com tamanho adequado para toque
- Evitar elementos muito próximos
- Melhorar menus mobile (hamburger/drawer)
- Simplificar layouts complexos no mobile
- Evitar tabelas quebradas (usar scroll ou cards)

TIPOGRAFIA:
- Ajustar tamanhos de fonte por breakpoint
- Garantir legibilidade em telas pequenas
- Evitar textos longos sem quebra
- Ajustar line-height responsivo

IMAGENS E MÍDIA:
- Garantir imagens fluidas (max-width: 100%)
- Evitar distorção de proporção
- Otimizar visualização em diferentes telas
- Ajustar vídeos e embeds responsivos

COMPONENTES:
- Tornar todos os componentes adaptáveis
- Ajustar cards para colunas responsivas
- Melhorar modais em mobile (fullscreen quando necessário)
- Ajustar dropdowns e menus flutuantes

FORMULÁRIOS:
- Inputs ocupando largura correta em mobile
- Melhor espaçamento entre campos
- Botões full-width quando necessário
- Melhor UX de preenchimento em telas pequenas

NAVEGAÇÃO:
- Sidebar adaptativa (colapsável no mobile)
- Menus responsivos e acessíveis
- Navegação simplificada no mobile
- Evitar excesso de elementos na header

━━━━━━━━━━━━━━━━━━━
BREAKPOINTS PADRÃO (SE NECESSÁRIO)
━━━━━━━━━━━━━━━━━━━

- Mobile: até 480px
- Mobile large: até 640px
- Tablet: até 768px
- Laptop: até 1024px
- Desktop: até 1280px+
- Large screens: 1536px+

━━━━━━━━━━━━━━━━━━━
REGRAS IMPORTANTES
━━━━━━━━━━━━━━━━━━━

- NÃO quebrar funcionalidades existentes
- NÃO remover componentes ou features
- NÃO alterar o design base sem necessidade
- Priorizar adaptação, não reconstrução total
- Manter consistência visual em todos os tamanhos
- Evitar soluções temporárias ou gambiarras
- Usar boas práticas modernas (Flexbox/Grid)
- Garantir performance junto com responsividade

━━━━━━━━━━━━━━━━━━━
VALIDAÇÃO FINAL OBRIGATÓRIA
━━━━━━━━━━━━━━━━━━━

Após aplicar melhorias:

- Testar todas as páginas em mobile, tablet e desktop
- Verificar ausência de overflow
- Verificar legibilidade geral
- Verificar usabilidade no toque
- Verificar consistência de layout
- Garantir que nada quebrou visualmente
- Garantir navegação fluida em qualquer tela

━━━━━━━━━━━━━━━━━━━
RESULTADO ESPERADO
━━━━━━━━━━━━━━━━━━━

O sistema deve estar:

- 100% responsivo
- Totalmente adaptável a qualquer tela
- Sem quebras de layout
- Sem scroll horizontal indesejado
- Com excelente UX em mobile
- Visualmente consistente em todos os dispositivos
- Pronto para produção profissional
