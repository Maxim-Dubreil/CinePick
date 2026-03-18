import rawTokens from './tokens.json'

type Shadow = {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
}

export type Theme = {
  colors: {
    bg: string
    surface: string
    surfaceAlt: string
    border: string
    borderSubtle: string
    accent: string
    accentDark: string
    accentMuted: string
    text: string
    textMuted: string
    textSubtle: string
    textDisabled: string
    success: string
    error: string
    errorMuted: string
    swipeAccept: string
    swipeReject: string
  }
  fonts: {
    display: string
    mono: string
    body: string
  }
  fontSizes: {
    xs: number
    sm: number
    base: number
    md: number
    lg: number
    xl: number
    xxl: number
    display: number
  }
  fontWeights: {
    regular: string
    medium: string
    semibold: string
    bold: string
    extrabold: string
  }
  lineHeights: {
    tight: number
    normal: number
    relaxed: number
  }
  letterSpacing: {
    tight: number
    normal: number
    wide: number
    wider: number
    caps: number
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
    xxl: number
    screen: number
  }
  radius: {
    sm: number
    md: number
    lg: number
    xl: number
    full: number
  }
  shadows: {
    card: Shadow
    subtle: Shadow
  }
  animation: {
    fast: number
    normal: number
    slow: number
    spring: { tension: number; friction: number }
  }
  swipe: {
    threshold: number
    rotationDeg: number
  }
}

const tokens = rawTokens as unknown as Theme

export default tokens
