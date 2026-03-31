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

  // Get current color mode to use appropriate icon
  const { mode, systemMode } = useColorScheme();

  // Determine dark mode - during SSR/initial render, default to light mode icon
  // After hydration, use actual color scheme
  const isDarkMode = mounted && (mode === 'dark' || (mode === 'system' && systemMode === 'dark'));

  // Use white icon (with black background) for dark mode, black icon (transparent bg) for light mode
  const logoSrc = isDarkMode ? '/images/abov3-logo-white.png' : '/images/abov3-logo-black.png';

  return (
    <img
      src={logoSrc}
      alt='ABOV3'
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: '4px',
      }}
      className={otherProps.className}
      id={otherProps.id}
    />
  );
}
