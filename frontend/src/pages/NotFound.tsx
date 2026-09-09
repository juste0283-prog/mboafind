// Page 404.
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";
import { btnPrimary, muted } from "../styles/classes";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl">🧭</p>
      <h1 className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-50">
        404 — {t("notfound.title")}
      </h1>
      <p className={`${muted} mt-2`}>{t("notfound.subtitle")}</p>
      <Link to="/" className={`${btnPrimary} mt-6 px-5`}>
        ← {t("notfound.home")}
      </Link>
    </div>
  );
}