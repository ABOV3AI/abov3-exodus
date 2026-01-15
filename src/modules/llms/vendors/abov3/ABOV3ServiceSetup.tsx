import * as React from 'react';

import { Alert, Box, Button, CircularProgress, FormControl, Input, Modal, ModalClose, ModalDialog, Sheet, Typography } from '@mui/joy';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { useChatAutoAI } from '../../../../apps/chat/store-app-chat';

import type { DModelsServiceId } from '~/common/stores/llms/llms.service.types';
import { AlreadySet } from '~/common/components/AlreadySet';
import { ExternalLink } from '~/common/components/ExternalLink';
import { FormInputKey } from '~/common/components/forms/FormInputKey';
import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { FormSwitchControl } from '~/common/components/forms/FormSwitchControl';
import { FormTextField } from '~/common/components/forms/FormTextField';
import { InlineError } from '~/common/components/InlineError';
import { Link } from '~/common/components/Link';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';
import { llmsStoreActions } from '~/common/stores/llms/store-llms';
import { useToggleableBoolean } from '~/common/util/hooks/useToggleableBoolean';
import { apiQuery } from '~/common/util/trpc.client';

import { ApproximateCosts } from '../ApproximateCosts';
import { useLlmUpdateModels } from '../../llm.client.hooks';
import { useServiceSetup } from '../useServiceSetup';

import { generateAuthUrl, openAuthorizationWindow } from './abov3.oauth';
import { isValidABOV3ApiKey, ModelVendorABOV3 } from './abov3.vendor';


/**
 * Detect OAuth authorization code from clipboard content
 * Handles both raw codes and full callback URLs
 */
function extractOAuthCode(text: string): string | null {
  if (!text) return null;

  // Pattern 1: Full callback URL
  // https://console.anthropic.com/oauth/code/callback?code=xxx#state=yyy
  const urlMatch = text.match(/console\.anthropic\.com\/oauth\/code\/callback\?code=([^#&\s]+)/);
  if (urlMatch) {
    const code = urlMatch[1];
    const stateMatch = text.match(/#state=([^\s&]+)/);
    const state = stateMatch ? stateMatch[1] : '';
    return state ? `${code}#${state}` : code;
  }

  // Pattern 2: Code#state format (already extracted)
  if (text.includes('#') && text.length > 20 && text.length < 500) {
    const [code, state] = text.split('#');
    if (code && state && code.length > 10) {
      return text;
    }
  }

  // Pattern 3: Raw authorization code (alphanumeric, typically 40+ chars)
  if (/^[a-zA-Z0-9_-]{20,100}$/.test(text.trim())) {
    return text.trim();
  }

  return null;
}


export function ABOV3ServiceSetup(props: { serviceId: DModelsServiceId }) {

  // state
  const advanced = useToggleableBoolean();
  const [oauthDialogOpen, setOAuthDialogOpen] = React.useState(false);
  const [oauthCode, setOAuthCode] = React.useState('');
  const [oauthError, setOAuthError] = React.useState<string | null>(null);
  const [oauthVerifier, setOAuthVerifier] = React.useState<string | null>(null);
  const [clipboardStatus, setClipboardStatus] = React.useState<'idle' | 'watching' | 'detected' | 'error'>('idle');

  // external state
  const { service, serviceAccess, serviceHasCloudTenantConfig, serviceHasLLMs, updateSettings } =
    useServiceSetup(props.serviceId, ModelVendorABOV3);

  const { autoVndAntBreakpoints, setAutoVndAntBreakpoints } = useChatAutoAI();

  // derived state
  const { abov3Key, abov3Host, heliconeKey, oauthAccessToken, oauthExpiresAt, enableABOV3Personas, enableProprietaryProtection } = serviceAccess;
  const needsUserKey = !serviceHasCloudTenantConfig;
  const isOAuthLoggedIn = !!oauthAccessToken;
  const isOAuthExpired = oauthExpiresAt ? Date.now() > oauthExpiresAt : false;

  const keyValid = isValidABOV3ApiKey(abov3Key);
  const keyError = (/*needsUserKey ||*/ !!abov3Key) && !keyValid;
  const shallFetchSucceed = abov3Key ? keyValid : (!needsUserKey || !!abov3Host || isOAuthLoggedIn);

  // fetch models
  const { isFetching, refetch, isError, error } =
    useLlmUpdateModels(!serviceHasLLMs && shallFetchSucceed, service);

  // OAuth token exchange
  const { mutate: exchangeToken, isPending: isExchanging } = apiQuery.backend.exchangeABOV3Token.useMutation({
    onSuccess: (data) => {
      // Store tokens
      llmsStoreActions().setABOV3OAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
      });
      // Close dialog and reset state
      setOAuthDialogOpen(false);
      setOAuthCode('');
      setOAuthError(null);
      setOAuthVerifier(null);
      setClipboardStatus('idle');
      // Trigger models fetch
      refetch();
    },
    onError: (error) => {
      setOAuthError(error.message || 'Failed to exchange authorization code');
      setClipboardStatus('watching'); // Reset to watching to allow retry
    },
  });

  // OAuth handlers
  const handleOAuthLogin = async () => {
    try {
      const { url, verifier } = await generateAuthUrl();
      setOAuthVerifier(verifier);
      setOAuthDialogOpen(true);
      // Open authorization URL using mobile-friendly method
      openAuthorizationWindow(url);
    } catch (error: any) {
      setOAuthError(error.message || 'Failed to generate authorization URL');
    }
  };

  const handleOAuthCodeSubmit = () => {
    if (!oauthCode || !oauthVerifier) {
      setOAuthError('Please enter the authorization code');
      return;
    }
    setOAuthError(null);
    exchangeToken({ code: oauthCode, verifier: oauthVerifier });
  };

  const handleOAuthLogout = () => {
    llmsStoreActions().clearABOV3OAuth();
  };

  // Clipboard monitoring effect - only active when OAuth dialog is open
  React.useEffect(() => {
    if (!oauthDialogOpen || !oauthVerifier) return;

    let intervalId: ReturnType<typeof setInterval>;
    let lastClipboardValue = '';

    const checkClipboard = async () => {
      try {
        // Check if clipboard API is available
        if (!navigator.clipboard?.readText) {
          setClipboardStatus('error');
          return;
        }

        const text = await navigator.clipboard.readText();

        // Skip if clipboard hasn't changed
        if (text === lastClipboardValue) return;
        lastClipboardValue = text;

        // Try to extract OAuth code
        const code = extractOAuthCode(text);
        if (code) {
          setOAuthCode(code);
          setClipboardStatus('detected');

          // Auto-submit after short delay to give user time to see what was detected
          setTimeout(() => {
            exchangeToken({ code, verifier: oauthVerifier });
          }, 500);
        }
      } catch {
        // Clipboard access denied - this is normal, just show manual input
        setClipboardStatus('error');
      }
    };

    // Start monitoring
    setClipboardStatus('watching');

    // Check immediately, then poll every 500ms
    checkClipboard();
    intervalId = setInterval(checkClipboard, 500);

    return () => {
      clearInterval(intervalId);
      setClipboardStatus('idle');
    };
  }, [oauthDialogOpen, oauthVerifier, exchangeToken]);

  return <>

    <ApproximateCosts serviceId={service?.id} whoSaved='ABOV3 saved you'>
      <Box sx={{ level: 'body-sm' }}>
        Enjoy <b>Genesis</b>, <b>Exodus</b> and <b>Solomon</b>. Experiencing Issues? Check <Link href='https://status.anthropic.com/' level='body-sm' target='_blank'>Anthropic status</Link>.
      </Box>
    </ApproximateCosts>

    {/* OAuth Section */}
    {!isOAuthLoggedIn ? (
      <Box>
        <Typography level='body-sm' sx={{ mb: 1 }}>
          <b>Unlimited Subscribers</b>: Get unlimited free API access with OAuth login
        </Typography>
        <Button
          variant='solid'
          color='primary'
          onClick={handleOAuthLogin}
          startDecorator={<AccountCircleIcon />}
        >
          Login with ABOV3 Unlimited
        </Button>
      </Box>
    ) : (
      <Alert
        variant='soft'
        color={isOAuthExpired ? 'warning' : 'success'}
        endDecorator={
          <Button size='sm' variant='plain' onClick={handleOAuthLogout}>
            Logout
          </Button>
        }
      >
        <Box>
          <Typography level='title-sm'>
            ✓ Logged in as Unlimited User
          </Typography>
          <Typography level='body-sm'>
            {isOAuthExpired ? 'OAuth token expired. Please re-login.' : 'Unlimited free API access enabled'}
          </Typography>
        </Box>
      </Alert>
    )}

    <Typography level='body-xs' sx={{ fontStyle: 'italic', color: 'text.tertiary', textAlign: 'center' }}>
      — OR —
    </Typography>

    {/* OAuth Code Dialog */}
    <Modal open={oauthDialogOpen} onClose={() => setOAuthDialogOpen(false)}>
      <ModalDialog>
        <ModalClose />
        <Typography level='h4'>ABOV3 OAuth Authorization</Typography>

        <Typography level='body-sm' sx={{ mt: 1 }}>
          1. A new window has opened to Anthropic&apos;s authorization page
          <br />
          2. Log in with your Claude Unlimited account and authorize
          <br />
          3. After authorization, <b>copy the URL or code</b> from the page
          <br />
          {clipboardStatus === 'watching' && (
            <Typography component='span' color='primary' level='body-sm'>
              4. Watching clipboard - code will auto-fill when copied!
            </Typography>
          )}
          {clipboardStatus === 'error' && (
            <Typography component='span' color='neutral' level='body-sm'>
              4. Paste the code below (clipboard access not available)
            </Typography>
          )}
          {clipboardStatus === 'detected' && (
            <Typography component='span' color='success' level='body-sm'>
              4. Code detected! Authenticating...
            </Typography>
          )}
        </Typography>

        {/* Clipboard status indicator */}
        {clipboardStatus === 'watching' && (
          <Alert variant='soft' color='primary' sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size='sm' />
              <Typography level='body-sm'>
                Watching clipboard... Just copy the code from the authorization page!
              </Typography>
            </Box>
          </Alert>
        )}

        {clipboardStatus === 'detected' && !isExchanging && (
          <Alert variant='soft' color='success' sx={{ mt: 2 }}>
            <Typography level='body-sm'>
              Authorization code detected from clipboard!
            </Typography>
          </Alert>
        )}

        <Input
          placeholder='Paste the authorization code or URL here...'
          value={oauthCode}
          onChange={(e) => setOAuthCode(e.target.value)}
          sx={{ mt: 2 }}
          autoFocus
          disabled={clipboardStatus === 'detected' && isExchanging}
        />

        {oauthError && (
          <Typography level='body-sm' color='danger' sx={{ mt: 1 }}>
            {oauthError}
          </Typography>
        )}

        <Button
          onClick={handleOAuthCodeSubmit}
          loading={isExchanging}
          disabled={!oauthCode || (clipboardStatus === 'detected' && isExchanging)}
          sx={{ mt: 2 }}
        >
          {clipboardStatus === 'detected' ? 'Authenticating...' : 'Submit'}
        </Button>
      </ModalDialog>
    </Modal>

    <FormInputKey
      autoCompleteId='abov3-key' label={!!abov3Host ? 'API Key' : 'ABOV3 API Key'}
      rightLabel={<>{needsUserKey
        ? !abov3Key && <Link level='body-sm' href='https://www.anthropic.com/earlyaccess' target='_blank'>request Key</Link>
        : <AlreadySet />
      } {abov3Key && keyValid && <Link level='body-sm' href='https://console.anthropic.com/settings/usage' target='_blank'>show tokens usage</Link>}
      </>}
      value={abov3Key} onChange={value => updateSettings({ abov3Key: value })}
      required={needsUserKey && !isOAuthLoggedIn} isError={keyError}
      placeholder='sk-...'
    />

    <FormSwitchControl
      title='ABOV3 Personas' on='Enabled' off='Disabled'
      tooltip='Enable ABOV3 branded personas (Genesis, Exodus, Solomon). Works with OAuth - personas are added to the system message.'
      description={enableABOV3Personas ? <>Genesis / Exodus / Solomon personas active</> : 'Disabled'}
      checked={enableABOV3Personas ?? true}
      onChange={(checked) => updateSettings({ enableABOV3Personas: checked })}
    />

    <FormSwitchControl
      title='Proprietary Protection' on='Enabled' off='Disabled'
      tooltip='When enabled, adds protective directives for proprietary information handling and identity disclosure'
      description={enableProprietaryProtection ? <>Active protection</> : 'Disabled'}
      checked={enableProprietaryProtection ?? true}
      onChange={(checked) => updateSettings({ enableProprietaryProtection: checked })}
    />

    <FormSwitchControl
      title='Auto-Caching' on='Enabled' off='Disabled'
      tooltip='Auto-breakpoints: 3 breakpoints are always set on the System instruction and on the last 2 User messages. This leaves the user with 1 breakpoint of their choice. (max 4)'
      description={autoVndAntBreakpoints ? <>Last 2 user messages</> : 'Disabled'}
      checked={autoVndAntBreakpoints}
      onChange={setAutoVndAntBreakpoints}
    />


    <FormControl orientation='horizontal' sx={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
      <FormLabelStart
        title='Caching'
        description='Toggle per-Message'
        tooltip='You can turn on/off caching on the fly for each message. Caching makes new input a bit more expensive, and reusing the cached input much cheaper. See Anthropic docs for details and pricing.'
      />
      <Typography level='title-sm'>
        {autoVndAntBreakpoints ? 'User & Auto' : 'User-driven'}
      </Typography>
    </FormControl>

    {advanced.on && <FormTextField
      autoCompleteId='abov3-host'
      title='API Host'
      description={<>e.g., <Link level='body-sm' href='https://github.com/ABOV3AI/abov3-exodus/blob/main/docs/config-aws-bedrock.md' target='_blank'>bedrock-claude</Link></>}
      placeholder='deployment.service.region.amazonaws.com'
      isError={false}
      value={abov3Host || ''}
      onChange={text => updateSettings({ abov3Host: text })}
    />}

    {advanced.on && <FormTextField
      autoCompleteId='abov3-helicone-key'
      title='Helicone Key' disabled={!!abov3Host}
      description={<>Generate <Link level='body-sm' href='https://www.helicone.ai/keys' target='_blank'>here</Link></>}
      placeholder='sk-...'
      value={heliconeKey || ''}
      onChange={text => updateSettings({ heliconeKey: text })}
    />}

    {!!heliconeKey && <Alert variant='soft' color='success'>
      Advanced: You set the Helicone key, and ABOV3 text will be routed through Helicone.
    </Alert>}

    <SetupFormRefetchButton refetch={refetch} disabled={!shallFetchSucceed || isFetching} loading={isFetching} error={isError} advanced={advanced} />

    {isError && <InlineError error={error} />}

  </>;
}
