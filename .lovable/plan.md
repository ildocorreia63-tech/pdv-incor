# Área de Recuperação de Clientes (DirectSmash dentro do PDV)

Trazer as telas do projeto DirectSmash para dentro deste app, agrupadas em uma nova área
"Recuperação de Clientes", acessível pelo Admin.

## O que o usuário verá

Um novo menu no Admin: **Recuperação de Clientes**. Dentro dele, um painel com menu lateral
(e menu sanduíche no celular) com as telas:

- Painel — resumo: clientes inativos, campanhas ativas, envios, conversões, economia de comissão
- Clientes — lista, busca, filtros por status/origem, edição, consentimento, importação CSV
- Campanhas — criar/editar campanha (gatilho de dias, horário, segmento, benefício, mensagem com prévia do WhatsApp)
- Automações — liga/desliga a automação, etapas do fluxo e histórico de execuções
- Integrações — status de conexão de cada canal e requisitos
- Relatórios — desempenho por campanha, conversões e economia
- Configurações — dados da loja, benefício padrão, horários, assinatura, texto de descadastro, LGPD
- Planos — comparativo dos planos

## Como vai funcionar

- As páginas vêm do DirectSmash, mas adaptadas ao sistema de navegação deste app
  (sem tela de login/onboarding próprios — quem já está logado no PDV entra direto).
- Os dados dessa área ficam salvos no próprio navegador (mesmo comportamento do DirectSmash),
  com dados de exemplo iniciais.
- Um botão em "Clientes" permite **puxar os clientes reais do PDV** (nome, WhatsApp, última compra)
  para dentro da área de recuperação, além da importação por CSV.
- Envio de mensagem continua manual, abrindo o WhatsApp com o texto pronto.

## Detalhes técnicos

- Novas rotas em `src/App.tsx`: `/recuperacao`, `/recuperacao/clientes`, `/campanhas`,
  `/automacoes`, `/integracoes`, `/relatorios`, `/configuracoes`, `/planos`.
- Portar `src/routes/*.tsx` do DirectSmash para `src/pages/recuperacao/*.tsx`, trocando
  `@tanstack/react-router` por `react-router-dom` (`Link`, `useNavigate`, `useLocation`)
  e removendo `createFileRoute`.
- Portar `src/lib/{types,seed,format,message}.ts`, `store.tsx` (versão só-localStorage, sem
  `supabase.auth` e sem tabelas `campaigns`/`campaign_executions`) para `src/lib/recuperacao/`.
- Portar componentes `AppShell` (adaptado como `RecuperacaoShell`), `StatCard`, `WhatsAppPreview`,
  `CampanhaEditor`, `AdicionarCampanhaDialog`, `ImportarCsvDialog`, `LgpdAviso`, `Logo`.
- `RecuperacaoProvider` montado apenas nessa área; tema continua o do app (sem toggle duplicado).
- Importação do PDV: consulta a `customers` + últimas vendas para preencher `ultimaCompra`/`ticket`.
- Tokens semânticos existentes; tokens `sidebar-*` já presentes no CSS são reutilizados
  (adicionados se faltarem).
