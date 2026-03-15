import * as React from 'react';
import Router from 'next/router';

import type { SxProps } from '@mui/joy/styles/types';

import { checkDivider, checkVisibileIcon, NavItemApp, navItems } from '~/common/app.nav';
import { UserMenu } from '~/common/components/UserMenu';
import { useUserFeatures } from '~/common/stores/store-user-features';

import { InvertedBar } from '../InvertedBar';
import { MobileNavGroupBox, MobileNavIcon, mobileNavItemClasses } from './MobileNavIcon';


export function MobileNav(props: {
  component: React.ElementType,
  currentApp?: NavItemApp,
  hideOnFocusMode?: boolean,
  sx?: SxProps,
}) {

  // external state
  // const { isFocusedMode } = useOptima...();

  // Subscribe to user features for nav visibility - this triggers re-render when features change
  const featuresLoaded = useUserFeatures((s) => s.isLoaded);
  const userFeatures = useUserFeatures((s) => s.features);
  const isAdmin = useUserFeatures((s) => s.isAdmin);
  const isMasterDev = useUserFeatures((s) => s.isMasterDev);


  // App items
  const navAppItems = React.useMemo(() => {
    return navItems.apps
      .filter(app => checkVisibileIcon(app, true, undefined))
      .map((app) => {
        const isActive = app === props.currentApp;

        if (checkDivider(app)) {
          // return <Divider key={'div-' + appIdx} sx={{ mx: 1, height: '50%', my: 'auto' }} />;
          return null;
        }

        return (
          <MobileNavIcon
            key={'n-m-' + app.route.slice(1)}
            aria-label={app.mobileName || app.name}
            variant={isActive ? 'solid' : undefined}
            onClick={() => Router.push(app.landingRoute || app.route)}
            className={`${mobileNavItemClasses.typeApp} ${isActive ? mobileNavItemClasses.active : ''}`}
          >
            {/*{(isActive && app.iconActive) ? <app.iconActive /> : <app.icon />}*/}
            <app.icon />
          </MobileNavIcon>
        );
      });
  }, [props.currentApp, featuresLoaded, userFeatures, isAdmin, isMasterDev]);


  // NOTE: this may be abrupt a little
  // if (isFocusedMode && props.hideOnFocusMode)
  //   return null;

  return (
    <InvertedBar
      id='mobile-nav'
      component={props.component}
      direction='horizontal'
      sx={props.sx}
    >

      <MobileNavGroupBox>
        <UserMenu variant='icon' />
        {navAppItems}
      </MobileNavGroupBox>

    </InvertedBar>
  );
}