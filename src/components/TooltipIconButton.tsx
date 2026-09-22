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
  const longPressed = useRef(false);

  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleTouchStart = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setOpen(true);
      // Feedback tátil sutil, quando disponível.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    }, 400);
  };

  const handleTouchEnd = () => {
    clearPress();
    // Se o tooltip foi aberto por toque longo, o toque não deve navegar.
    if (longPressed.current) {
      longPressed.current = false;
      onClick?.();
      return;
    }
  };

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "outline"}
          size="icon"
          className={cn("h-10 w-10 shrink-0", className)}
          aria-label={ariaLabel ?? label}
          onClick={onClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={clearPress}
          onContextMenu={(e) => {
            // Evita o menu nativo ao segurar no celular.
            if (pressTimer.current !== null || longPressed.current) e.preventDefault();
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
