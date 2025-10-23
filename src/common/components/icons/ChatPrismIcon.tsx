import * as React from 'react';

import { SvgIcon, SvgIconProps } from '@mui/joy';

export function ChatPrismIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox='0 0 24 24' width='24' height='24' {...props}>
      {/* White light beam entering from left */}
      <line x1="1" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>

      {/* Triangular prism */}
      <path
        d="M 9,8 L 15,12 L 9,16 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        opacity="0.9"
      />

      {/* Prism internal lines for 3D effect */}
      <line x1="9" y1="8" x2="11" y2="9.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>
      <line x1="9" y1="16" x2="11" y2="14.5" stroke="currentColor" strokeWidth="0.5" opacity="0.4"/>

      {/* Rainbow spectrum rays exiting prism (red, orange, yellow, green, blue, violet) */}
      <line x1="15" y1="12" x2="23" y2="8" stroke="#ff4444" strokeWidth="1.2" opacity="0.85"/>
      <line x1="15" y1="12" x2="23" y2="9.5" stroke="#ff8844" strokeWidth="1.2" opacity="0.85"/>
      <line x1="15" y1="12" x2="23" y2="11" stroke="#ffdd44" strokeWidth="1.2" opacity="0.85"/>
      <line x1="15" y1="12" x2="23" y2="13" stroke="#44ff44" strokeWidth="1.2" opacity="0.85"/>
      <line x1="15" y1="12" x2="23" y2="14.5" stroke="#4488ff" strokeWidth="1.2" opacity="0.85"/>
      <line x1="15" y1="12" x2="23" y2="16" stroke="#aa44ff" strokeWidth="1.2" opacity="0.85"/>

      {/* Light dots for animation effect */}
      <circle cx="5" cy="12" r="0.8" fill="currentColor" opacity="0.6"/>
      <circle cx="12" cy="12" r="0.8" fill="currentColor" opacity="0.7"/>
    </SvgIcon>
  );
}