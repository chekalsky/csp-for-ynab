import { PLACEHOLDER_CLIENT_ID, type AppConfig, type Marker } from "./types";

function originRedirect(): string {
  return `${window.location.origin}/`;
}

const FALLBACK: AppConfig = {
  ynabClientId: PLACEHOLDER_CLIENT_ID,
  redirectUri: originRedirect(),
  markers: [
    { bucket: "ignore", patterns: ["[CSP-Ignore]"] },
    { bucket: "fixed", patterns: ["[CSP-Fixed]", "Fixed Expenses", "Fixed Costs"] },
    { bucket: "guilt_free", patterns: ["[CSP-GuiltFree]", "Guilt-Free"] },
    { bucket: "investments", patterns: ["[CSP-Investments]", "Investments", "📈"] },
    { bucket: "savings", patterns: ["[CSP-Savings]", "Savings", "💰"] },
  ],
};

const VALID_BUCKETS = new Set<Marker["bucket"]>([
  "ignore",
  "fixed",
  "guilt_free",
  "investments",
  "savings",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseMarkers(raw: unknown): Marker[] {
  if (!Array.isArray(raw)) return FALLBACK.markers;
  const markers: Marker[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) continue;
    const bucket = rec.bucket;
    const patterns = rec.patterns;
    if (typeof bucket !== "string" || !VALID_BUCKETS.has(bucket as Marker["bucket"])) {
      continue;
    }
    if (!Array.isArray(patterns)) continue;
    const cleaned = patterns.filter((p): p is string => typeof p === "string" && p.length > 0);
    if (cleaned.length === 0) continue;
    markers.push({ bucket: bucket as Marker["bucket"], patterns: cleaned });
  }
  return markers.length > 0 ? markers : FALLBACK.markers;
}

export function parseConfig(raw: unknown): AppConfig {
  const rec = asRecord(raw);
  if (!rec) return FALLBACK;
  return {
    ynabClientId:
      typeof rec.ynabClientId === "string" && rec.ynabClientId.trim()
        ? rec.ynabClientId.trim()
        : FALLBACK.ynabClientId,
    redirectUri:
      typeof rec.redirectUri === "string" && rec.redirectUri.trim()
        ? rec.redirectUri.trim()
        : originRedirect(),
    markers: parseMarkers(rec.markers),
  };
}

export async function loadConfig(): Promise<AppConfig> {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not load /config.json (${res.status})`);
  }
  return parseConfig(await res.json());
}

export function isPlaceholderClientId(id: string): boolean {
  return id === PLACEHOLDER_CLIENT_ID || id.length < 8;
}
