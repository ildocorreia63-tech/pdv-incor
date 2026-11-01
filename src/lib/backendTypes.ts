import type { Database as GeneratedDatabase } from "@/integrations/supabase/types";

export type Operator = { id: string; store_id: string; user_id: string; display_name: string; email: string; created_by: string; created_at: string; active: boolean };
export type Shift = { id: string; store_id: string; name: string; day_of_week: number; starts_at: string; ends_at: string; active: boolean; created_by: string; created_at: string };
export type Assignment = { id: string; store_id: string; shift_id: string; operator_id: string; created_at: string };
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: [];
};

/** Match existing team migrations without changing generated files or applying SQL. */
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & {
      store_operators: Table<Operator, "store_id" | "user_id" | "display_name" | "email" | "created_by">;
      store_shifts: Table<Shift, "store_id" | "name" | "day_of_week" | "starts_at" | "ends_at" | "created_by">;
      store_shift_assignments: Table<Assignment, "store_id" | "shift_id" | "operator_id">;
    };
  };
};