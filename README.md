# DLU X ALFATEVE — Android TV App

Aplikasi Expo untuk TV kabin kapal. Katalog film, layar sambutan per tenant,
dan pemutaran dari server lokal di kapal. Aplikasi ini berjalan **di** IPTV,
bukan sebagai penyedia IPTV.

## Status

**Belum berjalan di perangkat.** Source, typecheck, dan build APK debug/release
berhasil, tetapi aplikasi gagal saat boot dengan
`TypeError: property is not writable` di dalam
`setUpDefaultReactNativeEnvironment`. Probe release tanpa modul Expo berjalan
normal, jadi penyebabnya adalah runtime Expo pada fork `react-native-tvos@0.88`,
bukan kode aplikasi. Dua jalur yang tersedia: turunkan pasangan Expo/RN ke versi
yang didokumentasikan untuk TV, atau lepaskan Expo dan pakai ExoPlayer native.

## Stack

| Komponen | Pilihan |
|---|---|
| Expo SDK | 58.0.26 |
| React Native | `react-native-tvos@0.88-stable` (lewat alias `react-native`) |
| Player | `expo-video` (ExoPlayer) |
| Gambar | `expo-image` dengan disk cache |
| Penyimpanan | `expo-sqlite` (cache katalog) + `expo-secure-store` (token perangkat) |
| Font | `expo-font` dari aset lokal, tanpa CDN |
| Navigasi | state machine bertipe, bukan library navigator |

## Perintah

```bash
npm install

# Development di emulator/perangkat TV
npm start
npm run android

# Build APK release
npm run build:apk

# Pemeriksaan tipe
npm run typecheck
```

`npm run build:apk` menjalankan `expo prebuild --clean` dengan `EXPO_TV=1` lalu
Gradle. Folder `android/` dihasilkan oleh perintah itu dan tidak disimpan di git.

## Struktur

```
App.tsx                  state machine rute + listener WebSocket
src/screens/             boot, pairing, welcome, catalog, detail, player
src/components/          tile, row, hero, ticker, subtitle overlay, focus guide
src/lib/                 api, ws, storage, subtitles, config, types
src/theme/tokens.ts      warna dan ukuran
```

## Kontrak API

Kontrak ada di `docs/openapi.yaml` pada repo backend. Endpoint yang dipakai:
`POST /auth/device/pair`, `GET /tv/init`, `GET /tv/movies/:id`,
`POST /tv/heartbeat`, `POST /tv/watch-logs`, `GET /tv/resume`,
`GET /tv/commands`, `POST /tv/commands/:id/ack`, `GET /stream/:id` (byte-range),
`GET /assets/*path`, dan `WS /ws/tv`.

Alamat server diatur di `app.json` (`extra.apiBaseUrl`) dan bisa diubah dari
layar pairing.
