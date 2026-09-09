// Composant racine : fournisseurs (thème, langue, auth) + Router + routes.
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";
import { ThemeProvider } from "./theme/ThemeContext";
import AppRoutes from "./routes";

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}