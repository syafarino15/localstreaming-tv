import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, spacing } from "../theme/tokens";

interface StatusScreenProps {
  title: string;
  message: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Full screen state used for booting, offline fallback and unrecoverable errors.
 *
 * It always offers a retry target so a remote-only user is never stuck on a
 * dead screen with no focusable element.
 */
export function StatusScreen({
  title,
  message,
  loading = false,
  actionLabel,
  onAction,
}: StatusScreenProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>DLU X ALFATEVE</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      {loading ? <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} /> : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hasTVPreferredFocus
          style={({ focused }) => [styles.action, focused && styles.actionFocused]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {({ focused }) => (
            <Text style={[styles.actionText, focused && styles.actionTextFocused]}>
              {actionLabel}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xxl,
  },
  brand: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: "800",
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    textAlign: "center",
    marginTop: spacing.md,
    maxWidth: 760,
    lineHeight: fontSize.md * 1.5,
  },
  spinner: {
    marginTop: spacing.xl,
  },
  action: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: "transparent",
  },
  actionFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  actionText: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  actionTextFocused: {
    color: colors.accent,
  },
});
