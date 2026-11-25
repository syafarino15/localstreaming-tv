import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import type { MovieCard } from "../lib/types";
import { absoluteUrl } from "../lib/api";
import { colors, fontSize, radius, spacing } from "../theme/tokens";

interface HeroBannerProps {
  movie: MovieCard;
  synopsis?: string;
  onPlay: (movie: MovieCard) => void;
  accentColor: string;
}

/**
 * Featured title block at the top of the catalog.
 *
 * The gradient sits above the artwork so the title stays readable regardless of
 * how bright the underlying image is.
 */
export function HeroBanner({
  movie,
  synopsis,
  onPlay,
  accentColor,
}: HeroBannerProps): React.ReactElement {
  const backdrop = movie.banner_url || movie.poster_url;

  return (
    <View style={styles.container}>
      {backdrop ? (
        <Image
          source={{ uri: absoluteUrl(backdrop) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}

      <LinearGradient
        colors={["rgba(5,8,15,0.15)", "rgba(5,8,15,0.75)", colors.background]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.kicker}>FILM UNGGULAN</Text>
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>

        <View style={styles.metaRow}>
          {movie.year > 0 ? <Text style={styles.meta}>{movie.year}</Text> : null}
          {movie.genres.slice(0, 3).map((genre) => (
            <Text key={genre} style={styles.meta}>
              {genre}
            </Text>
          ))}
        </View>

        {synopsis ? (
          <Text style={styles.synopsis} numberOfLines={3}>
            {synopsis}
          </Text>
        ) : null}

        <Pressable
          onPress={() => onPlay(movie)}
          style={({ focused }) => [
            styles.cta,
            { backgroundColor: accentColor },
            focused && styles.ctaFocused,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Putar ${movie.title}`}
        >
          {({ focused }) => (
            <Text style={[styles.ctaText, focused && styles.ctaTextFocused]}>Putar Sekarang</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 430,
    justifyContent: "flex-end",
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: colors.surfaceRaised,
  },
  content: {
    padding: spacing.xl,
    maxWidth: "62%",
  },
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: spacing.sm,
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
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  meta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  synopsis: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.5,
    marginTop: spacing.md,
  },
  cta: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: "transparent",
  },
  ctaFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.04 }],
  },
  ctaText: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: "800",
  },
  ctaTextFocused: {
    letterSpacing: 0.4,
  },
});
