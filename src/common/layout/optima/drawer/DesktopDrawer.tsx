import * as React from 'react';

import { Box, Sheet, styled } from '@mui/joy';

import { checkVisibleNav, NavItemApp } from '~/common/app.nav';
import { themeZIndexDesktopDrawer } from '~/common/app.theme';

import { OPTIMA_DRAWER_BACKGROUND } from '../optima.config';
import { optimaCloseDrawer, optimaOpenDrawer, useOptimaDrawerOpen, useOptimaDrawerPeeking } from '../useOptima';
import { useOptimaPortalOutRef } from '../portals/useOptimaPortalOutRef';


// Desktop Drawer

const DesktopDrawerFixRoot = styled(Box)({
  // fix the drawer size
  width: 'var(--AGI-Desktop-Drawer-width)',
  flexShrink: 0,
  flexGrow: 0,

  // Base state
  zIndex: themeZIndexDesktopDrawer,

  '&[data-closed="true"]': {
    contain: 'strict',
    pointerEvents: 'none',
  },

  '&.drawer-peeking': {
    zIndex: themeZIndexDesktopDrawer + 1, // elevate z-index when peeking
  },
});

const DesktopDrawerTranslatingSheet = styled(Sheet)(({ theme }) => ({
  // layout
  width: '100%',
  height: '100dvh',
  zIndex: 1, // just to allocate a layer; this was: themeZIndexDesktopDrawer

  // styling
  backgroundColor: OPTIMA_DRAWER_BACKGROUND,
  borderRight: '1px solid',
  // the border right color is from: theme.palette.divider, which is this /0.2 (light) and /0.16 (dark)
  borderRightColor: 'rgba(var(--joy-palette-neutral-mainChannel, 99 107 116) / 0.4)',
  // borderTopRightRadius: OPTIMA_DRAWER_MOBILE_RADIUS,
  // borderBottomRightRadius: OPTIMA_DRAWER_MOBILE_RADIUS,
  // contain: 'strict',
  // boxShadow: theme.shadow.md, // too thin and complex; also tried 40px blurs
  boxShadow: `0px 0px 6px 0 rgba(${theme.palette.neutral.darkChannel} / 0.12)`,

  // content layout
  display: 'flex',
  flexDirection: 'column',


  // base state (normal open/close, and peeking exit)
  transform: 'none',
  transition: 'transform 0.42s cubic-bezier(.17,.84,.44,1), box-shadow 0.42s cubic-bezier(.17,.84,.44,1)',
  willChange: 'transform, box-shadow',

  // Closed state via data attribute
  '&[data-closed="true"]': {
    transform: 'translateX(-101%)', // the extra 1% takes care of fractional units (custom monitor scaling)
    borderRightColor: 'transparent',
  },

  // Peek state via class
  '&.drawer-peeking': {
    transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)', // faster enter animation, shadow as-is
    boxShadow: '0 0 48px rgba(var(--joy-palette-primary-mainChannel) / 0.6)', // stronger shadow when peeking, was theme.shadow.lg
    borderRightColor: 'transparent',
  },
})) as typeof Sheet;


export function DesktopDrawer(props: { component: React.ElementType, currentApp?: NavItemApp }) {

  // state
  const drawerPortalRef = useOptimaPortalOutRef('optima-portal-drawer', 'DesktopDrawer');
  const [drawerWidth, setDrawerWidth] = React.useState(() => {
    // Load saved width from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agi-drawer-width');
      if (saved) {
        const width = parseInt(saved, 10);
        if (!isNaN(width) && width >= 250 && width <= 1200) {
          return width;
        }
      }
    }
    return 300; // default
  });
  const [isResizingDrawer, setIsResizingDrawer] = React.useState(false);

  // external state
  const _isDrawerOpen = useOptimaDrawerOpen();
  const isDrawerPeeking = useOptimaDrawerPeeking();
  const isDrawerOpen = _isDrawerOpen || isDrawerPeeking;
  // const hasDrawerContent = useOptimaPortalHasInputs('optima-portal-drawer');

  // Handle horizontal resize
  const handleDrawerResizeStart = React.useCallback(() => {
    setIsResizingDrawer(true);
  }, []);

  React.useEffect(() => {
    if (!isResizingDrawer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = e.clientX;

      // Constrain between 250px and 1200px (increased from 600px)
      if (newWidth >= 250 && newWidth <= 1200) {
        setDrawerWidth(newWidth);
        // Update CSS variable
        document.documentElement.style.setProperty('--AGI-Desktop-Drawer-width', `${newWidth}px`);
      }
    };

    const handleMouseUp = () => {
      setIsResizingDrawer(false);
      // Save to localStorage when resize is complete
      if (typeof window !== 'undefined') {
        localStorage.setItem('agi-drawer-width', drawerWidth.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingDrawer]);

  // Initialize drawer width from saved preference or CSS variable on mount
  React.useEffect(() => {
    // Apply the saved/default width to CSS variable
    document.documentElement.style.setProperty('--AGI-Desktop-Drawer-width', `${drawerWidth}px`);
  }, [drawerWidth]);


  // Desktop-only?: close the drawer if the current app doesn't use it
  const currentAppUsesDrawer = !props.currentApp?.hideDrawer;
  React.useEffect(() => {
    if (!currentAppUsesDrawer)
      optimaCloseDrawer();
  }, [currentAppUsesDrawer]);

  // [special case] remove in the future
  const shallOpenNavForSharedLink = !props.currentApp?.hideDrawer && checkVisibleNav(props.currentApp);
  React.useEffect(() => {
    if (shallOpenNavForSharedLink)
      optimaOpenDrawer();
  }, [shallOpenNavForSharedLink]);


  return (
    <DesktopDrawerFixRoot
      data-closed={!isDrawerOpen}
      className={isDrawerPeeking ? 'drawer-peeking' : undefined}
      sx={{ position: 'relative' }}
    >

      <DesktopDrawerTranslatingSheet
        ref={drawerPortalRef}
        component={props.component}
        data-closed={!isDrawerOpen}
        className={isDrawerPeeking ? 'drawer-peeking' : undefined}
      >

        {/* NOTE: this sort of algo was not used when we migrated this to Portals on 2024-07-30, so not restoring it ... */}
        {/*/!* [UX Responsiveness] Keep Mounted for now *!/*/}
        {/*{(!softDrawerUnmount || isDrawerOpen || !UNMOUNT_DELAY_MS) &&*/}
        {/*  appDrawerContent*/}
        {/*}*/}

      </DesktopDrawerTranslatingSheet>

      {/* Horizontal Resize Handle */}
      {isDrawerOpen && (
        <Box
          onMouseDown={handleDrawerResizeStart}
          sx={{
            position: 'absolute',
            top: 0,
            right: -3,
            bottom: 0,
            width: '6px',
            cursor: 'ew-resize',
            bgcolor: isResizingDrawer ? 'primary.500' : 'transparent',
            '&:hover': {
              bgcolor: 'primary.300',
            },
            transition: 'background-color 0.2s',
            zIndex: themeZIndexDesktopDrawer + 2,
          }}
        />
      )}

    </DesktopDrawerFixRoot>
  );
}