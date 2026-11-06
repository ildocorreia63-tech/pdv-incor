import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, ImagePlus, Loader2, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readExpensePhoto, type ExpensePhotoResult } from "@/lib/expensePhoto";
import { cn } from "@/lib/utils";

export interface ExpensePhotoInputProps {
  storeId: string;
  categories: string[];
  onResult: (result: ExpensePhotoResult) => void;
  onBusyChange: (busy: boolean) => void;
  className?: string;
}

export function ExpensePhotoInput({ storeId, categories, onResult, onBusyChange, className }: ExpensePhotoInputProps) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const controller = new AbortController(); abort.current = controller;
      return readExpensePhoto(file, storeId, categories, controller.signal);
    },
    retry: false,
    onSuccess: onResult,
    onError: (failure) => { if (!abort.current?.signal.aborted) setError(failure.message); },
    onSettled: () => onBusyChange(false),
  });
  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const select = (file: File | undefined) => {
    if (!file || mutation.isPending) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return setError("Envie uma foto JPEG, PNG ou WebP.");
    if (!file.size || file.size > 8 * 1024 * 1024) return setError("Escolha uma foto de até 8 MB.");
    setError(null); setPreview(URL.createObjectURL(file)); onBusyChange(true); mutation.mutate(file);
  };

  return <section className={cn("space-y-2 border-b border-border pb-3", className)} aria-label="Foto da nota do fornecedor">
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => camera.current?.click()}>
        <Camera className="h-4 w-4" /> Fotografar nota
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={mutation.isPending} onClick={() => gallery.current?.click()}>
        <ImagePlus className="h-4 w-4" /> Enviar foto
      </Button>
    </div>
    <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" aria-label="Fotografar nota" onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
    <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Enviar foto da nota" onChange={e => { select(e.target.files?.[0]); e.target.value = ""; }} />
    {preview && <div className="flex items-start gap-3">
      <a href={preview} target="_blank" rel="noreferrer" aria-label="Ver foto da nota ampliada" className="shrink-0 focus-visible:ring-2 focus-visible:ring-ring">
        <img src={preview} alt="Nota do fornecedor enviada" className="h-24 w-20 rounded-md border border-border object-contain" />
      </a>
      {mutation.isPending ? <div className="space-y-2">
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Lendo nota…</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => { abort.current?.abort(); onBusyChange(false); }}><Square className="h-3 w-3" /> Parar</Button>
      </div> : <Button type="button" size="icon" variant="ghost" aria-label="Remover foto" onClick={() => setPreview(null)}><X className="h-4 w-4" /></Button>}
    </div>}
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
  </section>;
}