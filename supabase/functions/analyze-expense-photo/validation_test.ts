import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ownsStore, photoBodySchema } from "./validation.ts";
Deno.test("somente o dono da loja pode analisar a nota", () => {
  assertEquals(ownsStore("owner"), true);
  assertEquals(ownsStore("admin"), false);
  assertEquals(ownsStore("operator"), false);
  assertEquals(ownsStore(undefined), false);
});
Deno.test("não aceita links externos no lugar da foto enviada", () => {
  assertEquals(photoBodySchema.safeParse({ storeId: "11111111-1111-4111-8111-111111111111", categories: ["Insumos"], image: "https://example.com/nota.jpg" }).success, false);
});