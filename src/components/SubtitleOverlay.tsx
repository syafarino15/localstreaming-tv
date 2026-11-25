import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fontSize, spacing } from "../theme/tokens";

interface SubtitleOverlayProps {
  text: string;
  /** Extra bottom offset so the text clears the player controls. */
  bottomInset?: number;
}

/**
 * Renders sidecar subtitles.
 *
 * expo-video can select subtitle tracks embedded in the container, but it cannot
 * open a `.srt`/`.vtt` file that sits next to the video. The ingest engine pairs
 * those files, so the player parses them and draws the active cue here.
 */
export function SubtitleOverlay({
  text,
  bottomInset = 120,
}: SubtitleOverlayProps): React.ReactElement | null {
  if (!text) {
    return null;
  }
  return (
    <View pointerEvents="none" style={[styles.container, { bottom: bottomInset }]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.xxl,
    right: spacing.xxl,
    alignItems: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: fontSize.lg,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: fontSize.lg * 1.35,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderRadius: 4,
    textShadowColor: colors.background,
    textShadowRadius: 6,
  },
});
