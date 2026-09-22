import { ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TooltipIconButtonProps {
  /** Nome da seção exibido no tooltip e lido por leitores de tela. */
  label: string;
  /** Rótulo acessível alternativo (quando o tooltip descreve outra coisa). */
  ariaLabel?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Botão de ícone com tooltip acessível em mouse/teclado (hover/foco)
 * e em toque (pressionar e segurar ~400ms), já que o atributo nativo
 * `title` não aparece no celular.
 */
export const TooltipIconButton = ({
  label,
  ariaLabel,
  active,
  onClick,
  className,
  children,
}: TooltipIconButtonProps) => {
  const [open, setOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);
  // Momento-limite até o qual o clique gerado após um toque longo deve ser ignorado.
  const suppressClickUntil = useRef(0);

  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleTouchStart = () => {
    pressTimer.current = window.setTimeout(() => {
      suppressClickUntil.current = Date.now() + 600;
      setOpen(true);
      // Feedback tátil sutil, quando disponível.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    }, 400);
  };

  const handleClick = () => {
    if (Date.now() < suppressClickUntil.current) return;
    onClick?.();
  };

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "outline"}
          size="icon"
          className={cn("h-10 w-10 shrink-0", className)}
          aria-label={ariaLabel ?? label}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={clearPress}
          onTouchCancel={clearPress}
          onContextMenu={(e) => {
            // Evita o menu nativo ao segurar no celular.
            if (pressTimer.current !== null || Date.now() < suppressClickUntil.current) {
              e.preventDefault();
            }
          }}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};
