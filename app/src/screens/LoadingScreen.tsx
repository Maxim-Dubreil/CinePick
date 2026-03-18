import React, { useEffect, useRef, useState } from 'react'
import { Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'

type Props = {
  filmCount: number
}

const MESSAGES = [
  'Analyse de ta watchlist...',
  'On cherche le film parfait...',
  'Presque prêt...',
]

export default function LoadingScreen({ filmCount }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const spinAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const [msgIndex, setMsgIndex] = useState(0)

  // Spin loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [])

  // Cycle through messages with fade
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: theme.animation.fast,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animation.normal,
          useNativeDriver: true,
        }).start()
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text style={[styles.spinner, { transform: [{ rotate }] }]}>
          🎬
        </Animated.Text>

        <Animated.Text style={[styles.message, { opacity: fadeAnim }]}>
          {MESSAGES[msgIndex]}
        </Animated.Text>

        <Text style={styles.count}>
          {filmCount} film{filmCount > 1 ? 's' : ''} analysé{filmCount > 1 ? 's' : ''}
        </Text>
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
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
    },
    spinner: {
      fontSize: 56,
    },
    message: {
      fontSize: theme.fontSizes.lg,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.medium as '500',
      textAlign: 'center',
    },
    count: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textSubtle,
    },
  })
}
