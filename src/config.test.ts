import { expect, test } from "vitest";
import { isPlaceholderClientId, parseConfig } from "./config";
import { PLACEHOLDER_CLIENT_ID } from "./types";

test("garbage config falls back", () => {
  const fallback = parseConfig(null);
  expect(fallback.ynabClientId).toBe(PLACEHOLDER_CLIENT_ID);
  expect(fallback.redirectUri).toBe("https://csp.test/");
  expect(fallback.markers[0]).toEqual({
    bucket: "ignore",
    patterns: ["[CSP-Ignore]"],
  });
  expect(parseConfig("nope").ynabClientId).toBe(PLACEHOLDER_CLIENT_ID);
});

test("invalid markers are dropped; empty list uses fallback markers", () => {
  const parsed = parseConfig({
    ynabClientId: "  real-client-id  ",
    redirectUri: " https://app.test/ ",
    markers: [
      { bucket: "fixed", patterns: ["[F]", ""] },
      { bucket: "nope", patterns: ["x"] },
      { bucket: "savings", patterns: [] },
      "skip",
    ],
  });
  expect(parsed.ynabClientId).toBe("real-client-id");
  expect(parsed.redirectUri).toBe("https://app.test/");
  expect(parsed.markers).toEqual([{ bucket: "fixed", patterns: ["[F]"] }]);
  expect(parseConfig({ ynabClientId: "real-client-id", markers: [] }).markers[0].bucket).toBe(
    "ignore",
  );
});

test("placeholder client ids", () => {
  expect(isPlaceholderClientId(PLACEHOLDER_CLIENT_ID)).toBe(true);
  expect(isPlaceholderClientId("short")).toBe(true);
  expect(isPlaceholderClientId("long-enough-id")).toBe(false);
});
