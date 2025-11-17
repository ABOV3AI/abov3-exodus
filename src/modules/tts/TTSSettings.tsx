import * as React from 'react';

import { Box, FormControl, ListDivider, Radio, RadioGroup, Typography } from '@mui/joy';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { useTTSPreferences } from './store-tts-preferences';
import { getTTSProviderDescription, getTTSProviderName } from './tts.client';
import type { TTSProvider } from './tts.types';

import { ElevenlabsSettings } from '~/modules/elevenlabs/ElevenlabsSettings';
import { PaulineSettings } from '~/modules/pauline/PaulineSettings';


export function TTSSettings() {

  // external state
  const { preferredProvider, setPreferredProvider } = useTTSPreferences();

  // handlers
  const handleProviderChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setPreferredProvider(event.target.value as TTSProvider);
  }, [setPreferredProvider]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Provider Selection */}
      <FormControl>
        <FormLabelStart title='TTS Provider' sx={{ mb: 1 }} />
        <RadioGroup value={preferredProvider} onChange={handleProviderChange}>

          {/* ElevenLabs Option */}
          <Radio
            value='elevenlabs'
            label={
              <Box>
                <Typography level='title-sm'>
                  {getTTSProviderName('elevenlabs')}
                </Typography>
                <Typography level='body-xs'>
                  {getTTSProviderDescription('elevenlabs')}
                </Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />

          {/* ABOV3 Pauline Option */}
          <Radio
            value='pauline'
            label={
              <Box>
                <Typography level='title-sm'>
                  {getTTSProviderName('pauline')}
                </Typography>
                <Typography level='body-xs'>
                  {getTTSProviderDescription('pauline')}
                </Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />

        </RadioGroup>
      </FormControl>

      <ListDivider sx={{ my: 2 }} />

      {/* Provider-Specific Settings */}
      {preferredProvider === 'elevenlabs' && <ElevenlabsSettings />}
      {preferredProvider === 'pauline' && <PaulineSettings />}

    </Box>
  );
}
