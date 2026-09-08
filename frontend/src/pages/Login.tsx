// Page de connexion : formulaire email / mot de passe → login JWT.
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { getApiErrorMessage } from "../utils/apiError";

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { from?: string; registered?: boolean } | null;
  const from = state?.from ?? "/profil";
  const [notice] = useState<string | null>(
    state?.registered ? "Compte créé ! Connectez-vous maintenant." : null
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
      <p className="mt-1 text-sm text-gray-600">
        Accédez à votre espace MboaFind.
      </p>

      {notice && (
        <div
          className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          role="status"
        >
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-brand-green px-4 py-2.5 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Pas encore de compte ?{" "}
        <Link to="/register" className="font-medium text-brand-green hover:underline">
          S'inscrire
        </Link>
      </p>
    </div>
  );
}