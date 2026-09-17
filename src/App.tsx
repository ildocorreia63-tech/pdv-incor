import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { handleError } from "@/lib/errors";

// Lazy-load all routes for code-splitting (dramatically reduces initial JS bundle)
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const PDV = lazy(() => import("./pages/PDV"));
const Fiados = lazy(() => import("./pages/Fiados"));
const Despesas = lazy(() => import("./pages/Despesas"));
const Admin = lazy(() => import("./pages/Admin"));
const PedidosOnline = lazy(() => import("./pages/PedidosOnline"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Cardapio = lazy(() => import("./pages/Cardapio"));
const Insumos = lazy(() => import("./pages/Insumos"));
const ListaCompras = lazy(() => import("./pages/ListaCompras"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Acompanhar = lazy(() => import("./pages/Acompanhar"));
const Cozinha = lazy(() => import("./pages/Cozinha"));
const Aniversariantes = lazy(() => import("./pages/Aniversariantes"));
const Clientes = lazy(() => import("./pages/Clientes"));
const RecuperacaoLayout = lazy(() => import("./pages/recuperacao/Layout"));
const RecPainel = lazy(() => import("./pages/recuperacao/painel"));
const RecClientes = lazy(() => import("./pages/recuperacao/clientes"));
const RecCampanhas = lazy(() => import("./pages/recuperacao/campanhas"));
const RecAutomacoes = lazy(() => import("./pages/recuperacao/automacoes"));
const RecIntegracoes = lazy(() => import("./pages/recuperacao/integracoes"));
const RecRelatorios = lazy(() => import("./pages/recuperacao/relatorios"));
const RecConfiguracoes = lazy(() => import("./pages/recuperacao/configuracoes"));
const RecPlanos = lazy(() => import("./pages/recuperacao/planos"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
    mutations: { retry: 0 },
  },
  queryCache: new QueryCache({
    onError: (err) => handleError(err, "Falha ao carregar dados"),
  }),
  mutationCache: new MutationCache({
    onError: (err) => handleError(err, "Falha ao salvar alterações"),
  }),
});

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/cardapio" element={<Cardapio />} />
                <Route path="/acompanhar/:orderId" element={<Acompanhar />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
                <Route path="/pedidos" element={<ProtectedRoute><PedidosOnline /></ProtectedRoute>} />
                <Route path="/cozinha" element={<ProtectedRoute><Cozinha /></ProtectedRoute>} />
                <Route path="/fiado" element={<ProtectedRoute><Fiados /></ProtectedRoute>} />
                <Route path="/despesas" element={<ProtectedRoute><Despesas /></ProtectedRoute>} />
                <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                <Route path="/insumos" element={<ProtectedRoute adminOnly><Insumos /></ProtectedRoute>} />
                <Route path="/lista-compras" element={<ProtectedRoute adminOnly><ListaCompras /></ProtectedRoute>} />
                <Route path="/aniversariantes" element={<ProtectedRoute><Aniversariantes /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />

                <Route path="/recuperacao" element={<ProtectedRoute><RecuperacaoLayout /></ProtectedRoute>}>
                  <Route index element={<RecPainel />} />
                  <Route path="painel" element={<RecPainel />} />
                  <Route path="clientes" element={<RecClientes />} />
                  <Route path="campanhas" element={<RecCampanhas />} />
                  <Route path="automacoes" element={<RecAutomacoes />} />
                  <Route path="integracoes" element={<RecIntegracoes />} />
                  <Route path="relatorios" element={<RecRelatorios />} />
                  <Route path="configuracoes" element={<RecConfiguracoes />} />
                  <Route path="planos" element={<RecPlanos />} />
                </Route>


                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
