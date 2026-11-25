import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import type { CatalogRowView, MovieCard } from "../lib/types";
import { cardSize, colors, fontSize, spacing } from "../theme/tokens";
import { MovieTile } from "./MovieTile";
import { TvFocusGuide } from "./TvFocusGuide";

interface GenreRowProps {
  row: CatalogRowView;
  onSelect: (movie: MovieCard) => void;
  /** Focus lands here first so the remote has an anchor on screen open. */
  isFirstRow?: boolean;
}

/**
 * One horizontal swimlane.
 *
 * The focus guide traps vertical movement so pressing DOWN on the last card
 * moves to the row below rather than dropping focus off screen.
 */
export function GenreRow({ row, onSelect, isFirstRow = false }: GenreRowProps): React.ReactElement {
  const variant = row.display_style === "LANDSCAPE_CARD" ? "LANDSCAPE_CARD" : "POSTER_PORTRAIT";

  return (
    <TvFocusGuide trapFocusUp trapFocusDown style={styles.container}>
      <Text style={styles.title}>{row.genre}</Text>
      <FlatList
        horizontal
        data={row.movies}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <View style={styles.itemWrapper}>
            <MovieTile
              movie={item}
              variant={variant}
              onPress={onSelect}
              hasPreferredFocus={isFirstRow && index === 0}
            />
          </View>
        )}
      />
    </TvFocusGuide>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.xl,
  },
  itemWrapper: {
    marginRight: cardSize.gap,
  },
});
