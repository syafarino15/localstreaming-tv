import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { absoluteUrl, api, ApiError } from "../lib/api";
import { cache } from "../lib/storage";
import type { MovieCard, MovieDetailView } from "../lib/types";
import { colors, fontSize, radius, spacing } from "../theme/tokens";
import { TvFocusGuide } from "../components/TvFocusGuide";

interface DetailScreenProps {
  movie: MovieCard;
  accentColor: string;
  onPlay: (movie: MovieCard, startSeconds: number) => void;
  onBack: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return "";
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours} jam ${minutes} menit` : `${minutes} menit`;
}

/**
 * Detail screen.
 *
 * Metadata is fetched on demand; the resume position comes from SQLite so
 * "Lanjutkan" is instant and still correct when the server is unreachable.
 */
export function DetailScreen({
  movie,
  accentColor,
  onPlay,
  onBack,
}: DetailScreenProps): React.ReactElement {
  const [detail, setDetail] = useState<MovieDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      const stored = await cache.getResume(movie.id);
      if (!cancelled) {
        setResumeAt(stored);
      }

      try {
        const result = await api.movie(movie.id);
        if (!cancelled) {
          setDetail(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Detail film tidak dapat dimuat.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [movie.id]);

  const handlePlay = useCallback(
    (fromStart: boolean) => {
      onPlay(movie, fromStart ? 0 : resumeAt);
    },
    [movie, onPlay, resumeAt],
  );

  const view = detail ?? null;
  const synopsis = view?.synopsis ?? "";
  const backdrop = movie.banner_url || movie.poster_url;

  return (
    <View style={styles.container}>
      {backdrop ? (
        <Image
          source={{ uri: absoluteUrl(backdrop) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TvFocusGuide style={styles.content} autoFocus>
          <Text style={styles.title}>{movie.title}</Text>

          <View style={styles.metaRow}>
            {movie.year > 0 ? <Text style={styles.meta}>{movie.year}</Text> : null}
            {view?.quality ? <Text style={styles.meta}>{view.quality}</Text> : null}
            {view?.age_rating ? <Text style={styles.metaBadge}>{view.age_rating}</Text> : null}
            {movie.duration_seconds > 0 ? (
              <Text style={styles.meta}>{formatDuration(movie.duration_seconds)}</Text>
            ) : null}
            {movie.genres.map((genre) => (
              <Text key={genre} style={styles.meta}>
                {genre}
              </Text>
            ))}
          </View>

          {loading ? <ActivityIndicator color={accentColor} style={styles.spinner} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {synopsis ? (
            <Text style={styles.synopsis} numberOfLines={6}>
              {synopsis}
            </Text>
          ) : null}

          {view?.director ? (
            <Text style={styles.credit}>
              <Text style={styles.creditLabel}>Sutradara: </Text>
              {view.director}
            </Text>
          ) : null}

          {view && view.cast.length > 0 ? (
            <Text style={styles.credit} numberOfLines={2}>
              <Text style={styles.creditLabel}>Pemain: </Text>
              {view.cast.join(", ")}
            </Text>
          ) : null}

          {view && view.subtitles.length > 0 ? (
            <Text style={styles.credit}>
              <Text style={styles.creditLabel}>Subtitle: </Text>
              {view.subtitles.map((sub) => sub.label).join(", ")}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {resumeAt > 0 ? (
              <Pressable
                onPress={() => handlePlay(false)}
                hasTVPreferredFocus
                style={({ focused }) => [
                  styles.primaryButton,
                  { backgroundColor: accentColor },
                  focused && styles.buttonFocused,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Lanjutkan menonton"
              >
                {({ focused }) => (
                  <Text style={[styles.primaryText, focused && styles.textFocused]}>
                    Lanjutkan ({Math.floor(resumeAt / 60)} menit)
                  </Text>
                )}
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => handlePlay(true)}
              hasTVPreferredFocus={resumeAt === 0}
              style={({ focused }) => [
                styles.primaryButton,
                { backgroundColor: resumeAt > 0 ? colors.surfaceRaised : accentColor },
                focused && styles.buttonFocused,
              ]}
              accessibilityRole="button"
              accessibilityLabel={resumeAt > 0 ? "Putar dari awal" : "Putar film"}
            >
              {({ focused }) => (
                <Text
                  style={[
                    styles.primaryText,
                    resumeAt > 0 && styles.secondaryText,
                    focused && styles.textFocused,
                  ]}
                >
                  {resumeAt > 0 ? "Putar dari Awal" : "Putar"}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onBack}
              style={({ focused }) => [styles.backButton, focused && styles.buttonFocused]}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke katalog"
            >
              {({ focused }) => (
                <Text style={[styles.backText, focused && styles.textFocused]}>Kembali</Text>
              )}
            </Pressable>
          </View>
        </TvFocusGuide>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    backgroundColor: "rgba(5,8,15,0.88)",
  },
  scrollContent: {
    padding: spacing.xxl,
  },
  content: {
    maxWidth: 1100,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: "800",
    lineHeight: fontSize.display * 1.08,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.md,
  },
  metaBadge: {
    color: colors.background,
    backgroundColor: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "800",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  spinner: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.md,
  },
  synopsis: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * 1.6,
    marginTop: spacing.lg,
  },
  credit: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  creditLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  primaryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: "transparent",
  },
  buttonFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.04 }],
  },
  primaryText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  secondaryText: {
    color: colors.text,
  },
  textFocused: {
    letterSpacing: 0.4,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
  },
  backText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
});
