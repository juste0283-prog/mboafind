// Page d'accueil : hero + barre de recherche + présentation des modules.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import { btnPrimary, input, muted } from "../styles/classes";

export default function Home() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : "/recherche");
  };

  const FEATURES = [
    {
      emoji: "🛒",
      title: t("home.feat.products.title"),
      description: t("home.feat.products.desc"),
      to: "/recherche",
    },
    {
      emoji: "🛠️",
      title: t("home.feat.professionals.title"),
      description: t("home.feat.professionals.desc"),
      to: "/professionnels",
    },
    {
      emoji: "⭐",
      title: t("home.feat.reviews.title"),
      description: t("home.feat.reviews.desc"),
      to: "/recherche",
    },
    {
      emoji: "🔔",
      title: t("home.feat.reports.title"),
      description: t("home.feat.reports.desc"),
      to: "/recherche",
    },
  ];

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-green/10 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <span className="text-5xl">🇨🇲</span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
            {t("home.title1")} <span className="text-brand-green">{t("home.title2")}</span>{" "}
            {t("home.title3")}
          </h1>
          <p className={`${muted} mx-auto mt-4 max-w-2xl text-lg`}>{t("home.subtitle")}</p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("home.searchPlaceholder")}
              className={`${input} flex-1 py-3 text-base`}
            />
            <button type="submit" className={`${btnPrimary} px-6 py-3 text-base`}>
              {t("common.search")}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              to="/professionnels"
              className="text-slate-600 hover:text-brand-green hover:underline dark:text-slate-300"
            >
              {t("home.findProfessional")}
            </Link>
            {!user && (
              <>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <Link to="/register" className="text-brand-green hover:underline">
                  {t("home.createAccount")}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
          {t("home.sectionTitle")}
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              to={feature.to}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="text-3xl">{feature.emoji}</div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {feature.title}
              </h3>
              <p className={`${muted} mt-1 text-sm`}>{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}