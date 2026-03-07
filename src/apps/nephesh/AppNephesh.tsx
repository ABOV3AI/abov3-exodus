'use client';

/**
 * Nephesh App - Autonomous AI Agent System
 *
 * Main application component for managing AI agent profiles,
 * background jobs, skills, and vector memory.
 */

import * as React from 'react';

import { Box, Button, Sheet, Tab, TabList, TabPanel, Tabs, Typography } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import ExtensionIcon from '@mui/icons-material/Extension';
import MemoryIcon from '@mui/icons-material/Memory';

import { OptimaDrawerIn } from '~/common/layout/optima/portals/OptimaPortalsIn';

import { ProfilesDrawer } from './components/layout-drawer/ProfilesDrawer';
import { ProfilesView } from './components/ProfilesView';
import { JobsView } from './components/JobsView';
import { SkillsMarketplace } from './components/SkillsMarketplace';
import { MemoryBrowser } from './components/MemoryBrowser';
import { ProfileEditor } from './components/ProfileEditor';
import { nepheshActions, useNepheshUI } from './store-nephesh';


export function AppNephesh() {

  // State from store
  const { viewMode, isEditorOpen } = useNepheshUI();

  // Handle tab change
  const handleTabChange = React.useCallback((_event: React.SyntheticEvent | null, newValue: string | number | null) => {
    if (newValue === 'profiles') {
      nepheshActions.setViewMode('profiles');
    } else if (newValue === 'jobs') {
      nepheshActions.setViewMode('jobs');
    } else if (newValue === 'skills') {
      nepheshActions.setViewMode('skills');
    } else if (newValue === 'memory') {
      nepheshActions.setViewMode('memory');
    }
  }, []);

  // Handle creating a new profile
  const handleNewProfile = React.useCallback(() => {
    nepheshActions.openEditor(null);
  }, []);

  return <>

    {/* Drawer content for profile list */}
    <OptimaDrawerIn>
      <ProfilesDrawer />
    </OptimaDrawerIn>

    {/* Main content area */}
    <Box sx={{
      flexGrow: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <Sheet
        variant='soft'
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Diversity3Icon sx={{ fontSize: 28, color: 'primary.solidBg' }} />
            <Typography level='h4'>
              Nephesh
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', ml: 1 }}>
              Autonomous AI Agents
            </Typography>
          </Box>

          <Button
            variant='soft'
            color='primary'
            startDecorator={<AddIcon />}
            onClick={handleNewProfile}
          >
            New Profile
          </Button>
        </Box>
      </Sheet>

      {/* Tabs */}
      <Tabs
        value={viewMode}
        onChange={handleTabChange}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <TabList
          sx={{
            px: { xs: 2, md: 3 },
            pt: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            bgcolor: 'background.surface',
            zIndex: 1,
          }}
        >
          <Tab value='profiles' sx={{ gap: 1 }}>
            <Diversity3Icon sx={{ fontSize: 18 }} />
            Profiles
          </Tab>
          <Tab value='jobs' sx={{ gap: 1 }}>
            <WorkHistoryIcon sx={{ fontSize: 18 }} />
            Jobs
          </Tab>
          <Tab value='skills' sx={{ gap: 1 }}>
            <ExtensionIcon sx={{ fontSize: 18 }} />
            Skills
          </Tab>
          <Tab value='memory' sx={{ gap: 1 }}>
            <MemoryIcon sx={{ fontSize: 18 }} />
            Memory
          </Tab>
        </TabList>

        {/* Tab Panels */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <TabPanel value='profiles' sx={{ p: 0 }}>
            <ProfilesView />
          </TabPanel>

          <TabPanel value='jobs' sx={{ p: 0 }}>
            <JobsView />
          </TabPanel>

          <TabPanel value='skills' sx={{ p: 0 }}>
            <SkillsMarketplace />
          </TabPanel>

          <TabPanel value='memory' sx={{ p: 0 }}>
            <MemoryBrowser />
          </TabPanel>
        </Box>
      </Tabs>
    </Box>

    {/* Profile Editor Modal */}
    {isEditorOpen && (
      <ProfileEditor />
    )}
  </>;
}
