import * as React from 'react';

import { Box, Typography } from '@mui/joy';

import { llmsStoreActions } from '~/common/stores/llms/store-llms';

import { InlineError } from '~/common/components/InlineError';
import { apiQuery } from '~/common/util/trpc.client';
import { navigateToIndex, useRouterQuery } from '~/common/app.routes';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';


// Deduplicate code exchange attempts (React Strict Mode causes double rendering)
const PROCESSED_CODES_KEY = 'openrouter_processed_codes';

function isCodeAlreadyProcessed(code: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const processed = JSON.parse(sessionStorage.getItem(PROCESSED_CODES_KEY) || '[]');
    return processed.includes(code);
  } catch {
    return false;
  }
}

function markCodeAsProcessed(code: string): void {
  if (typeof window === 'undefined') return;
  try {
    const processed = JSON.parse(sessionStorage.getItem(PROCESSED_CODES_KEY) || '[]');
    if (!processed.includes(code)) {
      processed.push(code);
      // Keep only last 10 codes to prevent unbounded growth
      sessionStorage.setItem(PROCESSED_CODES_KEY, JSON.stringify(processed.slice(-10)));
    }
  } catch {
    // Ignore storage errors
  }
}


function CallbackOpenRouterPage(props: { openRouterCode: string | undefined }) {

  // Track if this code was already processed (prevents double-fire in React Strict Mode)
  // Mark as processed immediately in state initializer to prevent race conditions
  const [codeAlreadyUsed] = React.useState(() => {
    if (!props.openRouterCode) return false;
    const alreadyProcessed = isCodeAlreadyProcessed(props.openRouterCode);
    if (!alreadyProcessed) {
      // Mark immediately to prevent second render from also trying
      markCodeAsProcessed(props.openRouterCode);
    }
    return alreadyProcessed;
  });

  // external state - only query if code hasn't been processed before
  const shouldQuery = !!props.openRouterCode && !codeAlreadyUsed;
  const { data, isError, error, isPending } = apiQuery.backend.exchangeOpenRouterKey.useQuery(
    { code: props.openRouterCode || '' },
    {
      enabled: shouldQuery,
      staleTime: Infinity,
      retry: false, // Don't retry - OAuth codes are single-use
    }
  );

  // derived state
  const isErrorInput = !props.openRouterCode;
  const openRouterKey = data?.key ?? undefined;
  const isSuccess = !!openRouterKey;


  // Success: save the key and redirect to the chat app
  React.useEffect(() => {
    if (!isSuccess)
      return;

    // 1. Save the key as the client key
    llmsStoreActions().setOpenRouterKey(openRouterKey);

    // 2. Navigate to the chat app
    void navigateToIndex(true); //.then(openModelsSetup);

  }, [isSuccess, openRouterKey]);

  return (
    <Box sx={{
      flexGrow: 1,
      overflowY: 'auto',
      display: 'flex', justifyContent: 'center',
      p: { xs: 3, md: 6 },
    }}>

      <Box sx={{
        // my: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 4,
      }}>

        <Typography level='title-lg'>
          Welcome Back
        </Typography>

        {isPending && <Typography level='body-sm'>Loading...</Typography>}

        {isErrorInput && <InlineError error='There was an issue retrieving the code from OpenRouter.' />}

        {isError && <InlineError error={error} />}

        {codeAlreadyUsed && !data && (
          <InlineError error='This authorization code has already been used. Please try logging in again.' />
        )}

        {data && (
          <Typography level='body-md'>
            Success! You can now close this window.
          </Typography>
        )}

      </Box>

    </Box>
  );
}


/**
 * This page will be invoked by OpenRouter as a Callback
 *
 * Docs: https://openrouter.ai/docs#oauth
 * Example URL: https://localhost:3000/link/callback_openrouter?code=SomeCode
 */
export default withNextJSPerPageLayout({ type: 'container' }, () => {

  // external state - get the 'code=...' from the URL
  const { code } = useRouterQuery<{ code: string | undefined }>();

  return <CallbackOpenRouterPage openRouterCode={code} />;

});
