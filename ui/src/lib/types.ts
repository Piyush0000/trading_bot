export type TokenMetrics = {
  symbol: string;
  price: number;
  change: number;
  rsi: number;
  signal: string;
  tp: string | number;
  sl: string | number;
  lot_qty: number;
  last_updated: string;
};

export type LatestDataResponse = {
  data: Record<string, TokenMetrics>;
  last_updated: string;
};

export type TokenDataResponse = {
  data: Record<string, TokenMetrics>;
  last_updated: string;
};

export type Position = {
  token: string;
  current_price: number;
  entry_price: number;
  side: "LONG" | "SHORT";
  quantity: number;
  tp_price: number;
  sl_price: number;
  liq_price: number;
  pnl: number;
  pnl_percent: number;
};

export type PositionsResponse = {
  positions: Position[];
  balance: number;
  paper_trading: boolean;
  active_signals: number;
  total_positions: number;
};

export type TokenHistoryPoint = {
  timestamp: string;
  price: number;
  rsi: number;
};

export type CandlePoint = {
  x: string; // ISO timestamp
  o: number;
  h: number;
  l: number;
  c: number;
};
