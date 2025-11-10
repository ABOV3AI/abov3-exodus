import * as React from 'react';

import { SvgIconProps } from '@mui/joy';

export function ABOV3Icon(props: SvgIconProps) {
  const { sx, ...otherProps } = props;
  return (
    <img
      src='/images/abov3-logo.png'
      alt='ABOV3'
      style={{
        width: props.fontSize === 'xl' ? '32px' : '24px',
        height: props.fontSize === 'xl' ? '32px' : '24px',
        objectFit: 'contain',
        ...sx,
      }}
      {...otherProps}
    />
  );
}
