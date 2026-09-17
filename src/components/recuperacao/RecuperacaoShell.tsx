import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  Menu,
  Plug,
  Settings,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useStore } from "@/lib/recuperacao/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/recuperacao/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/recuperacao/clientes", label: "Clientes", icon: Users },
  { to: "/recuperacao/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/recuperacao/automacoes", label: "Automações", icon: Workflow },
  { to: "/recuperacao/integracoes", label: "Integrações", icon: Plug },
  { to: "/recuperacao/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/recuperacao/configuracoes", label: "Configurações", icon: Settings },
  { to: "/recuperacao/planos", label: "Planos", icon: CreditCard },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação da recuperação de clientes">
      {NAV.map((item) => {
        const ativo = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export interface RecuperacaoShellProps {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
}

export function RecuperacaoShell({ titulo, descricao, acoes, children }: RecuperacaoShellProps) {
  const { state } = useStore();
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/recuperacao/painel" className="mb-6 block px-1 text-sidebar-foreground">
          <span className="font-display text-lg font-bold">Recuperação</span>
          <span className="block text-xs text-sidebar-foreground/70">de clientes</span>
        </Link>
        <NavLinks />
        <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
          <p className="px-1 text-xs font-medium text-sidebar-foreground">
            {state.config.nomeEmpresa} · plano {state.config.plano}
          </p>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Link to="/admin">
              <ArrowLeft className="size-4" aria-hidden="true" /> Voltar ao PDV
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-4 text-sidebar-foreground">
              <SheetTitle className="mb-6 font-display">Recuperação de clientes</SheetTitle>
              <NavLinks onNavigate={() => setAberto(false)} />
              <Button variant="ghost" size="sm" asChild className="mt-6 w-full justify-start text-sidebar-foreground/80">
                <Link to="/admin" onClick={() => setAberto(false)}>
                  <ArrowLeft className="size-4" /> Voltar ao PDV
                </Link>
              </Button>
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-bold sm:text-xl">{titulo}</h1>
            {descricao && (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{descricao}</p>
            )}
          </div>

          <ThemeToggle />
          <div className="hidden sm:flex sm:items-center sm:gap-2">{acoes}</div>
        </header>

        {acoes && <div className="flex flex-wrap gap-2 px-4 pt-4 sm:hidden">{acoes}</div>}

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
