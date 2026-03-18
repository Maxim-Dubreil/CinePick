import * as Haptics from 'expo-haptics'
import React, { useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import ProgressBar from '../components/ProgressBar'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'
import { Answers, Question } from '../types'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const QUESTIONS: Question[] = [
  {
    id: 'energy',
    question: "Quelle est ton énergie du soir ?",
    emoji: '⚡',
    options: [
      { label: 'Chill', value: 'chill', emoji: '😌', color: '#4ecdc4' },
      { label: 'Intense', value: 'intense', emoji: '🔥', color: '#ff6b6b' },
      { label: 'Surprends-moi', value: 'surprise', emoji: '🎲', color: '#a78bfa' },
      { label: 'Réfléchir', value: 'think', emoji: '🧠', color: '#60a5fa' },
    ],
  },
  {
    id: 'company',
    question: 'Tu regardes avec qui ?',
    emoji: '👥',
    options: [
      { label: 'Seul(e)', value: 'solo', emoji: '🧍', color: '#4ecdc4' },
      { label: 'En couple', value: 'couple', emoji: '💑', color: '#f472b6' },
      { label: 'Entre amis', value: 'friends', emoji: '🍻', color: '#fb923c' },
      { label: 'En famille', value: 'family', emoji: '👨‍👩‍👧', color: '#34d399' },
    ],
  },
  {
    id: 'duration',
    question: 'Combien de temps tu as ?',
    emoji: '⏱',
    options: [
      { label: '− de 1h30', value: 'short', emoji: '⚡', color: '#4ecdc4' },
      { label: '1h30 – 2h', value: 'medium', emoji: '🎯', color: '#60a5fa' },
      { label: '2h et +', value: 'long', emoji: '🏔', color: '#a78bfa' },
      { label: 'Peu importe', value: 'any', emoji: '♾', color: '#94a3b8' },
    ],
  },
  {
    id: 'mood',
    question: 'Ce que tu veux ressentir ?',
    emoji: '🎭',
    options: [
      { label: 'Avoir peur', value: 'scared', emoji: '👻', color: '#a78bfa' },
      { label: 'Rire', value: 'laugh', emoji: '😂', color: '#fbbf24' },
      { label: 'Être ému(e)', value: 'moved', emoji: '🥹', color: '#f472b6' },
      { label: 'Suspense', value: 'suspense', emoji: '😰', color: '#ff6b6b' },
    ],
  },
]

type Props = {
  onComplete: (answers: Answers) => void
  onBack: () => void
}

export default function QuestionsScreen({ onComplete, onBack }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})

  const slideAnim = useRef(new Animated.Value(0)).current

  const progress = ((currentIndex) / QUESTIONS.length) * 100

  function slideToNext(direction: 'forward' | 'back') {
    const toValue = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH
    Animated.timing(slideAnim, {
      toValue,
      duration: theme.animation.normal,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH)
      if (direction === 'forward') {
        setCurrentIndex((i) => i + 1)
      } else {
        setCurrentIndex((i) => i - 1)
      }
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.normal,
        useNativeDriver: true,
      }).start()
    })
  }

  function handleSelect(value: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const question = QUESTIONS[currentIndex]
    const newAnswers = { ...answers, [question.id]: value }
    setAnswers(newAnswers)

    if (currentIndex < QUESTIONS.length - 1) {
      slideToNext('forward')
    } else {
      onComplete(newAnswers)
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      onBack()
    } else {
      slideToNext('back')
    }
  }

  const question = QUESTIONS[currentIndex]

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressWrapper}>
        <ProgressBar progress={progress} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backText}>◀ Retour</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>
          {currentIndex + 1} / {QUESTIONS.length}
        </Text>
      </View>

      {/* Question */}
      <Animated.View
        style={[styles.questionArea, { transform: [{ translateX: slideAnim }] }]}
      >
        <Text style={styles.questionEmoji}>{question.emoji}</Text>
        <Text style={styles.questionText}>{question.question}</Text>

        {/* Options grid 2×2 */}
        <View style={styles.grid}>
          {question.options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionCard, { borderColor: option.color }]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={[styles.optionLabel, { color: option.color }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </SafeAreaView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    progressWrapper: {
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    backText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
    },
    counter: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      fontWeight: theme.fontWeights.medium as '500',
    },
    questionArea: {
      flex: 1,
      paddingHorizontal: theme.spacing.screen,
      justifyContent: 'center',
      gap: theme.spacing.lg,
    },
    questionEmoji: {
      fontSize: 48,
      textAlign: 'center',
    },
    questionText: {
      fontSize: theme.fontSizes.xl,
      fontFamily: theme.fonts.display,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
      textAlign: 'center',
      lineHeight: theme.fontSizes.xl * theme.lineHeights.tight,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    optionCard: {
      width: (SCREEN_WIDTH - theme.spacing.screen * 2 - theme.spacing.md) / 2,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1.5,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    optionEmoji: {
      fontSize: theme.fontSizes.xxl,
    },
    optionLabel: {
      fontSize: theme.fontSizes.base,
      fontWeight: theme.fontWeights.semibold as '600',
      textAlign: 'center',
    },
  })
}
