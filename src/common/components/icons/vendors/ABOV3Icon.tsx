import * as React from 'react';

import { SvgIconProps } from '@mui/joy';

export function ABOV3Icon(props: SvgIconProps) {
  const { fontSize, sx, ...otherProps } = props;
  const size = fontSize === 'xl' ? '32px' : '24px';

  return (
    <img
      src='/images/abov3-logo.png'
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
