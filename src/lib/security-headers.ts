import type { Env } from "./env";

/**
 * Content Security Policy. Next.js injects small inline bootstrap scripts,
 * so script-src needs 'unsafe-inline' without nonces (nonces would force
 * every page to render dynamically). Everything else is first-party only.
 * Vercel preview deployments also allow the Vercel Toolbar (comments).
 */
export function contentSecurityPolicy(env: Env = process.env): string {
  const toolbar = env.VERCEL_ENV === "preview";
  const live = toolbar ? " https://vercel.live" : "";
  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": `'self' 'unsafe-inline'${live}`,
    "style-src": `'self' 'unsafe-inline'${live}`,
    "img-src": `'self' data: blob:${toolbar ? " https://vercel.live https://vercel.com" : ""}`,
    "font-src": `'self'${toolbar ? " https://vercel.live https://assets.vercel.com" : ""}`,
    "media-src": "'self'",
    "connect-src": `'self'${toolbar ? " https://vercel.live wss://ws-us3.pusher.com" : ""}`,
    "frame-src": toolbar ? "https://vercel.live" : "'none'",
    "frame-ancestors": "'none'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "object-src": "'none'",
    "upgrade-insecure-requests": "",
  };
  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join("; ");
}

export function securityHeaders(env: Env = process.env): { key: string; value: string }[] {
  const headers = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  ];
  // `next dev` needs eval for fast refresh, so the CSP applies to builds only.
  if (env.NODE_ENV === "production") {
    headers.push({ key: "Content-Security-Policy", value: contentSecurityPolicy(env) });
  }
  return headers;
}
