import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";

import { absoluteUrl, api, fetchSubtitle } from "../lib/api";
import { WATCH_LOG_INTERVAL_MS } from "../lib/config";
import { activeCueText, parseSubtitles, type Cue } from "../lib/subtitles";
import { cache } from "../lib/storage";
import type { MovieCard, MovieDetailView, RemoteKey, SubtitleTrack } from "../lib/types";
import { colors, fontSize, radius, spacing } from "../theme/tokens";
import { SubtitleOverlay } from "../components/SubtitleOverlay";

interface PlayerScreenProps {
  movie: MovieCard;
  detail: MovieDetailView | null;
  startSeconds: number;
  onExit: (positionSeconds: number) => void;
  /** Keys forwarded from the passenger phone over the websocket. */
  remoteKey: RemoteKey | null;
  remoteKeyNonce: number;
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number): string => value.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

/**
 * Fullscreen player.
 *
 * expo-video drives ExoPlayer for hardware decoding. Everything else lives here:
 * the D-Pad control overlay, resume reporting, and the sidecar subtitle overlay
 * because expo-video cannot load an external `.srt` file on its own.
 */
export function PlayerScreen({
  movie,
  detail,
  startSeconds,
  onExit,
  remoteKey,
  remoteKeyNonce,
}: PlayerScreenProps): React.ReactElement {
  const streamUrl = absoluteUrl(movie.stream_url);

  const player = useVideoPlayer(streamUrl, (instance) => {
    instance.timeUpdateEventInterval = 0.5;
    instance.loop = false;
    instance.muted = false;
    if (startSeconds > 0) {
      instance.currentTime = startSeconds;
    }
    instance.play();
  });

  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime ?? 0,
    bufferedPosition: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
  });

  const { status } = useEvent(player, "statusChange", { status: player.status });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });

  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleTrack | null>(null);
  const [cues, setCues] = useState<Cue[]>([]);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);
  const [position, setPosition] = useState(startSeconds);

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReported = useRef(0);
  const positionRef = useRef(startSeconds);

  const duration = player.duration ?? movie.duration_seconds ?? 0;

  // --- progress -----------------------------------------------------------
  useEffect(() => {
    if (typeof currentTime !== "number") {
      return;
    }
    positionRef.current = currentTime;
    setPosition(currentTime);
  }, [currentTime]);

  const reportProgress = useCallback(
    async (completed: boolean): Promise<void> => {
      const at = positionRef.current;
      await cache.saveResume(movie.id, at, duration);
      try {
        await api.saveWatchLog({
          movie_id: movie.id,
          position_seconds: Math.floor(at),
          duration_seconds: Math.floor(duration),
          completed,
        });
      } catch {
        // Progress is best effort: the SQLite copy already holds the position,
        // so a failed report only loses analytics, never the resume point.
      }
      lastReported.current = at;
    },
    [duration, movie.id],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.abs(positionRef.current - lastReported.current) < 5) {
        return;
      }
      void reportProgress(false);
    }, WATCH_LOG_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [reportProgress]);

  const exit = useCallback(
    async (completed: boolean): Promise<void> => {
      try {
        player.pause();
      } catch {
        // The player may already be released during teardown.
      }
      await reportProgress(completed);
      onExit(positionRef.current);
    },
    [onExit, player, reportProgress],
  );

  // Report when playback reaches the end.
  useEffect(() => {
    if (status === "readyToPlay") {
      return;
    }
    if (status === "error") {
      void reportProgress(false);
    }
  }, [status, reportProgress]);

  // --- controls auto hide --------------------------------------------------
  const showControls = useCallback((): void => {
    setControlsVisible(true);
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => setControlsVisible(false), 4500);
  }, []);

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current !== null) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [showControls]);

  // --- subtitles -----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadTrack(track: SubtitleTrack | null): Promise<void> {
      if (!track) {
        setCues([]);
        return;
      }
      try {
        const raw = await fetchSubtitle(absoluteUrl(track.path));
        if (!cancelled) {
          setCues(parseSubtitles(raw));
          setSubtitleError(null);
        }
      } catch {
        if (!cancelled) {
          setCues([]);
          setSubtitleError("Subtitle gagal dimuat.");
        }
      }
    }

    const first = detail?.subtitles[0] ?? null;
    setActiveSubtitle(first);
    void loadTrack(first);

    return () => {
      cancelled = true;
    };
  }, [detail]);

  const cycleSubtitle = useCallback((): void => {
    const tracks = detail?.subtitles ?? [];
    if (tracks.length === 0) {
      return;
    }
    const currentIndex = activeSubtitle
      ? tracks.findIndex((track) => track.path === activeSubtitle.path)
      : -1;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= tracks.length) {
      setActiveSubtitle(null);
      setCues([]);
      return;
    }

    const next = tracks[nextIndex];
    if (!next) {
      return;
    }
    setActiveSubtitle(next);
    void fetchSubtitle(absoluteUrl(next.path))
      .then((raw) => setCues(parseSubtitles(raw)))
      .catch(() => {
        setCues([]);
        setSubtitleError("Subtitle gagal dimuat.");
      });
  }, [activeSubtitle, detail]);

  // --- transport -----------------------------------------------------------
  const seekBy = useCallback(
    (delta: number): void => {
      const target = Math.max(0, Math.min(duration || Number.MAX_SAFE_INTEGER, positionRef.current + delta));
      player.currentTime = target;
      positionRef.current = target;
      setPosition(target);
      showControls();
    },
    [duration, player, showControls],
  );

  const togglePlay = useCallback((): void => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
    showControls();
  }, [player, showControls]);

  // --- passenger phone remote ---------------------------------------------
  useEffect(() => {
    if (!remoteKey) {
      return;
    }
    showControls();
    switch (remoteKey) {
      case "PLAY_PAUSE":
        togglePlay();
        break;
      case "SEEK_FORWARD":
        seekBy(10);
        break;
      case "SEEK_BACK":
        seekBy(-10);
        break;
      case "OK":
        togglePlay();
        break;
      case "BACK":
        void exit(false);
        break;
      default:
        break;
    }
    // remoteKeyNonce makes repeated presses of the same key fire again.
  }, [remoteKey, remoteKeyNonce, togglePlay, seekBy, exit, showControls]);

  const subtitleText = useMemo(() => {
    if (!activeSubtitle) {
      return "";
    }
    return activeCueText(cues, position);
  }, [activeSubtitle, cues, position]);

  const progressRatio = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="contain"
        allowsPictureInPicture={false}
      />

      <SubtitleOverlay text={subtitleText} />

      {controlsVisible ? (
        <View style={styles.controls} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Text style={styles.title} numberOfLines={1}>
              {movie.title}
            </Text>
            <Text style={styles.badge}>
              {status === "loading" ? "Memuat…" : isPlaying ? "Diputar" : "Jeda"}
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>

            <View style={styles.buttonRow}>
              <ControlButton label="⟲ 10s" onPress={() => seekBy(-10)} />
              <ControlButton
                label={isPlaying ? "❚❚ Jeda" : "▶ Putar"}
                onPress={togglePlay}
                primary
              />
              <ControlButton label="10s ⟳" onPress={() => seekBy(10)} />
              {(detail?.subtitles.length ?? 0) > 0 ? (
                <ControlButton
                  label={activeSubtitle ? `Sub: ${activeSubtitle.label}` : "Sub: Mati"}
                  onPress={cycleSubtitle}
                />
              ) : null}
              <ControlButton label="Keluar" onPress={() => void exit(false)} />
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatClock(position)}</Text>
              <Text style={styles.time}>/ {formatClock(duration)}</Text>
              {subtitleError ? <Text style={styles.subtitleError}>{subtitleError}</Text> : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface ControlButtonProps {
  label: string;
  onPress: () => void;
  primary?: boolean;
}

function ControlButton({ label, onPress, primary = false }: ControlButtonProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      style={({ focused }) => [
        styles.controlButton,
        primary && styles.controlButtonPrimary,
        focused && styles.controlButtonFocused,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {({ focused }) => (
        <Text style={[styles.controlText, focused && styles.controlTextFocused]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  controls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "800",
    flexShrink: 1,
  },
  badge: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  bottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  controlButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 3,
    borderColor: "transparent",
  },
  controlButtonPrimary: {
    backgroundColor: colors.accent,
  },
  controlButtonFocused: {
    borderColor: colors.text,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  controlText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  controlTextFocused: {
    color: "#FFFFFF",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  time: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  subtitleError: {
    color: colors.danger,
    fontSize: fontSize.xs,
    marginLeft: spacing.md,
  },
});
