import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, adminOnly = false, ownerOnly = false }: { children: React.ReactNode; adminOnly?: boolean; ownerOnly?: boolean }) => {
  const { user, isAdmin, loading, store, accessError, refreshStore } = useAuth();
  const location = useLocation();
  if (loading || (user && store === undefined))
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/auth" state={{ from: location.pathname + location.search + location.hash }} replace />;
  if (accessError) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"><p role="alert">{accessError}</p><Button onClick={() => void refreshStore()}>Tentar novamente</Button></div>;
  // Usuário logado sem loja: precisa criar a própria hamburgueria primeiro
  if (!store) return <Navigate to="/criar-loja" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  if (ownerOnly && store.memberRole !== "owner") return <Navigate to="/" replace />;
  return <>{children}</>;
};
