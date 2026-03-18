import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import OnboardingStepper from '../../components/OnboardingStepper'
import { fetchWatchlist, warmBackend } from '../../services/api'
import { useTheme } from '../../theme/useTheme'
import type { Theme } from '../../theme/tokens'
import { Film, OnboardingError } from '../../types'

type Props = {
  onBack: () => void
  onSuccess: (films: Film[]) => void
  onBackToInstructions: () => void
}

type State = 'input' | 'loading' | 'success' | 'error'

type LoadingStep = {
  label: string
  status: 'pending' | 'active' | 'done'
}

const INITIAL_STEPS: LoadingStep[] = [
  { label: 'Connexion au serveur...', status: 'pending' },
  { label: 'Lecture de ta watchlist...', status: 'pending' },
  { label: 'Enrichissement des films', status: 'pending' },
]

export default function ConnectScreen({ onBack, onSuccess, onBackToInstructions }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const [screen, setScreen] = useState<State>('input')
  const [username, setUsername] = useState('')
  const [films, setFilms] = useState<Film[]>([])
  const [errorKind, setErrorKind] = useState<OnboardingError>(null)
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>(INITIAL_STEPS)

  const spinAnim = useRef(new Animated.Value(0)).current
  const successScale = useRef(new Animated.Value(0)).current
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (screen === 'loading') {
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      )
      spinLoop.current.start()
    } else {
      spinLoop.current?.stop()
      spinAnim.setValue(0)
    }
  }, [screen])

  function animateSuccess() {
    Animated.spring(successScale, {
      toValue: 1,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start()
  }

  function setStep(index: number, status: LoadingStep['status']) {
    setLoadingSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, status } : s)),
    )
  }

  async function handleLoad() {
    if (!username.trim()) return
    Keyboard.dismiss()

    setLoadingSteps(INITIAL_STEPS.map((s) => ({ ...s, status: 'pending' })))
    setScreen('loading')

    try {
      setStep(0, 'active')
      await warmBackend() // réveille Railway si cold start (3-5s)
      setStep(0, 'done')

      setStep(1, 'active')
      const result = await fetchWatchlist(username.trim())
      setStep(1, 'done')

      setStep(2, 'active')
      await new Promise((r) => setTimeout(r, 300))
      setStep(2, 'done')

      setFilms(result)
      setScreen('success')
      animateSuccess()
    } catch (err: unknown) {
      const kind = (err as { kind?: string }).kind
      if (kind === 'not_found') setErrorKind('not_found')
      else if (kind === 'private') setErrorKind('private')
      else setErrorKind('network')
      setScreen('error')
    }
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // ── State: Loading ──────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Animated.Text style={[styles.loadingIcon, { transform: [{ rotate: spin }] }]}>
            🎬
          </Animated.Text>
          <Text style={styles.loadingTitle}>Chargement en cours...</Text>
          <View style={styles.stepsList}>
            {loadingSteps.map((step, i) => (
              <View key={i} style={styles.loadingStepRow}>
                <Text style={styles.loadingStepIndex}>Étape {i + 1}/3</Text>
                <Text
                  style={[
                    styles.loadingStepLabel,
                    step.status === 'pending' && styles.loadingStepPending,
                    step.status === 'done' && styles.loadingStepDone,
                  ]}
                >
                  {step.label}
                </Text>
                {step.status === 'active' && (
                  <Animated.Text style={{ transform: [{ rotate: spin }] }}>⟳</Animated.Text>
                )}
                {step.status === 'done' && (
                  <Text style={styles.doneIcon}>✓</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── State: Success ──────────────────────────────────────────────────────────
  if (screen === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Animated.Text
            style={[styles.successIcon, { transform: [{ scale: successScale }] }]}
          >
            ✅
          </Animated.Text>
          <Text style={styles.successTitle}>Watchlist chargée !</Text>
          <Text style={styles.successSubtitle}>
            {films.length} films prêts à être analysés
          </Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => onSuccess(films)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>C'est parti 🎬</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── State: Error ────────────────────────────────────────────────────────────
  if (screen === 'error') {
    const isNotFound = errorKind === 'not_found'
    const isPrivate = errorKind === 'private'

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContent}>
          <Text style={styles.errorEmoji}>{isNotFound ? '⚠️' : isPrivate ? '🔒' : '📡'}</Text>
          <Text style={styles.errorTitle}>
            {isNotFound
              ? 'Profil introuvable'
              : isPrivate
                ? 'Watchlist inaccessible'
                : 'Problème de connexion'}
          </Text>
          <Text style={styles.errorBody}>
            {isNotFound
              ? `Le username "@${username}" n'existe pas sur Letterboxd.`
              : isPrivate
                ? "Ta watchlist semble être privée ou vide. Retourne sur l'étape précédente pour vérifier les réglages."
                : 'Impossible de joindre le serveur. Vérifie ta connexion internet.'}
          </Text>
        </View>
        <View style={styles.footer}>
          {isPrivate && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onBackToInstructions}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonSecondaryText}>← Retour aux instructions</Text>
            </TouchableOpacity>
          )}
          {!isPrivate && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => setScreen('input')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonSecondaryText}>← Modifier le username</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.button, isPrivate && styles.buttonOutline]}
            onPress={isNotFound ? () => setScreen('input') : handleLoad}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, isPrivate && styles.buttonOutlineText]}>
              {isNotFound ? 'Corriger le username' : 'Réessayer'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ── State: Input (default) ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
          <View style={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.backText}>◀ Retour</Text>
              </TouchableOpacity>
              <OnboardingStepper total={4} current={3} />
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.stepLabel}>Étape 3 sur 3</Text>
            <Text style={styles.title}>Ton username{'\n'}Letterboxd</Text>
            <Text style={styles.description}>
              On va charger tous tes films et les enrichir avec les affiches.
            </Text>

            {/* Input */}
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>letterboxd.com/</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={theme.colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLoad}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, !username.trim() && styles.buttonDisabled]}
              onPress={handleLoad}
              disabled={!username.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Charger ma watchlist →</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flex: 1,
      paddingHorizontal: theme.spacing.screen,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    backText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
    },
    headerSpacer: {
      width: 60,
    },
    stepLabel: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      letterSpacing: theme.letterSpacing.wide,
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontSize: theme.fontSizes.xxl,
      fontFamily: theme.fonts.display,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
      marginBottom: theme.spacing.sm,
      lineHeight: theme.fontSizes.xxl * theme.lineHeights.tight,
    },
    description: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSizes.base * theme.lineHeights.relaxed,
      marginBottom: theme.spacing.xl,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inputPrefix: {
      paddingLeft: theme.spacing.md,
      fontSize: theme.fontSizes.base,
      color: theme.colors.textSubtle,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
    },
    footer: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    button: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.bold as '700',
      color: theme.colors.bg,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonSecondaryText: {
      fontSize: theme.fontSizes.md,
      fontWeight: theme.fontWeights.medium as '500',
      color: theme.colors.textMuted,
    },
    buttonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.accent,
    },
    buttonOutlineText: {
      color: theme.colors.accent,
    },
    // Loading state
    centeredContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.screen,
      gap: theme.spacing.lg,
    },
    loadingIcon: {
      fontSize: 56,
    },
    loadingTitle: {
      fontSize: theme.fontSizes.xl,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.semibold as '600',
    },
    stepsList: {
      width: '100%',
      gap: theme.spacing.md,
    },
    loadingStepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    loadingStepIndex: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      width: 64,
    },
    loadingStepLabel: {
      flex: 1,
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
    },
    loadingStepPending: {
      color: theme.colors.textDisabled,
    },
    loadingStepDone: {
      color: theme.colors.textMuted,
    },
    doneIcon: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.success,
      fontWeight: theme.fontWeights.bold as '700',
    },
    // Success state
    successIcon: {
      fontSize: 72,
    },
    successTitle: {
      fontSize: theme.fontSizes.xxl,
      fontFamily: theme.fonts.display,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.bold as '700',
    },
    successSubtitle: {
      fontSize: theme.fontSizes.md,
      color: theme.colors.textMuted,
    },
    // Error state
    errorEmoji: {
      fontSize: 56,
    },
    errorTitle: {
      fontSize: theme.fontSizes.xl,
      color: theme.colors.text,
      fontWeight: theme.fontWeights.semibold as '600',
      textAlign: 'center',
    },
    errorBody: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: theme.fontSizes.base * theme.lineHeights.relaxed,
    },
  })
}
