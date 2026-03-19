import React, { useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTheme } from '../theme/useTheme'
import type { Theme } from '../theme/tokens'
import { Answers, RefusedFilm } from '../types'

// ---------------------------------------------------------------------------
// Haptics — optional, graceful fallback
// ---------------------------------------------------------------------------

let hapticLight: () => void = () => {}
let hapticMedium: () => void = () => {}
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Haptics = require('expo-haptics')
  hapticLight = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  hapticMedium = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
} catch {
  // expo-haptics not available — no-op
}

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type LocalOption = { label: string; value: string }
type Layout = 'list' | 'grid' | 'multiselect'

type LocalQuestion = {
  id: string
  question: string
  layout: Layout
  options: LocalOption[]
}

// ---------------------------------------------------------------------------
// Standard questions (9 total)
// ---------------------------------------------------------------------------

const STANDARD_QUESTIONS: LocalQuestion[] = [
  {
    id: 'energy',
    question: "Quelle est ton énergie ce soir ?",
    layout: 'list',
    options: [
      { label: "Très chill, je veux me poser",       value: 'very_chill'   },
      { label: "Calme mais curieux",                  value: 'calm_curious' },
      { label: "Envie de réfléchir",                  value: 'reflective'   },
      { label: "Je veux rigoler",                     value: 'funny'        },
      { label: "Humeur émotionnelle",                 value: 'emotional'    },
      { label: "Besoin de frissons",                  value: 'thrills'      },
      { label: "Envie d'adrénaline",                  value: 'adrenaline'   },
      { label: "Je veux être surpris",                value: 'surprise'     },
      { label: "Film de fond",                        value: 'background'   },
      { label: "Intense, que ça m'embarque",          value: 'intense'      },
    ],
  },
  {
    id: 'company',
    question: "Tu regardes avec qui ?",
    layout: 'grid',
    options: [
      { label: "Seul(e)",       value: 'solo'    },
      { label: "En couple",     value: 'couple'  },
      { label: "Entre amis",    value: 'friends' },
      { label: "En famille",    value: 'family'  },
    ],
  },
  {
    id: 'duration',
    question: "Combien de temps t'as ?",
    layout: 'grid',
    options: [
      { label: "Moins d'1h30", value: 'short'  },
      { label: "1h30 – 2h",    value: 'medium' },
      { label: "2h et plus",   value: 'long'   },
      { label: "Peu importe",  value: 'any'    },
    ],
  },
  {
    id: 'platforms',
    question: "Sur quelles plateformes t'es abonné ?",
    layout: 'grid',
    options: [
      { label: "Netflix",      value: 'netflix'  },
      { label: "Disney+",      value: 'disney'   },
      { label: "Canal+",       value: 'canal'    },
      { label: "Prime Video",  value: 'prime'    },
      { label: "Apple TV+",    value: 'appletv'  },
      { label: "Peu importe",  value: 'any'      },
    ],
  },
  {
    id: 'attention',
    question: "Niveau d'attention ce soir ?",
    layout: 'list',
    options: [
      { label: "Film de fond, je serai sur mon téléphone", value: 'background' },
      { label: "Détendu, sans trop réfléchir",             value: 'relaxed'    },
      { label: "Concentré, je veux rien rater",            value: 'focused'    },
      { label: "Prêt pour quelque chose de complexe",      value: 'deep'       },
    ],
  },
  {
    id: 'era',
    question: "Époque du film ?",
    layout: 'grid',
    options: [
      { label: "Avant 1990",      value: 'classic' },
      { label: "Années 90–2000",  value: 'retro'   },
      { label: "2010 et après",   value: 'modern'  },
      { label: "Peu importe",     value: 'any'     },
    ],
  },
  {
    id: 'language',
    question: "Langue ?",
    layout: 'grid',
    options: [
      { label: "Français / VF",                value: 'french'  },
      { label: "VO anglais",                   value: 'english' },
      { label: "Cinéma mondial (sous-titres)", value: 'world'   },
      { label: "Peu importe",                  value: 'any'     },
    ],
  },
  {
    id: 'vibe',
    question: "Ambiance visuelle ?",
    layout: 'grid',
    options: [
      { label: "Sombre",      value: 'dark'      },
      { label: "Coloré",      value: 'colorful'  },
      { label: "Minimaliste", value: 'minimal'   },
      { label: "Peu importe", value: 'any'       },
    ],
  },
  {
    id: 'excluded_genres',
    question: "Genres à éviter ce soir ?",
    layout: 'multiselect',
    options: [
      { label: "Horreur",          value: 'horror'     },
      { label: "Comédie",          value: 'comedy'     },
      { label: "Action",           value: 'action'     },
      { label: "Thriller",         value: 'thriller'   },
      { label: "Romance",          value: 'romance'    },
      { label: "Science-fiction",  value: 'scifi'      },
      { label: "Fantasy",          value: 'fantasy'    },
      { label: "Policier",         value: 'crime'      },
      { label: "Historique",       value: 'historical' },
      { label: "Drame",            value: 'drama'      },
      { label: "Animation",        value: 'animation'  },
      { label: "Aucun",            value: 'none'       },
    ],
  },
]

// ---------------------------------------------------------------------------
// Recalibrate questions (generated from refused films)
// ---------------------------------------------------------------------------

function buildRecalibrateQuestions(refusedFilms: RefusedFilm[]): LocalQuestion[] {
  const genreCounts: Record<string, number> = {}
  for (const film of refusedFilms) {
    for (const genre of film.genres ?? []) {
      genreCounts[genre] = (genreCounts[genre] ?? 0) + 1
    }
  }

  const dominantGenre = Object.entries(genreCounts)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)[0]?.[0]

  if (dominantGenre) {
    return [
      {
        id: 'recalibrate_genre',
        question: `Ces films avaient du "${dominantGenre}". Tu veux l'éviter ?`,
        layout: 'grid',
        options: [
          { label: 'Oui, évite-le',   value: `avoid_${dominantGenre.toLowerCase()}` },
          { label: 'Non, continue',   value: 'keep'         },
          { label: 'Moins intense',   value: 'less_intense' },
          { label: 'Peu importe',     value: 'any'          },
        ],
      },
    ]
  }

  return [
    {
      id: 'recalibrate_feedback',
      question: "Qu'est-ce qui t'a pas plu ?",
      layout: 'list',
      options: [
        { label: 'Trop long',        value: 'too_long'    },
        { label: 'Mauvais genre',    value: 'wrong_genre' },
        { label: "Pas l'humeur",     value: 'wrong_mood'  },
        { label: 'Autre chose',      value: 'other'       },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  onComplete: (answers: Answers) => void
  onBack?: () => void
  recalibrateMode?: boolean
  refusedFilms?: RefusedFilm[]
  initialAnswers?: Answers
  lastRefusedFilm?: import('../types').Film
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuestionsScreen({
  onComplete,
  onBack,
  recalibrateMode = false,
  refusedFilms = [],
  initialAnswers = {},
}: Props) {
  const theme = useTheme()

  const questions: LocalQuestion[] = recalibrateMode
    ? buildRecalibrateQuestions(refusedFilms)
    : STANDARD_QUESTIONS

  const totalQuestions = questions.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [multiValues, setMultiValues] = useState<string[]>([])

  const slideAnim = useRef(new Animated.Value(0)).current

  const styles = makeStyles(theme)

  // ── Animation ─────────────────────────────────────────────────────────────

  function slide(direction: 'forward' | 'back', onMid: () => void) {
    const outTo = direction === 'forward' ? -SCREEN_WIDTH : SCREEN_WIDTH
    const inFrom = direction === 'forward' ? SCREEN_WIDTH : -SCREEN_WIDTH
    Animated.timing(slideAnim, {
      toValue: outTo,
      duration: theme.animation.normal,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(inFrom)
      onMid()
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.normal,
        useNativeDriver: true,
      }).start()
    })
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSelect(value: string) {
    hapticLight()
    const q = questions[currentIndex]
    const newAnswers = { ...answers, [q.id]: value }
    setAnswers(newAnswers)

    if (currentIndex < totalQuestions - 1) {
      slide('forward', () => {
        setCurrentIndex((i) => i + 1)
        setMultiValues([])
      })
    } else {
      onComplete(newAnswers)
    }
  }

  function handleMultiToggle(value: string) {
    hapticLight()
    if (value === 'none') {
      setMultiValues(['none'])
      return
    }
    setMultiValues((prev) => {
      const without = prev.filter((v) => v !== 'none')
      return without.includes(value)
        ? without.filter((v) => v !== value)
        : [...without, value]
    })
  }

  function handleMultiConfirm() {
    hapticMedium()
    const q = questions[currentIndex]
    const value = multiValues.length === 0 ? 'none' : multiValues.join(',')
    const newAnswers = { ...answers, [q.id]: value }
    setAnswers(newAnswers)

    if (currentIndex < totalQuestions - 1) {
      slide('forward', () => {
        setCurrentIndex((i) => i + 1)
        setMultiValues([])
      })
    } else {
      onComplete(newAnswers)
    }
  }

  function handleBack() {
    if (currentIndex === 0) {
      onBack?.()
    } else {
      slide('back', () => {
        setCurrentIndex((i) => i - 1)
        setMultiValues([])
      })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const question = questions[currentIndex]
  const isMultiSelect = question.layout === 'multiselect'
  const isList = question.layout === 'list'

  const questionNumber = String(currentIndex + 1).padStart(2, '0')

  return (
    <SafeAreaView style={styles.container}>
      {/* Subtle blue glow at top */}
      <View style={styles.glow} pointerEvents="none" />

      {/* 9-segment progress bar */}
      <View style={styles.progressRow}>
        {Array.from({ length: totalQuestions }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor:
                  i < currentIndex
                    ? theme.colors.accent
                    : i === currentIndex
                    ? theme.colors.accentDark
                    : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Header — back + counter */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.counter}>{currentIndex + 1} / {totalQuestions}</Text>
      </View>

      {/* Sliding content */}
      <Animated.View
        style={[styles.slideArea, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Recalibrate banner */}
        {recalibrateMode && (
          <View style={styles.recalibrateBanner}>
            <Text style={styles.recalibrateText}>On affine !</Text>
          </View>
        )}

        {/* Question number + text */}
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>{questionNumber}</Text>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            !isList && styles.gridContent,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isList
            ? question.options.map((opt, idx) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.listRow,
                    idx < question.options.length - 1 && styles.listRowSeparator,
                  ]}
                  onPress={() => handleSelect(opt.value)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.listLabel}>{opt.label}</Text>
                  <View style={styles.listDot} />
                </TouchableOpacity>
              ))
            : question.options.map((opt) => {
                const isSelected = isMultiSelect && multiValues.includes(opt.value)
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.gridCard,
                      isSelected && styles.gridCardSelected,
                    ]}
                    onPress={() =>
                      isMultiSelect
                        ? handleMultiToggle(opt.value)
                        : handleSelect(opt.value)
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.gridLabel,
                        isSelected && styles.gridLabelSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}

          {/* Confirm button — multiselect only */}
          {isMultiSelect && (
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: multiValues.length > 0 ? theme.colors.accent : theme.colors.textDisabled },
              ]}
              onPress={handleMultiConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>
                {multiValues.length === 0 ? 'Aucun — continuer →' : 'Valider →'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function makeStyles(theme: Theme) {
  const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.screen * 2 - theme.spacing.sm) / 2

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },

    // Glow
    glow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 180,
      backgroundColor: theme.colors.accentMuted,
      zIndex: 0,
    },

    // Progress
    progressRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.md,
      zIndex: 1,
    },
    segment: {
      flex: 1,
      height: 3,
      borderRadius: theme.radius.full,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.screen,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      zIndex: 1,
    },
    backBtn: {},
    backText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
    },
    counter: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      fontWeight: theme.fontWeights.medium as '500',
    },

    // Slide area
    slideArea: {
      flex: 1,
      zIndex: 1,
    },

    // Recalibrate banner
    recalibrateBanner: {
      marginHorizontal: theme.spacing.screen,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.accentMuted,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.accentDark,
    },
    recalibrateText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.accent,
      fontWeight: theme.fontWeights.semibold as '600',
    },

    // Question header
    questionHeader: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    questionNumber: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      fontWeight: theme.fontWeights.medium as '500',
      letterSpacing: theme.letterSpacing.wider,
    },
    questionText: {
      fontSize: theme.fontSizes.lg,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
      lineHeight: theme.fontSizes.lg * theme.lineHeights.tight,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.xl,
    },
    gridContent: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },

    // List layout
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.md,
    },
    listRowSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    listLabel: {
      flex: 1,
      fontSize: theme.fontSizes.base,
      color: theme.colors.textSubtle,
    },
    listDot: {
      width: 6,
      height: 6,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.border,
    },

    // Grid layout
    gridCard: {
      width: CARD_WIDTH,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
    },
    gridCardSelected: {
      borderColor: theme.colors.accentDark,
      backgroundColor: theme.colors.accentMuted,
    },
    gridLabel: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      textAlign: 'center',
      fontWeight: theme.fontWeights.medium as '500',
    },
    gridLabelSelected: {
      color: theme.colors.text,
      fontWeight: theme.fontWeights.semibold as '600',
    },

    // Confirm button
    confirmBtn: {
      width: '100%',
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    confirmBtnText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.bg,
      fontWeight: theme.fontWeights.semibold as '600',
    },
  })
}
