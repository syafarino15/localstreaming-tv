import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import type { TVInitResponse } from "../lib/types";
import { absoluteUrl } from "../lib/api";
import { colors, fontSize, radius, spacing } from "../theme/tokens";
import { AnnouncementTicker } from "../components/AnnouncementTicker";
import { TvFocusGuide } from "../components/TvFocusGuide";

interface WelcomeScreenProps {
  init: TVInitResponse;
  wsStatus: "connecting" | "open" | "closed";
  offline: boolean;
  onEnter: () => void;
}

/**
 * Personalised welcome screen.
 *
 * The layout variant comes from the CMS, and the greeting is already substituted
 * by the server. When the websocket pushes a guest change the parent replaces
 * the payload, so this screen updates without a restart.
 */
export function WelcomeScreen({
  init,
  wsStatus,
  offline,
  onEnter,
}: WelcomeScreenProps): React.ReactElement {
  const { welcome_screen: welcome, app_title } = init.layout_config;
  const room = init.room;
  const variant = welcome.layout_variant;

  const accent = welcome.accent_color || colors.accent;
  const background = welcome.background_image_url;
  const logo = welcome.logo_url;

  const greeting = room?.greeting || welcome.default_greeting;
  const guestSuffix =
    room && room.guest_name
      ? ` — ${room.guest_salutation ? room.guest_salutation + " " : ""}${room.guest_name}`
      : "";

  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <View style={styles.container}>
      {background ? (
        <Image
          source={{ uri: absoluteUrl(background) }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.background]}
          style={StyleSheet.absoluteFill}
        />
      )}

      <LinearGradient
        colors={[`${welcome.primary_color}33`, "rgba(5,8,15,0.86)", colors.background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.body, variant === "FULLSCREEN_CENTER" && styles.bodyCentered]}>
        <TvFocusGuide style={styles.card} autoFocus trapFocusUp trapFocusDown>
          <View style={styles.brandRow}>
            {logo ? (
              <Image
                source={{ uri: absoluteUrl(logo) }}
                style={styles.logo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : null}
            <Text style={styles.brand}>{app_title}</Text>
          </View>

          <Text style={styles.kicker}>{today.toUpperCase()}</Text>

          <Text style={styles.greeting} numberOfLines={3}>
            {greeting}
            {guestSuffix}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaLabel}>KABIN</Text>
              <Text style={styles.metaValue}>{room?.room_number ?? "—"}</Text>
            </View>
            {room?.deck ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaLabel}>DEK</Text>
                <Text style={styles.metaValue}>{room.deck}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Text style={styles.metaLabel}>FILM</Text>
              <Text style={styles.metaValue}>{init.catalog.total}</Text>
            </View>
          </View>

          <Pressable
            onPress={onEnter}
            hasTVPreferredFocus
            style={({ focused }) => [
              styles.cta,
              { backgroundColor: accent },
              focused && styles.ctaFocused,
            ]}
            accessibilityRole="button"
            accessibilityLabel={welcome.cta_button_text || "Masuk ke hiburan"}
          >
            {({ focused }) => (
              <Text style={[styles.ctaText, focused && styles.ctaTextFocused]}>
                {welcome.cta_button_text || "Masuk ke Hiburan"}
              </Text>
            )}
          </Pressable>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    wsStatus === "open" ? colors.success : offline ? colors.danger : colors.warning,
                },
              ]}
            />
            <Text style={styles.statusText}>
              {wsStatus === "open"
                ? "Terhubung ke server kapal"
                : offline
                  ? "Mode offline — memakai data tersimpan"
                  : "Menyambungkan ulang…"}
            </Text>
            <Text style={styles.statusText}>· {init.server.node_code}</Text>
          </View>
        </TvFocusGuide>
      </View>

      <AnnouncementTicker announcements={init.announcements} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    maxWidth: 1100,
  },
  bodyCentered: {
    alignSelf: "center",
    alignItems: "center",
    maxWidth: 1200,
  },
  card: {
    alignItems: "flex-start",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logo: {
    width: 74,
    height: 74,
  },
  brand: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "800",
    letterSpacing: 5,
  },
  kicker: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: spacing.xl,
  },
  greeting: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: "800",
    lineHeight: fontSize.display * 1.1,
    marginTop: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  metaChip: {
    backgroundColor: colors.overlay,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs - 2,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  metaValue: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
  cta: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: "transparent",
  },
  ctaFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.05 }],
  },
  ctaText: {
    color: colors.background,
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
  ctaTextFocused: {
    letterSpacing: 0.6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});
