import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { AnnouncementView } from "../lib/types";
import { colors, fontSize, radius, spacing } from "../theme/tokens";

interface AnnouncementTickerProps {
  announcements: AnnouncementView[];
}

function severityColor(severity: AnnouncementView["severity"]): string {
  switch (severity) {
    case "EMERGENCY":
      return colors.danger;
    case "WARNING":
      return colors.warning;
    default:
      return colors.accent;
  }
}

/**
 * Running text at the bottom of the screen.
 *
 * It never blocks playback: the player keeps its controls and the ticker sits
 * above the safe area. Emergencies are surfaced with a colored bar so crew
 * messages stay noticeable without hijacking the film.
 */
export function AnnouncementTicker({
  announcements,
}: AnnouncementTickerProps): React.ReactElement | null {
  const translate = useRef(new Animated.Value(0)).current;
  const active = announcements[0];

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    translate.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 18_000,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [active, translate]);

  if (!active) {
    return null;
  }

  const color = severityColor(active.severity);

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.pill, { backgroundColor: color }]}>
        <Text style={styles.pillText}>{active.severity}</Text>
      </View>
      <View style={styles.viewport}>
        <Animated.Text
          style={[
            styles.text,
            {
              transform: [
                {
                  translateX: translate.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -1400],
                  }),
                },
              ],
            },
          ]}
          numberOfLines={1}
        >
          {active.message}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    borderWidth: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    overflow: "hidden",
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginRight: spacing.md,
  },
  pillText: {
    color: colors.background,
    fontSize: fontSize.xs - 2,
    fontWeight: "800",
    letterSpacing: 1,
  },
  viewport: {
    flex: 1,
    overflow: "hidden",
  },
  text: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
