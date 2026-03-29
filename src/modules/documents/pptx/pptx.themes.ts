/**
 * Professional Theme Presets for PowerPoint Generation
 *
 * Each theme includes coordinated colors, fonts, and shadow configurations
 * for creating visually polished presentations.
 */

/**
 * Shadow configuration for pptxgenjs
 */
export interface PptxShadowConfig {
  type: 'outer' | 'inner';
  color: string;
  blur: number;
  offset: number;
  angle: number;
  opacity: number;
}

/**
 * Professional theme preset definition
 */
export interface PptxThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;     // Slide background
    surface: string;        // Cards, shapes, containers
    primary: string;        // Titles, headings
    secondary: string;      // Subtitles, secondary text
    text: string;           // Body text
    accent: string;         // Highlights, key numbers, accents
    accentAlt: string;      // Secondary accent color
    muted: string;          // Subtle elements, borders
  };
  fonts: {
    title: string;
    body: string;
  };
  shadows: {
    card: PptxShadowConfig;
    subtle: PptxShadowConfig;
  };
  enableShadows: boolean;
}

/**
 * 5 Professional Theme Presets
 */
export const THEME_PRESETS: Record<string, PptxThemePreset> = {

  // Corporate Professional - Navy blue, clean business look
  corporate: {
    id: 'corporate',
    name: 'Corporate Professional',
    description: 'Clean, professional look with navy blue accents - ideal for business presentations',
    colors: {
      background: 'FFFFFF',
      surface: 'F5F7FA',
      primary: '1A365D',     // Dark navy
      secondary: '4A5568',   // Slate
      text: '2D3748',        // Dark gray
      accent: '2B6CB0',      // Professional blue
      accentAlt: '38A169',   // Success green
      muted: 'E2E8F0',       // Light gray
    },
    fonts: {
      title: 'Calibri',
      body: 'Calibri',
    },
    shadows: {
      card: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 135, opacity: 0.12 },
      subtle: { type: 'outer', color: '000000', blur: 4, offset: 2, angle: 135, opacity: 0.08 },
    },
    enableShadows: true,
  },

  // Modern Minimal - Clean white with bold typography
  modern: {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'Clean white background with bold typography - perfect for tech demos and pitches',
    colors: {
      background: 'FFFFFF',
      surface: 'F8FAFC',
      primary: '111827',     // Near black
      secondary: '6B7280',   // Gray
      text: '374151',        // Dark gray
      accent: '3B82F6',      // Bright blue
      accentAlt: 'EC4899',   // Pink
      muted: 'E5E7EB',       // Light gray
    },
    fonts: {
      title: 'Segoe UI',
      body: 'Segoe UI',
    },
    shadows: {
      card: { type: 'outer', color: '000000', blur: 12, offset: 4, angle: 135, opacity: 0.1 },
      subtle: { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 135, opacity: 0.06 },
    },
    enableShadows: true,
  },

  // Dark Executive - Sophisticated dark theme with gold accents
  dark: {
    id: 'dark',
    name: 'Dark Executive',
    description: 'Sophisticated dark theme with gold accents - great for executive presentations',
    colors: {
      background: '1A1A2E',  // Deep dark blue
      surface: '252545',     // Slightly lighter
      primary: 'EAEAEA',     // Light text
      secondary: 'B8B8D0',   // Muted light
      text: 'CCCCCC',        // Body text
      accent: 'D4AF37',      // Gold
      accentAlt: '00D4FF',   // Cyan
      muted: '3D3D5C',       // Dark muted
    },
    fonts: {
      title: 'Segoe UI Semibold',
      body: 'Segoe UI',
    },
    shadows: {
      card: { type: 'outer', color: '000000', blur: 16, offset: 6, angle: 135, opacity: 0.4 },
      subtle: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 135, opacity: 0.25 },
    },
    enableShadows: true,
  },

  // Nature Fresh - Earthy greens with organic feel
  nature: {
    id: 'nature',
    name: 'Nature Fresh',
    description: 'Earthy greens with organic feel - ideal for environmental and health topics',
    colors: {
      background: 'FEFEFE',
      surface: 'F0F7F4',     // Light green tint
      primary: '1B4332',     // Deep forest green
      secondary: '2D6A4F',   // Forest green
      text: '344E41',        // Dark green-gray
      accent: '40916C',      // Fresh green
      accentAlt: 'D4A373',   // Warm tan
      muted: 'D8E2DC',       // Soft sage
    },
    fonts: {
      title: 'Georgia',
      body: 'Segoe UI',
    },
    shadows: {
      card: { type: 'outer', color: '1B4332', blur: 10, offset: 4, angle: 135, opacity: 0.1 },
      subtle: { type: 'outer', color: '1B4332', blur: 5, offset: 2, angle: 135, opacity: 0.06 },
    },
    enableShadows: true,
  },

  // Tech Startup - Dark with vibrant purple/cyan accents
  tech: {
    id: 'tech',
    name: 'Tech Startup',
    description: 'Modern dark theme with vibrant accents - perfect for tech and startup presentations',
    colors: {
      background: '0F172A',  // Dark slate
      surface: '1E293B',     // Slightly lighter slate
      primary: 'F1F5F9',     // Light text
      secondary: '94A3B8',   // Slate gray
      text: 'CBD5E1',        // Light slate
      accent: '8B5CF6',      // Vibrant purple
      accentAlt: '06B6D4',   // Cyan
      muted: '334155',       // Dark muted
    },
    fonts: {
      title: 'Segoe UI',
      body: 'Segoe UI',
    },
    shadows: {
      card: { type: 'outer', color: '8B5CF6', blur: 20, offset: 0, angle: 135, opacity: 0.15 },
      subtle: { type: 'outer', color: '000000', blur: 8, offset: 3, angle: 135, opacity: 0.3 },
    },
    enableShadows: true,
  },
};

/**
 * Get a theme preset by ID
 */
export function getThemePreset(presetId: string): PptxThemePreset | undefined {
  return THEME_PRESETS[presetId];
}

/**
 * List all available theme preset IDs
 */
export function getThemePresetIds(): string[] {
  return Object.keys(THEME_PRESETS);
}
