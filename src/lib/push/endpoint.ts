/**
 * Web Push endpoints are URLs the browser hands us, and the server POSTs to
 * them — so an unchecked endpoint is an SSRF primitive. Only accept https
 * URLs on the known browser push services, on the default port, without
 * credentials.
 */
const EXACT_HOSTS = new Set(["fcm.googleapis.com", "web.push.apple.com"]);
const HOST_SUFFIXES = [
  ".push.services.mozilla.com",
  ".notify.windows.com",
  ".push.apple.com",
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.port !== "" && url.port !== "443") return false;
  if (url.username || url.password) return false;

  const host = url.hostname.toLowerCase();
  if (EXACT_HOSTS.has(host)) return true;
  return HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
