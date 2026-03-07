/**
 * ABOV3 Training App
 *
 * Main application component for model training/distillation.
 * Provides a wizard interface for creating training jobs and
 * monitoring their progress.
 */

import * as React from 'react';

import { Box, Button, Container, Sheet, Tab, TabList, TabPanel, Tabs, Typography } from '@mui/joy';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SchoolIcon from '@mui/icons-material/School';

import { OptimaDrawerIn } from '~/common/layout/optima/portals/OptimaPortalsIn';

import { TrainingDrawer } from './components/TrainingDrawer';
import { TrainingHistory } from './components/TrainingHistory';
import { TrainingProgress } from './components/TrainingProgress';
import { TrainingWizard } from './components/TrainingWizard';
import { useActiveTrainingJob, useAutoCheckEdenConnection, useTrainingUI } from './store-training';
import { trainingActions } from './store-training';


export function AppTraining() {

  // State from store
  const { viewMode } = useTrainingUI();
  const { activeJob } = useActiveTrainingJob();

  // Automatically check Eden server connection on mount and periodically
  useAutoCheckEdenConnection();

  // Determine which tab is active
  const tabValue = React.useMemo(() => {
    if (viewMode === 'wizard') return 'wizard';
    if (viewMode === 'progress' && activeJob) return 'progress';
    if (viewMode === 'history') return 'history';
    return 'wizard';
  }, [viewMode, activeJob]);

  // Handle tab change
  const handleTabChange = React.useCallback((_event: React.SyntheticEvent | null, newValue: string | number | null) => {
    if (newValue === 'wizard') {
      trainingActions.setViewMode('wizard');
      trainingActions.setActiveJob(null);
    } else if (newValue === 'progress') {
      trainingActions.setViewMode('progress');
    } else if (newValue === 'history') {
      trainingActions.setViewMode('history');
    }
  }, []);

  // Handle creating a new training job
  const handleNewTraining = React.useCallback(() => {
    trainingActions.clearWizardDraft();
    trainingActions.setViewMode('wizard');
    trainingActions.setActiveJob(null);
  }, []);

  return <>

    {/* Drawer content for navigation/settings */}
    <OptimaDrawerIn>
      <TrainingDrawer />
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
            <SchoolIcon sx={{ fontSize: 28, color: 'primary.solidBg' }} />
            <Typography level='h4'>
              Model Training
            </Typography>
          </Box>

          <Button
            variant='soft'
            color='primary'
            startDecorator={<AddIcon />}
            onClick={handleNewTraining}
          >
            New Training
          </Button>
        </Box>
      </Sheet>

      {/* Tab navigation */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <TabList
          sx={{
            px: { xs: 2, md: 3 },
            pt: 1,
            gap: 1,
          }}
        >
          <Tab value='wizard' variant='plain'>
            <AddIcon sx={{ mr: 0.5 }} />
            Create
          </Tab>
          <Tab
            value='progress'
            variant='plain'
            disabled={!activeJob}
          >
            <PlayArrowIcon sx={{ mr: 0.5 }} />
            Progress
            {activeJob && activeJob.status !== 'completed' && activeJob.status !== 'error' && (
              <Box
                component='span'
                sx={{
                  ml: 1,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 'sm',
                  bgcolor: 'primary.softBg',
                  color: 'primary.softColor',
                  fontSize: 'xs',
                }}
              >
                {activeJob.progress}%
              </Box>
            )}
          </Tab>
          <Tab value='history' variant='plain'>
            <HistoryIcon sx={{ mr: 0.5 }} />
            History
          </Tab>
        </TabList>

        {/* Tab panels */}
        <TabPanel
          value='wizard'
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 0,
          }}
        >
          <Container maxWidth='md' sx={{ py: 3 }}>
            <TrainingWizard />
          </Container>
        </TabPanel>

        <TabPanel
          value='progress'
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 0,
          }}
        >
          <Container maxWidth='lg' sx={{ py: 3 }}>
            {activeJob ? (
              <TrainingProgress job={activeJob} />
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography level='body-lg' color='neutral'>
                  No active training job
                </Typography>
                <Button
                  variant='soft'
                  sx={{ mt: 2 }}
                  onClick={handleNewTraining}
                >
                  Start a New Training
                </Button>
              </Box>
            )}
          </Container>
        </TabPanel>

        <TabPanel
          value='history'
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 0,
          }}
        >
          <Container maxWidth='lg' sx={{ py: 3 }}>
            <TrainingHistory />
          </Container>
        </TabPanel>
      </Tabs>

    </Box>
  </>;
}
