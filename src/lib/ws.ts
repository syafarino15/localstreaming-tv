import type { RemoteKey, ServerEvent } from "./types";

export type WsStatus = "connecting" | "open" | "closed";

export interface WsClientOptions {
  baseUrl: string;
  token: string;
  onEvent: (event: ServerEvent) => void;
  onStatus: (status: WsStatus) => void;
}

export interface WsClient {
  connect: () => void;
  disconnect: () => void;
  send: (type: string, payload?: unknown) => void;
  heartbeat: (appVersion: string, state: string) => void;
  ack: (commandId: string) => void;
}

const MAX_BACKOFF_MS = 30_000;

/**
 * Reconnecting websocket client for /ws/tv.
 *
 * A ship LAN can drop for a moment when a switch reboots, so the client retries
 * with exponential backoff and never gives up. The caller keeps working from the
 * SQLite cache while the socket is down.
 */
export function createWsClient(options: WsClientOptions): WsClient {
  let socket: WebSocket | null = null;
  let closedByCaller = false;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const url = `${options.baseUrl.replace(/^http/, "ws")}/ws/tv?token=${encodeURIComponent(
    options.token,
  )}`;

  function clearTimers(): void {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (heartbeatTimer !== null) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (closedByCaller) {
      return;
    }
    attempt += 1;
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** Math.min(attempt, 5));
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  }

  function send(type: string, payload?: unknown): void {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      socket.send(JSON.stringify(payload === undefined ? { type } : { type, payload }));
    } catch {
      // A failed send means the socket is already gone; the reconnect loop
      // handles it, so there is nothing else to do here.
    }
  }

  function connect(): void {
    closedByCaller = false;
    clearTimers();
    options.onStatus("connecting");

    try {
      socket = new WebSocket(url);
    } catch {
      options.onStatus("closed");
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempt = 0;
      options.onStatus("open");
      // Presence is cheap and keeps the CMS device list accurate.
      heartbeatTimer = setInterval(() => {
        send("HEARTBEAT", { app_version: "1.0.0", state: "ONLINE" });
      }, 30_000);
    };

    socket.onmessage = (message) => {
      if (typeof message.data !== "string") {
        return;
      }
      try {
        const parsed = JSON.parse(message.data) as ServerEvent;
        if (parsed && typeof parsed.type === "string") {
          options.onEvent(parsed);
        }
      } catch {
        // Ignore frames that are not valid JSON.
      }
    };

    socket.onerror = () => {
      // onclose always follows, so the status change is handled there.
    };

    socket.onclose = () => {
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      options.onStatus("closed");
      socket = null;
      scheduleReconnect();
    };
  }

  function disconnect(): void {
    closedByCaller = true;
    clearTimers();
    if (socket) {
      try {
        socket.close();
      } catch {
        // Nothing to do: the socket is already unusable.
      }
      socket = null;
    }
    options.onStatus("closed");
  }

  return {
    connect,
    disconnect,
    send,
    heartbeat: (appVersion, state) => send("HEARTBEAT", { app_version: appVersion, state }),
    ack: (commandId) => send("ACK", { command_id: commandId }),
  };
}

/** Keys forwarded by the passenger phone to the TV. */
export const REMOTE_KEYS: RemoteKey[] = [
  "UP",
  "DOWN",
  "LEFT",
  "RIGHT",
  "OK",
  "BACK",
  "PLAY_PAUSE",
  "SEEK_FORWARD",
  "SEEK_BACK",
];
