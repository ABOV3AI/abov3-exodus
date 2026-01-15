/**
 * Client-side OAuth token refresh for ABOV3
 * Automatically refreshes tokens before they expire
 */

import { refreshAccessToken } from './abov3.oauth';
import { useModelsStore } from '~/common/stores/llms/store-llms';


// Track ongoing refresh to prevent multiple simultaneous refreshes
let refreshPromise: Promise<void> | null = null;


/**
 * Check if OAuth token needs refresh and refresh it if necessary
 * This should be called before making ABOV3 API calls
 *
 * @param throwOnFailure - If true, throws error on refresh failure. If false, fails silently.
 * @returns Promise that resolves when token is fresh (or throws if refresh fails and throwOnFailure is true)
 */
export async function ensureABOV3OAuthFresh(throwOnFailure: boolean = false): Promise<void> {
  const store = useModelsStore.getState();

  // Find first ABOV3 service
  const abov3Service = store.sources.find(s => s.vId === 'abov3');
  if (!abov3Service) {
    return; // No ABOV3 service configured
  }

  const {
    oauthAccessToken,
    oauthRefreshToken,
    oauthExpiresAt,
  } = abov3Service.setup as any;

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
      console.log('[ABOV3 OAuth] Access token expiring soon, refreshing...');

      // Call refresh endpoint
      const newTokens = await refreshAccessToken(oauthRefreshToken);

      // Update store with new tokens
      store.setABOV3OAuth(newTokens);

      console.log('[ABOV3 OAuth] Successfully refreshed access token');
      console.log(`[ABOV3 OAuth] New token expires at: ${new Date(newTokens.expiresAt).toLocaleString()}`);

    } catch (error: any) {
      console.error('[ABOV3 OAuth] Token refresh failed:', error.message);

      // Clear OAuth tokens from store on refresh failure
      store.clearABOV3OAuth();

      // Only throw if caller wants to handle the error (e.g., from chat-persona)
      if (throwOnFailure) {
        throw new Error(
          'Your ABOV3 Unlimited session has expired. Please login again in Settings → Models → ABOV3.'
        );
      }
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
export function initializeABOV3OAuthRefresh(): void {
  // Check every 4 minutes
  setInterval(() => {
    ensureABOV3OAuthFresh().catch(err => {
      // Silent fail - don't crash the app for background refresh failures
      console.warn('[ABOV3 OAuth] Background refresh failed (this is normal if not logged in):', err.message);
    });
  }, 4 * 60 * 1000); // 4 minutes

  // Initial check - silent, don't throw errors that would crash the app
  ensureABOV3OAuthFresh().catch(err => {
    // Silent fail on startup - user may not be logged in or token may be expired
    console.warn('[ABOV3 OAuth] Initial refresh check failed (this is normal if not logged in):', err.message);
  });
}
