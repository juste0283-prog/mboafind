// Cloche de notifications : badge non-lu + panneau dépliant + polling.
// Polling du compteur non-lu toutes les 30 s ; la liste est rechargée
// à chaque ouverture du panneau.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useI18n } from "../../i18n/I18nContext";
import { badge, card, muted } from "../../styles/classes";
import type { Notification } from "../../types";
import {
  fetchUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notifications";

const POLL_INTERVAL_MS = 30_000;

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function relativeTime(value: string, lang: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return lang === "fr" ? "à l'instant" : "just now";
  if (minutes < 60) return lang === "fr" ? `il y a ${minutes} min` : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "fr" ? `il y a ${hours} h` : `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return lang === "fr" ? `il y a ${days} j` : `${days} days ago`;
}

function targetRoute(item: Notification): string {
  const productId = item.data?.product_id;
  if (productId != null) return `/produits/${productId}`;
  return "/profil";
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await fetchUnreadCount());
    } catch {
      // Réseau hors-ligne : on garde l'ancien compteur.
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      setOpen(false);
      return;
    }
    refreshCount();
    const timer = window.setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [user, refreshCount]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBusy(true);
    listNotifications(1, 20)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setUnread(result.unread);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) return null;

  const handleItemClick = async (item: Notification) => {
    if (!item.is_read) {
      setUnread((value) => Math.max(0, value - 1));
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
      markNotificationRead(item.id).catch(() => undefined);
    }
    if (item.type === "service_request_received") {
      navigate("/professionnel");
    } else if (
      item.type === "request_accepted" ||
      item.type === "request_declined" ||
      item.type === "request_in_progress" ||
      item.type === "request_completed"
    ) {
      navigate("/profil");
    } else {
      navigate(targetRoute(item));
    }
    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    setBusy(true);
    try {
      const done = await markAllNotificationsRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (done === 0) setItems([]);
    } catch {
      // Silencieux : le prochain polling resynchronisera.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("notifications.bell")}
        title={t("notifications.bell")}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-base transition-colors ${
          open
            ? "bg-brand-green text-white"
            : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        }`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-red px-1 text-[10px] font-bold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`${card} absolute right-0 z-30 mt-2 w-80 overflow-hidden sm:w-96`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t("notifications.bell")}
              {unread > 0 && (
                <span className={`${badge.red} ml-2`}>
                  {t("notifications.unread", { count: unread })}
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-brand-green hover:underline disabled:opacity-50"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {busy && items.length === 0 ? (
              <p className={`${muted} px-4 py-8 text-center text-sm`}>
                {t("common.loading")}
              </p>
            ) : items.length === 0 ? (
              <p className={`${muted} px-4 py-8 text-center text-sm`}>
                {t("notifications.empty")}
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      item.is_read ? "bg-transparent" : "bg-brand-green"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-50">
                      {item.title}
                    </span>
                    <span className={`${muted} mt-0.5 block text-xs leading-relaxed`}>
                      {item.message}
                    </span>
                    <span className={`${muted} mt-1 block text-[11px]`}>
                      {relativeTime(item.created_at, lang)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-slate-200 px-4 py-2.5 text-center text-xs font-medium text-brand-green hover:underline dark:border-slate-700"
          >
            {t("notifications.viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
}