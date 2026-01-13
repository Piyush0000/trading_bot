'use client';

import { formatChange, formatCurrency } from "../lib/utils";
import { PositionsResponse } from "../lib/types";

type Props = {
  data: PositionsResponse | null;
  loading: boolean;
  onRefresh: () => void;
};

export function PositionsTable({ data, loading, onRefresh }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1a0f]/80 p-4 shadow-lg shadow-emerald-900/40 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-emerald-50">Positions</div>
          <div className="text-xs text-emerald-200/80">
            Paper trading balance {formatCurrency(data?.balance ?? 0, 0)}
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs font-semibold text-emerald-300 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-emerald-500/20">
        <table className="min-w-full text-left text-sm text-emerald-100">
          <thead className="bg-[#0f2414] text-emerald-200/80">
            <tr>
              <th className="px-3 py-2">Token</th>
              <th className="px-3 py-2">Side</th>
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Current</th>
              <th className="px-3 py-2">PnL</th>
              <th className="px-3 py-2">TP / SL</th>
            </tr>
          </thead>
          <tbody>
            {!data?.positions?.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-sm text-emerald-200/70"
                >
                  {loading ? "Loading positions..." : "No open positions"}
                </td>
              </tr>
            ) : (
              data.positions.map((p) => (
                <tr key={`${p.token}-${p.entry_price}`} className="border-t border-emerald-500/20">
                  <td className="px-3 py-2 font-semibold text-emerald-50">
                    {p.token}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        p.side === "LONG"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-rose-500/20 text-rose-200"
                      }`}
                    >
                      {p.side}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-emerald-100">
                    {formatCurrency(p.entry_price)}
                  </td>
                  <td className="px-3 py-2 text-emerald-100">
                    {formatCurrency(p.current_price)}
                  </td>
                  <td
                    className={`px-3 py-2 font-semibold ${
                      p.pnl >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatCurrency(p.pnl)} ({formatChange(p.pnl_percent)})
                  </td>
                  <td className="px-3 py-2 text-xs text-emerald-200/80">
                    TP {formatCurrency(p.tp_price)} / SL {formatCurrency(p.sl_price)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
