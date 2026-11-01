/** Only allow local app routes, never an external URL or a login loop. */
export function requestedRoute(state: unknown): string {
  const from = typeof state === "object" && state !== null && "from" in state ? state.from : undefined;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//") ||
      from.includes("\\") || /^\/(auth|reset-password)([/?#]|$)/.test(from)) return "/";
  return from;
}