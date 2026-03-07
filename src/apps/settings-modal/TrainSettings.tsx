/**
 * Train Settings Component
 *
 * Configuration UI for the ABOV3 Training system including
 * Eden server settings and default training parameters.
 */

import * as React from 'react';

import { Box, Button, Chip, FormControl, FormHelperText, FormLabel, Input, Option, Select, Slider, Switch, Typography } from '@mui/joy';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import RefreshIcon from '@mui/icons-material/Refresh';

import { InlineError } from '~/common/components/InlineError';

import { useDefaultTrainingConfig, useEdenServer, trainingActions } from '~/apps/training/store-training';
import type { GGUFQuantization, TrainingType } from '~/apps/training/training.types';


/**
 * Eden Server Settings
 */
export function EdenServerSettings() {

  // Store state
  const { edenServerUrl, edenServerConnected } = useEdenServer();

  // Local state
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  // Test connection
  const handleTestConnection = React.useCallback(async () => {
    setTestingConnection(true);
    setConnectionError(null);

    try {
      // Try to fetch from the Eden server's capabilities endpoint
      const response = await fetch(`${edenServerUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'capabilities',
          params: {},
        }),
      });

      if (response.ok) {
        trainingActions.setEdenServerConnected(true);
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      trainingActions.setEdenServerConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setTestingConnection(false);
    }
  }, [edenServerUrl]);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>

      <Typography level='title-sm'>
        ABOV3 Eden Server
      </Typography>

      <Typography level='body-sm' color='neutral'>
        Eden is the local training server that handles model distillation and fine-tuning.
        It should be running on your machine before starting any training jobs.
      </Typography>

      <FormControl>
        <FormLabel>Eden Server URL</FormLabel>
        <Input
          placeholder='http://127.0.0.1:3100'
          value={edenServerUrl}
          onChange={e => trainingActions.setEdenServerUrl(e.target.value)}
        />
        <FormHelperText>
          Default: http://127.0.0.1:3100
        </FormHelperText>
      </FormControl>

      {/* Connection status and test button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          size='lg'
          variant='soft'
          color={edenServerConnected ? 'success' : 'neutral'}
          startDecorator={edenServerConnected ? <CloudIcon /> : <CloudOffIcon />}
        >
          {edenServerConnected ? 'Connected' : 'Not Connected'}
        </Chip>

        <Button
          variant='soft'
          color='primary'
          loading={testingConnection}
          startDecorator={<RefreshIcon />}
          onClick={handleTestConnection}
        >
          Test Connection
        </Button>
      </Box>

      {connectionError && (
        <InlineError error={connectionError} />
      )}

    </Box>
  );
}


/**
 * Default Training Configuration Settings
 */
export function TrainingDefaultSettings() {

  // Store state
  const defaultConfig = useDefaultTrainingConfig();

  // Update helpers
  const updateConfig = React.useCallback(<K extends keyof typeof defaultConfig>(key: K, value: typeof defaultConfig[K]) => {
    trainingActions.setDefaultConfig({ [key]: value });
  }, []);

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>

      <Typography level='title-sm'>
        Default Training Parameters
      </Typography>

      <Typography level='body-sm' color='neutral'>
        These defaults will be used when creating new training jobs.
        You can override them in the training wizard.
      </Typography>

      <FormControl>
        <FormLabel>Default Training Type</FormLabel>
        <Select
          value={defaultConfig.trainingType}
          onChange={(_e, value) => updateConfig('trainingType', value as TrainingType)}
        >
          <Option value='lora'>LoRA Adapter (Recommended)</Option>
          <Option value='distillation'>Full Distillation</Option>
          <Option value='full-finetune'>Full Fine-tune</Option>
        </Select>
      </FormControl>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <FormControl>
          <FormLabel>Default Epochs</FormLabel>
          <Slider
            value={defaultConfig.epochs}
            onChange={(_e, value) => updateConfig('epochs', value as number)}
            min={1}
            max={10}
            step={1}
            marks
            valueLabelDisplay='auto'
          />
        </FormControl>

        <FormControl>
          <FormLabel>Default Batch Size</FormLabel>
          <Select
            value={defaultConfig.batchSize}
            onChange={(_e, value) => updateConfig('batchSize', value as number)}
          >
            <Option value={1}>1</Option>
            <Option value={2}>2</Option>
            <Option value={4}>4 (Recommended)</Option>
            <Option value={8}>8</Option>
            <Option value={16}>16</Option>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <FormControl>
          <FormLabel>Default LoRA Rank</FormLabel>
          <Select
            value={defaultConfig.loraRank}
            onChange={(_e, value) => updateConfig('loraRank', value as number)}
          >
            <Option value={4}>4</Option>
            <Option value={8}>8 (Recommended)</Option>
            <Option value={16}>16</Option>
            <Option value={32}>32</Option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Default LoRA Alpha</FormLabel>
          <Select
            value={defaultConfig.loraAlpha}
            onChange={(_e, value) => updateConfig('loraAlpha', value as number)}
          >
            <Option value={8}>8</Option>
            <Option value={16}>16 (Recommended)</Option>
            <Option value={32}>32</Option>
          </Select>
        </FormControl>
      </Box>

      <FormControl>
        <FormLabel>Default Training Samples</FormLabel>
        <Slider
          value={defaultConfig.numSamples}
          onChange={(_e, value) => updateConfig('numSamples', value as number)}
          min={100}
          max={5000}
          step={100}
          marks={[
            { value: 100, label: '100' },
            { value: 1000, label: '1K' },
            { value: 2500, label: '2.5K' },
            { value: 5000, label: '5K' },
          ]}
          valueLabelDisplay='auto'
        />
      </FormControl>

    </Box>
  );
}


/**
 * Export Settings for trained models
 */
export function TrainingExportSettings() {

  // Store state
  const defaultConfig = useDefaultTrainingConfig();

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>

      <Typography level='title-sm'>
        Model Export Settings
      </Typography>

      <Typography level='body-sm' color='neutral'>
        Configure default output format and quantization for trained models.
      </Typography>

      <FormControl>
        <FormLabel>Default Quantization</FormLabel>
        <Select
          value={defaultConfig.quantization}
          onChange={(_e, value) => trainingActions.setDefaultConfig({ quantization: value as GGUFQuantization })}
        >
          <Option value='q4_0'>Q4_0 (Smallest, Fastest)</Option>
          <Option value='q4_1'>Q4_1</Option>
          <Option value='q5_0'>Q5_0</Option>
          <Option value='q5_1'>Q5_1</Option>
          <Option value='q8_0'>Q8_0 (Balanced)</Option>
          <Option value='f16'>F16 (High Quality)</Option>
        </Select>
        <FormHelperText>
          Lower quantization = smaller file size and faster inference, but slightly lower quality
        </FormHelperText>
      </FormControl>

      <FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormLabel>Auto-deploy to Ark-SLM</FormLabel>
          <Switch
            checked={defaultConfig.autoDeployToArk}
            onChange={e => trainingActions.setDefaultConfig({ autoDeployToArk: e.target.checked })}
          />
        </Box>
        <FormHelperText>
          Automatically deploy trained models to the local Ark-SLM server for immediate use
        </FormHelperText>
      </FormControl>

    </Box>
  );
}
