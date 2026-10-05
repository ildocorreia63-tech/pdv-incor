import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, isAdmin, loading, store } = useAuth();
  if (loading || (user && store === undefined))
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  // Usuário logado sem loja: precisa criar a própria hamburgueria primeiro
  if (!store) return <Navigate to="/criar-loja" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};
