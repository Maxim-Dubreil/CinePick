import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/useTheme'

type Props = {
  total: number
  current: number // 0-indexed
}

export default function OnboardingStepper({ total, current }: Props) {
  const theme = useTheme()

  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === current
        const isPast = index < current

        const backgroundColor = isActive
          ? theme.colors.accent
          : isPast
            ? theme.colors.accentDark
            : theme.colors.border

        const size = isActive ? 8 : 6

        return (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor,
                marginHorizontal: theme.spacing.xs / 2,
              },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {},
})
