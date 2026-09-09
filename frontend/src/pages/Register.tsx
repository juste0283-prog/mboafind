// Page d'inscription : création de compte puis redirection vers /login.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import type { UserRole } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { btnPrimary, input, label, heading, muted, notice as noticeCls } from "../styles/classes";

export default function Register() {
  const { register, isLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("CLIENT");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
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
      setCreated(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const ROLES: { value: UserRole; label: string }[] = [
    { value: "CLIENT", label: t("auth.roles.client") },
    { value: "COMMERCANT", label: t("auth.roles.merchant") },
    { value: "PROFESSIONNEL", label: t("auth.roles.pro") },
  ];

  useEffect(() => {
    if (created) {
      navigate("/login", { state: { registered: true } });
    }
  }, [created, navigate]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <h1 className={`${heading} text-2xl`}>{t("auth.registerTitle")}</h1>
      <p className={`${muted} mt-1 text-sm`}>{t("auth.welcome")}</p>

      {created && (
        <div className={`${noticeCls.success} mt-4`} role="status">
          {t("auth.registrationDone")}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {error && <ErrorMessage message={error} />}

        <div>
          <label htmlFor="fullName" className={label}>
            {t("auth.fullName")}{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              ({t("common.optional")})
            </span>
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={input}
          />
        </div>

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
          <label htmlFor="phone" className={label}>
            {t("auth.phone")}{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              ({t("common.optional")})
            </span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t("auth.phonePlaceholder")}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="role" className={label}>
            {t("auth.youAre")}
          </label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className={input}
          >
            {ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="password" className={label}>
            {t("auth.password")}{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">
              ({t("auth.passwordMin")})
            </span>
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={input}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className={label}>
            {t("auth.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={input}
          />
        </div>

        <button type="submit" disabled={isLoading} className={`${btnPrimary} w-full py-2.5`}>
          {isLoading ? t("auth.creating") : t("auth.register")}
        </button>
      </form>

      <p className={`${muted} mt-4 text-center text-sm`}>
        {t("auth.haveAccount")}{" "}
        <Link to="/login" className="font-medium text-brand-green hover:underline">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}