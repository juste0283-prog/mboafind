// Page « Notifications » : historique complet, marquage lu et suppression.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Spinner from "../components/common/Spinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { useAuth } from "../hooks/useAuth";
import { useI18n } from "../i18n/I18nContext";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications";
import {
  btnPrimary,
  card,
  muted,
  heading,
} from "../styles/classes";
import type { Notification } from "../types";
import { getApiErrorMessage } from "../utils/apiError";

function relativeTime(value: string, lang: string): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return lang === "fr" ? "à l'instant" : "just now";
  if (minutes < 60) return lang === "fr" ? `il y a ${minutes} min` : `${minutes} min ago`;
  return lang === "fr" ? new Date(value).toLocaleString("fr-FR") : new Date(value).toLocaleString("en-US");
}

export default function Notifications() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listNotifications(1, 50);
      setItems(result.items);
      setTotal(result.total);
      setUnread(result.unread);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return null;

  const handleRead = async (item: Notification) => {
    if (item.is_read) return;
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
    setUnread((value) => Math.max(0, value - 1));
    try {
      await markNotificationRead(item.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleDelete = async (item: Notification) => {
    if (!window.confirm(t("notifications.deleteConfirm"))) return;
    try {
      await deleteNotification(item.id);
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      setTotal((value) => Math.max(0, value - 1));
      if (!item.is_read) setUnread((value) => Math.max(0, value - 1));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const openItem = (item: Notification) => {
    const productId = item.data?.product_id;
    if (productId != null) {
      navigate(`/produits/${productId}`);
    } else if (item.type === "service_request_received") {
      navigate("/professionnel");
    } else if (
      item.type === "request_accepted" ||
      item.type === "request_declined" ||
      item.type === "request_in_progress" ||
      item.type === "request_completed"
    ) {
      navigate("/profil");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/" className={`${muted} text-sm hover:underline`}>
        ← {t("common.back")}
      </Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h1 className={`${heading} text-2xl`}>{t("notifications.bell")}</h1>
          <p className={`${muted} mt-1 text-sm`}>
            {unread > 0
              ? t("notifications.unreadCount", { count: unread })
              : t("notifications.allRead")}
          </p>
        </div>
        {unread > 0 && (
          <button type="button" onClick={handleMarkAllRead} className={btnPrimary}>
            {t("notifications.markAllRead")}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}
      {loading ? (
        <div className="mt-10 flex justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className={`${card} mt-6 p-8 text-center`}>
          <p className={`${muted} text-sm`}>{t("notifications.empty")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`${card} flex items-start gap-3 px-4 py-3 ${
                item.is_read ? "opacity-70" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => handleRead(item)}
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                title={t("notifications.read")}
              >
                {!item.is_read && <span className="block h-2 w-2 rounded-full bg-brand-green" />}
              </button>
              <button type="button" onClick={() => openItem(item)} className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">
                  {item.title}
                </span>
                <span className={`${muted} mt-0.5 block text-xs leading-relaxed`}>
                  {item.message}
                </span>
                <span className={`${muted} mt-1 block text-[11px]`}>
                  {relativeTime(item.created_at, lang)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="shrink-0 text-sm text-brand-red hover:underline"
                title={t("notifications.delete")}
              >
                {t("notifications.delete")}
              </button>
            </div>
          ))}
          {total > items.length && (
            <p className={`${muted} pt-2 text-center text-xs`}>
              {t("notifications.truncated", { shown: items.length, total })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}