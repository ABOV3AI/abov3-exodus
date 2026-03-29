import * as React from 'react';

import type { ColorPaletteProp, SxProps } from '@mui/joy/styles/types';
import { Box, Button, IconButton, Tooltip } from '@mui/joy';
import CompressIcon from '@mui/icons-material/Compress';

import { KeyStroke } from '~/common/components/KeyStroke';
import { animationEnterBelow } from '~/common/util/animUtils';


const desktopLegend =
  <Box sx={{ px: 1, py: 0.75, lineHeight: '1.5rem' }}>
    Compact conversation context to free up space<br />
    Removes old messages while preserving tool call pairs
  </Box>;

const mobileSx: SxProps = {
  mr: { xs: 1, md: 2 },
};

const desktopSx: SxProps = {
  '--Button-gap': '1rem',
  backgroundColor: 'background.popup',
  boxShadow: '0 4px 16px -4px rgb(var(--joy-palette-neutral-mainChannel) / 10%)',
  animation: `${animationEnterBelow} 0.1s ease-out`,
};


export const ButtonCompactMemo = React.memo(ButtonCompact);

function ButtonCompact(props: {
  isMobile?: boolean,
  color?: ColorPaletteProp,
  disabled?: boolean,
  loading?: boolean,
  onClick: () => void,
}) {
  return props.isMobile ? (
    <IconButton variant='soft' color={props.color ?? 'neutral'} disabled={props.disabled} onClick={props.onClick} sx={mobileSx}>
      <CompressIcon />
    </IconButton>
  ) : (
    <Tooltip disableInteractive variant='solid' arrow placement='right' title={desktopLegend}>
      <Button
        variant='soft'
        color={props.color ?? 'neutral'}
        disabled={props.disabled}
        loading={props.loading}
        onClick={props.onClick}
        endDecorator={<CompressIcon />}
        sx={desktopSx}
      >
        Compact
      </Button>
    </Tooltip>
  );
}
