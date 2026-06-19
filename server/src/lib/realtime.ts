/**
 * Realtime layer (socket.io). Clients join a per-restaurant room and the order
 * service calls `emitOrderCreated` / `emitOrderUpdated` to push live updates —
 * this replaces the prototype's BroadcastChannel with true cross-device sync.
 */
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import {
  SOCKET_EVENTS,
  restaurantRoom,
  type ClientToServerEvents,
  type OrderDTO,
  type ServerToClientEvents,
} from '@orderlink/shared';
import { env } from '../config/env.js';
import { logger } from './logger.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;

let io: IO | null = null;

export function initRealtime(httpServer: HttpServer): IO {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on(SOCKET_EVENTS.JOIN_RESTAURANT, (restaurantId) => {
      if (typeof restaurantId === 'string' && restaurantId.length > 0) {
        void socket.join(restaurantRoom(restaurantId));
      }
    });
  });

  logger.info('Realtime (socket.io) ready');
  return io;
}

export function emitOrderCreated(order: OrderDTO): void {
  io?.to(restaurantRoom(order.restaurantId)).emit(SOCKET_EVENTS.ORDER_CREATED, order);
}

export function emitOrderUpdated(order: OrderDTO): void {
  io?.to(restaurantRoom(order.restaurantId)).emit(SOCKET_EVENTS.ORDER_UPDATED, order);
}
