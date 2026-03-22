import React from 'react'
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'
import { Film } from '../types'

type Props = {
  film: Film
  onBack: () => void
}

export default function FilmDetailScreen({ film, onBack }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Poster */}
        {film.poster ? (
          <Image
            source={{ uri: film.poster }}
            style={styles.poster}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.posterFallbackText}>🎬</Text>
          </View>
        )}

        {/* Title + year */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>{film.title}</Text>
          {film.year && <Text style={styles.year}>{film.year}</Text>}
        </View>

        {/* Genres */}
        {film.genres && film.genres.length > 0 && (
          <View style={styles.tags}>
            {film.genres.map((g) => (
              <View key={g} style={styles.tag}>
                <Text style={styles.tagText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Meta: runtime + match score */}
        {(film.runtime || film.match_score !== undefined) && (
          <View style={styles.metaRow}>
            {film.runtime && (
              <Text style={styles.meta}>{film.runtime} min</Text>
            )}
            {film.match_score !== undefined && (
              <Text style={styles.meta}>Match {film.match_score} %</Text>
            )}
          </View>
        )}

        {/* Overview */}
        {film.overview && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Synopsis</Text>
            <Text style={styles.sectionBody}>{film.overview}</Text>
          </View>
        )}

        {/* AI reason */}
        {film.reason && (
          <View style={[styles.section, styles.reasonCard]}>
            <Text style={styles.sectionLabel}>Pourquoi ce film ?</Text>
            <Text style={styles.sectionBody}>{film.reason}</Text>
          </View>
        )}

        {/* Providers */}
        {film.providers && film.providers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Disponible sur</Text>
            <View style={styles.tags}>
              {film.providers.map((p) => (
                <View key={p} style={styles.providerTag}>
                  <Text style={styles.providerText}>{p}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Warning */}
        {film.warning && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {film.warning}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    header: {
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    backText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.md,
    },
    poster: {
      width: '100%',
      height: 320,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
    },
    posterFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterFallbackText: {
      fontSize: 64,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    title: {
      flex: 1,
      fontSize: theme.fontSizes.xl,
      fontWeight: theme.fontWeights.bold as '700',
      color: theme.colors.text,
    },
    year: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textSubtle,
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    tag: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tagText: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      gap: theme.spacing.lg,
    },
    meta: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
    },
    section: {
      gap: theme.spacing.xs,
    },
    sectionLabel: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semibold as '600',
      color: theme.colors.textMuted,
      letterSpacing: theme.letterSpacing.wider,
      textTransform: 'uppercase',
    },
    sectionBody: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
      lineHeight: theme.fontSizes.base * theme.lineHeights.relaxed,
    },
    reasonCard: {
      backgroundColor: theme.colors.accentMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.accentDark,
    },
    providerTag: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    providerText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.text,
    },
    warningBox: {
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    warningText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.error,
      lineHeight: theme.fontSizes.sm * theme.lineHeights.relaxed,
    },
  })
}
