import React, { useState } from 'react'
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import OnboardingStepper from '../../components/OnboardingStepper'
import { useTheme } from '../../theme/useTheme'
import type { Theme } from '../../theme/tokens'

type Props = {
  onBack: () => void
  onNext: () => void
}

const STEPS = [
  { number: '1', text: 'Va sur letterboxd.com' },
  { number: '2', text: 'Clique sur ton profil → Settings' },
  { number: '3', text: 'Onglet Privacy' },
  { number: '4', text: "Watchlist → sélectionne \"Visible to everyone\"" },
  { number: '5', text: 'Save changes' },
]

export default function InstructionsScreen({ onBack, onNext }: Props) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const [checked, setChecked] = useState(false)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>◀ Retour</Text>
          </TouchableOpacity>
          <OnboardingStepper total={4} current={2} />
          <View style={styles.headerSpacer} />
        </View>

        {/* Title */}
        <Text style={styles.stepLabel}>Étape 2 sur 3</Text>
        <Text style={styles.title}>Rends ta watchlist{'\n'}publique</Text>
        <Text style={styles.description}>
          CinePick lit ta watchlist directement depuis Letterboxd. Elle doit être publique.
        </Text>

        {/* Steps */}
        <View style={styles.stepsList}>
          {STEPS.map((step) => (
            <View key={step.number} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{step.number}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* Open Letterboxd button */}
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL('https://letterboxd.com/settings/privacy/')}
          activeOpacity={0.7}
        >
          <Text style={styles.linkButtonText}>Ouvrir Letterboxd ↗</Text>
        </TouchableOpacity>

        {/* Checkbox */}
        <Pressable style={styles.checkboxRow} onPress={() => setChecked((v) => !v)}>
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>C'est fait, ma watchlist est publique</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !checked && styles.buttonDisabled]}
          onPress={onNext}
          disabled={!checked}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continuer →</Text>
        </TouchableOpacity>
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
      lineHeight: theme.fontSizes.xxl * theme.lineHeights.tight,
    },
    description: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.textMuted,
      lineHeight: theme.fontSizes.base * theme.lineHeights.relaxed,
      marginBottom: theme.spacing.xl,
    },
    stepsList: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    stepBadge: {
      width: 32,
      height: 32,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.accentMuted,
      borderWidth: 1,
      borderColor: theme.colors.accentDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumber: {
      fontSize: theme.fontSizes.sm,
      fontWeight: theme.fontWeights.bold as '700',
      color: theme.colors.accent,
    },
    stepText: {
      flex: 1,
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
      lineHeight: theme.fontSizes.base * theme.lineHeights.normal,
    },
    linkButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.xl,
    },
    linkButtonText: {
      fontSize: theme.fontSizes.base,
      color: theme.colors.accent,
      fontWeight: theme.fontWeights.medium as '500',
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: theme.radius.sm,
      borderWidth: 2,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    checkmark: {
      fontSize: theme.fontSizes.sm,
      color: theme.colors.bg,
      fontWeight: theme.fontWeights.bold as '700',
    },
    checkboxLabel: {
      flex: 1,
      fontSize: theme.fontSizes.base,
      color: theme.colors.text,
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
