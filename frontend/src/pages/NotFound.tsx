// Page 404.
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">404 — Page introuvable</h1>
      <p className="mt-2 text-gray-600">Cette page n'existe pas ou n'existe plus.</p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-brand-green px-5 py-2.5 font-semibold text-white hover:brightness-110"
      >
        ← Retour à l'accueil
      </Link>
    </div>
  );
}