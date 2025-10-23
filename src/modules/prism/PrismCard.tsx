import type { SxProps } from '@mui/joy/styles/types';
import { Box, styled } from '@mui/joy';

import { animationShadowLimey } from '~/common/util/animUtils';

import { BEAM_INVERT_BACKGROUND, BEAM_PANE_ZINDEX } from './prism.config';


export const prismCardClasses = {
  fusionIdle: 'prismCard-fusionIdle',
  errored: 'prismCard-Errored',
  selectable: 'prismCard-Selectable',
  attractive: 'prismCard-Attractive',
  smashTop: 'prismCard-SmashTop',
};

/**
 * Used for message-containing cards.
 */
export const PrismCard = styled(Box)(({ theme }) => ({
  '--Card-padding': '1rem',

  backgroundColor: theme.vars.palette.background.surface,
  border: '1px solid',
  borderColor: theme.vars.palette.neutral.outlinedBorder,
  borderRadius: theme.radius.md,

  padding: 'var(--Card-padding)',

  // [`&.${prismCardClasses.active}`]: {
  //   boxShadow: 'inset 0 0 0 2px #00f, inset 0 0 0 4px #00a',
  // },

  [`&.${prismCardClasses.fusionIdle}`]: {
    backgroundColor: BEAM_INVERT_BACKGROUND ? theme.vars.palette.background.level2 : theme.vars.palette.background.surface,
  },
  [`&.${prismCardClasses.selectable}`]: {
    backgroundColor: theme.vars.palette.background.popup,
  },
  [`&.${prismCardClasses.errored}`]: {
    backgroundColor: theme.vars.palette.danger.softBg,
    borderColor: theme.vars.palette.danger.outlinedBorder,
  },
  [`&.${prismCardClasses.attractive}`]: {
    animation: `${animationShadowLimey} 2s linear infinite`,
  },
  [`&.${prismCardClasses.smashTop}`]: {
    borderTop: 'none',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },

  position: 'relative',

  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--Pad_2)',

  // uncomment the following to limit the card height
  // maxHeight: 'calc(0.8 * (100dvh - 16rem))',
  // overflow: 'auto',
}));
PrismCard.displayName = 'PrismCard'; // [shared] scatter/gather pane style


export const prismCardMessageWrapperSx: SxProps = {
  minHeight: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  // uncomment the following to limit the message height
  // overflow: 'auto',
  // maxHeight: 'calc(0.8 * (100vh - 16rem))',
  // aspectRatio: 1,
};

export const prismCardMessageSx: SxProps = {
  // style: to undo the style of ChatMessage
  backgroundColor: 'none',
  border: 'none',
  mx: -1.5, // compensates for the marging (e.g. RenderChatText, )
  my: 0,
  px: 0,
  py: 0,
};

export const prismCardMessageScrollingSx: SxProps = {
  ...prismCardMessageSx,
  overflow: 'auto',
  maxHeight: 'max(18rem, calc(50lvh - 16rem))',
};


/**
 * Props for the two panes.
 */
export const beamPaneSx: SxProps = {
  // style
  p: 'var(--Pad)',
  py: 'calc(3 * var(--Pad) / 4)',
  zIndex: BEAM_PANE_ZINDEX, // cast shadow on the rays/fusion, and be on top of the overlay pane

  // layout
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--Pad_2)',
};