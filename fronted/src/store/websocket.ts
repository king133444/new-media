// WebSocket 客户端工具（socket.io），负责连接、重连、事件分发
import { store } from './index';
// 使用 socket.io-client 与后端 /ws 命名空间通信（需置于文件顶部以通过 lint）
import { io, Socket } from 'socket.io-client';
// 动态导入 notificationSlice 的 action，避免类型声明问题
let addNotification: any;
try {
  addNotification = require('./slices/notificationSlice').addNotification;
} catch (e) {
  addNotification = () => ({ type: 'notification/addNotification', payload: {} });
}
const WS_HTTP_URL = process.env.REACT_APP_WS_HTTP_URL || 'http://localhost:3000/ws';
let socket: Socket | null = null;
let lastToken: string | null = null;
type PendingListener = { event: string; handler: (payload: any) => void };
const pendingListeners: PendingListener[] = [];
let isConnecting = false;
const recentEventKeys = new Set<string>();
function extractDedupeId(payload: any) {
  if (!payload) return undefined;
  return (
    payload.messageId ||
    payload.applicationId ||
    payload.id ||
    payload.receiverId ||
    payload.fromUserId
  );
}
function shouldProcess(event: string, payload: any) {
  const id = extractDedupeId(payload) || Math.random().toString(36);
  const key = `${event}:${id}`;
  if (recentEventKeys.has(key)) return false;
  recentEventKeys.add(key);
  setTimeout(() => recentEventKeys.delete(key), 2000);
  return true;
}

export function connectWebSocket(token: string) {
  // 已连接且 token 未变化，直接复用，避免无谓的断开/重连
  if ((socket && (socket as any).connected && lastToken === token) || (isConnecting && lastToken === token)) {
    return;
  }

  if (socket) {
    try { socket.off('order.application.created'); } catch {}
    try { socket.off('order.application.accepted'); } catch {}
    try { socket.off('communication.message'); } catch {}
    try { socket.off('communication.message.sent'); } catch {}
    try { socket.off('online.changed'); } catch {}
    socket.disconnect();
    socket = null;
  }

  isConnecting = true;
  socket = io(WS_HTTP_URL, {
    withCredentials: true,
    transports: ['websocket'],
    auth: {
      token,
    },
  });
  lastToken = token;

  socket.on('connect', () => {
    console.log('WebSocket connected');
    isConnecting = false;
    // 绑定所有等待中的监听器
    if (pendingListeners.length) {
      pendingListeners.forEach(({ event, handler }) => socket?.on(event, handler));
      pendingListeners.splice(0, pendingListeners.length);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('WebSocket connect_error', err?.message || err);
    isConnecting = false;
  });

  // 后端通过 event 名称直接发送，如 "order.application.created"、"order.application.accepted"、"communication.message"
  const handleEvent = (event: string) => (payload: any) => {
    console.log('[WS<-]', event, payload);
    if (!shouldProcess(event, payload)) return;
    // 只对需要提醒的事件入通知中心
    const notifyEvents = new Set([
      'order.application.created',
      'order.application.accepted',
      'order.deliverables.submitted',
      'order.payout.released',
      'reviews.cta',
      'communication.message',
    ]);
    if (!notifyEvents.has(event)) return;
    store.dispatch(addNotification({ event, ...payload }));
  };

  socket.on('order.application.created', handleEvent('order.application.created'));
  socket.on('order.application.accepted', handleEvent('order.application.accepted'));
  socket.on('order.deliverables.submitted', handleEvent('order.deliverables.submitted'));
  socket.on('order.payout.released', handleEvent('order.payout.released'));
  socket.on('reviews.cta', handleEvent('reviews.cta'));
  socket.on('communication.message', handleEvent('communication.message'));
  socket.on('communication.message.sent', (payload: any) => {
    console.log('[WS<-]', 'communication.message.sent', payload);
    // 发送者确认不进入通知中心（避免铃铛噪音），但保留去重
    if (!shouldProcess('communication.message.sent', payload)) return;
  });
  // 批量补推离线通知
  socket.on('notifications.bulk', (bulk: any) => {
    console.log('[WS<-]', 'notifications.bulk', bulk);
    const apps = bulk?.applications || [];
    const msgs = bulk?.messages || [];
    apps.forEach((a: any) => {
      if (shouldProcess('order.application.created', a)) {
        store.dispatch(addNotification({ event: 'order.application.created', ...a }));
      }
    });
    msgs.forEach((m: any) => {
      if (shouldProcess('communication.message', m)) {
        store.dispatch(addNotification({ event: 'communication.message', ...m }));
      }
    });
  });
  // 不投递到通知中心，仅用于页面实时在线状态
  socket.on('online.changed', (payload: any) => {
    console.log('[WS<-]', 'online.changed', payload);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
  });
}

export function disconnectWebSocket() {
  if (socket) {
    socket.off('order.application.created');
    socket.off('order.application.accepted');
    socket.off('communication.message');
    socket.off('communication.message.sent');
    socket.off('online.changed');
    socket.disconnect();
    socket = null;
  }
}

// 供页面复用的事件接口，避免重复创建连接
export function wsOn(event: string, handler: (payload: any) => void) {
  if (socket) socket.on(event, handler);
  else pendingListeners.push({ event, handler });
}

export function wsOff(event: string, handler?: (payload: any) => void) {
  if (!socket) return;
  if (handler) socket.off(event, handler);
  else socket.off(event);
  // 同时从 pending 中移除
  if (!handler) {
    for (let i = pendingListeners.length - 1; i >= 0; i--) {
      if (pendingListeners[i].event === event) pendingListeners.splice(i, 1);
    }
  } else {
    const idx = pendingListeners.findIndex(pl => pl.event === event && pl.handler === handler);
    if (idx >= 0) pendingListeners.splice(idx, 1);
  }
}

export function wsEmit(event: string, payload?: any) {
  socket?.emit(event, payload);
}