import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'

type Props = {
  progress: number // 0-100
}

export default function ProgressBar({ progress }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const width = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(width, {
      toValue: Math.min(100, Math.max(0, progress)),
      duration: theme.animation.normal,
      useNativeDriver: false,
    }).start()
  }, [progress])

  const widthPercent = width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { width: widthPercent }]} />
    </View>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    track: {
      height: 3,
      backgroundColor: theme.colors.borderSubtle,
      borderRadius: theme.radius.full,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.full,
    },
  })
}
