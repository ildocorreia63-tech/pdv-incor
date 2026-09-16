import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: LucideIcon;
  tom?: "padrao" | "positivo" | "alerta";
  className?: string;
}

export function StatCard({
  titulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "padrao",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("transition-shadow hover:shadow-card", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {titulo}
          </p>
          <p className="mt-1.5 truncate font-display text-2xl font-bold">{valor}</p>
          {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-lg",
            tom === "positivo" && "bg-success/15 text-success",
            tom === "alerta" && "bg-warning/20 text-warning",
            tom === "padrao" && "bg-primary/12 text-primary",
          )}
        >
          <Icone className="size-4.5" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  );
}
