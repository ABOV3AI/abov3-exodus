/**
 * Pollinations.ai Settings UI Component
 *
 * Configuration panel for Pollinations image generation settings.
 */

import * as React from 'react';

import { Box, FormControl, FormLabel, Option, Select, Switch, Typography } from '@mui/joy';

import { FormLabelStart } from '~/common/components/forms/FormLabelStart';

import {
  usePollinationsStore,
  POLLINATIONS_SIZE_PRESETS,
  POLLINATIONS_MODEL_INFO,
} from './store-module-pollinations';
import type { PollinationsModel } from './pollinationsGenerateImages';


export function PollinationsSettings() {

  // State from store
  const {
    model,
    width,
    height,
    nologo,
    enhance,
    setModel,
    setSize,
    setNologo,
    setEnhance,
  } = usePollinationsStore();

  // Find current size preset (or null if custom)
  const currentSizePreset = POLLINATIONS_SIZE_PRESETS.find(
    (p) => p.width === width && p.height === height
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Header */}
      <Box>
        <Typography level="title-md">
          Pollinations.ai
        </Typography>
        <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
          Free image generation - no API key required
        </Typography>
      </Box>

      {/* Model Selection */}
      <FormControl>
        <FormLabelStart title="Model" />
        <Select
          value={model}
          onChange={(_event, value) => value && setModel(value as PollinationsModel)}
          slotProps={{
            listbox: { sx: { maxHeight: '280px' } },
          }}
        >
          {(Object.keys(POLLINATIONS_MODEL_INFO) as PollinationsModel[]).map((modelKey) => (
            <Option key={modelKey} value={modelKey}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography level="body-sm">
                  {POLLINATIONS_MODEL_INFO[modelKey].label}
                </Typography>
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  {POLLINATIONS_MODEL_INFO[modelKey].description}
                </Typography>
              </Box>
            </Option>
          ))}
        </Select>
      </FormControl>

      {/* Size Selection */}
      <FormControl>
        <FormLabelStart title="Image Size" />
        <Select
          value={currentSizePreset ? `${width}x${height}` : 'custom'}
          onChange={(_event, value) => {
            if (!value || value === 'custom') return;
            const preset = POLLINATIONS_SIZE_PRESETS.find(
              (p) => `${p.width}x${p.height}` === value
            );
            if (preset) {
              setSize(preset.width, preset.height);
            }
          }}
        >
          {POLLINATIONS_SIZE_PRESETS.map((preset) => (
            <Option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
              {preset.label}
            </Option>
          ))}
        </Select>
      </FormControl>

      {/* Enhance Prompt */}
      <FormControl orientation="horizontal" sx={{ justifyContent: 'space-between' }}>
        <Box>
          <FormLabel>Enhance Prompt</FormLabel>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            AI will improve your prompt for better results
          </Typography>
        </Box>
        <Switch
          checked={enhance}
          onChange={(event) => setEnhance(event.target.checked)}
        />
      </FormControl>

      {/* No Logo */}
      <FormControl orientation="horizontal" sx={{ justifyContent: 'space-between' }}>
        <Box>
          <FormLabel>Remove Watermark</FormLabel>
          <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
            Generate images without Pollinations logo
          </Typography>
        </Box>
        <Switch
          checked={nologo}
          onChange={(event) => setNologo(event.target.checked)}
        />
      </FormControl>

      {/* Info */}
      <Typography level="body-xs" sx={{ color: 'text.tertiary', mt: 1 }}>
        Powered by Pollinations.ai - Free, open-source image generation.
        No account or API key required.
      </Typography>

    </Box>
  );
}
