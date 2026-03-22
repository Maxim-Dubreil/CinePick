import React from 'react'
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'
import { Film } from '../types'

type Props = {
  history: Film[]
  onBack: () => void
  onSelect: (film: Film) => void
}

export default function HistoryScreen({ history, onBack, onSelect }: Props) {
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
        <Text style={styles.title}>Mes films validés</Text>
        <Text style={styles.count}>{history.length}</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎬</Text>
          <Text style={styles.emptyText}>Aucun film validé pour l'instant.</Text>
          <Text style={styles.emptySubtext}>
            Swipe à droite sur un film recommandé pour l'ajouter ici.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, idx) => `${item.title}-${idx}`}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
            >
              {item.poster ? (
                <Image
                  source={{ uri: item.poster }}
                  style={styles.poster}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.poster, styles.posterFallback]}>
                  <Text style={styles.posterFallbackText}>🎬</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.filmTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.filmMeta} numberOfLines={1}>
                  {[item.year, item.genres?.slice(0, 2).join(' · ')]
                    .filter(Boolean)
                    .join(' — ')}
                </Text>
                {item.runtime && (
                  <Text style={styles.runtime}>{item.runtime} min</Text>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderSubtle,
    },
    backText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      width: 60,
    },
    title: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.semibold as '600',
      color: theme.colors.text,
    },
    count: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textDisabled,
      width: 60,
      textAlign: 'right',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.screen,
    },
    emptyEmoji: {
      fontSize: 48,
    },
    emptyText: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.semibold as '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      textAlign: 'center',
      lineHeight: theme.fontSizes.sm * theme.lineHeights.relaxed,
    },
    list: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.xl,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.borderSubtle,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    poster: {
      width: 48,
      height: 72,
      borderRadius: theme.radius.sm,
    },
    posterFallback: {
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterFallbackText: {
      fontSize: 20,
    },
    info: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    filmTitle: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.semibold as '600',
      color: theme.colors.text,
    },
    filmMeta: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
    },
    runtime: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textDisabled,
    },
    chevron: {
      fontSize: 22,
      color: theme.colors.textDisabled,
    },
  })
}
