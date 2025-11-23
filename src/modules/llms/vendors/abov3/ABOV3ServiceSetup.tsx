import * as React from 'react';

import { Alert, Box, Button, FormControl, Input, Modal, ModalClose, ModalDialog, Sheet, Typography } from '@mui/joy';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

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


export function ABOV3ServiceSetup(props: { serviceId: DModelsServiceId }) {

  // state
  const advanced = useToggleableBoolean();
  const [oauthDialogOpen, setOAuthDialogOpen] = React.useState(false);
  const [oauthCode, setOAuthCode] = React.useState('');
  const [oauthError, setOAuthError] = React.useState<string | null>(null);
  const [oauthVerifier, setOAuthVerifier] = React.useState<string | null>(null);

  // external state
  const { service, serviceAccess, serviceHasCloudTenantConfig, serviceHasLLMs, updateSettings } =
    useServiceSetup(props.serviceId, ModelVendorABOV3);

  // Note: autoVndAbov3Breakpoints not yet implemented in store-app-chat
  // const { autoVndAbov3Breakpoints, setAutoVndAbov3Breakpoints } = useChatAutoAI();
  const autoVndAbov3Breakpoints = false;
  const setAutoVndAbov3Breakpoints = () => {};

  // derived state
  const { abov3Key, abov3Host, heliconeKey, oauthAccessToken, oauthExpiresAt } = serviceAccess;
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
      // Trigger models fetch
      refetch();
    },
    onError: (error) => {
      setOAuthError(error.message || 'Failed to exchange authorization code');
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

  return <>

    {/* ABOV3 Logo */}
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
      <img
        src='/images/abov3-logo.png'
        alt='ABOV3 Logo'
        style={{
          height: '48px',
          width: 'auto',
          // Remove black background using blend modes
          mixBlendMode: 'screen',
          opacity: 0.9,
        }}
      />
    </Box>

    <ApproximateCosts serviceId={service?.id} whoSaved='ABOV3 saved you'>
      <Box sx={{ level: 'body-sm' }}>
        Enjoy <b>ABOV3</b> models. Experiencing Issues? Check <Link href='https://abov3.ai/status' level='body-sm' target='_blank'>ABOV3 status</Link>.
      </Box>
    </ApproximateCosts>

    {/* OAuth Section */}
    {!isOAuthLoggedIn ? (
      <Box>
        <Typography level='body-sm' sx={{ mb: 1 }}>
          <b>ABOV3 Subscribers</b>: Get unlimited free API access with OAuth login
        </Typography>
        <Button
          variant='solid'
          color='primary'
          onClick={handleOAuthLogin}
          startDecorator={<AccountCircleIcon />}
        >
          Login with ABOV3
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
            ✓ Logged in as ABOV3 User
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
          1. A new window has opened to ABOV3&apos;s authorization page
          <br />
          2. Log in with your ABOV3 account and authorize
          <br />
          3. After authorization, you&apos;ll be redirected to a page with a code in the URL
          <br />
          4. Copy the <b>entire URL</b> or just the code portion and paste it below
        </Typography>
        <Input
          placeholder='Paste the authorization code or URL here...'
          value={oauthCode}
          onChange={(e) => setOAuthCode(e.target.value)}
          sx={{ mt: 2 }}
          autoFocus
        />
        {oauthError && (
          <Typography level='body-sm' color='danger' sx={{ mt: 1 }}>
            {oauthError}
          </Typography>
        )}
        <Button
          onClick={handleOAuthCodeSubmit}
          loading={isExchanging}
          disabled={!oauthCode}
          sx={{ mt: 2 }}
        >
          Submit
        </Button>
      </ModalDialog>
    </Modal>

    <FormInputKey
      autoCompleteId='abov3-key' label={!!abov3Host ? 'API Key' : 'ABOV3 API Key'}
      rightLabel={<>{needsUserKey
        ? !abov3Key && <Link level='body-sm' href='https://www.abov3.ai/earlyaccess' target='_blank'>request Key</Link>
        : <AlreadySet />
      } {abov3Key && keyValid && <Link level='body-sm' href='https://console.abov3.ai/settings/usage' target='_blank'>show tokens usage</Link>}
      </>}
      value={abov3Key} onChange={value => updateSettings({ abov3Key: value })}
      required={needsUserKey && !isOAuthLoggedIn} isError={keyError}
      placeholder='sk-...'
    />

    <FormSwitchControl
      title='Auto-Caching' on='Enabled' off='Disabled'
      tooltip='Auto-breakpoints: 3 breakpoints are always set on the System instruction and on the last 2 User messages. This leaves the user with 1 breakpoint of their choice. (max 4)'
      description={autoVndAbov3Breakpoints ? <>Last 2 user messages</> : 'Disabled'}
      checked={autoVndAbov3Breakpoints}
      onChange={setAutoVndAbov3Breakpoints}
    />


    <FormControl orientation='horizontal' sx={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
      <FormLabelStart
        title='Caching'
        description='Toggle per-Message'
        tooltip='You can turn on/off caching on the fly for each message. Caching makes new input a bit more expensive, and reusing the cached input much cheaper. See ABOV3 docs for details and pricing.'
      />
      <Typography level='title-sm'>
        {autoVndAbov3Breakpoints ? 'User & Auto' : 'User-driven'}
      </Typography>
    </FormControl>

    {advanced.on && <FormTextField
      autoCompleteId='abov3-host'
      title='API Host'
      description={<>e.g., <Link level='body-sm' href='https://github.com/ABOV3AI/abov3-exodus/blob/main/docs/config-aws-bedrock.md' target='_blank'>bedrock-abov3</Link></>}
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
