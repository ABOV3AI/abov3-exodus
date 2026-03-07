import * as React from 'react';

import { Box, Button, Chip, Typography } from '@mui/joy';
import MemoryIcon from '@mui/icons-material/Memory';
import RefreshIcon from '@mui/icons-material/Refresh';

import type { DModelsServiceId } from '~/common/stores/llms/llms.service.types';
import { FormTextField } from '~/common/components/forms/FormTextField';
import { InlineError } from '~/common/components/InlineError';
import { Link } from '~/common/components/Link';
import { SetupFormRefetchButton } from '~/common/components/forms/SetupFormRefetchButton';
import { apiQuery } from '~/common/util/trpc.client';
import { asValidURL } from '~/common/util/urlUtils';

import { useLlmUpdateModels } from '../../llm.client.hooks';
import { useServiceSetup } from '../useServiceSetup';

import { ModelVendorArkSLM } from './ark-slm.vendor';


export function ArkSLMServiceSetup(props: { serviceId: DModelsServiceId }) {

  // external state
  const { service, serviceAccess, updateSettings } =
    useServiceSetup(props.serviceId, ModelVendorArkSLM);

  // derived state
  const { arkSLMHost } = serviceAccess;

  const hostValid = !!asValidURL(arkSLMHost);
  const hostError = !!arkSLMHost && !hostValid;
  const shallFetchSucceed = !hostError;

  // fetch models
  const { isFetching, refetch, isError, error } =
    useLlmUpdateModels(false /* use button only */, service);

  // fetch server status
  const { data: status, refetch: refetchStatus } = apiQuery.llmArkSLM.getStatus.useQuery(
    { access: serviceAccess },
    { enabled: hostValid, refetchInterval: 10000 }, // Poll every 10s
  );

  // refresh models on server
  const refreshMutation = apiQuery.llmArkSLM.refreshModels.useMutation();

  const handleRefreshModels = React.useCallback(async () => {
    if (!hostValid) return;
    try {
      await refreshMutation.mutateAsync({ access: serviceAccess });
      refetch();
      refetchStatus();
    } catch (e) {
      console.error('Failed to refresh models:', e);
    }
  }, [hostValid, refreshMutation, serviceAccess, refetch, refetchStatus]);

  return <>

    <FormTextField
      autoCompleteId='ark-slm-host'
      title='Ark-SLM Host'
      description={<Link level='body-sm' href='https://github.com/ABOV3AI/abov3-ark-slm' target='_blank'>Documentation</Link>}
      placeholder='http://127.0.0.1:3200'
      isError={hostError}
      value={arkSLMHost || ''}
      onChange={text => updateSettings({ arkSLMHost: text })}
    />

    {/* Server Status */}
    {status && (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          size='sm'
          variant='soft'
          color={status.online ? 'success' : 'danger'}
        >
          {status.online ? 'Online' : 'Offline'}
        </Chip>
        {status.online && (
          <>
            <Chip
              size='sm'
              variant='soft'
              color={status.loaded ? 'primary' : 'neutral'}
              startDecorator={<MemoryIcon sx={{ fontSize: 14 }} />}
            >
              {status.loaded ? 'Model Loaded' : 'No Model'}
            </Chip>
            <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
              {status.availableModels} model(s) available
            </Typography>
          </>
        )}
      </Box>
    )}

    {status?.currentModel && (
      <Box sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'primary.softBg' }}>
        <Typography level='body-sm' fontWeight='lg'>
          {status.currentModel.name}
        </Typography>
        <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
          Context: {status.currentModel.context_length?.toLocaleString()} tokens
        </Typography>
      </Box>
    )}

    <SetupFormRefetchButton
      refetch={refetch}
      disabled={!shallFetchSucceed || isFetching}
      loading={isFetching}
      error={isError}
      leftButton={
        <Button
          color='neutral'
          variant='soft'
          disabled={!hostValid || refreshMutation.isPending}
          loading={refreshMutation.isPending}
          onClick={handleRefreshModels}
          startDecorator={<RefreshIcon />}
        >
          Scan Models
        </Button>
      }
    />

    {isError && <InlineError error={error} />}

  </>;
}
