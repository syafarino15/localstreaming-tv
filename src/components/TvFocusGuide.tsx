import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { TVFocusGuideView as RNTVFocusGuideView } from "react-native";

/**
 * Typed wrapper around the react-native-tvos focus guide.
 *
 * The fork exposes these props at runtime; this interface keeps them explicit
 * instead of falling back to `any` when the bundled type definitions lag behind.
 */
interface FocusGuideProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  autoFocus?: boolean;
  focusable?: boolean;
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
  destinations?: unknown[];
}

const FocusGuide = RNTVFocusGuideView as unknown as React.ComponentType<FocusGuideProps>;

export interface TvFocusGuideProps extends FocusGuideProps {}

/**
 * Wraps a focusable region and keeps D-Pad focus inside it.
 *
 * Rows use this so pressing DOWN on the last card moves to the next row instead
 * of losing focus entirely, which is the most common Android TV UX defect.
 */
export function TvFocusGuide({
  children,
  style,
  autoFocus = false,
  focusable = true,
  trapFocusUp = false,
  trapFocusDown = false,
  trapFocusLeft = false,
  trapFocusRight = false,
}: TvFocusGuideProps): React.ReactElement {
  return (
    <FocusGuide
      style={style}
      autoFocus={autoFocus}
      focusable={focusable}
      trapFocusUp={trapFocusUp}
      trapFocusDown={trapFocusDown}
      trapFocusLeft={trapFocusLeft}
      trapFocusRight={trapFocusRight}
    >
      {children}
    </FocusGuide>
  );
}
