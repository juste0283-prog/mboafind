// Page d'accueil : hero + barre de recherche + présentation des modules.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  {
    emoji: "🛒",
    title: "Produits & prix",
    description: "Cherchez un produit et comparez les prix entre commerces d'une même ville.",
    to: "/recherche",
  },
  {
    emoji: "🛠️",
    title: "Professionnels",
    description: "Trouvez un mécanicien, un maçon ou un informaticien et envoyez une demande.",
    to: "/professionnels",
  },
  {
    emoji: "⭐",
    title: "Avis & réputation",
    description: "Consultez les avis vérifiés avant de faire confiance à un commerce.",
    to: "/recherche",
  },
  {
    emoji: "🔔",
    title: "Signalements",
    description: "Corrigez prix et informations incorrectes pour toute la communauté.",
    to: "/recherche",
  },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/recherche?q=${encodeURIComponent(trimmed)}` : "/recherche");
  };

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-green/10 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-20">
          <span className="text-5xl">🇨🇲</span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Trouvez le <span className="text-brand-green">meilleur prix</span> au Cameroun
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            MboaFind centralise produits, commerces, professionnels et avis
            pour vous aider à acheter malin, à vendre plus et à choisir en confiance.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Que cherchez-vous ? (produit, service, professionnel…)"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-green px-6 py-3 text-base font-semibold text-white shadow hover:brightness-110"
            >
              Rechercher
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link to="/professionnels" className="text-gray-600 hover:text-brand-green hover:underline">
              Trouver un professionnel →
            </Link>
            {!user && (
              <>
                <span className="text-gray-300">|</span>
                <Link to="/register" className="text-brand-green hover:underline">
                  Créer un compte gratuit
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-900">
          Ce que vous trouverez sur MboaFind
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              to={feature.to}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="text-3xl">{feature.emoji}</div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}