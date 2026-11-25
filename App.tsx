import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";

import { api, ApiError, setApiBaseUrl, setDeviceToken } from "./src/lib/api";
import { CACHE_TTL_MS, DEFAULT_API_BASE_URL } from "./src/lib/config";
import { cache, secure } from "./src/lib/storage";
import type {
  MovieCard,
  MovieDetailView,
  RemoteKey,
  RoomGuestUpdate,
  ServerEvent,
  TVInitResponse,
} from "./src/lib/types";
import { createWsClient, type WsClient, type WsStatus } from "./src/lib/ws";
import { colors } from "./src/theme/tokens";
import { StatusScreen } from "./src/components/StatusScreen";
import { PairingScreen } from "./src/screens/PairingScreen";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { CatalogScreen } from "./src/screens/CatalogScreen";
import { DetailScreen } from "./src/screens/DetailScreen";
import { PlayerScreen } from "./src/screens/PlayerScreen";

type Route =
  | { name: "boot" }
  | { name: "pairing" }
  | { name: "welcome" }
  | { name: "catalog" }
  | { name: "detail"; movie: MovieCard }
  | { name: "player"; movie: MovieCard; detail: MovieDetailView | null; startSeconds: number }
  | { name: "error"; message: string };

interface GuestOverride {
  greeting: string;
  guestName: string;
  guestSalutation: string;
}

/**
 * Application shell.
 *
 * Navigation is an explicit state machine rather than a navigator so D-Pad focus
 * is predictable and BACK always has a defined destination.
 */
export default function App(): React.ReactElement {
  useKeepAwake();

  const [route, setRoute] = useState<Route>({ name: "boot" });
  const [init, setInit] = useState<TVInitResponse | null>(null);
  const [resume, setResume] = useState<MovieCard[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>("closed");
  const [offline, setOffline] = useState(false);
  const [detail, setDetail] = useState<MovieDetailView | null>(null);
  const [remoteKey, setRemoteKey] = useState<RemoteKey | null>(null);
  const [remoteKeyNonce, setRemoteKeyNonce] = useState(0);
  const [guest, setGuest] = useState<GuestOverride | null>(null);
  const [apiBaseUrl, setApiBaseUrlState] = useState(DEFAULT_API_BASE_URL);

  const wsRef = useRef<WsClient | null>(null);
  const deviceUidRef = useRef<string | null>(null);
  const bootedRef = useRef(false);

  // --- bootstrap -----------------------------------------------------------
  const boot = useCallback(async (): Promise<void> => {
    const storedBase = (await secure.getApiBaseUrl()) ?? DEFAULT_API_BASE_URL;
    setApiBaseUrl(storedBase);
    setApiBaseUrlState(storedBase);

    const token = await secure.getDeviceToken();
    const uid = await secure.getDeviceUid();

    if (!token || !uid) {
      setRoute({ name: "pairing" });
      return;
    }

    setDeviceToken(token);
    deviceUidRef.current = uid;

    await loadInit(uid, true);
  }, []);

  const loadInit = useCallback(async (uid: string, allowCache: boolean): Promise<void> => {
    try {
      const payload = await api.init(uid);
      setInit(payload);
      setOffline(false);
      setGuest(null);
      await cache.saveInit(payload);
      void loadResume();
      setRoute((current) =>
        current.name === "catalog" || current.name === "detail" || current.name === "player"
          ? current
          : { name: "welcome" },
      );
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;

      if (apiError && (apiError.status === 401 || apiError.status === 403)) {
        await secure.clearDeviceToken();
        setDeviceToken(null);
        setRoute({ name: "pairing" });
        return;
      }

      if (allowCache) {
        const cached = await cache.loadInit();
        if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
          setInit(cached.payload);
          setOffline(true);
          setRoute({ name: "welcome" });
          return;
        }
      }

      setRoute({
        name: "error",
        message:
          apiError?.message ??
          "Server kapal tidak dapat dihubungi. Periksa kabel LAN dan alamat server.",
      });
    }
  }, []);

  const loadResume = useCallback(async (): Promise<void> => {
    try {
      const result = await api.resume();
      setResume(result.items);
    } catch {
      setResume([]);
    }
  }, []);

  useEffect(() => {
    if (bootedRef.current) {
      return;
    }
    bootedRef.current = true;
    void boot();
  }, [boot]);

  // --- websocket -----------------------------------------------------------
  const handleEvent = useCallback(
    (event: ServerEvent): void => {
      switch (event.type) {
        case "ROOM_GUEST_UPDATED": {
          const payload = event.payload as RoomGuestUpdate;
          setGuest({
            greeting: payload.greeting,
            guestName: payload.guest_name,
            guestSalutation: payload.guest_salutation,
          });
          break;
        }
        case "REFRESH_CONFIG":
        case "CONTENT_UPDATED": {
          const uid = deviceUidRef.current;
          if (uid) {
            void loadInit(uid, false);
          }
          break;
        }
        case "ANNOUNCEMENT": {
          setInit((current) => {
            if (!current) {
              return current;
            }
            const payload = event.payload as { id?: string; deleted?: boolean; message?: string; severity?: string };
            if (payload.deleted && payload.id) {
              return {
                ...current,
                announcements: current.announcements.filter((item) => item.id !== payload.id),
              };
            }
            if (payload.id && payload.message) {
              const severity = (payload.severity ?? "INFO") as "INFO" | "WARNING" | "EMERGENCY";
              const next = current.announcements.filter((item) => item.id !== payload.id);
              return {
                ...current,
                announcements: [
                  { id: payload.id, message: payload.message, severity },
                  ...next,
                ],
              };
            }
            return current;
          });
          break;
        }
        case "KEY": {
          setRemoteKey(event.payload.key);
          setRemoteKeyNonce((value) => value + 1);
          break;
        }
        case "COMMAND": {
          const command = event.payload.command;
          if (command === "RESTART_APP") {
            setRoute({ name: "boot" });
            const uid = deviceUidRef.current;
            if (uid) {
              void loadInit(uid, false);
            }
          } else if (command === "REFRESH_CONFIG" || command === "RELOAD_CATALOG") {
            const uid = deviceUidRef.current;
            if (uid) {
              void loadInit(uid, false);
            }
          }
          wsRef.current?.ack(event.payload.id);
          break;
        }
        default:
          break;
      }
    },
    [loadInit],
  );

  useEffect(() => {
    const token = deviceUidRef.current ? undefined : null;
    void (async () => {
      const storedToken = await secure.getDeviceToken();
      if (!storedToken || token === null) {
        return;
      }
      const client = createWsClient({
        baseUrl: apiBaseUrl,
        token: storedToken,
        onEvent: handleEvent,
        onStatus: (status) => {
          setWsStatus(status);
          if (status === "open") {
            setOffline(false);
          }
        },
      });
      wsRef.current = client;
      client.connect();
    })();

    return () => {
      wsRef.current?.disconnect();
      wsRef.current = null;
    };
  }, [apiBaseUrl, handleEvent]);

  // --- navigation ----------------------------------------------------------
  const enterCatalog = useCallback((): void => {
    void loadResume();
    setRoute({ name: "catalog" });
  }, [loadResume]);

  const openDetail = useCallback(async (movie: MovieCard): Promise<void> => {
    setRoute({ name: "detail", movie });
    setDetail(null);
    try {
      const result = await api.movie(movie.id);
      setDetail(result);
    } catch {
      // The detail screen still renders from the card data.
    }
  }, []);

  const startPlayback = useCallback(
    (movie: MovieCard, startSeconds: number): void => {
      setRoute({ name: "player", movie, detail, startSeconds });
    },
    [detail],
  );

  const exitPlayer = useCallback((): void => {
    setRoute((current) => {
      if (current.name === "player") {
        return { name: "detail", movie: current.movie };
      }
      return { name: "catalog" };
    });
    void loadResume();
  }, [loadResume]);

  const goBack = useCallback((): void => {
    setRoute((current) => {
      switch (current.name) {
        case "detail":
          return { name: "catalog" };
        case "catalog":
          return { name: "welcome" };
        case "welcome":
          return current;
        default:
          return current;
      }
    });
  }, []);

  // --- render --------------------------------------------------------------
  const effectiveInit: TVInitResponse | null = init
    ? guest && init.room
      ? {
          ...init,
          room: {
            ...init.room,
            greeting: guest.greeting,
            guest_name: guest.guestName,
            guest_salutation: guest.guestSalutation,
          },
        }
      : init
    : null;

  switch (route.name) {
    case "boot":
      return (
        <View style={styles.fill}>
          <StatusScreen
            title="Menyiapkan hiburan"
            message="Menghubungkan ke server kapal dan memuat katalog film."
            loading
          />
        </View>
      );

    case "pairing":
      return (
        <PairingScreen
          initialBaseUrl={apiBaseUrl}
          onPaired={() => {
            void boot();
          }}
        />
      );

    case "error":
      return (
        <View style={styles.fill}>
          <StatusScreen
            title="Tidak dapat terhubung"
            message={route.message}
            actionLabel="Coba Lagi"
            onAction={() => {
              setRoute({ name: "boot" });
              const uid = deviceUidRef.current;
              if (uid) {
                void loadInit(uid, true);
              } else {
                void boot();
              }
            }}
          />
        </View>
      );

    case "welcome":
      if (!effectiveInit) {
        return (
          <View style={styles.fill}>
            <StatusScreen title="Data belum tersedia" message="Memuat ulang konfigurasi." loading />
          </View>
        );
      }
      return (
        <WelcomeScreen
          init={effectiveInit}
          wsStatus={wsStatus}
          offline={offline}
          onEnter={enterCatalog}
        />
      );

    case "catalog":
      if (!effectiveInit) {
        return (
          <View style={styles.fill}>
            <StatusScreen title="Data belum tersedia" message="Memuat ulang konfigurasi." loading />
          </View>
        );
      }
      return (
        <CatalogScreen
          init={effectiveInit}
          resume={resume}
          synopsis={detail?.synopsis}
          onSelect={(movie) => {
            void openDetail(movie);
          }}
        />
      );

    case "detail":
      return (
        <DetailScreen
          movie={route.movie}
          accentColor={
            effectiveInit?.layout_config.welcome_screen.accent_color ?? colors.accent
          }
          onPlay={startPlayback}
          onBack={goBack}
        />
      );

    case "player":
      return (
        <PlayerScreen
          movie={route.movie}
          detail={route.detail ?? detail}
          startSeconds={route.startSeconds}
          onExit={exitPlayer}
          remoteKey={remoteKey}
          remoteKeyNonce={remoteKeyNonce}
        />
      );

    default:
      return (
        <View style={styles.fill}>
          <StatusScreen
            title="Halaman tidak dikenal"
            message="Kembali ke layar utama."
            actionLabel="Kembali"
            onAction={() => setRoute({ name: "welcome" })}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
