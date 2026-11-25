import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { MovieCard, TVInitResponse } from "../lib/types";
import { colors, fontSize, spacing } from "../theme/tokens";
import { AnnouncementTicker } from "../components/AnnouncementTicker";
import { GenreRow } from "../components/GenreRow";
import { HeroBanner } from "../components/HeroBanner";
import { TvFocusGuide } from "../components/TvFocusGuide";

interface CatalogScreenProps {
  init: TVInitResponse;
  resume: MovieCard[];
  synopsis?: string;
  onSelect: (movie: MovieCard) => void;
}

/**
 * IDLIX style catalog: a hero banner on top, then horizontal swimlanes.
 *
 * Rows come from the CMS document (`rows_order`), so the partner controls the
 * genre order and whether each row uses landscape cards or portrait posters.
 */
export function CatalogScreen({
  init,
  resume,
  synopsis,
  onSelect,
}: CatalogScreenProps): React.ReactElement {
  const { welcome_screen: welcome, app_title } = init.layout_config;

  const rows = useMemo(() => {
    if (resume.length === 0) {
      return init.catalog.rows;
    }
    return [
      {
        genre: "Lanjutkan Menonton",
        display_style: "LANDSCAPE_CARD" as const,
        movies: resume,
      },
      ...init.catalog.rows,
    ];
  }, [init.catalog.rows, resume]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>{app_title}</Text>
          <Text style={styles.room}>
            {init.room ? `Kabin ${init.room.room_number}` : "Kabin —"}
            {init.room?.guest_name ? ` · ${init.room.guest_name}` : ""}
          </Text>
        </View>

        {init.catalog.featured ? (
          <HeroBanner
            movie={init.catalog.featured}
            synopsis={synopsis}
            onPlay={onSelect}
            accentColor={welcome.accent_color || colors.accent}
          />
        ) : null}

        {rows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Belum ada film di katalog</Text>
            <Text style={styles.emptyText}>
              Salin film ke folder Storage/Movies lalu jalankan pemindaian dari CMS.
            </Text>
          </View>
        ) : (
          <TvFocusGuide trapFocusUp trapFocusDown>
            {rows.map((row, index) => (
              <GenreRow
                key={`${row.genre}-${index}`}
                row={row}
                onSelect={onSelect}
                isFirstRow={index === 0}
              />
            ))}
          </TvFocusGuide>
        )}
      </ScrollView>

      <AnnouncementTicker announcements={init.announcements} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: 220,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  brand: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "800",
    letterSpacing: 5,
  },
  room: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  emptyState: {
    marginTop: spacing.xxl,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
