import * as React from 'react';

import { useColorScheme } from '@mui/joy/styles';
import type { SvgIconProps } from '@mui/joy';

export function ABOV3Icon(props: SvgIconProps) {
  const { fontSize, sx, ...otherProps } = props;
  const size = fontSize === 'xl' ? '32px' : fontSize === 'lg' ? '28px' : '24px';

  // Get current color mode to use appropriate icon
  const { mode, systemMode } = useColorScheme();
  const isDarkMode = mode === 'dark' || (mode === 'system' && systemMode === 'dark');

  // Use white icon on dark background for dark mode, black icon for light mode
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
