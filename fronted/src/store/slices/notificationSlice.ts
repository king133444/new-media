import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: string;
  message: string;
  orderId?: string;
  applicationId?: string;
  fromUserId?: string;
  isRead: boolean;
  createdAt: string;
  event: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    addNotification(state, action: PayloadAction<any>) {
      const p = action.payload;
      const id = p.messageId || p.id || `${Date.now()}`;
      // 去重：若已存在相同 id 的通知，不重复入栈/计数
      if (state.notifications.some(n => n.id === id)) return;
      const notification: Notification = {
        id,
        type: p.event,
        message: p.message || p.content || '',
        orderId: p.orderId,
        applicationId: p.applicationId,
        fromUserId: p.fromUserId,
        isRead: false,
        createdAt: p.createdAt || new Date().toISOString(),
        event: p.event,
      };
      state.notifications.unshift(notification);
      state.unreadCount++;
    },
    markAsRead(state, action: PayloadAction<string>) {
      const idx = state.notifications.findIndex(n => n.id === action.payload);
      if (idx !== -1 && !state.notifications[idx].isRead) {
        state.notifications[idx].isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead(state) {
      state.notifications.forEach(n => { n.isRead = true; });
      state.unreadCount = 0;
    },
    clearApplicationNotificationsByOrderId(state, action: PayloadAction<string>) {
      const orderId = action.payload;
      state.notifications = state.notifications.filter(n => !(n.event === 'order.application.created' && n.orderId === orderId));
      state.unreadCount = state.notifications.filter(n => !n.isRead).length;
    },
  },
});

export const { addNotification, markAsRead, markAllAsRead, clearApplicationNotificationsByOrderId } = notificationSlice.actions;
export default notificationSlice.reducer;