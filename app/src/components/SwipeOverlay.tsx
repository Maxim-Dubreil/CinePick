import React from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'

type Props = {
  // Positive = LIKE (right), negative = SKIP (left), 0 = neutral
  dragX: Animated.Value
  threshold: number // px at which overlay becomes fully visible
}

export default function SwipeOverlay({ dragX, threshold }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const likeOpacity = dragX.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const skipOpacity = dragX.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  return (
    <>
      {/* LIKE — right swipe */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, styles.overlayLike, { opacity: likeOpacity }]}
      >
        <View style={[styles.badge, styles.badgeLike]}>
          <Text style={styles.badgeText}>CE SOIR ✓</Text>
        </View>
      </Animated.View>

      {/* SKIP — left swipe */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, styles.overlaySkip, { opacity: skipOpacity }]}
      >
        <View style={[styles.badge, styles.badgeSkip]}>
          <Text style={styles.badgeText}>SKIP ✕</Text>
        </View>
      </Animated.View>
    </>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: theme.radius.xl,
      justifyContent: 'flex-start',
      paddingTop: theme.spacing.xl,
    },
    overlayLike: {
      backgroundColor: `${theme.colors.swipeAccept}22`,
      alignItems: 'flex-start',
      paddingLeft: theme.spacing.lg,
    },
    overlaySkip: {
      backgroundColor: `${theme.colors.swipeReject}22`,
      alignItems: 'flex-end',
      paddingRight: theme.spacing.lg,
    },
    badge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      borderWidth: 3,
    },
    badgeLike: {
      borderColor: theme.colors.swipeAccept,
    },
    badgeSkip: {
      borderColor: theme.colors.swipeReject,
    },
    badgeText: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.extrabold as '800',
      color: theme.colors.text,
      letterSpacing: theme.letterSpacing.wider,
    },
  })
}
