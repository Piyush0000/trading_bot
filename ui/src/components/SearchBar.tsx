'use client';

import { FormEvent } from "react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  loading?: boolean;
};

export function SearchBar({ value, onChange, onSubmit, loading }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search token (e.g., BTC, ETH, SOL)"
        className="w-full rounded-xl border border-emerald-400/30 bg-[#0f2a18] px-4 py-3 text-sm text-emerald-100 shadow-inner shadow-emerald-900/40 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 placeholder:text-emerald-200/60"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 px-4 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-900/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Searching..." : "Search"}
      </button>
    </form>
  );
}
