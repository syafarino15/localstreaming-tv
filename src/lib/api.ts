import type {
  Envelope,
  FieldError,
  MovieDetailView,
  PairRequest,
  PairResponse,
  RoomInfo,
  TVInitResponse,
  WatchLogPayload,
} from "./types";

/** Error carrying the structured payload returned by the Go server. */
export class ApiError extends Error {
  readonly status: number;
  readonly fields: FieldError[];

  constructor(message: string, status: number, fields: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }

  /** True when the failure is a connectivity problem rather than an API answer. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

let baseUrl = "";
let deviceToken: string | null = null;

/** Sets the node origin, e.g. http://192.168.1.10:8080 */
export function setApiBaseUrl(value: string): void {
  baseUrl = value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  return baseUrl;
}

/** Stores the long lived device credential used on every device request. */
export function setDeviceToken(value: string | null): void {
  deviceToken = value;
}

export function getDeviceToken(): string | null {
  return deviceToken;
}

/** Resolves a relative path returned by the API into an absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) {
    return "";
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${normalized}`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  device?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, device = false, timeoutMs = 15_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = (): void => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (device) {
    if (!deviceToken) {
      throw new ApiError("Perangkat belum dipasangkan.", 401);
    }
    headers["X-Device-Token"] = deviceToken;
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    const parsed: unknown = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const envelope = parsed as { message?: string; errors?: FieldError[] } | null;
      throw new ApiError(
        envelope?.message ?? `Permintaan gagal (${response.status})`,
        response.status,
        envelope?.errors ?? [],
      );
    }

    if (parsed === null) {
      return undefined as T;
    }

    // Streaming endpoints do not use the envelope, but every call here does.
    if (typeof parsed === "object" && parsed !== null && "success" in parsed) {
      const envelope = parsed as Envelope<T>;
      if (!envelope.success) {
        throw new ApiError(envelope.message, response.status);
      }
      return envelope.data;
    }

    return parsed as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("Koneksi ke server habis waktu.", 0);
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Tidak dapat menghubungi server.",
      0,
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

export const api = {
  /** Pairs this TV with the cabin that owns the code. */
  pair(payload: PairRequest): Promise<PairResponse> {
    return request<PairResponse>("/api/v1/auth/device/pair", {
      method: "POST",
      body: payload,
    });
  },

  /** Fetches the whole boot payload for this device. */
  init(deviceUid: string): Promise<TVInitResponse> {
    return request<TVInitResponse>(
      `/api/v1/tv/init?device_id=${encodeURIComponent(deviceUid)}`,
      { device: true, timeoutMs: 20_000 },
    );
  },

  /** Movie detail, including subtitle tracks. */
  movie(movieId: string): Promise<MovieDetailView> {
    return request<MovieDetailView>(`/api/v1/tv/movies/${movieId}`, { device: true });
  },

  /** Presence ping, also used when the socket cannot connect. */
  heartbeat(appVersion: string, state: string): Promise<void> {
    return request<void>("/api/v1/tv/heartbeat", {
      method: "POST",
      device: true,
      body: { app_version: appVersion, state },
      timeoutMs: 8_000,
    });
  },

  /** Persists the resume position. */
  saveWatchLog(payload: WatchLogPayload): Promise<void> {
    return request<void>("/api/v1/tv/watch-logs", {
      method: "POST",
      device: true,
      body: payload,
      timeoutMs: 8_000,
    });
  },

  /** Continue Watching list. */
  resume(): Promise<{ items: import("./types").MovieCard[] }> {
    return request<{ items: import("./types").MovieCard[] }>("/api/v1/tv/resume", {
      device: true,
    });
  },

  /** Commands queued while the TV was offline. */
  pendingCommands(): Promise<{ items: import("./types").RemoteCommandView[] }> {
    return request<{ items: import("./types").RemoteCommandView[] }>(
      "/api/v1/tv/commands",
      { device: true },
    );
  },

  /** Confirms that a command was executed. */
  ackCommand(commandId: string): Promise<void> {
    return request<void>(`/api/v1/tv/commands/${commandId}/ack`, {
      method: "POST",
      device: true,
    });
  },

  /** Room snapshot used after a websocket guest update. */
  guestSnapshot(room: RoomInfo): RoomInfo {
    return room;
  },
};

/** Fetches a subtitle file as plain text. */
export async function fetchSubtitle(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ApiError(`Subtitle tidak dapat diunduh (${response.status})`, response.status);
  }
  return response.text();
}
