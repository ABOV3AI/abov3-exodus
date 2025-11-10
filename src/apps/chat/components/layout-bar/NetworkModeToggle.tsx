import * as React from 'react';

import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { IconButton, Tooltip } from '@mui/joy';

import { useNetworkModeStore } from '~/common/stores/store-network-mode';


/**
 * Network Mode Toggle Button
 * Switches between Online and Air-Gapped modes
 * - Online: All models work (default)
 * - Air-Gapped: Only ABOV3 and local models work
 */
export function NetworkModeToggle() {

  // external state
  const { networkMode, toggleNetworkMode } = useNetworkModeStore();

  const isOnline = networkMode === 'online';

  // Tooltip text
  const tooltipText = isOnline
    ? 'Network: Online - All models available'
    : 'Network: Air-Gapped - Only local models available';

  return (
    <Tooltip title={tooltipText} placement='bottom'>
      <IconButton
        variant='solid'
        color={isOnline ? 'success' : 'warning'}
        onClick={toggleNetworkMode}
        sx={{
          '--Icon-fontSize': '1.25rem',
          minWidth: '2rem',
          minHeight: '2rem',
          borderRadius: 'sm',
          ...(isOnline && {
            '& .MuiSvgIcon-root': {
              color: '#4caf50', // Bright green color for online icon
            },
          }),
        }}
      >
        {isOnline ? <CloudIcon /> : <CloudOffIcon />}
      </IconButton>
    </Tooltip>
  );
}
