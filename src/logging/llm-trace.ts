/** Stderr-only tracing for LLM calls (stdio MCP must not write diagnostics to stdout). */

export function isVerboseLlmEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw.trim() === "") {
    return false;
  }
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function logLlmCallStart(enabled: boolean, msg: string): void {
  if (!enabled) {
    return;
  }
  console.error(`[dissent] ${msg}`);
}

/**
 * Log a truncated view of model output (full text can be huge).
 */
export function logLlmResponse(enabled: boolean, heading: string, text: string, maxChars = 480): void {
  if (!enabled) {
    return;
  }
  const t = text.trim();
  const n = t.length;
  const body = n === 0 ? "(empty)" : n <= maxChars ? t : `${t.slice(0, maxChars)}…`;
  console.error(`[dissent]   ${heading} — ${n} chars\n${body}`);
}
