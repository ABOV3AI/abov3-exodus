import * as React from 'react';

import { Alert, Box } from '@mui/joy';

import { FormChipControl } from '~/common/components/forms/FormChipControl';
import { FormRadioOption } from '~/common/components/forms/FormRadioControl';
import { useCapabilityTextToImage } from '~/common/components/useCapabilities';

import { PollinationsSettings } from './pollinations/PollinationsSettings';


export function T2ISettings() {

  // external state
  const {
    mayWork,
    providers,
    activeProviderId,
    setActiveProviderId,
  } = useCapabilityTextToImage();

  // Check if Pollinations is the active provider
  const isPollinationsActive = activeProviderId === 'pollinations';


  // derived state
  const providerOptions = React.useMemo(() => {
    const options: FormRadioOption<string>[] = [];
    providers.forEach(provider => {
      options.push({
        label: provider.label,
        value: provider.providerId,
        disabled: !provider.configured,
      });
    });
    return options.toReversed();
  }, [providers]);


  return <>

    {!mayWork ? (

      <Alert variant='soft'>
        There are no configured services for text-to-image generation.
        Please configure one service, such as an OpenAI LLM service, below.
      </Alert>

    ) : (

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormChipControl
          title='Text-to-Image'
          description='Active Service'
          // tooltip='Select the service to use for text-to-image generation.'
          disabled={!mayWork}
          options={providerOptions}
          value={activeProviderId ?? undefined} onChange={setActiveProviderId}
        />

        {/* Show Pollinations settings when active */}
        {isPollinationsActive && (
          <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid', borderColor: 'primary.softBg' }}>
            <PollinationsSettings />
          </Box>
        )}
      </Box>

    )}

  </>;
}