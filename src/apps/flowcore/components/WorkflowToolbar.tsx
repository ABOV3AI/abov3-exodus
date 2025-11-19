import * as React from 'react';
import { Box, Button, IconButton, Input, Typography } from '@mui/joy';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';

import { useFlowCoreStore } from '../store-flowcore';

export function WorkflowToolbar() {
  const { currentWorkflowId, workflows, updateWorkflowName, saveCurrentWorkflow, runWorkflow } = useFlowCoreStore();

  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState(currentWorkflow?.name || '');

  React.useEffect(() => {
    if (currentWorkflow) {
      setEditedName(currentWorkflow.name);
    }
  }, [currentWorkflow]);

  const handleNameSave = () => {
    if (currentWorkflowId && editedName.trim()) {
      updateWorkflowName(currentWorkflowId, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleRun = () => {
    if (currentWorkflowId) {
      runWorkflow(currentWorkflowId);
    }
  };

  if (!currentWorkflow) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography level='h4'>FlowCore</Typography>
        <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
          Select or create a workflow to get started
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      {/* Workflow Name */}
      {isEditingName ? (
        <Input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onBlur={handleNameSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNameSave();
            if (e.key === 'Escape') setIsEditingName(false);
          }}
          autoFocus
          sx={{ flex: 1, maxWidth: 400 }}
        />
      ) : (
        <Typography
          level='h4'
          onClick={() => setIsEditingName(true)}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          {currentWorkflow.name}
        </Typography>
      )}

      <Box sx={{ flex: 1 }} />

      {/* Run Button */}
      <Button
        startDecorator={<PlayArrowRoundedIcon />}
        color='primary'
        onClick={handleRun}
      >
        Run
      </Button>

      {/* Save Button */}
      <Button
        startDecorator={<SaveRoundedIcon />}
        variant='outlined'
        onClick={saveCurrentWorkflow}
      >
        Save
      </Button>

      {/* More Menu */}
      <IconButton variant='plain'>
        <MoreVertRoundedIcon />
      </IconButton>
    </Box>
  );
}
