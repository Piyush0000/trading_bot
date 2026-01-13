'use client';

import { formatChange, formatCurrency, formatTime, toDisplaySymbol } from "../lib/utils";
import { TokenMetrics } from "../lib/types";

type Props = {
  data: TokenMetrics;
};

const badgeColors: Record<string, string> = {
  BUY: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40",
  SELL: "bg-rose-500/20 text-rose-200 border border-rose-400/40",
  HOLD: "bg-emerald-900/40 text-emerald-200 border border-emerald-700/50",
};

export function TokenCard({ data }: Props) {
  const changePositive = data.change >= 0;
  const badgeClass = badgeColors[data.signal.toUpperCase()] ?? badgeColors.HOLD;

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-[#0e2415]/80 p-5 shadow-lg shadow-emerald-900/40 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-emerald-200/70">Token</div>
          <div className="text-2xl font-semibold tracking-tight text-emerald-50">
            {toDisplaySymbol(data.symbol)}
          </div>
          <div className="text-xs text-emerald-200/70">
            Updated {formatTime(data.last_updated)}
          </div>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${badgeClass}`}>
          {data.signal}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Metric label="Price" value={formatCurrency(data.price, 2)} />
        <Metric
          label="24h Change"
          value={formatChange(data.change)}
          className={changePositive ? "text-emerald-400" : "text-rose-300"}
        />
        <Metric label="RSI" value={data.rsi.toFixed(2)} />
        <Metric label="Lot Qty (20x)" value={data.lot_qty.toFixed(4)} />
        <Metric label="TP" value={data.tp} />
        <Metric label="SL" value={data.sl} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="rounded-xl bg-[#0a1a10] px-3 py-3 text-sm text-emerald-100 shadow-inner shadow-emerald-900/60">
      <div className="text-xs text-emerald-200/70">{label}</div>
      <div className={`mt-0.5 font-semibold text-emerald-50 ${className ?? ""}`}>{value}</div>
    </div>
  );
}
