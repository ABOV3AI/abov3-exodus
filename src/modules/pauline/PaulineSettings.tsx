import * as React from 'react';

import { Box, Button, FormControl, FormHelperText, FormLabel, Input, Option, Select, Slider, Typography } from '@mui/joy';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';
import { apiQuery } from '~/common/util/trpc.client';
import { usePaulineEndpoint, usePaulineVoiceId, usePaulineSpeed, usePaulineTempo } from './store-module-pauline';
import { useCapability } from './pauline.client';


export function PaulineSettings() {

  // external state
  const [paulineEndpoint, setPaulineEndpoint] = usePaulineEndpoint();
  const [paulineVoiceId, setPaulineVoiceId] = usePaulineVoiceId();
  const [paulineSpeed, setPaulineSpeed] = usePaulineSpeed();
  const [paulineTempo, setPaulineTempo] = usePaulineTempo();
  const capability = useCapability();

  // load available voices
  const { data: voicesData, isLoading: voicesLoading } = apiQuery.pauline.listVoices.useQuery({
    endpoint: paulineEndpoint,
  });

  // handlers
  const handleEndpointChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPaulineEndpoint(e.target.value);
  }, [setPaulineEndpoint]);

  const handleVoiceChange = React.useCallback((_event: any, value: string | null) => {
    if (value) setPaulineVoiceId(value);
  }, [setPaulineVoiceId]);

  const handleTestTTS = React.useCallback(async () => {
    const { paulineSpeakText } = await import('./pauline.client');
    await paulineSpeakText('Testing ABOV3 Pauline text to speech. Hello from ABOV3 Exodus!', paulineVoiceId, false, false);
  }, [paulineVoiceId]);

  const handleTestVoice = React.useCallback(async (voiceId: string) => {
    const { paulineSpeakText } = await import('./pauline.client');
    await paulineSpeakText('This is a preview of the voice.', voiceId, false, false);
  }, []);

  const handleSpeedChange = React.useCallback((_event: Event, value: number | number[]) => {
    const newSpeed = typeof value === 'number' ? value : value[0];
    setPaulineSpeed(newSpeed);
  }, [setPaulineSpeed]);

  const handleTempoChange = React.useCallback((_event: Event, value: number | number[]) => {
    const newTempo = typeof value === 'number' ? value : value[0];
    setPaulineTempo(newTempo);
  }, [setPaulineTempo]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      <Typography level='title-sm'>
        ABOV3 Pauline Configuration
      </Typography>

      <Typography level='body-sm'>
        ABOV3 Pauline is a self-hosted, high-quality TTS solution. Deploy the Pauline Docker container and configure the endpoint below.
      </Typography>

      {/* Service Endpoint */}
      <FormControl>
        <FormLabelStart title='Service Endpoint' />
        <Input
          variant='outlined'
          value={paulineEndpoint}
          onChange={handleEndpointChange}
          placeholder='http://localhost:8080'
        />
        <FormHelperText>
          {capability.isConfiguredServerSide
            ? `Server-side endpoint configured${capability.mayWork ? ' ✓' : ''}`
            : 'Enter the URL of your ABOV3 Pauline service'}
        </FormHelperText>
      </FormControl>

      {/* Voice Selection */}
      <FormControl>
        <FormLabelStart title='Voice' />
        <Select
          value={paulineVoiceId}
          onChange={handleVoiceChange}
          placeholder='Select a voice'
          disabled={voicesLoading}
        >
          {voicesData?.voices.map((voice) => (
            <Option key={voice.id} value={voice.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Box>
                  <Typography level='title-sm'>{voice.name}</Typography>
                  <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                    {voice.description}
                  </Typography>
                </Box>
                <Button
                  size='sm'
                  variant='plain'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestVoice(voice.id);
                  }}
                  disabled={!capability.mayWork}
                  sx={{ ml: 2 }}
                >
                  Preview
                </Button>
              </Box>
            </Option>
          ))}
        </Select>
        <FormHelperText>
          {voicesLoading ? 'Loading voices...' : `${voicesData?.voices.length || 0} voices available`}
        </FormHelperText>
      </FormControl>

      {/* Speech Tempo (client-side, changes pitch) */}
      <FormControl>
        <FormLabelStart title='Speech Tempo' />
        <Box sx={{ px: 1 }}>
          <Slider
            value={paulineTempo}
            onChange={handleTempoChange}
            min={0.75}
            max={1.25}
            step={0.05}
            marks={[
              { value: 0.75, label: '0.75x' },
              { value: 0.95, label: '0.95x' },
              { value: 1.0, label: '1.0x' },
              { value: 1.25, label: '1.25x' },
            ]}
            valueLabelDisplay='auto'
            valueLabelFormat={(value) => `${value.toFixed(2)}x`}
          />
        </Box>
        <FormHelperText>
          Adjust speech tempo (client-side, multiplies with playback speed). Default: 0.95x for calm delivery
        </FormHelperText>
      </FormControl>

      {/* Playback Speed (client-side, changes pitch) */}
      <FormControl>
        <FormLabelStart title='Playback Speed' />
        <Box sx={{ px: 1 }}>
          <Slider
            value={paulineSpeed}
            onChange={handleSpeedChange}
            min={0.5}
            max={2.0}
            step={0.05}
            marks={[
              { value: 0.5, label: '0.5x' },
              { value: 1.0, label: '1.0x' },
              { value: 1.5, label: '1.5x' },
              { value: 2.0, label: '2.0x' },
            ]}
            valueLabelDisplay='auto'
            valueLabelFormat={(value) => `${value.toFixed(2)}x`}
          />
        </Box>
        <FormHelperText>
          Adjust playback speed (client-side, multiplies with tempo). Note: Changes pitch. Default: 1.0x
        </FormHelperText>
      </FormControl>

      {/* Status */}
      <FormControl>
        <FormLabel>Status</FormLabel>
        <Typography level='body-sm' color={capability.mayWork ? 'success' : 'warning'}>
          {capability.mayWork ? '✓ ABOV3 Pauline is ready' : '⚠ ABOV3 Pauline not configured or service unavailable'}
        </Typography>
      </FormControl>

      {/* Test Button */}
      <Box>
        <Button
          variant='outlined'
          color='primary'
          onClick={handleTestTTS}
          disabled={!capability.mayWork}
        >
          Test ABOV3 Pauline TTS
        </Button>
      </Box>

      {/* Deployment Instructions */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.level1', borderRadius: 'sm' }}>
        <Typography level='title-sm' sx={{ mb: 1 }}>
          Quick Setup
        </Typography>
        <Typography level='body-xs' component='pre' sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`# Deploy ABOV3 Pauline with Docker
docker-compose -f docker-compose.pauline.yml up -d

# Test the service
curl http://localhost:8004/api/ui/initial-data

# Configure endpoint above and click Test`}
        </Typography>
      </Box>

    </Box>
  );
}
