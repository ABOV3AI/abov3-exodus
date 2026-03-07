import * as React from 'react';
import { useState } from 'react';
import Head from 'next/head';
import { MyAppProps } from 'next/app';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/next';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { Brand } from '~/common/app.config';
import { apiQuery, apiQueryCloud, getCloudClientConfig, getCloudQueryClient } from '~/common/util/trpc.client';

import 'katex/dist/katex.min.css';
import '~/common/styles/CodePrism.css';
import '~/common/styles/GithubMarkdown.css';
import '~/common/styles/NProgress.css';
import '~/common/styles/agi.effects.css';
import '~/common/styles/app.styles.css';

import { ErrorBoundary } from '~/common/components/ErrorBoundary';
import { Is } from '~/common/util/pwaUtils';
import { OverlaysInsert } from '~/common/layout/overlays/OverlaysInsert';
import { ProviderBackendCapabilities } from '~/common/providers/ProviderBackendCapabilities';
import { ProviderBootstrapLogic } from '~/common/providers/ProviderBootstrapLogic';
import { ProviderSingleTab } from '~/common/providers/ProviderSingleTab';
import { ProviderTheming } from '~/common/providers/ProviderTheming';
import { SnackbarInsert } from '~/common/components/snackbar/SnackbarInsert';
import { hasGoogleAnalytics, OptionalGoogleAnalytics } from '~/common/components/3rdparty/GoogleAnalytics';
import { hasPostHogAnalytics, OptionalPostHogAnalytics } from '~/common/components/3rdparty/PostHogAnalytics';


/**
 * Cloud tRPC Provider wrapper.
 * Uses createTRPCReact with manual provider setup to avoid context conflicts
 * with the edge tRPC router which uses createTRPCNext.
 */
function CloudTRPCProvider({ children }: { children: React.ReactNode }) {
  // Using useState to ensure the client is created once per component lifecycle
  const [cloudTrpcClient] = useState(() =>
    apiQueryCloud.createClient(getCloudClientConfig())
  );

  // Get the shared query client
  const cloudQueryClient = getCloudQueryClient();

  return (
    <apiQueryCloud.Provider client={cloudTrpcClient} queryClient={cloudQueryClient}>
      <QueryClientProvider client={cloudQueryClient}>
        {children}
      </QueryClientProvider>
    </apiQueryCloud.Provider>
  );
}


const Big_AGI_App = ({ Component, emotionCache, pageProps }: MyAppProps) => {

  // We are using a nextjs per-page layout pattern to bring the (Optima) layout creation to a shared place
  // This reduces the flicker and the time switching between apps, and seems to not have impact on
  // the build. This is a good trade-off for now.
  const getLayout = Component.getLayout ?? ((page: any) => page);

  return <>

    <Head>
      <title>{Brand.Title.Common}</title>
      <meta name='viewport' content='minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no' />
    </Head>

    <SessionProvider session={pageProps.session}>
      {/* Cloud tRPC provider (manual setup for createTRPCReact) */}
      <CloudTRPCProvider>
        <ProviderTheming emotionCache={emotionCache}>
          <ProviderSingleTab>
            <ProviderBackendCapabilities>
              {/* ^ Backend capabilities & SSR boundary */}
              <ErrorBoundary outer>
                <ProviderBootstrapLogic>
                  <SnackbarInsert />
                  {getLayout(<Component {...pageProps} />)}
                  <OverlaysInsert />
                </ProviderBootstrapLogic>
              </ErrorBoundary>
            </ProviderBackendCapabilities>
          </ProviderSingleTab>
        </ProviderTheming>
      </CloudTRPCProvider>
    </SessionProvider>

    {Is.Deployment.VercelFromFrontend && <VercelAnalytics debug={false} />}
    {Is.Deployment.VercelFromFrontend && <VercelSpeedInsights debug={false} sampleRate={1 / 2} />}
    {hasGoogleAnalytics && <OptionalGoogleAnalytics />}
    {hasPostHogAnalytics && <OptionalPostHogAnalytics />}

  </>;
};

// Initializes React Query and tRPC for the Edge-Runtime API only.
// Cloud tRPC is initialized via CloudTRPCProvider above (manual setup).
export default apiQuery.withTRPC(Big_AGI_App);
