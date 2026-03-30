'use client';

/**
 * ProfilesDrawer - Drawer content showing list of profiles
 */

import * as React from 'react';

import { Box, Button, Chip, List, ListItem, ListItemButton, ListItemContent, ListItemDecorator, Typography } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';

import { nepheshActions, useNepheshUI } from '../../store-nephesh';
import { apiQueryCloud } from '~/common/util/trpc.client';


export function ProfilesDrawer() {

  // State
  const { selectedProfileId } = useNepheshUI();

  // Fetch profiles from server
  const { data: profiles, isLoading } = apiQueryCloud.nephesh.listProfiles.useQuery(undefined);

  // Use empty array as fallback
  const displayProfiles = profiles || [];

  // Handle profile selection
  const handleSelectProfile = React.useCallback((profileId: string) => {
    nepheshActions.setSelectedProfile(profileId);
    nepheshActions.setViewMode('profiles');
  }, []);

  // Handle new profile
  const handleNewProfile = React.useCallback(() => {
    nepheshActions.openEditor(null);
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>

      {/* Header */}
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography level='title-lg' sx={{ mb: 1 }}>
          Agent Profiles
        </Typography>
        <Button
          fullWidth
          variant='soft'
          color='primary'
          startDecorator={<AddIcon />}
          onClick={handleNewProfile}
        >
          New Profile
        </Button>
      </Box>

      {/* Profiles List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', px: 1 }}>
        {isLoading && (
          <Typography level='body-sm' sx={{ textAlign: 'center', py: 4, color: 'text.tertiary' }}>
            Loading profiles...
          </Typography>
        )}

        {!isLoading && displayProfiles.length === 0 && (
          <Typography level='body-sm' sx={{ textAlign: 'center', py: 4, color: 'text.tertiary' }}>
            No profiles yet. Create one to get started!
          </Typography>
        )}

        {!isLoading && displayProfiles.length > 0 && (
          <List sx={{ gap: 0.5 }}>
            {displayProfiles.map((profile: any) => (
              <ListItem key={profile.id}>
                <ListItemButton
                  selected={selectedProfileId === profile.id}
                  onClick={() => handleSelectProfile(profile.id)}
                  sx={{ borderRadius: 'sm' }}
                >
                  <ListItemDecorator>
                    <SmartToyIcon />
                  </ListItemDecorator>
                  <ListItemContent>
                    <Typography level='title-sm'>{profile.name}</Typography>
                    {profile.description && (
                      <Typography level='body-xs' sx={{ color: 'text.tertiary' }}>
                        {profile.description}
                      </Typography>
                    )}
                  </ListItemContent>
                  {profile.enabled ? (
                    <CheckCircleIcon sx={{ fontSize: 16, color: 'success.500' }} />
                  ) : (
                    <PauseCircleIcon sx={{ fontSize: 16, color: 'neutral.400' }} />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Footer with tier info */}
      <Box sx={{ px: 2, pb: 2, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
        <Typography level='body-xs' sx={{ color: 'text.tertiary', textAlign: 'center' }}>
          {displayProfiles.length} / {displayProfiles[0]?.tier === 'COMMERCIAL' ? '10' : displayProfiles[0]?.tier === 'ENTERPRISE' ? '50' : '1'} profiles
        </Typography>
        <Chip size='sm' variant='soft' color='primary' sx={{ mt: 1, width: '100%' }}>
          {displayProfiles[0]?.tier || 'FREE'} Tier
        </Chip>
      </Box>
    </Box>
  );
}
