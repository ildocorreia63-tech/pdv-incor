import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Cardapio from "./Cardapio";

interface StoreLookup {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

/** /loja/:slug — valida o link e abre o cardápio daquela loja. */
export default function LojaPublica() {
  const { slug = "" } = useParams<{ slug: string }>();
  const valid = /^[a-z0-9-]{3,40}$/.test(slug.toLowerCase());

  const { data, isLoading } = useQuery({
    queryKey: ["store-by-slug", slug],
    enabled: valid,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StoreLookup | null> => {
      const { data, error } = await supabase.rpc("get_store_by_slug", { _slug: slug });
      if (error) throw error;
      return (data as unknown as StoreLookup | null) ?? null;
    },
  });

  if (valid && isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando cardápio" />
      </div>
    );

  if (!valid || !data || !data.active)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {data && !data.active ? "Cardápio indisponível no momento" : "Loja não encontrada"}
        </h1>
        <p className="text-muted-foreground">Confira o link com a hamburgueria.</p>
        <Button asChild variant="outline"><Link to="/planos">Conheça a plataforma</Link></Button>
      </main>
    );

  return <Cardapio storeSlug={data.slug} />;
}
