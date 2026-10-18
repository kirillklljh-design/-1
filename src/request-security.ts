export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const url = new URL(request.url);
  // Next.js may use localhost in request.url behind its Node/Vercel proxy.
  const host = request.headers.get("host") ?? url.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    url.protocol.slice(0, -1);
  return (
    ["http", "https"].includes(protocol) && origin === `${protocol}://${host}`
  );
}
