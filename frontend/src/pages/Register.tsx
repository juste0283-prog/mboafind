// Page d'inscription : création de compte puis redirection vers /login.
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types";
import { getApiErrorMessage } from "../utils/apiError";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "CLIENT", label: "Client" },
  { value: "COMMERCANT", label: "Commerçant" },
  { value: "PROFESSIONNEL", label: "Professionnel" },
];

export default function Register() {
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("CLIENT");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      await register({
        email,
        password,
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
      <p className="mt-1 text-sm text-gray-600">
        Rejoignez la communauté MboaFind en quelques secondes.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
            Nom complet <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

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
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
            Téléphone <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+237 6XX XX XX XX"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        <div>
          <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
            Vous êtes…
          </label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Mot de passe <span className="text-gray-400">(min. 8 caractères)</span>
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
            Confirmez le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-brand-green px-4 py-2.5 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Création…" : "S'inscrire"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Déjà un compte ?{" "}
        <Link to="/login" className="font-medium text-brand-green hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}