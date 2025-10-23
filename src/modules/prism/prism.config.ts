import type { SxProps } from '@mui/joy/styles/types';
import { OVERLAY_BUTTON_ZINDEX } from '~/modules/blocks/OverlayButton';

// PRISM recap - Nomenclature:
//  - Prism (public name) = Scatter (technology process) -> Ray[] (single scatter thread)
//  - Merge (public name) = Gather (technology process) -> Fusion[] (single gather thread)

// configuration [PRISM Common]
export const BEAM_INVERT_BACKGROUND = true;
export const BEAM_BTN_SX: SxProps = { minWidth: 128 };
export const BEAM_PANE_ZINDEX = OVERLAY_BUTTON_ZINDEX + 1; // on top of the overlay buttons
export const BEAM_SHOW_REASONING_ICON = false;

// configuration [PRISM Scatter]
export const SCATTER_COLOR = 'neutral' as const;
export const SCATTER_DEBUG_STATE = false;
export const SCATTER_PLACEHOLDER = '🖊️ ...'; // 💫 ..., 🖊️ ...
export const SCATTER_RAY_DEF = 2;
export const SCATTER_RAY_MAX = 8;
export const SCATTER_RAY_MIN = 1;
export const SCATTER_RAY_PRESETS = [2, 4, 8];
export const SCATTER_RAY_SHOW_DRAG_HANDLE = false;

// configuration [PRISM Gather]
export const GATHER_COLOR = 'success' as const;
export const GATHER_PLACEHOLDER = '📦 ...';
