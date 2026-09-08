// Page profil (protégée) : carte d'identité de l'utilisateur connecté.

import Spinner from "../components/common/Spinner";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";

const ROLE_LABELS: Record<UserRole, string> = {
  CLIENT: "Client",
  COMMERCANT: "Commerçant",
  PROFESSIONNEL: "Professionnel",
  ADMIN: "Administrateur",
};

export default function Profile() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading || !user) {
    return <Spinner fullScreen />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
      <p className="mt-1 text-sm text-gray-600">
        Gérez les informations de votre compte MboaFind.
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-2xl font-bold text-white">
              {(user.full_name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {user.full_name ?? "—"}
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <span className="rounded-full bg-brand-yellow/20 px-3 py-1 text-xs font-semibold text-gray-700">
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
            <dd className="mt-1 text-gray-900">{user.phone ?? "Non renseigné"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Membre depuis</dt>
            <dd className="mt-1 text-gray-900">
              {new Date(user.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-gray-100 pt-4">
          {(user.role === "COMMERCANT" || user.role === "PROFESSIONNEL") && (
            <p className="text-sm text-gray-500">
              💡 Les espaces commerçant et professionnel arrivent dans une prochaine phase.
            </p>
          )}

          <button
            type="button"
            onClick={logout}
            className="mt-4 rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}