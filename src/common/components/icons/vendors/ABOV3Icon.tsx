import * as React from 'react';

import { useColorScheme } from '@mui/joy/styles';
import type { SvgIconProps } from '@mui/joy';

export function ABOV3Icon(props: SvgIconProps) {
  const { fontSize, sx, ...otherProps } = props;
  const size = fontSize === 'xl' ? '32px' : fontSize === 'lg' ? '28px' : '24px';

  // Track mounted state to avoid hydration mismatch
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Get current color mode for CSS filter
  const { mode, systemMode } = useColorScheme();

  // Determine dark mode - during SSR/initial render, default to light mode
  // After hydration, use actual color scheme
  const isDarkMode = mounted && (mode === 'dark' || (mode === 'system' && systemMode === 'dark'));

  return (
    <img
      src='/images/abov3-logo-outline.png'
      alt='ABOV3'
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: '4px',
        // Invert colors in dark mode to make gray outline appear white
        filter: isDarkMode ? 'invert(1) brightness(2)' : 'none',
        transition: 'filter 0.2s ease',
      }}
      className={otherProps.className}
      id={otherProps.id}
    />
  );
}
