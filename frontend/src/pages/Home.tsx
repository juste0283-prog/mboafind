// Page d'accueil : hero + présentation des modules à venir.

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const FEATURES = [
  {
    emoji: "🛒",
    title: "Produits & prix",
    description: "Cherchez un produit et comparez les prix entre commerces d'une même ville.",
  },
  {
    emoji: "📍",
    title: "Carte des commerces",
    description: "Localisez boutiques et marchés sur une carte OpenStreetMap interactive.",
  },
  {
    emoji: "🛠️",
    title: "Professionnels",
    description: "Trouvez un mécanicien, un maçon ou un informaticien de confiance.",
  },
  {
    emoji: "⭐",
    title: "Avis & réputation",
    description: "Consultez les avis vérifiés avant de faire confiance à un commerce.",
  },
  {
    emoji: "🔔",
    title: "Signalements",
    description: "Corrigez prix et informations incorrectes pour toute la communauté.",
  },
  {
    emoji: "🗺️",
    title: "Roadmap active",
    description: "Recherche filtrée, cartographie, annuaire et modération arrivent bientôt.",
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-green/10 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
          <span className="text-5xl">🇨🇲</span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Trouvez le <span className="text-brand-green">meilleur prix</span> au Cameroun
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            MboaFind centralise produits, commerces, professionnels et avis
            pour vous aider à acheter malin, à vendre plus et à choisir en confiance.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link
                to="/profil"
                className="rounded-lg bg-brand-green px-6 py-3 text-base font-semibold text-white shadow hover:brightness-110"
              >
                Mon profil →
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-green px-6 py-3 text-base font-semibold text-white shadow hover:brightness-110"
                >
                  Créer un compte
                </Link>
                <Link
                  to="/login"
                  className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Se connecter
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
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="text-3xl">{feature.emoji}</div>
              <h3 className="mt-3 text-lg font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}