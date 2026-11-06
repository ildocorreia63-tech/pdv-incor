import { z } from "npm:zod@3";

export const photoBodySchema = z.object({
  storeId: z.string().uuid(),
  image: z.string().max(12_000_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
  categories: z.array(z.string().trim().min(1).max(80)).min(1).max(50),
}).strict();

// All fields are required-but-nullable: unreadable information is never invented.
export const expensePhotoSchema = z.object({
  supplier: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  amount: z.number().nullable(),
  expense_date: z.string().nullable(),
  notes: z.string().nullable(),
  warnings: z.array(z.string()),
}).strict();

export function ownsStore(role: unknown): boolean {
  return role === "owner";
}