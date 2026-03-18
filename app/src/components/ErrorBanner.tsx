import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'

type Props = {
  message: string
  onDismiss?: () => void
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  return (
    <View style={styles.banner}>
      <Text style={styles.message} numberOfLines={3}>
        {message}
      </Text>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.dismiss}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.errorMuted,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    message: {
      flex: 1,
      fontSize: theme.fontSizes.sm,
      color: theme.colors.error,
      lineHeight: theme.fontSizes.sm * theme.lineHeights.relaxed,
    },
    dismiss: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.error,
      fontWeight: theme.fontWeights.bold as '700',
    },
  })
}
