import { Outlet } from "react-router-dom";
import { StoreProvider } from "@/lib/recuperacao/store";

export default function RecuperacaoLayout() {
  return (
    <StoreProvider>
      <Outlet />
    </StoreProvider>
  );
}
