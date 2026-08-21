import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { config } from '../config/index.js';

export const SOCKET_EVENTS = {
  STOCK_UPDATE: 'stock:update',
  RESERVATION_EXPIRED: 'reservation:expired',
  DROP_CREATED: 'drop:created',
  ACTIVITY_FEED_UPDATE: 'activity:update',
} as const;

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Clients can join a room per drop to keep payloads scoped, but we also
    // broadcast globally since the dashboard shows every drop at once.
    socket.on('drop:subscribe', (dropId: string) => {
      socket.join(`drop:${dropId}`);
    });

    socket.on('drop:unsubscribe', (dropId: string) => {
      socket.leave(`drop:${dropId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket() first.');
  }
  return io;
};

// ---- Typed emit helpers ----

export const emitStockUpdate = (payload: {
  dropId: string;
  availableStock: number;
  totalStock: number;
  soldCount: number;
}) => {
  if (!io) return;
  io.emit(SOCKET_EVENTS.STOCK_UPDATE, payload);
};

export const emitReservationExpired = (payload: {
  dropId: string;
  reservationId: string;
  availableStock: number;
}) => {
  if (!io) return;
  io.emit(SOCKET_EVENTS.RESERVATION_EXPIRED, payload);
};

export const emitDropCreated = (payload: unknown) => {
  if (!io) return;
  io.emit(SOCKET_EVENTS.DROP_CREATED, payload);
};

export const emitActivityFeedUpdate = (payload: {
  dropId: string;
  latestPurchasers: Array<{ username: string; purchasedAt: Date }>;
}) => {
  if (!io) return;
  io.emit(SOCKET_EVENTS.ACTIVITY_FEED_UPDATE, payload);
};
