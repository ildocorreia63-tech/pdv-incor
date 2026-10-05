import { useState, FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { slugify, TRIAL_DAYS } from "@/lib/plans";

/** Cadastro da hamburgueria: inicia o teste grátis. */
export default function CriarLoja() {
  const { user, loading, store, refreshStore, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading || (user && store === undefined)) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (store) return <Navigate to="/" replace />;

  const finalSlug = slugTouched ? slug : slugify(name);
  const valid = name.trim().length >= 2 && /^[a-z0-9](-?[a-z0-9])*$/.test(finalSlug) && finalSlug.length >= 3;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const { error } = await supabase.rpc("create_store", { _name: name.trim(), _slug: finalSlug, _whatsapp: whatsapp });
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível criar a loja", description: error.message, variant: "destructive" });
      return;
    }
    await refreshStore();
    toast({ title: "Loja criada!", description: `Seu teste grátis de ${TRIAL_DAYS} dias começou.` });
    navigate("/admin", { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Store className="h-8 w-8 text-primary" aria-hidden />
          <CardTitle>Crie sua hamburgueria</CardTitle>
          <CardDescription>{TRIAL_DAYS} dias grátis com tudo liberado. Sem cartão.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da loja</Label>
              <Input id="nome" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Link do cardápio</Label>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>/loja/</span>
                <Input
                  id="slug"
                  value={finalSlug}
                  maxLength={40}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wpp">WhatsApp (opcional)</Label>
              <Input id="wpp" inputMode="tel" value={whatsapp} maxLength={20} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={!valid || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Começar teste grátis
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => void signOut()}>
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
