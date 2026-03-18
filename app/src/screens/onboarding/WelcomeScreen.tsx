import React, { useEffect, useRef } from 'react'
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../../theme/useTheme'

type Props = {
  onNext: () => void
}

const FEATURES = [
  {
    emoji: '🎬',
    title: 'Ta watchlist Letterboxd',
    description: 'On analyse ta liste pour trouver le film parfait ce soir.',
  },
  {
    emoji: '🎯',
    title: '4 questions, 1 film',
    description: 'Ton humeur, ton temps, avec qui — on choisit pour toi.',
  },
  {
    emoji: '✨',
    title: 'Recommandation IA',
    description: 'Gemini ou Groq analysent ta watchlist en quelques secondes.',
  },
]

export default function WelcomeScreen({ onNext }: Props) {
  const theme = useTheme()

  const featureAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current

  useEffect(() => {
    const animations = featureAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: theme.animation.slow,
        delay: 200 + index * 100,
        useNativeDriver: true,
      }),
    )
    Animated.stagger(0, animations).start()
  }, [])

  const styles = makeStyles(theme)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.icon}>🎬</Text>
        <Text style={styles.title}>CinePick</Text>
        <Text style={styles.tagline}>
          Finis les soirées à scroller.{'\n'}On choisit le film pour toi.
        </Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature, index) => {
          const opacity = featureAnims[index]
          const translateY = featureAnims[index].interpolate({
            inputRange: [0, 1],
            outputRange: [16, 0],
          })

          return (
            <Animated.View
              key={index}
              style={[styles.featureBlock, { opacity, transform: [{ translateY }] }]}
            >
              <Text style={styles.featureEmoji}>{feature.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </Animated.View>
          )
        })}
      </View>

      <TouchableOpacity style={styles.button} onPress={onNext} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Commencer →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
      paddingHorizontal: theme.spacing.screen,
      justifyContent: 'space-between',
      paddingBottom: theme.spacing.xl,
    },
    hero: {
      alignItems: 'center',
      paddingTop: theme.spacing.xxl,
    },
    icon: {
      fontSize: 64,
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.fontSizes.display,
      fontFamily: theme.fonts.display,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
      letterSpacing: theme.letterSpacing.tight,
      marginBottom: theme.spacing.sm,
    },
    tagline: {
      fontSize: theme.fontSizes.md,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: theme.fontSizes.md * theme.lineHeights.relaxed,
    },
    features: {
      gap: theme.spacing.md,
    },
    featureBlock: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      gap: theme.spacing.md,
    },
    featureEmoji: {
      fontSize: theme.fontSizes.xl,
    },
    featureText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    featureTitle: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.semibold as '600',
    },
    featureDescription: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSizes.sm * theme.lineHeights.relaxed,
    },
    button: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.bold as '700',
      color: theme.colors.bg,
    },
  })
}
