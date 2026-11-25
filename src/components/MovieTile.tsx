import React, { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { cardSize, colors, FOCUS_RING, FOCUS_SCALE, fontSize, radius, spacing } from "../theme/tokens";
import type { MovieCard } from "../lib/types";
import { absoluteUrl } from "../lib/api";

export type CardVariant = "POSTER_PORTRAIT" | "LANDSCAPE_CARD";

interface MovieCardProps {
  movie: MovieCard;
  variant?: CardVariant;
  onPress: (movie: MovieCard) => void;
  hasPreferredFocus?: boolean;
  onFocus?: (movie: MovieCard) => void;
}

/**
 * Focusable catalog card.
 *
 * Focus is shown with a scale animation plus an accent ring, which stays visible
 * on cheap TV panels where a subtle outline would disappear.
 */
export function MovieTile({
  movie,
  variant = "POSTER_PORTRAIT",
  onPress,
  hasPreferredFocus = false,
  onFocus,
}: MovieCardProps): React.ReactElement {
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const isPortrait = variant === "POSTER_PORTRAIT";
  const width = isPortrait ? cardSize.posterWidth : cardSize.landscapeWidth;
  const height = isPortrait ? cardSize.posterHeight : cardSize.landscapeHeight;

  const animate = (to: number): void => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      friction: 7,
      tension: 90,
    }).start();
  };

  const imageUrl = isPortrait ? movie.poster_url : movie.banner_url || movie.poster_url;

  return (
    <Pressable
      onPress={() => onPress(movie)}
      onFocus={() => {
        setFocused(true);
        animate(FOCUS_SCALE);
        onFocus?.(movie);
      }}
      onBlur={() => {
        setFocused(false);
        animate(1);
      }}
      hasTVPreferredFocus={hasPreferredFocus}
      style={{ width, height }}
      accessibilityRole="button"
      accessibilityLabel={`${movie.title}${movie.year > 0 ? ` (${movie.year})` : ""}`}
    >
      <Animated.View
        style={[
          styles.frame,
          { width, height, transform: [{ scale }] },
          focused && styles.frameFocused,
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: absoluteUrl(imageUrl) }}
            style={styles.image}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText} numberOfLines={3}>
              {movie.title}
            </Text>
          </View>
        )}

        {movie.source === "FLASHDISK" || movie.source === "USB" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {movie.source === "USB" ? "USB LOKAL" : "SERVER KAPAL"}
            </Text>
          </View>
        ) : null}

        {!isPortrait ? (
          <View style={styles.landscapeFooter}>
            <Text style={styles.landscapeTitle} numberOfLines={1}>
              {movie.title}
            </Text>
            {movie.year > 0 ? (
              <Text style={styles.landscapeMeta}>{movie.year}</Text>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      {isPortrait ? (
        <Text style={[styles.caption, focused && styles.captionFocused]} numberOfLines={1}>
          {movie.title}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: "transparent",
  },
  frameFocused: {
    borderWidth: FOCUS_RING,
    borderColor: colors.accent,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: colors.accent,
    fontSize: fontSize.xs - 2,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  landscapeFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.overlay,
  },
  landscapeTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  landscapeMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  caption: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: fontSize.xs,
    maxWidth: cardSize.posterWidth,
  },
  captionFocused: {
    color: colors.text,
  },
});
