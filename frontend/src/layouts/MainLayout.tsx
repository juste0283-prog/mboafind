// Layout principal : header (navigation + thème + langue), contenu et footer.
import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import { useTheme } from "../theme/ThemeContext";
import NotificationBell from "../components/notifications/NotificationBell";
import { page } from "../styles/classes";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-green text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
  }`;
}

function ToggleButton({
  label,
  children,
  onClick,
  active,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors ${
        active
          ? "bg-brand-green text-white"
          : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className={`${page} flex min-h-screen flex-col`}>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-lg text-white shadow-sm">
              🇨🇲
            </span>
            <span className="hidden sm:inline">
              Mboa<span className="text-brand-green">Find</span>
            </span>
          </Link>

          <nav className="flex items-center gap-0.5 overflow-x-auto">
            <NavLink to="/" end className={navLinkClass}>
              {t("nav.home")}
            </NavLink>
            <NavLink to="/recherche" className={navLinkClass}>
              {t("nav.products")}
            </NavLink>
            <NavLink to="/boutiques" className={navLinkClass}>
              {t("nav.stores")}
            </NavLink>
            <NavLink to="/professionnels" className={navLinkClass}>
              {t("nav.professionals")}
            </NavLink>
            {user && user.role === "COMMERCANT" && (
              <NavLink to="/commercant" className={navLinkClass}>
                {t("nav.merchant")}
              </NavLink>
            )}
            {user && user.role === "PROFESSIONNEL" && (
              <NavLink to="/professionnel" className={navLinkClass}>
                {t("nav.pro")}
              </NavLink>
            )}
            {user && user.role === "ADMIN" && (
              <NavLink to="/admin" className={navLinkClass}>
                {t("nav.admin")}
              </NavLink>
            )}
            {user && (
              <NavLink to="/profil" className={navLinkClass}>
                {t("nav.profile")}
              </NavLink>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5">
            <ToggleButton
              label={t("nav.theme", { mode: theme === "dark" ? t("mode.light") : t("mode.dark") })}
              onClick={toggleTheme}
              active={theme === "dark"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </ToggleButton>
            <ToggleButton
              label={t("nav.lang")}
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            >
              <span className="text-xs font-bold">{lang === "fr" ? "FR" : "EN"}</span>
            </ToggleButton>

            {user && <NotificationBell />}

            {user ? (
              <>
                <span className="hidden max-w-40 truncate text-sm text-slate-500 dark:text-slate-400 md:block">
                  {user.full_name ?? user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden rounded-lg bg-brand-red px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 sm:block"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-green px-3 py-2 text-sm font-medium text-white shadow-sm hover:brightness-110"
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-6 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>🇨🇲 MboaFind — {t("app.footer")}</p>
          <p className="mt-1 text-xs">{t("app.license")}</p>
        </div>
      </footer>
    </div>
  );
}