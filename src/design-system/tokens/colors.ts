// Primitive and Semantic Color Tokens for Education Management App
export const primitiveColors = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  sky: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE123C',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const semanticColors = {
  light: {
    // 4-Tier Surface Hierarchy
    bgApp: '#F4F6FA',         // Tier 1: Soft neutral canvas
    surfaceCard: '#FFFFFF',    // Tier 2: Card container
    surfaceSection: '#F8FAFC', // Tier 3: Nested section within card
    surfaceInput: '#FFFFFF',   // Tier 4: Interactive form controls
    surfaceHover: '#F1F5F9',   // Hover state
    surfaceSelected: '#E0F2FE',// Active/Selected state
    surfaceSubtle: '#F8FAFC',  // Subtle backgrounds

    // Text with WCAG AA/AAA compliance
    textPrimary: '#0F172A',    // Slate 900 (High contrast: ~14:1)
    textSecondary: '#475569',  // Slate 600 (Medium contrast: ~7:1)
    textTertiary: '#64748B',   // Slate 500
    textDisabled: '#94A3B8',   // Slate 400
    textInverse: '#FFFFFF',

    // Borders with distinct separation
    borderSubtle: '#E2E8F0',   // Slate 200
    borderDefault: '#CBD5E1',  // Slate 300 (Visible against card)
    borderStrong: '#94A3B8',   // Slate 400
    borderFocus: '#0284C7',    // Sky 600

    // Semantic Brand & Status
    primary: '#0284C7',
    primaryHover: '#0369A1',
    primaryActive: '#075985',
    primarySoft: '#E0F2FE',
    primaryForeground: '#FFFFFF',

    success: '#059669',
    successHover: '#047857',
    successSoft: '#D1FAE5',
    successForeground: '#FFFFFF',

    warning: '#D97706',
    warningHover: '#B45309',
    warningSoft: '#FEF3C7',
    warningForeground: '#FFFFFF',

    danger: '#E11D48',
    dangerHover: '#BE123C',
    dangerSoft: '#FFE4E6',
    dangerForeground: '#FFFFFF',

    info: '#0EA5E9',
    infoHover: '#0284C7',
    infoSoft: '#E0F2FE',
    infoForeground: '#FFFFFF',
  },
} as const;
