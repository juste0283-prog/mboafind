// Classes utilitaires partagées du design system MboaFind
// (thème clair/sombre cohérent sur toute l'application).

export const page = "min-h-screen bg-slate-50 dark:bg-slate-950";

export const container = "mx-auto max-w-6xl px-4";

export const card =
  "rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow dark:border-slate-700 dark:bg-slate-800/60";

export const cardHover = `${card} hover:shadow-md`;

export const muted = "text-slate-500 dark:text-slate-400";

export const heading =
  "font-semibold tracking-tight text-slate-900 dark:text-slate-50";

export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

export const label = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";

export const inputError = "border-brand-red dark:border-brand-red";

export const tableHead =
  "bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400";

export const tableRow = "hover:bg-slate-50 dark:hover:bg-slate-800/40";

export const notice = {
  success:
    "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800/60 dark:bg-green-900/30 dark:text-green-300",
  info: "rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-300",
  warning:
    "rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800/60 dark:bg-yellow-900/30 dark:text-yellow-200",
};

export const badge = {
  green: "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300",
  red: "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300",
  yellow:
    "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  blue: "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  slate:
    "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};