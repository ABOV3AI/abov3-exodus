/**
 * Training Data Preview Component
 *
 * Shows a preview of generated training samples during and after training.
 */

import * as React from 'react';

import {
  Accordion,
  AccordionDetails,
  AccordionGroup,
  AccordionSummary,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Input,
  Modal,
  ModalClose,
  ModalDialog,
  Sheet,
  Stack,
  Typography,
} from '@mui/joy';
import DatasetIcon from '@mui/icons-material/Dataset';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';

import { trainingActions } from '../store-training';
import type { DatasetSample, TrainingDataset } from '../training.types';


function SampleCard(props: { sample: DatasetSample; index: number; expanded?: boolean }) {
  const { sample, index, expanded = false } = props;
  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const instruction = sample.metadata?.instruction || 'No instruction';
  const inputPreview = sample.input.length > 100 ? sample.input.substring(0, 100) + '...' : sample.input;
  const outputPreview = sample.output.length > 150 ? sample.output.substring(0, 150) + '...' : sample.output;

  return (
    <Card variant='outlined' sx={{ mb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          p: 1.5,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Chip size='sm' variant='soft' color='neutral'>#{index + 1}</Chip>
          <Typography level='body-sm' sx={{ fontWeight: 'md' }}>
            {inputPreview || 'Empty input'}
          </Typography>
        </Box>
        <IconButton size='sm' variant='plain'>
          <ExpandMoreIcon
            sx={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </IconButton>
      </Box>

      {isExpanded && (
        <>
          <Divider />
          <Stack spacing={2} sx={{ p: 2 }}>
            {/* Instruction */}
            <Box>
              <Typography level='body-xs' fontWeight='lg' color='neutral' sx={{ mb: 0.5 }}>
                INSTRUCTION
              </Typography>
              <Sheet variant='soft' sx={{ p: 1.5, borderRadius: 'sm' }}>
                <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap' }}>
                  {instruction}
                </Typography>
              </Sheet>
            </Box>

            {/* Input */}
            <Box>
              <Typography level='body-xs' fontWeight='lg' color='primary' sx={{ mb: 0.5 }}>
                INPUT
              </Typography>
              <Sheet variant='soft' color='primary' sx={{ p: 1.5, borderRadius: 'sm' }}>
                <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap' }}>
                  {sample.input || '(empty)'}
                </Typography>
              </Sheet>
            </Box>

            {/* Output */}
            <Box>
              <Typography level='body-xs' fontWeight='lg' color='success' sx={{ mb: 0.5 }}>
                OUTPUT
              </Typography>
              <Sheet variant='soft' color='success' sx={{ p: 1.5, borderRadius: 'sm', maxHeight: 300, overflow: 'auto' }}>
                <Typography level='body-sm' sx={{ whiteSpace: 'pre-wrap' }}>
                  {sample.output}
                </Typography>
              </Sheet>
            </Box>

            {/* Metadata */}
            {sample.metadata && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {sample.metadata.teacherModelId && (
                  <Chip size='sm' variant='outlined'>Model: {sample.metadata.teacherModelId}</Chip>
                )}
                {sample.metadata.temperature !== undefined && (
                  <Chip size='sm' variant='outlined'>Temp: {sample.metadata.temperature}</Chip>
                )}
                {sample.metadata.generatedAt && (
                  <Chip size='sm' variant='outlined'>
                    {new Date(sample.metadata.generatedAt).toLocaleTimeString()}
                  </Chip>
                )}
              </Box>
            )}
          </Stack>
        </>
      )}
    </Card>
  );
}


function DatasetViewerModal(props: {
  open: boolean;
  onClose: () => void;
  dataset: TrainingDataset | null;
}) {
  const { open, onClose, dataset } = props;
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandAll, setExpandAll] = React.useState(false);

  // Moved useMemo before early return to follow React hooks rules
  const filteredSamples = React.useMemo(() => {
    if (!dataset) return [];
    if (!searchQuery.trim()) return dataset.samples;
    const query = searchQuery.toLowerCase();
    return dataset.samples.filter(s =>
      s.input.toLowerCase().includes(query) ||
      s.output.toLowerCase().includes(query) ||
      s.metadata?.instruction?.toLowerCase().includes(query)
    );
  }, [dataset, searchQuery]);

  if (!dataset) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        layout='fullscreen'
        sx={{ p: 0 }}
      >
        {/* Header */}
        <Box sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <DatasetIcon />
            <Box>
              <Typography level='title-lg'>{dataset.name}</Typography>
              <Typography level='body-sm' color='neutral'>
                {dataset.samples.length} samples | {(dataset.sizeBytes / 1024).toFixed(1)} KB
              </Typography>
            </Box>
          </Box>
          <ModalClose />
        </Box>

        {/* Toolbar */}
        <Box sx={{
          p: 2,
          display: 'flex',
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Input
            placeholder='Search samples...'
            startDecorator={<SearchIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
          />
          <Button
            variant='outlined'
            size='sm'
            onClick={() => setExpandAll(!expandAll)}
          >
            {expandAll ? 'Collapse All' : 'Expand All'}
          </Button>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {filteredSamples.length === 0 ? (
            <Typography level='body-sm' color='neutral' sx={{ textAlign: 'center', py: 4 }}>
              {searchQuery ? 'No samples match your search.' : 'No samples available.'}
            </Typography>
          ) : (
            filteredSamples.map((sample, index) => (
              <SampleCard
                key={sample.id}
                sample={sample}
                index={index}
                expanded={expandAll}
              />
            ))
          )}
        </Box>
      </ModalDialog>
    </Modal>
  );
}


export function TrainingDataPreview(props: { jobId: string }) {
  const { jobId } = props;
  const [viewerOpen, setViewerOpen] = React.useState(false);

  // Get dataset for this job
  const dataset = React.useMemo(() => {
    return trainingActions.getDatasetByJobId(jobId);
  }, [jobId]);

  // Re-render when datasets change
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    // Poll for dataset updates during generation
    const interval = setInterval(() => {
      const newDataset = trainingActions.getDatasetByJobId(jobId);
      if (newDataset !== dataset) {
        forceUpdate();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId, dataset]);

  if (!dataset || dataset.samples.length === 0) {
    return null;
  }

  const previewSamples = dataset.samples.slice(0, 3); // Show first 3 samples in preview

  return (
    <Card variant='outlined'>
      <Box sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DatasetIcon color='primary' />
          <Box>
            <Typography level='title-md'>Training Data Preview</Typography>
            <Typography level='body-xs' color='neutral'>
              {dataset.samples.length} samples generated
            </Typography>
          </Box>
        </Box>
        <Button
          variant='soft'
          size='sm'
          startDecorator={<OpenInFullIcon />}
          onClick={() => setViewerOpen(true)}
        >
          View All
        </Button>
      </Box>

      <Divider />

      <Box sx={{ p: 1 }}>
        {previewSamples.map((sample, index) => (
          <SampleCard key={sample.id} sample={sample} index={index} />
        ))}
        {dataset.samples.length > 3 && (
          <Typography level='body-xs' color='neutral' sx={{ textAlign: 'center', py: 1 }}>
            + {dataset.samples.length - 3} more samples
          </Typography>
        )}
      </Box>

      {/* Full Dataset Viewer Modal */}
      <DatasetViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        dataset={dataset}
      />
    </Card>
  );
}
