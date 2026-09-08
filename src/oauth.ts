import { clearOauthState, getOauthState, setOauthState, setToken } from "./storage";
import type { TokenRecord } from "./types";

const AUTHORIZE = "https://app.ynab.com/oauth/authorize";

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildAuthorizeUrl(clientId: string, redirectUri: string): string {
  const state = randomState();
  setOauthState(state);
  const url = new URL(AUTHORIZE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", "read-only");
  url.searchParams.set("state", state);
  return url.toString();
}

export function tokenIsFresh(token: TokenRecord, skewMs = 30_000): boolean {
  return Date.now() + skewMs < token.expiresAt;
}

export type HashCapture =
  | { ok: true }
  | { ok: false; error: string }
  | null;

export function captureOauthHash(): HashCapture {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const error = params.get("error");
  const token = params.get("access_token");
  if (!error && !token) return null;

  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", cleanUrl);

  if (error) {
    clearOauthState();
    return {
      ok: false,
      error: params.get("error_description") || error,
    };
  }

  const expected = getOauthState();
  const state = params.get("state");
  clearOauthState();
  if (expected && state && expected !== state) {
    return { ok: false, error: "OAuth state mismatch. Try connecting again." };
  }

  const expiresIn = Number(params.get("expires_in") ?? "7200");
  const ttl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 7200;
  setToken({
    accessToken: token as string,
    expiresAt: Date.now() + ttl * 1000,
  });
  return { ok: true };
}
