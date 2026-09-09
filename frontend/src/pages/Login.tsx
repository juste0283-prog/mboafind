// Page de connexion : formulaire email / mot de passe → login JWT.
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import { getApiErrorMessage } from "../utils/apiError";
import { btnPrimary, input, label, heading, muted, notice as noticeCls } from "../styles/classes";

export default function Login() {
  const { login, isLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { from?: string; registered?: boolean } | null;
  const from = state?.from ?? "/profil";
  const notice = state?.registered ? t("auth.registrationDone") : null;

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
      <h1 className={`${heading} text-2xl`}>{t("auth.signInTitle")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("auth.loginSubtitle")}</p>

      {notice && (
        <div className={`${noticeCls.success} mt-4`} role="status">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="email" className={label}>
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="password" className={label}>
            {t("auth.password")}
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={input}
          />
        </div>

        <button type="submit" disabled={isLoading} className={`${btnPrimary} w-full py-2.5`}>
          {isLoading ? t("auth.logging") : t("auth.login")}
        </button>
      </form>

      <p className={`${muted} mt-4 text-center text-sm`}>
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="font-medium text-brand-green hover:underline">
          {t("auth.register")}
        </Link>
      </p>
    </div>
  );
}