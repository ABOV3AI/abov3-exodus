import { generatePKCE } from '@openauthjs/openauth/pkce';


const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';


/**
 * OAuth credentials returned from Anthropic
 */
export interface AnthropicOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}


/**
 * Generate OAuth authorization URL using PKCE flow
 * This is called when user clicks "Login with Claude Pro/Max"
 */
export async function generateAuthUrl(): Promise<{ url: string; verifier: string }> {
  const pkce = await generatePKCE();

  const url = new URL('https://claude.ai/oauth/authorize');
  url.searchParams.set('code', 'true');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', 'https://console.anthropic.com/oauth/code/callback');
  url.searchParams.set('scope', 'org:create_api_key user:profile user:inference');
  url.searchParams.set('code_challenge', pkce.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', pkce.verifier);

  return {
    url: url.toString(),
    verifier: pkce.verifier,
  };
}


/**
 * Exchange authorization code for OAuth tokens
 * Called after user authorizes in browser and pastes code
 */
export async function exchangeCodeForTokens(code: string, verifier: string): Promise<AnthropicOAuthCredentials> {
  const [authCode, state] = code.split('#');

  const response = await fetch('https://console.anthropic.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code: authCode,
      state,
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      redirect_uri: 'https://console.anthropic.com/oauth/code/callback',
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`OAuth token exchange failed: ${errorText}`);
  }

  const json = await response.json();

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}


/**
 * Refresh expired access token using refresh token
 * Called automatically when access token is about to expire
 */
export async function refreshAccessToken(refreshToken: string): Promise<AnthropicOAuthCredentials> {
  const response = await fetch('https://console.anthropic.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`OAuth token refresh failed: ${errorText}`);
  }

  const json = await response.json();

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}


/**
 * Detect if device is mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
}

/**
 * Open authorization URL in new browser window or tab
 * On mobile: Opens in new tab (better UX, avoids popup blockers)
 * On desktop: Opens in popup window (traditional OAuth flow)
 */
export function openAuthorizationWindow(url: string): void {
  if (isMobileDevice()) {
    // Mobile: Open in new tab (popup blockers often prevent popups on mobile)
    window.open(url, '_blank');
  } else {
    // Desktop: Open in popup window
    window.open(url, '_blank', 'width=600,height=800');
  }
}
