import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import OnboardingStepper from '../../components/OnboardingStepper'
import { LLMError, saveProviderConfig, testApiKey } from '../../services/llm'
import { useTheme } from '../../theme/useTheme'
import type { Theme } from '../../theme/tokens'
import { AIProvider } from '../../types'

type Props = {
  onBack: () => void
  onNext: () => void
}

type ProviderConfig = {
  id: AIProvider
  name: string
  badge: string
  quota: string
  keyUrl: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    badge: 'RECOMMANDÉ · Gratuit',
    quota: '1 500 req/jour',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'groq',
    name: 'Groq (Llama 3.3)',
    badge: 'Gratuit · Très généreux',
    quota: '14 400 req/jour',
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4o)',
    badge: 'Payant après essai',
    quota: '',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    badge: 'Payant',
    quota: '',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
]

function getErrorMessage(err: unknown, providerName: string): string {
  if (err instanceof LLMError) {
    switch (err.kind) {
      case 'invalid_key':
        return `Clé non reconnue par ${providerName}. Vérifie que tu l'as bien copiée.`
      case 'quota_exceeded':
        return 'Quota journalier atteint. Réessaie demain ou choisis un autre provider.'
      case 'network':
        return `Impossible de joindre ${providerName}. Vérifie ta connexion.`
      default:
        return `Erreur inattendue. Réessaie.`
    }
  }
  return `Impossible de joindre ${providerName}. Vérifie ta connexion.`
}

export default function ApiKeyScreen({ onBack, onNext }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const selectedConfig = PROVIDERS.find((p) => p.id === selectedProvider)!
  const canVerify = apiKey.trim().length > 0

  async function handleVerify() {
    if (!canVerify || loading) return
    setErrorMsg(null)
    setLoading(true)
    try {
      await testApiKey(selectedProvider, apiKey.trim())
      await saveProviderConfig(selectedProvider, apiKey.trim())
      onNext()
    } catch (err) {
      setErrorMsg(getErrorMessage(err, selectedConfig.name))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backText}>◀ Retour</Text>
            </TouchableOpacity>
            <OnboardingStepper total={4} current={1} />
            <View style={styles.headerSpacer} />
          </View>

          {/* Title */}
          <Text style={styles.stepLabel}>Étape 1 sur 3</Text>
          <Text style={styles.title}>Connecte ton IA</Text>
          <Text style={styles.description}>
            CinePick utilise un modèle IA pour analyser ta watchlist. Tu as besoin d'une clé API
            gratuite.
          </Text>

          {/* Provider list */}
          <Text style={styles.sectionLabel}>Choisis ton provider :</Text>
          <View style={styles.providerList}>
            {PROVIDERS.map((provider) => {
              const isSelected = selectedProvider === provider.id
              return (
                <Pressable
                  key={provider.id}
                  style={[styles.providerRow, isSelected && styles.providerRowSelected]}
                  onPress={() => {
                    setSelectedProvider(provider.id)
                    setErrorMsg(null)
                  }}
                >
                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, isSelected && styles.providerNameSelected]}>
                      {provider.name}
                    </Text>
                    <View style={styles.providerMeta}>
                      <Text style={styles.providerBadge}>{provider.badge}</Text>
                      {provider.quota ? (
                        <Text style={styles.providerQuota}>{provider.quota}</Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              )
            })}
          </View>

          {/* API key input */}
          <Text style={styles.sectionLabel}>Ta clé API</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={(v) => {
                setApiKey(v)
                setErrorMsg(null)
              }}
              placeholder="Colle ta clé ici..."
              placeholderTextColor={theme.colors.textSubtle}
              secureTextEntry={!keyVisible}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setKeyVisible((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.eyeIcon}>{keyVisible ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Get key link */}
          <TouchableOpacity
            onPress={() => Linking.openURL(selectedConfig.keyUrl)}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Comment obtenir ma clé →</Text>
          </TouchableOpacity>

          {/* Error message */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Sticky verify button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !canVerify && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={!canVerify || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Vérifier la clé →</Text>
            )}
          </TouchableOpacity>
        </View>
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
    scroll: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.lg,
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
    },
    description: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSizes.base * theme.lineHeights.relaxed,
      marginBottom: theme.spacing.xl,
    },
    sectionLabel: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.textSubtle,
      fontWeight: theme.fontWeights.medium as '500',
      letterSpacing: theme.letterSpacing.wide,
      marginBottom: theme.spacing.sm,
    },
    providerList: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    providerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
      gap: theme.spacing.md,
    },
    providerRowSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentMuted,
    },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: theme.colors.accent,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.accent,
    },
    providerInfo: {
      flex: 1,
      gap: theme.spacing.xs / 2,
    },
    providerName: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
      fontWeight: theme.fontWeights.medium as '500',
    },
    providerNameSelected: {
      color: theme.colors.text,
    },
    providerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    providerBadge: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.textSubtle,
    },
    providerQuota: {
      fontSize: theme.fontSizes.xs,
      color: theme.colors.accent,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
      fontFamily: theme.fonts.mono,
    },
    eyeButton: {
      paddingHorizontal: theme.spacing.md,
    },
    eyeIcon: {
      fontSize: theme.fontSizes.lg,
    },
    linkButton: {
      marginBottom: theme.spacing.lg,
    },
    linkText: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.accent,
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
    footer: {
      paddingHorizontal: theme.spacing.screen,
      paddingBottom: theme.spacing.md,
      paddingTop: theme.spacing.sm,
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
  })
}
