import * as Haptics from 'expo-haptics'
import React, { useRef } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'
import { Film } from '../types'
import SwipeOverlay from './SwipeOverlay'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH - 32
const POSTER_HEIGHT = CARD_WIDTH * 1.35

type Props = {
  film: Film
  onAccept: () => void
  onSkip: () => void
}

export default function FilmCard({ film, onAccept, onSkip }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const dragX = useRef(new Animated.Value(0)).current
  const dragY = useRef(new Animated.Value(0)).current

  const THRESHOLD = SCREEN_WIDTH * theme.swipe.threshold

  const rotate = dragX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [`-${theme.swipe.rotationDeg}deg`, '0deg', `${theme.swipe.rotationDeg}deg`],
    extrapolate: 'clamp',
  })

  function resetCard() {
    Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start()
    Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start()
  }

  function flyOut(direction: 'left' | 'right', callback: () => void) {
    if (direction === 'right') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5
    Animated.timing(dragX, {
      toValue: toX,
      duration: theme.animation.normal,
      useNativeDriver: true,
    }).start(() => {
      dragX.setValue(0)
      dragY.setValue(0)
      callback()
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: (_, { dx, dy }) => {
        dragX.setValue(dx)
        dragY.setValue(dy * 0.2)
      },
      onPanResponderRelease: (_, { dx }) => {
        if (dx > THRESHOLD) {
          flyOut('right', onAccept)
        } else if (dx < -THRESHOLD) {
          flyOut('left', onSkip)
        } else {
          resetCard()
        }
      },
      onPanResponderTerminate: () => resetCard(),
    }),
  ).current

  const hasPoster = !!film.poster
  const genres = film.genres?.slice(0, 3).join(' · ') ?? ''
  const runtime = film.runtime ? `${film.runtime} min` : ''
  const meta = [runtime, genres].filter(Boolean).join(' · ')

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [
            { translateX: dragX },
            { translateY: dragY },
            { rotate },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Poster */}
        <View style={styles.posterContainer}>
          {hasPoster ? (
            <Image
              source={{ uri: film.poster! }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>🎬</Text>
            </View>
          )}

          {/* Match score badge */}
          {film.match_score != null && (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreText}>{film.match_score}%</Text>
            </View>
          )}

          {/* Swipe overlays — rendered inside poster area */}
          <SwipeOverlay dragX={dragX} threshold={THRESHOLD} />
        </View>

        {/* Film info */}
        <View style={styles.info}>
          {/* Title + year */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{film.title}</Text>
            {film.year ? <Text style={styles.year}>{film.year}</Text> : null}
          </View>

          {/* Meta: runtime · genres */}
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}

          {/* Mood tags */}
          {film.mood_tags && film.mood_tags.length > 0 && (
            <View style={styles.tagsRow}>
              {film.mood_tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* AI reason */}
          {film.reason ? (
            <Text style={styles.reason}>{film.reason}</Text>
          ) : null}

          {/* Warning */}
          {film.warning ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ {film.warning}</Text>
            </View>
          ) : null}

          {/* Providers */}
          {film.providers && film.providers.length > 0 && (
            <View style={styles.providersRow}>
              <Text style={styles.providersLabel}>Disponible sur </Text>
              <Text style={styles.providersValue}>{film.providers.join(', ')}</Text>
            </View>
          )}

          {/* TMDB link */}
          {film.tmdb_url ? (
            <TouchableOpacity
              style={styles.tmdbLink}
              onPress={() => Linking.openURL(film.tmdb_url!)}
              activeOpacity={0.7}
            >
              <Text style={styles.tmdbLinkText}>Voir sur TMDB →</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => flyOut('left', onSkip)}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>✕ Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => flyOut('right', onAccept)}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptButtonText}>Ce soir ✓</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      overflow: 'hidden',
      ...theme.shadows.card,
    },
    scroll: {
      flexGrow: 0,
      maxHeight: Dimensions.get('window').height * 0.72,
    },
    scrollContent: {
      paddingBottom: theme.spacing.md,
    },
    posterContainer: {
      width: '100%',
      height: POSTER_HEIGHT,
      position: 'relative',
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    posterPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterPlaceholderText: {
      fontSize: 64,
    },
    scoreBadge: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    scoreText: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.bold as '700',
      color: theme.colors.bg,
    },
    info: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: theme.fontSizes.xl,
      fontFamily: theme.fonts.display,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
      lineHeight: theme.fontSizes.xl * theme.lineHeights.tight,
    },
    year: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      paddingTop: 2,
    },
    meta: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textMuted,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    tag: {
      backgroundColor: theme.colors.accentMuted,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
    },
    tagText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.accent,
      fontWeight: theme.fontWeights.medium as '500',
    },
    reason: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSizes.base * theme.lineHeights.relaxed,
      fontStyle: 'italic',
    },
    warningBox: {
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.sm,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    warningText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.error,
    },
    providersRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    providersLabel: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
    },
    providersValue: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.medium as '500',
    },
    tmdbLink: {
      alignSelf: 'flex-start',
    },
    tmdbLinkText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.accent,
    },
    actions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSubtle,
    },
    skipButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      borderRightWidth: 1,
      borderRightColor: theme.colors.borderSubtle,
    },
    skipButtonText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.swipeReject,
      fontWeight: theme.fontWeights.semibold as '600',
    },
    acceptButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    acceptButtonText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.swipeAccept,
      fontWeight: theme.fontWeights.semibold as '600',
    },
  })
}
