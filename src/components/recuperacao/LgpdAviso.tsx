import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function LgpdAviso({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground",
        className,
      )}
    >
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        Use somente contatos obtidos legalmente e respeite a LGPD e as políticas do WhatsApp.
      </span>
    </p>
  );
}
