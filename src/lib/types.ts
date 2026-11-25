/**
 * API contract types.
 *
 * These mirror Backend/docs/openapi.yaml. `npm run gen:api` can regenerate a
 * declaration file into src/types/api.d.ts for CI, but the hand written types
 * here stay authoritative for the app model so a generator change never breaks
 * a running TV.
 */

export type LayoutVariant = "SPLIT_LEFT_CARD" | "FULLSCREEN_CENTER" | "BOTTOM_OVERLAY";
export type DisplayStyle = "LANDSCAPE_CARD" | "POSTER_PORTRAIT";
export type AnnouncementSeverity = "INFO" | "WARNING" | "EMERGENCY";
export type MovieSource = "FLASHDISK" | "SERVER" | "USB";

export interface FieldError {
  field: string;
  message: string;
}

export interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface WelcomeScreen {
  enabled: boolean;
  layout_variant: LayoutVariant;
  background_image_url: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  cta_button_text: string;
  default_greeting: string;
}

export interface CatalogRow {
  genre: string;
  display_style: DisplayStyle;
}

export interface CatalogLayout {
  show_hero_banner: boolean;
  featured_movie_id: string;
  rows_order: CatalogRow[];
}

export interface LayoutConfig {
  tenant_id: string;
  app_title: string;
  welcome_screen: WelcomeScreen;
  catalog_layout: CatalogLayout;
}

export interface RoomInfo {
  room_number: string;
  deck: string;
  room_type: "STANDARD" | "EXCLUSIVE" | "VIP";
  is_exclusive: boolean;
  guest_name: string;
  guest_salutation: string;
  guest_checkin_at: string | null;
  guest_checkout_at: string | null;
  greeting: string;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  branding: Record<string, unknown>;
  license_quota: number;
  status: string;
}

export interface DeviceInfo {
  id: string;
  tenant_id: string;
  room_id: string | null;
  device_uid: string;
  label: string;
  model: string;
  app_version: string;
  status: "UNPAIRED" | "ONLINE" | "OFFLINE" | "DISABLED";
  ip_address: string;
  last_seen_at: string | null;
}

export interface MovieCard {
  id: string;
  title: string;
  year: number;
  duration_seconds: number;
  genres: string[];
  poster_url: string;
  banner_url: string;
  stream_url: string;
  source: MovieSource;
  is_featured: boolean;
  has_subtitle: boolean;
}

export interface AudioTrack {
  language: string;
  label: string;
}

export interface SubtitleTrack {
  language: string;
  label: string;
  path: string;
}

export interface MovieDetailView extends MovieCard {
  synopsis: string;
  tagline: string;
  director: string;
  cast: string[];
  country: string;
  original_language: string;
  age_rating: string;
  quality: string;
  audio_tracks: AudioTrack[];
  subtitles: SubtitleTrack[];
  file_size_bytes: number;
  container: string;
  checksum_sha256: string;
}

export interface CatalogRowView {
  genre: string;
  display_style: DisplayStyle;
  movies: MovieCard[];
}

export interface CatalogView {
  featured: MovieCard | null;
  rows: CatalogRowView[];
  genres: string[];
  total: number;
}

export interface AnnouncementView {
  id: string;
  message: string;
  severity: AnnouncementSeverity;
}

export interface ServerInfo {
  node_code: string;
  app_mode: string;
  server_time: string;
  heartbeat_interval_seconds: number;
  catalog_version: number;
  streaming_mode: string;
}

export interface TVInitResponse {
  device: DeviceInfo;
  room: RoomInfo | null;
  tenant: TenantInfo;
  layout_config: LayoutConfig;
  catalog: CatalogView;
  announcements: AnnouncementView[];
  server: ServerInfo;
}

export interface PairRequest {
  device_uid: string;
  pairing_code: string;
  model: string;
  app_version: string;
}

export interface PairResponse {
  device_token: string;
  device_id: string;
  tenant_id: string;
  status: string;
  room_id: string | null;
}

export interface WatchLogPayload {
  movie_id: string;
  position_seconds: number;
  duration_seconds: number;
  completed: boolean;
}

/** A command queued for this device. */
export interface RemoteCommandView {
  id: string;
  tenant_id: string;
  device_id: string;
  command: string;
  payload: Record<string, unknown>;
  status: "QUEUED" | "SENT" | "ACKED" | "FAILED";
  issued_at: string;
  acked_at: string | null;
  error: string;
}

/** Events pushed by the server over /ws/tv. */
export type ServerEvent =
  | { type: "WELCOME"; payload: { device_id: string; tenant_id: string; room_id: string } }
  | { type: "COMMAND"; payload: { id: string; command: string; data?: Record<string, unknown> } }
  | { type: "REFRESH_CONFIG"; payload?: { reason?: string; version?: number } }
  | { type: "ROOM_GUEST_UPDATED"; payload: RoomGuestUpdate }
  | { type: "ANNOUNCEMENT"; payload: AnnouncementView | { id: string; deleted: true } }
  | { type: "CONTENT_UPDATED"; payload?: { catalog_version?: number } }
  | { type: "APK_AVAILABLE"; payload?: { path?: string; size?: number } }
  | { type: "KEY"; payload: { key: RemoteKey } }
  | { type: "PONG"; payload?: null };

export type RemoteKey =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "OK"
  | "BACK"
  | "PLAY_PAUSE"
  | "SEEK_FORWARD"
  | "SEEK_BACK";

export interface RoomGuestUpdate {
  room_id: string;
  room_number: string;
  guest_name: string;
  guest_salutation: string;
  is_exclusive: boolean;
  greeting: string;
}
