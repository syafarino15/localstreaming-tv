import Constants from "expo-constants";

/**
 * Default API base URL.
 *
 * Precedence:
 *   1. EXPO_PUBLIC_API_BASE_URL at build time (used by CI and the emulator,
 *      which reaches the host through 10.0.2.2)
 *   2. app.json > expo.extra.apiBaseUrl
 *   3. the LAN address of the node
 *
 * The installer can still change it on the pairing screen, which is what makes
 * one APK usable across rooms and ships.
 */
const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const extraBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

export const DEFAULT_API_BASE_URL: string =
  envBaseUrl && envBaseUrl.length > 0
    ? envBaseUrl
    : (extraBaseUrl ?? "http://192.168.1.10:8080");

export const NODE_CODE: string =
  (Constants.expoConfig?.extra?.nodeCode as string | undefined) ?? "DLU-NODE-01";

/** How long a cached boot payload stays usable when the server is unreachable. */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Progress is reported to the server at this interval while playing. */
export const WATCH_LOG_INTERVAL_MS = 10_000;

/** The TV returns to the welcome screen after this much inactivity. */
export const IDLE_TIMEOUT_MS = 90_000;

/** Overscan safe area, as a fraction of the screen. */
export const OVERSCAN = 0.04;
