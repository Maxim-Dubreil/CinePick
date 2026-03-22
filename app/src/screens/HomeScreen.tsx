import React, { useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { fetchWatchlist } from '../services/api'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'
import { Film } from '../types'

type Props = {
  username: string
  watchlist: Film[]
  lastSync: number | null
  historyCount: number
  onStart: () => void
  onSyncComplete: (films: Film[], syncedAt: number) => void
  onHistory: () => void
}

function formatSyncDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))
}

export default function HomeScreen({ username, watchlist, lastSync, historyCount, onStart, onSyncComplete, onHistory }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    setSyncError(null)
    try {
      const films = await fetchWatchlist(username)
      onSyncComplete(films, Date.now())
    } catch (err: unknown) {
      const kind = (err as { kind?: string }).kind
      if (kind === 'private') {
        setSyncError('Ta watchlist est privée. Rends-la publique dans les paramètres Letterboxd.')
      } else if (kind === 'not_found') {
        setSyncError(`Le profil "${username}" est introuvable.`)
      } else {
        setSyncError('Impossible de joindre le serveur. Vérifie ta connexion.')
      }
    } finally {
      setSyncing(false)
    }
  }

  const staleDays = lastSync ? daysSince(lastSync) : null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonsoir 👋</Text>
          <Text style={styles.username}>@{username}</Text>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statValue}>{watchlist.length}</Text>
            <Text style={styles.statLabel}>films dans ta watchlist</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.syncDate}>
            {lastSync
              ? `Dernière sync : ${formatSyncDate(lastSync)}`
              : 'Jamais synchronisé'}
          </Text>
          {staleDays !== null && staleDays >= 7 && (
            <Text style={styles.staleWarning}>
              ⚠️ Ta watchlist n'a pas été mise à jour depuis {staleDays} jours
            </Text>
          )}
        </View>

        {/* Sync error */}
        {syncError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{syncError}</Text>
          </View>
        )}

        {/* Main CTA */}
        <TouchableOpacity
          style={[styles.mainButton, watchlist.length === 0 && styles.buttonDisabled]}
          onPress={onStart}
          disabled={watchlist.length === 0}
          activeOpacity={0.8}
        >
          <Text style={styles.mainButtonText}>Trouver mon film ce soir 🎬</Text>
        </TouchableOpacity>

        {/* Sync button */}
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.buttonDisabled]}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          {syncing ? (
            <ActivityIndicator color={theme.colors.accent} size="small" />
          ) : (
            <Text style={styles.syncButtonText}>↻ Sync Letterboxd</Text>
          )}
        </TouchableOpacity>

        {/* History button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={onHistory}
          activeOpacity={0.7}
        >
          <View style={styles.historyLeft}>
            <Text style={styles.historyIcon}>🎬</Text>
            <View>
              <Text style={styles.historyLabel}>Mes films validés</Text>
              <Text style={styles.historySub}>
                {historyCount === 0
                  ? "Aucun film pour l'instant"
                  : `${historyCount} film${historyCount > 1 ? 's' : ''} regard\u00e9${historyCount > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>
          <View style={styles.historyRight}>
            {historyCount > 0 && (
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{historyCount}</Text>
              </View>
            )}
            <Text style={styles.historyChevron}>›</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    header: {
      marginBottom: theme.spacing.sm,
    },
    greeting: {
      fontSize: theme.fontSizes.lg,
      color: theme.colors.textMuted,
    },
    username: {
      fontSize: theme.fontSizes.xxl,
      fontFamily: theme.fonts.display,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
    },
    statsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      gap: theme.spacing.sm,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    statValue: {
      fontSize: theme.fontSizes.display,
      fontFamily: theme.fonts.display,
      color: theme.colors.accent,
      fontWeight: theme.fontWeights.bold as '700',
    },
    statLabel: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.borderSubtle,
    },
    syncDate: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
    },
    staleWarning: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.accentDark,
    },
    errorBox: {
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
    },
    errorText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.error,
      lineHeight: theme.fontSizes.sm * theme.lineHeights.relaxed,
    },
    mainButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    mainButtonText: {
      fontSize: theme.fontSizes.lg,
      fontWeight: theme.fontWeights.bold as '700',
      color: theme.colors.bg,
    },
    syncButton: {
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    syncButtonText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    historyLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    historyIcon: {
      fontSize: theme.fontSizes.xl,
    },
    historyLabel: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.medium as '500',
      color: theme.colors.text,
    },
    historySub: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSubtle,
      marginTop: theme.spacing.xs / 2,
    },
    historyRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    historyBadge: {
      backgroundColor: theme.colors.accentMuted,
      borderRadius: theme.radius.full,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: theme.colors.accentDark,
    },
    historyBadgeText: {
      fontSize: theme.fontSizes.xs,
      fontWeight: theme.fontWeights.semibold as '600',
      color: theme.colors.accent,
    },
    historyChevron: {
      fontSize: theme.fontSizes.xl,
      color: theme.colors.textDisabled,
    },
  })
}
