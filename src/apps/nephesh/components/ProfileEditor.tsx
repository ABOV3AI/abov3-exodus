'use client';

/**
 * ProfileEditor - Modal for creating/editing agent profiles
 */

import * as React from 'react';

import {
  Box, Button, Checkbox, FormControl, FormHelperText, FormLabel,
  Input, Modal, ModalClose, ModalDialog, Select, Option, Sheet,
  Stack, Textarea, Typography,
} from '@mui/joy';
import SaveIcon from '@mui/icons-material/Save';

import { apiQuery } from '~/common/util/trpc.client';
import { nepheshActions, useNepheshUI } from '../store-nephesh';
import { useVisibleLLMs } from '~/common/stores/llms/llms.hooks';


export function ProfileEditor() {

  const { isEditorOpen, editorProfileId } = useNepheshUI();

  // Load existing profile if editing
  const { data: existingProfile } = apiQuery.nephesh.getProfile.useQuery(
    { profileId: editorProfileId || '' },
    { enabled: !!editorProfileId }
  );

  // Get available LLM models
  const llmModels = useVisibleLLMs(null);

  // Form state
  const [name, setName] = React.useState(existingProfile?.name || '');
  const [description, setDescription] = React.useState(existingProfile?.description || '');
  const [systemMessage, setSystemMessage] = React.useState(
    existingProfile?.systemMessage || 'You are a helpful AI assistant.'
  );
  const [llmId, setLlmId] = React.useState(existingProfile?.llmId || '');
  const [temperature, setTemperature] = React.useState(existingProfile?.temperature || 0.7);
  const [maxTokens, setMaxTokens] = React.useState(existingProfile?.maxTokens || 2048);
  const [memoryEnabled, setMemoryEnabled] = React.useState(existingProfile?.memoryEnabled !== false);
  const [memoryMaxItems, setMemoryMaxItems] = React.useState(existingProfile?.memoryMaxItems || 1000);

  // Tool permissions
  const [fileOps, setFileOps] = React.useState(existingProfile?.enabledTools?.fileOps || false);
  const [web, setWeb] = React.useState(existingProfile?.enabledTools?.web !== false);
  const [codeExec, setCodeExec] = React.useState(existingProfile?.enabledTools?.codeExec || false);
  const [mcp, setMcp] = React.useState(existingProfile?.enabledTools?.mcp || false);

  // Mutations
  const createMutation = apiQuery.nephesh.createProfile.useMutation();
  const updateMutation = apiQuery.nephesh.updateProfile.useMutation();

  // Set default LLM if not set
  React.useEffect(() => {
    if (!llmId && llmModels.length > 0) {
      setLlmId(llmModels[0].id);
    }
  }, [llmId, llmModels]);

  // Handle close
  const handleClose = React.useCallback(() => {
    nepheshActions.closeEditor();
  }, []);

  // Handle save
  const handleSave = React.useCallback(async () => {
    try {
      if (editorProfileId) {
        // Update existing
        await updateMutation.mutateAsync({
          profileId: editorProfileId,
          updates: {
            name,
            description,
            systemMessage,
            llmId,
            temperature,
            maxTokens,
            memoryEnabled,
            memoryMaxItems,
            enabledTools: {
              fileOps,
              web,
              codeExec,
              mcp,
              customTools: [],
            },
          },
        });
        // React Query will automatically invalidate and refetch
      } else {
        // Create new
        const created = await createMutation.mutateAsync({
          name,
          description,
          systemMessage,
          llmId,
          temperature,
          maxTokens,
          enabledSkills: [],
          enabledTools: {
            fileOps,
            web,
            codeExec,
            mcp,
            customTools: [],
          },
          memoryEnabled,
          memoryMaxItems,
          channelBindings: {},
          tier: 'FREE',
        });
        // Select the newly created profile
        nepheshActions.setSelectedProfile(created.id);
      }
      handleClose();
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to save profile'}`);
    }
  }, [
    editorProfileId, name, description, systemMessage, llmId, temperature, maxTokens,
    memoryEnabled, memoryMaxItems, fileOps, web, codeExec, mcp,
    createMutation, updateMutation, handleClose,
  ]);

  const isValid = name.trim().length > 0 && systemMessage.trim().length > 0 && llmId;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={isEditorOpen} onClose={handleClose}>
      <ModalDialog
        sx={{
          maxWidth: 700,
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <ModalClose />
        <Typography level='h4' sx={{ mb: 2 }}>
          {editorProfileId ? 'Edit Profile' : 'New Profile'}
        </Typography>

        <Stack spacing={2}>
          {/* Name */}
          <FormControl required>
            <FormLabel>Profile Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='My Assistant'
            />
          </FormControl>

          {/* Description */}
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Optional description'
            />
          </FormControl>

          {/* System Message */}
          <FormControl required>
            <FormLabel>System Message</FormLabel>
            <Textarea
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              minRows={4}
              maxRows={10}
              placeholder='You are a helpful AI assistant...'
            />
            <FormHelperText>Define the agent&apos;s personality and behavior</FormHelperText>
          </FormControl>

          {/* Model */}
          <FormControl required>
            <FormLabel>Language Model</FormLabel>
            <Select
              value={llmId}
              onChange={(_, value) => value && setLlmId(value)}
            >
              {llmModels.map((model) => (
                <Option key={model.id} value={model.id}>
                  {model.label}
                </Option>
              ))}
            </Select>
          </FormControl>

          {/* Temperature & Max Tokens */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormControl>
              <FormLabel>Temperature</FormLabel>
              <Input
                type='number'
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                slotProps={{ input: { min: 0, max: 2, step: 0.1 } }}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Max Tokens</FormLabel>
              <Input
                type='number'
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                slotProps={{ input: { min: 100, max: 32000, step: 100 } }}
              />
            </FormControl>
          </Box>

          {/* Tool Permissions */}
          <FormControl>
            <FormLabel>Tool Permissions</FormLabel>
            <Sheet variant='soft' sx={{ p: 2, borderRadius: 'sm' }}>
              <Stack spacing={1}>
                <Checkbox
                  label='File Operations'
                  checked={fileOps}
                  onChange={(e) => setFileOps(e.target.checked)}
                />
                <Checkbox
                  label='Web Access'
                  checked={web}
                  onChange={(e) => setWeb(e.target.checked)}
                />
                <Checkbox
                  label='Code Execution'
                  checked={codeExec}
                  onChange={(e) => setCodeExec(e.target.checked)}
                />
                <Checkbox
                  label='MCP Tools'
                  checked={mcp}
                  onChange={(e) => setMcp(e.target.checked)}
                />
              </Stack>
            </Sheet>
          </FormControl>

          {/* Memory */}
          <FormControl>
            <Checkbox
              label='Enable Memory'
              checked={memoryEnabled}
              onChange={(e) => setMemoryEnabled(e.target.checked)}
            />
            {memoryEnabled && (
              <Input
                type='number'
                value={memoryMaxItems}
                onChange={(e) => setMemoryMaxItems(parseInt(e.target.value))}
                slotProps={{ input: { min: 100, max: 10000, step: 100 } }}
                sx={{ mt: 1, ml: 3 }}
                startDecorator={<Typography level='body-sm'>Max items:</Typography>}
              />
            )}
          </FormControl>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant='plain' onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant='solid'
              color='primary'
              startDecorator={<SaveIcon />}
              onClick={handleSave}
              disabled={!isValid}
              loading={isPending}
            >
              Save
            </Button>
          </Box>
        </Stack>
      </ModalDialog>
    </Modal>
  );
}
