import * as React from 'react';

import { Box, Typography } from '@mui/joy';

import type { DModelsServiceId } from '~/common/stores/llms/llms.service.types';
import { FormTextField } from '~/common/components/forms/FormTextField';
import { InlineError } from '~/common/components/InlineError';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';

import { useLlmUpdateModels } from '../../llm.client.hooks';
import { useServiceSetup } from '../useServiceSetup';

import { ModelVendorArkCloud } from './ark-cloud.vendor';


export function ArkCloudServiceSetup(props: { serviceId: DModelsServiceId }) {

  // external state
  const { service, serviceAccess, updateSettings } =
    useServiceSetup(props.serviceId, ModelVendorArkCloud);

  // derived state (from service access which is always populated)
  const arkCloudUserKey = service?.setup?.arkCloudUserKey || '';

  // fetch models - auto-fetch since no configuration needed
  const { isFetching, refetch, isError, error } =
    useLlmUpdateModels(true /* auto-fetch */, service);

  return <>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography level='body-sm'>
        ABOV3 ARK Cloud provides AI inference powered by open models.
        No API key required for basic usage.
      </Typography>

      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
        Endpoint: <code>https://api.abov3.ai</code>
      </Typography>
    </Box>

    <FormTextField
      autoCompleteId='ark-cloud-user-key'
      title='User Key (Optional)'
      description='For priority access and usage tracking'
      placeholder='Leave empty for free tier'
      value={arkCloudUserKey}
      onChange={text => updateSettings({ arkCloudUserKey: text })}
    />

    <Typography level='body-xs'>
      Available models include Llama 3.2, Mistral, Qwen, and more.
    </Typography>

    <SetupFormRefetchButton
      refetch={refetch} disabled={isFetching} loading={isFetching} error={isError}
    />

    {isError && <InlineError error={error} />}

  </>;
}
