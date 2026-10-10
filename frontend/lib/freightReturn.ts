// Only preserve the existing customer quote destination. This is deliberately
// narrower than a general-purpose return URL to prevent open redirects.
export function freightReturnPath(search: string, origin: string): string | null {
  const next = new URLSearchParams(search).get("next");
  if (!next) return null;
  try {
    const url = new URL(next, origin);
    return url.origin === origin && url.pathname === "/customer/rfq/new" &&
      /^[a-f0-9-]{36}:\d+$/.test(url.searchParams.get("freight_reference") || "")
      ? url.pathname + url.search : null;
  } catch { return null; }
}
