import type { CurrencyFormat } from "./types";

export const FALLBACK_CURRENCY: CurrencyFormat = {
  iso_code: "EUR",
  example_format: "123.456,78",
  decimal_digits: 2,
  decimal_separator: ",",
  symbol_first: true,
  group_separator: ".",
  currency_symbol: "€",
  display_symbol: true,
};

export function milliToUnits(milliunits: number): number {
  return milliunits / 1000;
}

export function formatMoney(
  milliunits: number,
  currency: CurrencyFormat,
  digits?: number,
): string {
  const amount = milliToUnits(milliunits);
  const fraction = digits ?? Math.min(2, currency.decimal_digits);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.iso_code || "EUR",
      currencyDisplay: currency.display_symbol ? "symbol" : "code",
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    }).format(amount);
  } catch {
    const sign = amount < 0 ? "−" : "";
    return `${sign}${currency.currency_symbol}${Math.abs(amount).toFixed(fraction)}`;
  }
}

export function formatPct(part: number, of: number): string {
  if (of === 0) return "—";
  return `${Math.round((part / of) * 100)}%`;
}

export function monthLabel(month: string, withYear: boolean): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString(undefined, {
    month: "short",
    year: withYear ? "2-digit" : undefined,
    timeZone: "UTC",
  });
}

export function monthFull(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function monthSpanLabel(fromMonth: string, toMonth: string): string {
  if (fromMonth === toMonth) return monthFull(fromMonth);
  const [y, m] = fromMonth.split("-").map(Number);
  const fromDate = new Date(Date.UTC(y, m - 1, 1));
  const sameYear = fromMonth.slice(0, 4) === toMonth.slice(0, 4);
  const fromPart = fromDate.toLocaleDateString(undefined, {
    month: "long",
    year: sameYear ? undefined : "numeric",
    timeZone: "UTC",
  });
  return `${fromPart} – ${monthFull(toMonth)}`;
}
