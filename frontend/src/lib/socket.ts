"use client";

import { io, type Socket } from "socket.io-client";

let _socket: Socket | null = null;

function baseFromApi(apiUrl: string) {
  // default env is like: http://localhost:3001/api
  return apiUrl.replace(/\/?api\/?$/, "");
}

export function getSocket(apiUrl: string) {
  if (_socket) return _socket;

  const base = baseFromApi(apiUrl);

  _socket = io(base, {
    withCredentials: true,
    // let Socket.IO pick best transport; websocket preferred when available
    transports: ["websocket", "polling"],
  });

  return _socket;
}

export function disconnectSocket() {
  if (!_socket) return;
  _socket.disconnect();
  _socket = null;
}
