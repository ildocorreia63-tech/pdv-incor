import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { backendConfig } from "./lib/backendConfig";
import "./index.css";
import { friendlyMessage } from "./lib/errors";
import { toast } from "sonner";

// A deployment may replace lazy-loaded files while an older app tab is open.
// Reload once so the browser picks up the current asset map instead of freezing.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const reloadKey = "pdv-preload-recovery";
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  }
});

// Global safety nets — catch anything that escapes React/component-level try/catch
window.addEventListener("unhandledrejection", (event) => {
  console.error("[unhandledrejection]", event.reason);
  const msg = friendlyMessage(event.reason, "Erro inesperado em segundo plano");
  // Avoid toast spam from benign aborts
  if (!/aborted|cancell?ed/i.test(msg)) toast.error(msg);
});

window.addEventListener("error", (event) => {
  // ResizeObserver noise — safe to ignore
  if (event.message?.includes("ResizeObserver")) return;
  console.error("[window.error]", event.error || event.message);
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento principal não encontrado");
const root = createRoot(rootElement);
if (!backendConfig.ok) {
  root.render(
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h1 className="font-display text-2xl">Conexão do PDV INCOR pendente</h1>
      <p role="alert" className="max-w-lg text-sm text-muted-foreground">{backendConfig.error}</p>
      <p className="max-w-lg text-sm text-muted-foreground">Nenhum acesso ao banco anterior será realizado.</p>
    </main>,
  );
} else {
  void import("./App.tsx").then(({ default: App }) => root.render(
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="pdv-theme">
        <App />
      </ThemeProvider>
    </HelmetProvider>,
  ));
}

// Fade out the boot splash once the app has mounted
requestAnimationFrame(() => {
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  splash.classList.add("boot-splash--hidden");
  setTimeout(() => splash.remove(), 400);
});
