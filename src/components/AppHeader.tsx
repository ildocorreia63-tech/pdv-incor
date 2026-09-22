import defaultLogo from "@/assets/logo-1980.jpg";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, ChartNoAxesCombined, UsersRound, CakeSlice, Boxes, ShoppingBasket, LayoutDashboard } from "lucide-react";
import { TooltipIconButton } from "@/components/TooltipIconButton";
import { useStoreLogo } from "@/hooks/useStoreLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link, useLocation } from "react-router-dom";

export const AppHeader = ({ title, action, subAction }: { title?: string; action?: ReactNode; subAction?: ReactNode }) => {
  const { signOut, user } = useAuth();
  const storeLogo = useStoreLogo();
  const location = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black ring-2 ring-primary/30 flex items-center justify-center p-1">
          <img src={storeLogo ?? defaultLogo} alt="Logo da loja" className="h-full w-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl leading-none text-foreground uppercase tracking-tight">
            {title ?? "1980 Burguer"}
          </h1>
        </div>
        {action}
        <ThemeToggle />
        <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      {(subAction || (location.pathname !== "/pdv" && location.pathname !== "/" && location.pathname !== "/cozinha")) && (
        <div className="px-4 pb-3 flex gap-1 overflow-x-auto no-scrollbar">
          {!subAction && (location.pathname.startsWith("/admin") ||
           location.pathname === "/relatorios" ||
           location.pathname === "/clientes" ||
           location.pathname === "/aniversariantes" ||
           location.pathname === "/insumos" ||
           location.pathname === "/lista-compras") ? (
            <>
              <Link to="/admin">
                <TooltipIconButton label="Painel Admin" active={location.pathname === "/admin"}>
                  <LayoutDashboard className="h-5 w-5" />
                </TooltipIconButton>
              </Link>
              <Link to="/relatorios">
                <TooltipIconButton label="Relatórios" active={location.pathname === "/relatorios"}>
                  <ChartNoAxesCombined className="h-5 w-5" />
                </TooltipIconButton>
              </Link>
              <Link to="/clientes">
                <TooltipIconButton label="Clientes" active={location.pathname === "/clientes"}>
                  <UsersRound className="h-5 w-5" />
                </TooltipIconButton>
              </Link>
              <Link to="/aniversariantes">
                <TooltipIconButton label="Aniversariantes" active={location.pathname === "/aniversariantes"}>
                  <CakeSlice className="h-5 w-5" />
                </TooltipIconButton>
              </Link>
              <Link to="/insumos">
                <TooltipIconButton label="Insumos" active={location.pathname === "/insumos"}>
                  <Boxes className="h-5 w-5" />
                </TooltipIconButton>
              </Link>
              <Link to="/lista-compras">
                <TooltipIconButton label="Lista de Compras" active={location.pathname === "/lista-compras"}>
                  <ShoppingBasket className="h-5 w-5" />
                </TooltipIconButton>
              </Link>
            </>
          ) : null}
          {subAction}
        </div>
      )}
    </header>
  );
};
