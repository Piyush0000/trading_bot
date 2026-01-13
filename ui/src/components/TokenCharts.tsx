"use client";

import { MouseEvent, useRef, useState } from "react";
import { Chart as ChartComponent } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from "chart.js";
import { TokenHistoryPoint } from "../lib/types";
import { toDisplaySymbol } from "../lib/utils";
import "chartjs-adapter-date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

type Props = {
  token: string;
  history: TokenHistoryPoint[];
};

export function TokenCharts({ token, history }: Props) {
  const [selectedPoint, setSelectedPoint] = useState<TokenHistoryPoint | null>(null);
  const priceChartRef = useRef<ChartJS<"line", number[], number> | null>(null);

  if (!history.length) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-950/40 p-6 text-center text-sm text-emerald-200/70">
        Charts will appear after the first refresh for {toDisplaySymbol(token)}.
      </div>
    );
  }

  const priceLabels = history.map((p) => new Date(p.timestamp).getTime());

  const priceData: ChartData<"line"> = {
    labels: priceLabels,
    datasets: [
      {
        label: `${toDisplaySymbol(token)} Price`,
        data: history.map((p) => p.price),
        borderColor: "rgba(74, 222, 128, 1)",
        backgroundColor: "rgba(34, 197, 94, 0.18)",
        fill: true,
        tension: 0.35,
        pointRadius: 2.5,
        pointBackgroundColor: "rgba(16, 185, 129, 0.9)",
      },
    ],
  };

  const rsiData: ChartData<"line"> = {
    labels: priceLabels,
    datasets: [
      {
        label: "RSI",
        data: history.map((p) => p.rsi),
        borderColor: "rgba(74, 222, 128, 1)",
        backgroundColor: "rgba(52, 211, 153, 0.14)",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: "Overbought (70)",
        data: history.map(() => 70),
        borderColor: "rgba(239, 68, 68, 0.5)",
        borderDash: [6, 6],
        pointRadius: 0,
      },
      {
        label: "Oversold (30)",
        data: history.map(() => 30),
        borderColor: "rgba(59, 130, 246, 0.5)",
        borderDash: [6, 6],
        pointRadius: 0,
      },
    ],
  };

  const sharedTimeOptions = {
    type: "time" as const,
    ticks: { color: "rgb(167 243 208)" },
    grid: { color: "rgba(16,185,129,0.15)" },
    time: { tooltipFormat: "HH:mm:ss", displayFormats: { minute: "HH:mm", second: "HH:mm:ss" } },
  };

  const priceOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top", labels: { color: "rgb(187 247 208)" } },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        ...sharedTimeOptions,
      },
      y: {
        ticks: { color: "rgb(167 243 208)" },
        grid: { color: "rgba(16,185,129,0.15)" },
      },
    },
  };

  const rsiOptions: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top", labels: { color: "rgb(187 247 208)" } },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "nearest", intersect: false },
    scales: {
      x: {
        ...sharedTimeOptions,
      },
      y: {
        ticks: { color: "rgb(167 243 208)" },
        grid: { color: "rgba(16,185,129,0.15)" },
      },
    },
  };

  const handlePriceClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const chart = priceChartRef.current;
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(
      event.nativeEvent,
      "nearest",
      { intersect: false },
      true
    );
    if (!points.length) return;
    const { index } = points[0];
    const point = history[index];
    if (point) setSelectedPoint(point);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1a0f]/80 p-4 shadow-lg shadow-emerald-900/40 backdrop-blur">
        <h3 className="mb-3 text-sm font-semibold text-emerald-50">
          {toDisplaySymbol(token)} Price
        </h3>
        <ChartComponent
          ref={priceChartRef}
          type="line"
          data={priceData}
          options={priceOptions}
          height={180}
          onClick={handlePriceClick}
        />
        {selectedPoint ? (
          <div className="mt-3 rounded-xl border border-emerald-500/20 bg-[#0d1f13]/80 px-3 py-2 text-xs text-emerald-100">
            <div className="font-semibold text-emerald-200">
              {new Date(selectedPoint.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </div>
            <div className="flex gap-3">
              <span>Price {selectedPoint.price.toFixed(4)}</span>
              <span>RSI {selectedPoint.rsi.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-emerald-200/70">
            Click a point to see value and RSI at that time.
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1a0f]/80 p-4 shadow-lg shadow-emerald-900/40 backdrop-blur">
        <h3 className="mb-3 text-sm font-semibold text-emerald-50">
          {toDisplaySymbol(token)} RSI
        </h3>
        <ChartComponent type="line" data={rsiData} options={rsiOptions} height={180} />
      </div>
    </div>
  );
}
