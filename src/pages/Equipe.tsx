import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { maxUsersForPlan } from "@/lib/plans";
import { toast } from "sonner";
import { CalendarClock, Loader2, Plus, ShieldCheck, UsersRound } from "lucide-react";

type Operator = { id: string; user_id: string; display_name: string; email: string; created_at: string };
type Shift = { id: string; name: string; day_of_week: number; starts_at: string; ends_at: string; active: boolean };
type Assignment = { id: string; shift_id: string; operator_id: string };
type CreateOperatorResponse = { operator?: Operator; error?: string };

const DAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

async function errorMessage(error: { message: string; context?: unknown }) {
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch { /* usa a mensagem padrão */ }
  }
  return error.message;
}

export default function Equipe() {
  const { store, user } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingOperator, setSavingOperator] = useState(false);
  const [savingShift, setSavingShift] = useState(false);
  const [operatorName, setOperatorName] = useState("");
  const [operatorEmail, setOperatorEmail] = useState("");
  const [operatorPassword, setOperatorPassword] = useState("");
  const [shiftName, setShiftName] = useState("");
  const [shiftDay, setShiftDay] = useState("1");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);

  const trialActive = store?.subscription_status === "trialing" &&
    !!store.trial_ends_at && new Date(store.trial_ends_at).getTime() > Date.now();
  const maxUsers = trialActive ? null : maxUsersForPlan(store?.plan ?? "essencial");
  const canAddByPlan = trialActive || store?.subscription_status === "active";
  const reachedLimit = maxUsers !== null && memberCount >= maxUsers;
  const remainingLabel = maxUsers === null ? "Ilimitado" : `${memberCount} de ${maxUsers}`;
  const operatorNames = useMemo(() => new Map(operators.map((operator) => [operator.id, operator.display_name])), [operators]);

  const load = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    const [operatorsResult, shiftsResult, assignmentsResult, membersResult] = await Promise.all([
      supabase.from("store_operators" as any).select("id,user_id,display_name,email,created_at").eq("store_id", store.id).order("created_at", { ascending: false }),
      supabase.from("store_shifts" as any).select("id,name,day_of_week,starts_at,ends_at,active").eq("store_id", store.id).order("day_of_week").order("starts_at"),
      supabase.from("store_shift_assignments" as any).select("id,shift_id,operator_id").eq("store_id", store.id),
      supabase.from("store_members").select("id", { count: "exact", head: true }).eq("store_id", store.id),
    ]);
    const queryError = operatorsResult.error ?? shiftsResult.error ?? assignmentsResult.error ?? membersResult.error;
    if (queryError) {
      toast.error("Não foi possível carregar a equipe. Confira se a atualização do banco foi aplicada.");
    } else {
      setOperators((operatorsResult.data ?? []) as Operator[]);
      setShifts((shiftsResult.data ?? []) as Shift[]);
      setAssignments((assignmentsResult.data ?? []) as Assignment[]);
      setMemberCount(membersResult.count ?? 0);
    }
    setLoading(false);
  }, [store?.id]);

  useEffect(() => { void load(); }, [load]);

  const createOperator = async (event: FormEvent) => {
    event.preventDefault();
    if (!store?.id || !user?.id) return;
    if (!canAddByPlan) return toast.error("O plano da loja precisa estar ativo para criar acessos.");
    if (reachedLimit) return toast.error("O limite de usuários deste plano foi atingido.");
    setSavingOperator(true);
    try {
      const { data, error } = await supabase.functions.invoke<CreateOperatorResponse>("create-operator", {
        body: { storeId: store.id, name: operatorName, email: operatorEmail, password: operatorPassword },
      });
      if (error) throw new Error(await errorMessage(error));
      if (!data?.operator) throw new Error(data?.error ?? "Não foi possível criar o operador.");
      toast.success("Login do operador criado.");
      setOperatorName("");
      setOperatorEmail("");
      setOperatorPassword("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar o operador.");
    } finally {
      setSavingOperator(false);
    }
  };

  const createShift = async (event: FormEvent) => {
    event.preventDefault();
    if (!store?.id || !user?.id) return;
    if (selectedOperators.length === 0) return toast.error("Escolha pelo menos um operador para este turno.");
    setSavingShift(true);
    try {
      const { data: shiftData, error: shiftError } = await supabase
        .from("store_shifts" as any)
        .insert({
          store_id: store.id,
          name: shiftName.trim(),
          day_of_week: Number(shiftDay),
          starts_at: shiftStart,
          ends_at: shiftEnd,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (shiftError || !shiftData) throw shiftError ?? new Error("Não foi possível salvar o turno.");

      const shiftId = (shiftData as { id: string }).id;
      const { error: assignmentError } = await supabase
        .from("store_shift_assignments" as any)
        .insert(selectedOperators.map((operatorId) => ({
          store_id: store.id,
          shift_id: shiftId,
          operator_id: operatorId,
        })));
      if (assignmentError) {
        await supabase.from("store_shifts" as any).delete().eq("id", shiftId).eq("store_id", store.id);
        throw assignmentError;
      }

      toast.success("Turno salvo com os operadores selecionados.");
      setShiftName("");
      setSelectedOperators([]);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar o turno.");
    } finally {
      setSavingShift(false);
    }
  };

  const toggleOperator = (operatorId: string) => {
    setSelectedOperators((current) => current.includes(operatorId)
      ? current.filter((id) => id !== operatorId)
      : [...current, operatorId]);
  };

  return (
    <AppShell title="Equipe e turnos">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Acesso seguro dos operadores</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Só o proprietário pode criar logins. As senhas são usadas para autenticação e não ficam salvas nesta tela.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{store?.plan === "trial" ? "Teste grátis" : store?.plan ?? "Plano"}</Badge>
                <span className="text-sm text-muted-foreground">Contas do plano, incluindo o proprietário: <strong className="text-foreground">{remainingLabel}</strong></span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Cadastrar operador</h2>
          </div>
          <form onSubmit={createOperator} className="space-y-3">
            <div>
              <Label htmlFor="operator-name">Nome do operador</Label>
              <Input id="operator-name" className="mt-1" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} autoComplete="name" minLength={2} maxLength={80} required />
            </div>
            <div>
              <Label htmlFor="operator-email">E-mail de acesso</Label>
              <Input id="operator-email" className="mt-1" type="email" value={operatorEmail} onChange={(e) => setOperatorEmail(e.target.value)} autoComplete="off" maxLength={254} required />
            </div>
            <div>
              <Label htmlFor="operator-password">Senha inicial</Label>
              <Input id="operator-password" className="mt-1" type="password" value={operatorPassword} onChange={(e) => setOperatorPassword(e.target.value)} autoComplete="new-password" minLength={8} maxLength={72} required />
              <p className="mt-1 text-xs text-muted-foreground">Mínimo de 8 caracteres. O operador poderá redefinir a senha pelo login.</p>
            </div>
            {!canAddByPlan && <p className="text-sm text-destructive">Ative ou renove o plano para criar novos acessos.</p>}
            {reachedLimit && <p className="text-sm text-destructive">Limite atingido. Faça upgrade do plano para incluir mais usuários.</p>}
            <Button type="submit" className="w-full" disabled={savingOperator || loading || !canAddByPlan || reachedLimit}>
              {savingOperator ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar login do operador
            </Button>
          </form>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-medium">Operadores cadastrados</h3>
            {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : operators.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum operador cadastrado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {operators.map((operator) => (
                  <li key={operator.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{operator.display_name}</p>
                      <p className="truncate text-sm text-muted-foreground">{operator.email}</p>
                    </div>
                    <Badge variant="secondary">Operador</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Escala de turnos</h2>
          </div>
          {operators.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Cadastre um operador antes de montar a escala.</p>
          ) : (
            <form onSubmit={createShift} className="space-y-3">
              <div>
                <Label htmlFor="shift-name">Nome do turno</Label>
                <Input id="shift-name" className="mt-1" value={shiftName} onChange={(e) => setShiftName(e.target.value)} placeholder="Ex.: Abertura" minLength={2} maxLength={60} required />
              </div>
              <div>
                <Label htmlFor="shift-day">Dia da semana</Label>
                <select id="shift-day" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={shiftDay} onChange={(e) => setShiftDay(e.target.value)}>
                  {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="shift-start">Início</Label><Input id="shift-start" className="mt-1" type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} required /></div>
                <div><Label htmlFor="shift-end">Fim</Label><Input id="shift-end" className="mt-1" type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} required /></div>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Operadores neste turno</legend>
                {operators.map((operator) => (
                  <label key={operator.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <input type="checkbox" checked={selectedOperators.includes(operator.id)} onChange={() => toggleOperator(operator.id)} />
                    <span>{operator.display_name} <span className="text-muted-foreground">· {operator.email}</span></span>
                  </label>
                ))}
              </fieldset>
              <Button type="submit" className="w-full" disabled={savingShift || loading}>
                {savingShift ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Salvar turno e operadores
              </Button>
            </form>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-medium">Turnos salvos</h3>
            {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum turno cadastrado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {shifts.map((shift) => {
                  const assigned = assignments.filter((assignment) => assignment.shift_id === shift.id)
                    .map((assignment) => operatorNames.get(assignment.operator_id))
                    .filter(Boolean);
                  return (
                    <li key={shift.id} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{shift.name} <span className="text-sm font-normal text-muted-foreground">· {DAYS[shift.day_of_week]}</span></p>
                        <Badge variant="outline">{shift.starts_at.slice(0, 5)}–{shift.ends_at.slice(0, 5)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{assigned.join(", ") || "Nenhum operador vinculado"}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
