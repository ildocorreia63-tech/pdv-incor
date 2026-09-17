(globalThis as any).ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StoreProvider } from "@/lib/recuperacao/store";
import Painel from "@/pages/recuperacao/painel";
import Clientes from "@/pages/recuperacao/clientes";
import Campanhas from "@/pages/recuperacao/campanhas";
import Automacoes from "@/pages/recuperacao/automacoes";
import Integracoes from "@/pages/recuperacao/integracoes";
import Relatorios from "@/pages/recuperacao/relatorios";
import Configuracoes from "@/pages/recuperacao/configuracoes";
import Planos from "@/pages/recuperacao/planos";

const paginas = { Painel, Clientes, Campanhas, Automacoes, Integracoes, Relatorios, Configuracoes, Planos };

describe("recuperacao", () => {
  for (const [nome, C] of Object.entries(paginas)) {
    it(`renderiza ${nome}`, () => {
      render(<MemoryRouter><StoreProvider><C /></StoreProvider></MemoryRouter>);
      expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
    });
  }
});
