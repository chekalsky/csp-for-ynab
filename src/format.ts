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

function groupInt(digits: string, sep: string): string {
  if (!sep) return digits;
  let out = "";
  for (let i = digits.length; i > 0; i -= 3) {
    const chunk = digits.slice(Math.max(0, i - 3), i);
    out = out ? chunk + sep + out : chunk;
  }
  return out;
}

export function formatNumber(
  amount: number,
  currency: CurrencyFormat,
  digits?: number,
): string {
  const fraction = digits ?? currency.decimal_digits;
  const abs = Math.abs(amount);
  const [intRaw, fracRaw] = abs.toFixed(fraction).split(".");
  const grouped = groupInt(intRaw, currency.group_separator);
  const body =
    fraction > 0
      ? `${grouped}${currency.decimal_separator}${fracRaw}`
      : grouped;
  return amount < 0 ? `-${body}` : body;
}

export function formatMoney(
  milliunits: number,
  currency: CurrencyFormat,
  digits?: number,
): string {
  const amount = milliToUnits(milliunits);
  const num = formatNumber(amount, currency, digits);
  const negative = num.startsWith("-");
  const absNum = negative ? num.slice(1) : num;
  const symbol = currency.display_symbol ? currency.currency_symbol : "";
  const withSymbol = symbol
    ? currency.symbol_first
      ? `${symbol}${absNum}`
      : `${absNum} ${symbol}`
    : absNum;
  return negative ? `-${withSymbol}` : withSymbol;
}

export function formatCompact(amount: number, currency: CurrencyFormat): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    return `${formatNumber(amount / 1_000_000, currency, 1)}m`;
  }
  if (abs >= 1000) {
    return `${formatNumber(Math.round(amount / 1000), currency, 0)}k`;
  }
  return formatNumber(Math.round(amount), currency, 0);
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
