import * as React from 'react';

import { SvgIconProps, useColorScheme } from '@mui/joy';

export function ABOV3Icon(props: SvgIconProps) {
  const { fontSize, sx, ...otherProps } = props;
  const { mode } = useColorScheme();
  const size = fontSize === 'xl' ? '32px' : '24px';

  // Use black logo for light mode, white logo for dark mode
  const logoSrc = mode === 'dark' ? '/images/abov3-logo-white.png' : '/images/abov3-logo-black.png';

  return (
    <img
      src={logoSrc}
      alt='ABOV3'
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
      }}
      className={otherProps.className}
      id={otherProps.id}
    />
  );
}
