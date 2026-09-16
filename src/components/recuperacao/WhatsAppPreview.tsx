import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WhatsAppPreviewProps {
  texto: string;
  titulo?: string;
  className?: string;
}

/** Prévia no formato de conversa do WhatsApp (simulação visual). */
export function WhatsAppPreview({ texto, titulo = "Cliente", className }: WhatsAppPreviewProps) {
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("rounded-xl border bg-muted/40 p-3", className)}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Conversa com {titulo}</p>
      <div className="chat-bubble ml-auto max-w-[92%] rounded-2xl rounded-tr-sm px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{texto}</p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
          {hora}
          <Check className="size-3" aria-hidden="true" />
        </p>
      </div>
    </div>
  );
}
