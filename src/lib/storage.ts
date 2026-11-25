import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";

import type { TVInitResponse } from "./types";

const KEY_DEVICE_TOKEN = "stayin.device_token";
const KEY_DEVICE_UID = "stayin.device_uid";
const KEY_API_BASE = "stayin.api_base_url";
const KEY_DEVICE_MODEL = "stayin.device_model";

/**
 * Device identity and credentials.
 *
 * The token lives in SecureStore (hardware backed where available) and is never
 * written to the plain SQLite cache.
 */
export const secure = {
  async getDeviceToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_DEVICE_TOKEN);
    } catch {
      return null;
    }
  },

  async setDeviceToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_DEVICE_TOKEN, token);
  },

  async clearDeviceToken(): Promise<void> {
    await SecureStore.deleteItemAsync(KEY_DEVICE_TOKEN).catch(() => undefined);
  },

  async getDeviceUid(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_DEVICE_UID);
    } catch {
      return null;
    }
  },

  async setDeviceUid(uid: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_DEVICE_UID, uid);
  },

  async getApiBaseUrl(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_API_BASE);
    } catch {
      return null;
    }
  },

  async setApiBaseUrl(url: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_API_BASE, url);
  },

  async getDeviceModel(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(KEY_DEVICE_MODEL);
    } catch {
      return null;
    }
  },

  async setDeviceModel(model: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_DEVICE_MODEL, model);
  },
};

let database: SQLite.SQLiteDatabase | null = null;

async function db(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }
  database = await SQLite.openDatabaseAsync("stayin-tv.db");
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS resume (
      movie_id         TEXT PRIMARY KEY NOT NULL,
      position_seconds INTEGER NOT NULL,
      duration_seconds INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );
  `);
  return database;
}

/**
 * Local cache.
 *
 * The last successful boot payload is kept so a TV that cannot reach the server
 * still renders the welcome screen and the catalog instead of a blank page.
 */
export const cache = {
  async saveInit(payload: TVInitResponse): Promise<void> {
    const handle = await db();
    await handle.runAsync(
      `INSERT INTO kv (key, value, updated_at) VALUES ('init', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(payload), Date.now()],
    );
  },

  async loadInit(): Promise<{ payload: TVInitResponse; updatedAt: number } | null> {
    const handle = await db();
    const row = await handle.getFirstAsync<{ value: string; updated_at: number }>(
      `SELECT value, updated_at FROM kv WHERE key = 'init'`,
    );
    if (!row) {
      return null;
    }
    try {
      return { payload: JSON.parse(row.value) as TVInitResponse, updatedAt: row.updated_at };
    } catch {
      return null;
    }
  },

  async clearInit(): Promise<void> {
    const handle = await db();
    await handle.runAsync(`DELETE FROM kv WHERE key = 'init'`);
  },

  async saveResume(movieId: string, position: number, duration: number): Promise<void> {
    const handle = await db();
    await handle.runAsync(
      `INSERT INTO resume (movie_id, position_seconds, duration_seconds, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(movie_id) DO UPDATE SET
         position_seconds = excluded.position_seconds,
         duration_seconds = excluded.duration_seconds,
         updated_at = excluded.updated_at`,
      [movieId, Math.floor(position), Math.floor(duration), Date.now()],
    );
  },

  async getResume(movieId: string): Promise<number> {
    const handle = await db();
    const row = await handle.getFirstAsync<{ position_seconds: number }>(
      `SELECT position_seconds FROM resume WHERE movie_id = ?`,
      [movieId],
    );
    return row?.position_seconds ?? 0;
  },

  async clearResume(movieId: string): Promise<void> {
    const handle = await db();
    await handle.runAsync(`DELETE FROM resume WHERE movie_id = ?`, [movieId]);
  },
};
