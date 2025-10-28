/**
 * Client-side OAuth token refresh for Anthropic
 * Automatically refreshes tokens before they expire
 */

import { refreshAccessToken } from './anthropic.oauth';
import { useModelsStore } from '~/common/stores/llms/store-llms';


// Track ongoing refresh to prevent multiple simultaneous refreshes
let refreshPromise: Promise<void> | null = null;


/**
 * Check if OAuth token needs refresh and refresh it if necessary
 * This should be called before making Anthropic API calls
 *
 * @returns Promise that resolves when token is fresh (or throws if refresh fails)
 */
export async function ensureAnthropicOAuthFresh(): Promise<void> {
  const store = useModelsStore.getState();

  // Find first Anthropic service
  const anthropicService = store.sources.find(s => s.vId === 'anthropic');
  if (!anthropicService) {
    return; // No Anthropic service configured
  }

  const {
    oauthAccessToken,
    oauthRefreshToken,
    oauthExpiresAt,
  } = anthropicService.setup as any;

  // Check if OAuth is in use
  if (!oauthAccessToken || !oauthRefreshToken || !oauthExpiresAt) {
    return; // Not using OAuth
  }

  // Check if token expires within next 5 minutes (300000ms)
  const needsRefresh = oauthExpiresAt < Date.now() + 300000;

  if (!needsRefresh) {
    return; // Token is still fresh
  }

  // If refresh is already in progress, wait for it
  if (refreshPromise) {
    return await refreshPromise;
  }

  // Start refresh
  refreshPromise = (async () => {
    try {
      console.log('[Anthropic OAuth] Access token expiring soon, refreshing...');

      // Call refresh endpoint
      const newTokens = await refreshAccessToken(oauthRefreshToken);

      // Update store with new tokens
      store.setAnthropicOAuth(newTokens);

      console.log('[Anthropic OAuth] Successfully refreshed access token');
      console.log(`[Anthropic OAuth] New token expires at: ${new Date(newTokens.expiresAt).toLocaleString()}`);

    } catch (error: any) {
      console.error('[Anthropic OAuth] Token refresh failed:', error.message);

      // Clear OAuth tokens from store on refresh failure
      store.clearAnthropicOAuth();

      throw new Error(
        'Your Claude Pro/Max session has expired. Please login again in Settings → Models → Anthropic.'
      );
    } finally {
      refreshPromise = null;
    }
  })();

  return await refreshPromise;
}


/**
 * Initialize background token refresh check
 * Checks every 4 minutes if token needs refresh
 */
export function initializeAnthropicOAuthRefresh(): void {
  // Check every 4 minutes
  setInterval(() => {
    ensureAnthropicOAuthFresh().catch(err => {
      console.error('[Anthropic OAuth] Background refresh failed:', err);
    });
  }, 4 * 60 * 1000); // 4 minutes

  // Initial check
  ensureAnthropicOAuthFresh().catch(err => {
    console.error('[Anthropic OAuth] Initial refresh check failed:', err);
  });
}
