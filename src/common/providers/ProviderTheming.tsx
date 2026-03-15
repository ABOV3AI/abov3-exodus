import * as React from 'react';

import { CacheProvider, EmotionCache } from '@emotion/react';
import { CssBaseline, CssVarsProvider } from '@mui/joy';

import { createAppTheme, createEmotionCache } from '~/common/app.theme';
import { useUIComplexityIsMinimal } from '~/common/stores/store-ui';


// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();


export const ProviderTheming = (props: { emotionCache?: EmotionCache, children: React.ReactNode }) => {

  // external state
  const zenMode = useUIComplexityIsMinimal();

  // recreate the theme only to apply zen touches
  const theme = React.useMemo(() => createAppTheme(zenMode), [zenMode]);

  return (
    <CacheProvider value={props.emotionCache || clientSideEmotionCache}>
      <CssVarsProvider defaultMode='dark' theme={theme}>
        <CssBaseline />
        {props.children}
      </CssVarsProvider>
    </CacheProvider>
  );
};
