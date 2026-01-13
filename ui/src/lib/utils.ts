export const formatCurrency = (value: number, digits = 2) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const formatChange = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const toDisplaySymbol = (symbol: string) =>
  symbol.replace(/USDT$/i, "");

export const normalizeTokenInput = (token: string) => {
  const trimmed = token.trim().toUpperCase();
  if (!trimmed) return "";
  return trimmed.endsWith("USDT") ? trimmed : `${trimmed}USDT`;
};
