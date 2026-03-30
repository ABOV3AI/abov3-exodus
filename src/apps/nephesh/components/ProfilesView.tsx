'use client';

/**
 * ProfilesView - Main view showing selected profile details
 */

import * as React from 'react';

import { Box, Button, Card, CardContent, Chip, Sheet, Stack, Typography } from '@mui/joy';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DeleteIcon from '@mui/icons-material/Delete';

import { nepheshActions, useNepheshUI } from '../store-nephesh';
import { apiQueryCloud } from '~/common/util/trpc.client';


export function ProfilesView() {

  const { selectedProfileId } = useNepheshUI();

  // Fetch the selected profile
  const { data: selectedProfile } = apiQueryCloud.nephesh.getProfile.useQuery(
    { profileId: selectedProfileId || '' },
    { enabled: !!selectedProfileId }
  );

  // Toggle mutation
  const toggleMutation = apiQueryCloud.nephesh.toggleProfile.useMutation();

  // Delete mutation
  const deleteMutation = apiQueryCloud.nephesh.deleteProfile.useMutation();

  // Get profile stats
  const { data: stats } = apiQueryCloud.nephesh.getProfileStats.useQuery(
    { profileId: selectedProfile?.id || '' },
    {
      enabled: !!selectedProfile?.id,
    }
  );

  // Handle toggle enabled/disabled
  const handleToggle = React.useCallback(async () => {
    if (!selectedProfile) return;
    await toggleMutation.mutateAsync({
      profileId: selectedProfile.id,
      enabled: !selectedProfile.enabled,
    });
    // React Query will automatically invalidate and refetch
  }, [selectedProfile, toggleMutation]);

  // Handle edit
  const handleEdit = React.useCallback(() => {
    if (!selectedProfile) return;
    nepheshActions.openEditor(selectedProfile.id);
  }, [selectedProfile]);

  // Handle delete
  const handleDelete = React.useCallback(async () => {
    if (!selectedProfile) return;
    if (!confirm(`Delete profile "${selectedProfile.name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync({ profileId: selectedProfile.id });
    // Clear selection if this profile was selected
    nepheshActions.setSelectedProfile(null);
  }, [selectedProfile, deleteMutation]);

  if (!selectedProfile) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography level='body-lg' sx={{ color: 'text.tertiary' }}>
          Select a profile from the sidebar to view details
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack spacing={3}>

        {/* Profile Header */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography level='h4'>{selectedProfile.name}</Typography>
                {selectedProfile.description && (
                  <Typography level='body-sm' sx={{ color: 'text.tertiary', mt: 0.5 }}>
                    {selectedProfile.description}
                  </Typography>
                )}
              </Box>
              <Stack direction='row' spacing={1}>
                <Button
                  size='sm'
                  variant='soft'
                  color={selectedProfile.enabled ? 'warning' : 'success'}
                  startDecorator={selectedProfile.enabled ? <PauseIcon /> : <PlayArrowIcon />}
                  onClick={handleToggle}
                  loading={toggleMutation.isPending}
                >
                  {selectedProfile.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  size='sm'
                  variant='soft'
                  startDecorator={<EditIcon />}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
                <Button
                  size='sm'
                  variant='soft'
                  color='danger'
                  startDecorator={<DeleteIcon />}
                  onClick={handleDelete}
                  loading={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </Stack>
            </Box>

            <Stack direction='row' spacing={1}>
              <Chip size='sm' variant='soft' color={selectedProfile.enabled ? 'success' : 'neutral'}>
                {selectedProfile.enabled ? 'Enabled' : 'Disabled'}
              </Chip>
              <Chip size='sm' variant='soft'>{selectedProfile.tier}</Chip>
            </Stack>
          </CardContent>
        </Card>

        {/* Stats */}
        {stats && (
          <Card>
            <CardContent>
              <Typography level='title-md' sx={{ mb: 2 }}>Statistics</Typography>
              <Stack direction='row' spacing={3}>
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Total Jobs</Typography>
                  <Typography level='h4'>{stats.totalJobs}</Typography>
                </Box>
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Completed</Typography>
                  <Typography level='h4' sx={{ color: 'success.500' }}>{stats.completedJobs}</Typography>
                </Box>
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Failed</Typography>
                  <Typography level='h4' sx={{ color: 'danger.500' }}>{stats.failedJobs}</Typography>
                </Box>
                <Box>
                  <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Total Tokens</Typography>
                  <Typography level='h4'>{stats.totalTokens.toLocaleString()}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Configuration */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>Configuration</Typography>
            <Stack spacing={1.5}>
              <Box>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Model</Typography>
                <Typography level='body-sm'>{selectedProfile.llmId}</Typography>
              </Box>
              <Box>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Temperature</Typography>
                <Typography level='body-sm'>{selectedProfile.temperature}</Typography>
              </Box>
              <Box>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Max Tokens</Typography>
                <Typography level='body-sm'>{selectedProfile.maxTokens}</Typography>
              </Box>
              <Box>
                <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>Memory Enabled</Typography>
                <Typography level='body-sm'>{selectedProfile.memoryEnabled ? 'Yes' : 'No'}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* System Message */}
        <Card>
          <CardContent>
            <Typography level='title-md' sx={{ mb: 2 }}>System Message</Typography>
            <Sheet variant='soft' sx={{ p: 2, borderRadius: 'sm' }}>
              <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85em' }}>
                {selectedProfile.systemMessage}
              </Typography>
            </Sheet>
          </CardContent>
        </Card>

      </Stack>
    </Box>
  );
}
