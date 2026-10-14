// Portable environment access for multi-runtime support.
// Works on Node, Deno, Bun, Cloudflare Workers, and browser.

export function getEnv(name: string): string {
  // Node / Bun
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[name];
    if (typeof v === 'string') return v;
  }
  // Deno
  const g = globalThis as unknown as { Deno?: { env: { get: (n: string) => string | undefined } } };
  if (g.Deno && g.Deno.env) {
    const v = g.Deno.env.get(name);
    if (typeof v === 'string') return v;
  }
  // Cloudflare Workers / custom global
  const h = globalThis as unknown as { HTL_ENV?: Record<string, string> };
  if (h.HTL_ENV && typeof h.HTL_ENV === 'object') {
    const v = h.HTL_ENV[name];
    if (typeof v === 'string') return v;
  }
  return '';
}
