import { expect, test } from "vitest";
import { formatPct, milliToUnits } from "./format";

test("milliunits are thousandths", () => {
  expect(milliToUnits(12340)).toBe(12.34);
});

test("formatPct is a dash when the denominator is 0", () => {
  expect(formatPct(1, 0)).toBe("—");
  expect(formatPct(1, 2)).toBe("50%");
});
