import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ErrorBanner from './src/components/ErrorBanner'
import FilmCard from './src/components/FilmCard'
import FilmDetailScreen from './src/screens/FilmDetailScreen'
import HistoryScreen from './src/screens/HistoryScreen'
import HomeScreen from './src/screens/HomeScreen'
import LoadingScreen from './src/screens/LoadingScreen'
import ApiKeyScreen from './src/screens/onboarding/ApiKeyScreen'
import ConnectScreen from './src/screens/onboarding/ConnectScreen'
import InstructionsScreen from './src/screens/onboarding/InstructionsScreen'
import WelcomeScreen from './src/screens/onboarding/WelcomeScreen'
import QuestionsScreen from './src/screens/QuestionsScreen'
import {
  dismissSyncReminder,
  getCachedWatchlist,
  getHistory,
  getLastSyncTime,
  isOnboardingComplete,
  saveToHistory,
  setOnboardingComplete,
  shouldShowSyncBanner,
} from './src/services/api'
import { LLMError, recommend } from './src/services/llm'
import { useTheme } from './src/theme/useTheme'
import { Answers, Film, RefusedFilm, Screen } from './src/types'

const SWIPE_LIMIT = 3

function toReadableError(err: unknown): string {
  if (err instanceof LLMError) {
    switch (err.kind) {
      case 'invalid_key':
        return "Clé API invalide. Vérifie ta clé dans les paramètres."
      case 'quota_exceeded':
        return "Quota journalier atteint. Réessaie demain ou change de provider."
      case 'network':
        return "Impossible de joindre le provider IA. Vérifie ta connexion."
      case 'validation':
        return "Le modèle n'a pas pu trouver un film dans ta watchlist. Réessaie."
      case 'parse':
        return "Réponse inattendue du modèle IA. Réessaie."
    }
  }
  if ((err as { kind?: string }).kind === 'network') {
    return "Impossible de joindre le serveur. Vérifie ta connexion internet."
  }
  return "Une erreur inattendue s'est produite. Réessaie."
}

export default function App() {
  const theme = useTheme()

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('welcome')
  const slideAnim = useRef(new Animated.Value(0)).current

  // ── User data ──────────────────────────────────────────────────────────────
  const [username, setUsername] = useState('')
  const [watchlist, setWatchlist] = useState<Film[]>([])
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Answers>({})

  // ── Swipe / recommendation state ───────────────────────────────────────────
  const [swipeCount, setSwipeCount] = useState(0)
  const [refusedFilms, setRefusedFilms] = useState<RefusedFilm[]>([])
  const [currentFilm, setCurrentFilm] = useState<Film | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── History ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<Film[]>([])
  const [selectedFilm, setSelectedFilm] = useState<Film | null>(null)
  const [showBonFilmOverlay, setShowBonFilmOverlay] = useState(false)

  // ── Banners ────────────────────────────────────────────────────────────────
  const [syncBanner, setSyncBanner] = useState(false)
  const [syncBannerMsg, setSyncBannerMsg] = useState('')
  const [questionsBanner, setQuestionsBanner] = useState<string | null>(null)

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function bootstrap() {
      const onboardingDone = await isOnboardingComplete()
      if (!onboardingDone) {
        setScreen('welcome')
        return
      }

      // getCachedWatchlist() seed le storage (username, last_sync) en DEV_MOCK
      // avant que les lectures suivantes n'aient lieu.
      const cachedFilms = await getCachedWatchlist()
      const [cachedSync, storedUsername, cachedHistory] = await Promise.all([
        getLastSyncTime(),
        AsyncStorage.getItem('username'),
        getHistory(),
      ])

      if (cachedFilms.length > 0 && storedUsername) {
        setWatchlist(cachedFilms)
        setLastSync(cachedSync)
        setUsername(storedUsername)
        setHistory(cachedHistory)
        setScreen('home')

        const showBanner = await shouldShowSyncBanner()
        if (showBanner) {
          const days = cachedSync
            ? Math.floor((Date.now() - cachedSync) / (1000 * 60 * 60 * 24))
            : null
          setSyncBannerMsg(
            days
              ? `Ta watchlist n'a pas été mise à jour depuis ${days} jours.`
              : "Ta watchlist n'a jamais été synchronisée.",
          )
          setSyncBanner(true)
        }
      } else {
        setScreen('welcome')
      }
    }
    bootstrap()
  }, [])

  // ── Slide animation ────────────────────────────────────────────────────────
  function navigateTo(next: Screen, direction: 'forward' | 'back' = 'forward') {
    const outValue = direction === 'forward' ? -400 : 400
    const inValue = direction === 'forward' ? 400 : -400

    Animated.timing(slideAnim, {
      toValue: outValue,
      duration: theme.animation.normal,
      useNativeDriver: true,
    }).start(() => {
      slideAnim.setValue(inValue)
      setScreen(next)
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: theme.animation.normal,
        useNativeDriver: true,
      }).start()
    })
  }

  // ── Recommend ──────────────────────────────────────────────────────────────
  async function triggerRecommend(refused: RefusedFilm[]) {
    setLoadError(null)
    navigateTo('loading')

    try {
      const rec = await recommend({ watchlist, answers, refusedFilms: refused })
      const baseFilm = watchlist.find(
        (f) => f.title.toLowerCase() === rec.title.toLowerCase(),
      )
      const film: Film = { ...(baseFilm ?? { title: rec.title }), ...rec }
      setCurrentFilm(film)
      setScreen('result')
    } catch (err: unknown) {
      setLoadError(toReadableError(err))
      setScreen('result')
    }
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────
  function handleWelcomeNext() { navigateTo('api_key') }
  function handleApiKeyBack() { navigateTo('welcome', 'back') }
  function handleApiKeyNext() { navigateTo('instructions') }
  function handleInstructionsBack() { navigateTo('api_key', 'back') }
  function handleInstructionsNext() { navigateTo('connect') }
  function handleConnectBack() { navigateTo('instructions', 'back') }
  function handleConnectBackToInstructions() { navigateTo('instructions', 'back') }

  async function handleConnectSuccess(films: Film[]) {
    const storedUsername = await AsyncStorage.getItem('username') ?? ''
    setWatchlist(films)
    setLastSync(Date.now())
    setUsername(storedUsername)
    await setOnboardingComplete()
    navigateTo('home')
  }

  // ── Home ───────────────────────────────────────────────────────────────────
  function handleStart() {
    setRefusedFilms([])
    setSwipeCount(0)
    setCurrentFilm(null)
    navigateTo('questions')
  }

  function handleSyncComplete(films: Film[], syncedAt: number) {
    setWatchlist(films)
    setLastSync(syncedAt)
    setSyncBanner(false)
  }

  async function handleDismissBanner() {
    setSyncBanner(false)
    await dismissSyncReminder()
  }

  // ── Questions ──────────────────────────────────────────────────────────────
  function handleQuestionsComplete(newAnswers: Answers) {
    setAnswers(newAnswers)
    setQuestionsBanner(null)
    triggerRecommend(refusedFilms)
  }

  function handleQuestionsBack() {
    setQuestionsBanner(null)
    navigateTo('home', 'back')
  }

  function handleRecalibrateComplete(newAnswers: Answers) {
    setAnswers(newAnswers)
    triggerRecommend(refusedFilms)
  }

  function handleRecalibrateBack() {
    navigateTo('home', 'back')
  }

  // ── Swipe ──────────────────────────────────────────────────────────────────
  function handleSkip() {
    if (!currentFilm) return

    const newRefused: RefusedFilm[] = [
      ...refusedFilms,
      { title: currentFilm.title, genres: currentFilm.genres, runtime: currentFilm.runtime, mood_tags: currentFilm.mood_tags },
    ]
    const newCount = swipeCount + 1

    setRefusedFilms(newRefused)
    setSwipeCount(newCount)

    if (newCount >= SWIPE_LIMIT) {
      setSwipeCount(0)
      navigateTo('recalibrate', 'back')
    } else {
      triggerRecommend(newRefused)
    }
  }

  function handleAccept() {
    setShowBonFilmOverlay(true)
    if (currentFilm) {
      saveToHistory(currentFilm).then(() => {
        setHistory((prev) => {
          const deduped = prev.filter((f) => f.title !== currentFilm.title)
          return [currentFilm, ...deduped].slice(0, 50)
        })
      })
    }
  }

  function handleBonFilmDone() {
    setShowBonFilmOverlay(false)
    setSwipeCount(0)
    setRefusedFilms([])
    setAnswers({})
    setCurrentFilm(null)
    setLoadError(null)
    navigateTo('home', 'back')
  }

  // ── History ────────────────────────────────────────────────────────────────
  function handleOpenHistory() { navigateTo('history') }
  function handleHistoryBack() { navigateTo('home', 'back') }

  function handleSelectFilm(film: Film) {
    setSelectedFilm(film)
    navigateTo('film_detail')
  }

  function handleFilmDetailBack() {
    navigateTo('history', 'back')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function renderScreen() {
    switch (screen) {
      case 'welcome':
        return <WelcomeScreen onNext={handleWelcomeNext} />

      case 'api_key':
        return <ApiKeyScreen onBack={handleApiKeyBack} onNext={handleApiKeyNext} />

      case 'instructions':
        return (
          <InstructionsScreen
            onBack={handleInstructionsBack}
            onNext={handleInstructionsNext}
          />
        )

      case 'connect':
        return (
          <ConnectScreen
            onBack={handleConnectBack}
            onSuccess={handleConnectSuccess}
            onBackToInstructions={handleConnectBackToInstructions}
          />
        )

      case 'home':
        return (
          <View style={styles.flex}>
            {syncBanner && (
              <View style={styles.bannerOverlay}>
                <ErrorBanner
                  message={`${syncBannerMsg}  Sync →`}
                  onDismiss={handleDismissBanner}
                />
              </View>
            )}
            <HomeScreen
              username={username}
              watchlist={watchlist}
              lastSync={lastSync}
              historyCount={history.length}
              onStart={handleStart}
              onSyncComplete={handleSyncComplete}
              onHistory={handleOpenHistory}
            />
          </View>
        )

      case 'history':
        return (
          <HistoryScreen
            history={history}
            onBack={handleHistoryBack}
            onSelect={handleSelectFilm}
          />
        )

      case 'film_detail':
        return selectedFilm ? (
          <FilmDetailScreen film={selectedFilm} onBack={handleFilmDetailBack} />
        ) : null

      case 'questions':
        return (
          <View style={styles.flex}>
            {questionsBanner && (
              <View style={styles.bannerOverlay}>
                <ErrorBanner
                  message={questionsBanner}
                  onDismiss={() => setQuestionsBanner(null)}
                />
              </View>
            )}
            <QuestionsScreen
              onComplete={handleQuestionsComplete}
              onBack={handleQuestionsBack}
            />
          </View>
        )

      case 'recalibrate':
        return (
          <QuestionsScreen
            recalibrateMode
            refusedFilms={refusedFilms}
            initialAnswers={answers}
            onComplete={handleRecalibrateComplete}
            onBack={handleRecalibrateBack}
          />
        )

      case 'loading':
        return <LoadingScreen filmCount={watchlist.length} />

      case 'result':
        if (loadError) {
          return (
            <SafeAreaView style={[styles.flex, styles.darkBg]}>
              <View style={styles.errorScreen}>
                <Text style={styles.errorEmoji}>📡</Text>
                <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
                  Oups, une erreur
                </Text>
                <Text style={[styles.errorBody, { color: theme.colors.textMuted }]}>
                  {loadError}
                </Text>
                <TouchableOpacity
                  style={[styles.errorBtn, { backgroundColor: theme.colors.accent }]}
                  onPress={() => triggerRecommend(refusedFilms)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.errorBtnText, { color: theme.colors.bg }]}>
                    Réessayer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.errorBtn, styles.errorBtnOutline, { borderColor: theme.colors.border }]}
                  onPress={() => navigateTo('questions', 'back')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.errorBtnText, { color: theme.colors.textMuted }]}>
                    ← Retour aux questions
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          )
        }
        return (
          <View style={[styles.flex, styles.darkBg, styles.resultCenter]}>
            {currentFilm && (
              <FilmCard
                film={currentFilm}
                onAccept={handleAccept}
                onSkip={handleSkip}
              />
            )}
          </View>
        )
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <StatusBar style="light" />
      <Animated.View style={[styles.flex, { transform: [{ translateX: slideAnim }] }]}>
        {renderScreen()}
      </Animated.View>

      {/* Bon film! overlay — rendered above everything */}
      {showBonFilmOverlay && currentFilm && (
        <View style={styles.overlayBackdrop}>
          <View style={[styles.overlayCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={styles.overlayEmoji}>🍿</Text>
            <Text style={[styles.overlayTitle, { color: theme.colors.text }]}>Bon film !</Text>
            <Text style={[styles.overlayFilm, { color: theme.colors.textSubtle }]} numberOfLines={2}>
              {currentFilm.title}
            </Text>
            <TouchableOpacity
              style={[styles.overlayBtn, { backgroundColor: theme.colors.accent }]}
              onPress={handleBonFilmDone}
              activeOpacity={0.8}
            >
              <Text style={[styles.overlayBtnText, { color: theme.colors.bg }]}>
                Retour à l'accueil
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  overlayEmoji: {
    fontSize: 56,
  },
  overlayTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  overlayFilm: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  overlayBtn: {
    marginTop: 8,
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  overlayBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bannerOverlay: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  darkBg: {
    backgroundColor: '#0d0d0f',
  },
  resultCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  errorEmoji: {
    fontSize: 52,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBody: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBtn: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  errorBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  errorBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
