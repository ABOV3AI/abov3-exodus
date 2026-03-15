import createCache, { StylisElement, StylisPlugin } from '@emotion/cache';

import { Inter, JetBrains_Mono } from 'next/font/google';
import { extendTheme } from '@mui/joy';

import { animationEnterBelow } from '~/common/util/animUtils';


// Definitions
export type UIComplexityMode = 'minimal' | 'pro' | 'extra';
export type ContentScaling = 'xs' | 'sm' | 'md';


// CSS utils
export const hideOnMobile = { display: { xs: 'none', md: 'flex' } };


// Theme & Fonts

const font = Inter({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Helvetica', 'Arial', 'sans-serif'],
});
export const themeFontFamilyCss = font.style.fontFamily;

const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['monospace'],
});
export const themeCodeFontFamilyCss = jetBrainsMono.style.fontFamily;


export const createAppTheme = (uiComplexityMinimal: boolean) => extendTheme({
  fontFamily: {
    body: themeFontFamilyCss,
    display: themeFontFamilyCss,
    code: themeCodeFontFamilyCss,
  },
  fontSize: {
    xs: '0.65rem',
    sm: '0.75rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
    xl2: '1.25rem',
    xl3: '1.5rem',
    xl4: '1.875rem',
  },
  spacing: (factor: number) => `${0.25 * factor * 0.85}rem`,

  colorSchemes: {
    light: {
      palette: {
        primary: {
          solidBg: '#2563EB',
          solidHoverBg: '#1D4ED8',
        },
      },
    },
    dark: {
      palette: {
        primary: {
          solidBg: '#3B82F6',
          solidHoverBg: '#60A5FA',
        },
      },
    },
  },

  components: {
    JoyButton: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          transition: 'all 0.15s ease',
          fontWeight: 600,
          ...(ownerState.variant === 'solid' && {
            color: '#FFFFFF',
          }),
        }),
      },
    },

    JoyModal: {
      styleOverrides: {
        backdrop: !uiComplexityMinimal ? undefined : {
          backdropFilter: 'none',
        },
        root: uiComplexityMinimal ? undefined : {
          '& .agi-animate-enter': {
            animation: `${animationEnterBelow} 0.16s ease-out`,
          },
        },
      },
    },

    JoySwitch: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.size === 'md' && {
            '--Switch-thumbSize': '16px',
          }),
        }),
        thumb: {
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
  },
});


export const themeBgApp = 'background.level1';
export const themeBgAppDarker = 'background.level2';
export const themeBgAppChatComposer = 'background.surface';

export const lineHeightChatTextMd = 1.75;
export const lineHeightTextareaMd = 1.75;

export const themeZIndexPrismView = 10;
export const themeZIndexPageBar = 25;
export const themeZIndexDesktopDrawer = 26;
export const themeZIndexDesktopPanel = 27;
export const themeZIndexDesktopNav = 30;
export const themeZIndexChatBubble = 50;
export const themeZIndexDragOverlay = 60;
export const themeZIndexOverMobileDrawer = 1301;


// Dynamic UI Sizing

export function adjustContentScaling(scaling: ContentScaling, offset?: number) {
  if (!offset) return scaling;
  const scalingArray = ['xs', 'sm', 'md'];
  const scalingIndex = scalingArray.indexOf(scaling);
  const newScalingIndex = Math.max(0, Math.min(scalingArray.length - 1, scalingIndex + offset));
  return scalingArray[newScalingIndex] as ContentScaling;
}

interface ContentScalingOptions {
  blockCodeFontSize: string;
  blockCodeMarginY: number;
  blockFontSize: string;
  blockImageGap: number;
  blockLineHeight: string | number;
  chatMessagePadding: number;
  fragmentButtonFontSize: string;
  chatDrawerItemSx: { '--ListItem-minHeight': string, fontSize: string };
  chatDrawerItemFolderSx: { '--ListItem-minHeight': string, fontSize: string };
  optimaPanelGroupSize: 'sm' | 'md';
}

export const themeScalingMap: Record<ContentScaling, ContentScalingOptions> = {
  xs: {
    blockCodeFontSize: '0.65rem',
    blockCodeMarginY: 0.35,
    blockFontSize: 'xs',
    blockImageGap: 0.7,
    blockLineHeight: 1.5,
    chatMessagePadding: 0.7,
    fragmentButtonFontSize: 'xs',
    chatDrawerItemSx: { '--ListItem-minHeight': '1.75rem', fontSize: 'xs' },
    chatDrawerItemFolderSx: { '--ListItem-minHeight': '2rem', fontSize: 'xs' },
    optimaPanelGroupSize: 'sm',
  },
  sm: {
    blockCodeFontSize: '0.75rem',
    blockCodeMarginY: 1,
    blockFontSize: 'sm',
    blockImageGap: 1.5,
    blockLineHeight: 1.714286,
    chatMessagePadding: 1.5,
    fragmentButtonFontSize: 'sm',
    chatDrawerItemSx: { '--ListItem-minHeight': '2.25rem', fontSize: 'sm' },
    chatDrawerItemFolderSx: { '--ListItem-minHeight': '2.5rem', fontSize: 'sm' },
    optimaPanelGroupSize: 'sm',
  },
  md: {
    blockCodeFontSize: '0.875rem',
    blockCodeMarginY: 1.5,
    blockFontSize: 'md',
    blockImageGap: 2,
    blockLineHeight: 1.75,
    chatMessagePadding: 2,
    fragmentButtonFontSize: 'sm',
    chatDrawerItemSx: { '--ListItem-minHeight': '2.5rem', fontSize: 'md' },
    chatDrawerItemFolderSx: { '--ListItem-minHeight': '2.75rem', fontSize: 'md' },
    optimaPanelGroupSize: 'md',
  },
};


// Emotion Cache (with insertion point on the SSR pass)

const isBrowser = typeof document !== 'undefined';

const emotionStylisPlugins: StylisPlugin[] = [
  function removeSlowCSS(element: StylisElement) {
    if (
      element.type === 'rule'
      && element.value.endsWith('~*')
      && Array.isArray(element.children)
    ) {
      element.return = ' ';
      element.children = [];
    }
  },
];


export function createEmotionCache() {
  let insertionPoint: HTMLElement | undefined;

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector<HTMLMetaElement>(
      'meta[name="emotion-insertion-point"]',
    );
    insertionPoint = emotionInsertionPoint ?? undefined;
  }

  return createCache({ key: 'mui-style', insertionPoint: insertionPoint, stylisPlugins: emotionStylisPlugins });
}
