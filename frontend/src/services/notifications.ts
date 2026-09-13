// Appels API : notifications in-app (cloche + page dédiée).
import type { Notification, NotificationListResult } from "../types";
import { api } from "./api";

export async function listNotifications(
  page = 1,
  pageSize = 20,
): Promise<NotificationListResult> {
  const { data } = await api.get<NotificationListResult>("/notifications", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>(
    "/notifications/unread-count",
  );
  return data.count;
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const { data } = await api.post<Notification>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await api.post<{ count: number }>(
    "/notifications/read-all",
  );
  return data.count;
}

export async function deleteNotification(id: number): Promise<void> {
  await api.delete(`/notifications/${id}`);
}