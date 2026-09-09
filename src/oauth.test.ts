import { expect, test } from "vitest";
import { captureOauthHash, tokenIsFresh } from "./oauth";
import { getOauthState, getToken, setOauthState } from "./storage";

test("empty or irrelevant hash is ignored", () => {
  expect(captureOauthHash()).toBeNull();
  window.location.hash = "#foo=bar";
  expect(captureOauthHash()).toBeNull();
});

test("error hash clears state and strips the fragment", () => {
  setOauthState("abc");
  window.location.hash = "#error=access_denied&error_description=Nope";
  expect(captureOauthHash()).toEqual({ ok: false, error: "Nope" });
  expect(getOauthState()).toBeNull();
  expect(window.location.hash).toBe("");
});

test("state mismatch rejects the token", () => {
  setOauthState("expected");
  window.location.hash = "#access_token=tok&state=other";
  expect(captureOauthHash()).toEqual({
    ok: false,
    error: "OAuth state mismatch. Try connecting again.",
  });
  expect(getToken()).toBeNull();
});

test("success stores the token; missing expires_in defaults to 7200s", () => {
  setOauthState("abc");
  window.location.hash = "#access_token=tok&state=abc";
  const before = Date.now();
  expect(captureOauthHash()).toEqual({ ok: true });
  const token = getToken();
  expect(token?.accessToken).toBe("tok");
  expect(token?.expiresAt).toBeGreaterThanOrEqual(before + 7200_000);
  expect(token?.expiresAt).toBeLessThan(before + 7200_000 + 50);
  expect(getOauthState()).toBeNull();
});

test("tokenIsFresh applies the 30s skew", () => {
  expect(tokenIsFresh({ accessToken: "t", expiresAt: Date.now() + 60_000 })).toBe(
    true,
  );
  expect(tokenIsFresh({ accessToken: "t", expiresAt: Date.now() + 10_000 })).toBe(
    false,
  );
  expect(tokenIsFresh({ accessToken: "t", expiresAt: Date.now() - 1 })).toBe(
    false,
  );
});
