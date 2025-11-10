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

import { generateAuthUrl } from './anthropic.oauth';
import { isValidAnthropicApiKey, ModelVendorAnthropic } from './anthropic.vendor';


export function AnthropicServiceSetup(props: { serviceId: DModelsServiceId }) {

  // state
  const advanced = useToggleableBoolean();
  const [oauthDialogOpen, setOAuthDialogOpen] = React.useState(false);
  const [oauthCode, setOAuthCode] = React.useState('');
  const [oauthError, setOAuthError] = React.useState<string | null>(null);
  const [oauthVerifier, setOAuthVerifier] = React.useState<string | null>(null);

  // external state
  const { service, serviceAccess, serviceHasCloudTenantConfig, serviceHasLLMs, updateSettings } =
    useServiceSetup(props.serviceId, ModelVendorAnthropic);

  const { autoVndAntBreakpoints, setAutoVndAntBreakpoints } = useChatAutoAI();

  // derived state
  const { anthropicKey, anthropicHost, heliconeKey, oauthAccessToken, oauthExpiresAt } = serviceAccess;
  const needsUserKey = !serviceHasCloudTenantConfig;
  const isOAuthLoggedIn = !!oauthAccessToken;
  const isOAuthExpired = oauthExpiresAt ? Date.now() > oauthExpiresAt : false;

  const keyValid = isValidAnthropicApiKey(anthropicKey);
  const keyError = (/*needsUserKey ||*/ !!anthropicKey) && !keyValid;
  const shallFetchSucceed = anthropicKey ? keyValid : (!needsUserKey || !!anthropicHost || isOAuthLoggedIn);

  // fetch models
  const { isFetching, refetch, isError, error } =
    useLlmUpdateModels(!serviceHasLLMs && shallFetchSucceed, service);

  // OAuth token exchange
  const { mutate: exchangeToken, isPending: isExchanging } = apiQuery.backend.exchangeAnthropicToken.useMutation({
    onSuccess: (data) => {
      // Store tokens
      llmsStoreActions().setAnthropicOAuth({
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
      // Open authorization URL in new window
      window.open(url, '_blank', 'width=600,height=800');
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
    llmsStoreActions().clearAnthropicOAuth();
  };

  return <>

    <ApproximateCosts serviceId={service?.id} whoSaved='ABOV3 saved you'>
      <Box sx={{ level: 'body-sm' }}>
        Enjoy <b>Sonnet</b>, <b>Opus</b> and <b>Haiku</b>. Experiencing Issues? Check <Link href='https://status.anthropic.com/' level='body-sm' target='_blank'>Anthropic status</Link>.
      </Box>
    </ApproximateCosts>

    {/* OAuth Section */}
    {!isOAuthLoggedIn ? (
      <Box>
        <Typography level='body-sm' sx={{ mb: 1 }}>
          <b>Pro/Max Subscribers</b>: Get unlimited free API access with OAuth login
        </Typography>
        <Button
          variant='solid'
          color='primary'
          onClick={handleOAuthLogin}
          startDecorator={<AccountCircleIcon />}
        >
          Login with Claude Pro/Max
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
            ✓ Logged in as Pro/Max User
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
        <Typography level='h4'>Anthropic OAuth Authorization</Typography>
        <Typography level='body-sm' sx={{ mt: 1 }}>
          1. A new window has opened to Anthropic&apos;s authorization page
          <br />
          2. Log in with your Claude Pro/Max account and authorize
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
      autoCompleteId='anthropic-key' label={!!anthropicHost ? 'API Key' : 'Anthropic API Key'}
      rightLabel={<>{needsUserKey
        ? !anthropicKey && <Link level='body-sm' href='https://www.anthropic.com/earlyaccess' target='_blank'>request Key</Link>
        : <AlreadySet />
      } {anthropicKey && keyValid && <Link level='body-sm' href='https://console.anthropic.com/settings/usage' target='_blank'>show tokens usage</Link>}
      </>}
      value={anthropicKey} onChange={value => updateSettings({ anthropicKey: value })}
      required={needsUserKey && !isOAuthLoggedIn} isError={keyError}
      placeholder='sk-...'
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
      autoCompleteId='anthropic-host'
      title='API Host'
      description={<>e.g., <Link level='body-sm' href='https://github.com/ABOV3AI/abov3-exodus/blob/main/docs/config-aws-bedrock.md' target='_blank'>bedrock-claude</Link></>}
      placeholder='deployment.service.region.amazonaws.com'
      isError={false}
      value={anthropicHost || ''}
      onChange={text => updateSettings({ anthropicHost: text })}
    />}

    {advanced.on && <FormTextField
      autoCompleteId='anthropic-helicone-key'
      title='Helicone Key' disabled={!!anthropicHost}
      description={<>Generate <Link level='body-sm' href='https://www.helicone.ai/keys' target='_blank'>here</Link></>}
      placeholder='sk-...'
      value={heliconeKey || ''}
      onChange={text => updateSettings({ heliconeKey: text })}
    />}

    {!!heliconeKey && <Alert variant='soft' color='success'>
      Advanced: You set the Helicone key, and Anthropic text will be routed through Helicone.
    </Alert>}

    <SetupFormRefetchButton refetch={refetch} disabled={!shallFetchSucceed || isFetching} loading={isFetching} error={isError} advanced={advanced} />

    {isError && <InlineError error={error} />}

  </>;
}