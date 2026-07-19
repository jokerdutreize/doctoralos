import { apiFetch } from './client'
import type { AppNotification, NotificationList } from '../types'

export const notificationsApi = {
  list(unreadOnly = false): Promise<NotificationList> {
    return apiFetch(`/notifications/${unreadOnly ? '?unread_only=1' : ''}`)
  },

  markRead(id: number): Promise<AppNotification> {
    return apiFetch(`/notifications/${id}/read/`, { method: 'PATCH' })
  },

  markAllRead(): Promise<{ detail: string }> {
    return apiFetch('/notifications/read-all/', { method: 'POST' })
  },
}
