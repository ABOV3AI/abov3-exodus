import * as React from 'react';
import { useRouter } from 'next/router';

import { getChatTokenCountingMethod } from '../../apps/chat/store-app-chat';

import { logger } from '~/common/logger/logger.client';
import { markNewsAsSeen, shallRedirectToNews, sherpaReconfigureBackendModels, sherpaStorageMaintenanceNoChats_delayed } from '~/common/logic/store-logic-sherpa';
import { navigateToNews, ROUTE_APP_CHAT } from '~/common/app.routes';
import { preloadTiktokenLibrary } from '~/common/tokens/tokens.text';
import { useClientLoggerInterception } from '~/common/logger/hooks/useClientLoggerInterception';
import { useNextLoadProgress } from '~/common/components/useNextLoadProgress';
import { initializeToolRegistry } from '~/modules/tools/tools.registry';
import { initializeAnthropicOAuthRefresh } from '~/modules/llms/vendors/anthropic/anthropic.token-refresh';
import { initializeABOV3OAuthRefresh } from '~/modules/llms/vendors/abov3/abov3.token-refresh';
import { useMCPServersStore } from '~/common/stores/store-mcp-servers';
import { useProjectsStore } from '~/apps/projects/store-projects';


export function ProviderBootstrapLogic(props: { children: React.ReactNode }) {

  // external state
  const { route, events } = useRouter();

  // AUTO-LOG events from this scope on; note that we are past the Sherpas
  useClientLoggerInterception(true, false);

  // wire-up the NextJS router to a loading bar to be displayed while routes change
  useNextLoadProgress(route, events);


  // [boot-up] logic
  const isOnChat = route === ROUTE_APP_CHAT;
  const doRedirectToNews = isOnChat && shallRedirectToNews();


  // redirect Chat -> News if fresh news
  const isRedirectingToNews = React.useMemo(() => {
    if (doRedirectToNews) {
      navigateToNews().then(() => markNewsAsSeen()).catch(console.error);
      return true;
    }
    return false;
  }, [doRedirectToNews]);


  // decide what to launch
  const launchPreload = isOnChat && !isRedirectingToNews && getChatTokenCountingMethod() === 'accurate'; // only preload if using TikToken by default
  const launchAutoConf = isOnChat && !isRedirectingToNews;
  const launchStorageGC = true;


  // [preload] kick-off a preload of the Tiktoken library right when proceeding to the UI
  React.useEffect(() => {
    if (!launchPreload) return;

    void preloadTiktokenLibrary() // fire/forget (large WASM payload)
      .catch(err => {
        // Suppress WebAssembly loading errors - app will fall back to approximate counting
        // These commonly occur when users navigate away or have slow connections
        logger.debug('Tiktoken preload failed (expected on slow/interrupted loads)', err, 'client', {
          skipReporting: true, // Don't send to PostHog - this is a benign error
        });
      });

  }, [launchPreload]);

  // [autoconf] initiate the llm auto-configuration process if on the chat
  React.useEffect(() => {
    if (!launchAutoConf) return;

    void sherpaReconfigureBackendModels(); // fire/forget (background server-driven model reconfiguration)

  }, [launchAutoConf]);

  // storage maintenance and garbage collection
  React.useEffect(() => {
    if (!launchStorageGC) return;

    const timeout = setTimeout(sherpaStorageMaintenanceNoChats_delayed, 1000);
    return () => clearTimeout(timeout);

  }, [launchStorageGC]);

  // [tools] initialize the tools registry (one-time on mount)
  React.useEffect(() => {
    initializeToolRegistry(); // fire once to register all available tools
  }, []);

  // [oauth] initialize Anthropic OAuth token refresh (one-time on mount)
  React.useEffect(() => {
    initializeAnthropicOAuthRefresh(); // check token every 4 minutes
  }, []);

  // [oauth] initialize ABOV3 OAuth token refresh (one-time on mount)
  React.useEffect(() => {
    initializeABOV3OAuthRefresh(); // check token every 4 minutes
  }, []);

  // [mcp] initialize MCP runtime and register servers (one-time on mount)
  React.useEffect(() => {
    const initializeMCP = async () => {
      try {
        await useMCPServersStore.getState().initializeRuntime();
      } catch (error) {
        console.error('Failed to initialize MCP runtime:', error);
      }
    };
    void initializeMCP();
  }, []);

  // [projects] load persisted FileSystem handles from IndexedDB (one-time on mount)
  React.useEffect(() => {
    const loadProjectHandles = async () => {
      try {
        await useProjectsStore.getState().loadPersistedHandles();
      } catch (error) {
        console.error('Failed to load persisted project handles:', error);
      }
    };
    void loadProjectHandles();
  }, []);

  //
  // Render Gates
  //

  if (isRedirectingToNews)
    return null;

  return props.children;
}
