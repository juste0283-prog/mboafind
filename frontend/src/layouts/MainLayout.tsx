// Layout principal : header de navigation, contenu (Outlet) et footer.
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-green text-white" : "text-gray-700 hover:bg-gray-100"
  }`;
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <span className="text-2xl">🇨🇲</span>
            <span>
              Mboa<span className="text-brand-green">Find</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Accueil
            </NavLink>
            {user && (
              <NavLink to="/profil" className={navLinkClass}>
                Mon profil
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-40 truncate text-sm text-gray-600 sm:block">
                  {user.full_name ?? user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md bg-brand-red px-3 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-brand-green px-3 py-2 text-sm font-medium text-white hover:brightness-110"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          <p>🇨🇲 MboaFind — comparateur de prix open source pour le Cameroun.</p>
          <p className="mt-1">React + FastAPI · Licence MIT</p>
        </div>
      </footer>
    </div>
  );
}