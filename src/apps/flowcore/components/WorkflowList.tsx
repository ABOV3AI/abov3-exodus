import * as React from 'react';
import { Box, Button, Input, List, ListItem, ListItemButton, ListItemContent, Typography, Sheet, IconButton, Modal, ModalDialog, ModalClose, Divider } from '@mui/joy';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

import { useFlowCoreStore } from '../store-flowcore';

export function WorkflowList() {
  const { workflows, currentWorkflowId, createWorkflow, selectWorkflow, deleteWorkflow } = useFlowCoreStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const handleCreateWorkflow = () => {
    const name = `Workflow ${workflows.length + 1}`;
    createWorkflow(name);
  };

  const handleDeleteClick = (e: React.MouseEvent, workflowId: string) => {
    e.stopPropagation(); // Prevent selecting the workflow
    setDeleteConfirmId(workflowId);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      deleteWorkflow(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const filteredWorkflows = workflows.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Sheet
      sx={{
        width: 280,
        borderRight: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography level='title-lg' sx={{ mb: 1.5 }}>
          FlowCore
        </Typography>

        {/* Search */}
        <Input
          placeholder='Search workflows...'
          startDecorator={<SearchRoundedIcon />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size='sm'
          sx={{ mb: 1.5 }}
        />

        {/* New Workflow Button */}
        <Button
          startDecorator={<AddRoundedIcon />}
          fullWidth
          onClick={handleCreateWorkflow}
          size='sm'
        >
          New Workflow
        </Button>
      </Box>

      {/* Workflow List */}
      <List sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {filteredWorkflows.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
              {searchTerm ? 'No workflows found' : 'No workflows yet'}
            </Typography>
          </Box>
        ) : (
          filteredWorkflows.map((workflow) => (
            <ListItem
              key={workflow.id}
              endAction={
                <IconButton
                  size='sm'
                  variant='plain'
                  color='danger'
                  onClick={(e) => handleDeleteClick(e, workflow.id)}
                  sx={{
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '.MuiListItem-root:hover &': { opacity: 1 },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemButton
                selected={workflow.id === currentWorkflowId}
                onClick={() => selectWorkflow(workflow.id)}
                sx={{ borderRadius: 'sm' }}
              >
                <ListItemContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {workflow.isActive ? (
                      <CheckCircleRoundedIcon sx={{ fontSize: '1rem', color: 'success.500' }} />
                    ) : (
                      <RadioButtonUncheckedRoundedIcon sx={{ fontSize: '1rem', color: 'neutral.400' }} />
                    )}
                    <Typography level='title-sm' noWrap>
                      {workflow.name}
                    </Typography>
                  </Box>
                  <Typography level='body-xs' sx={{ color: 'text.secondary' }}>
                    {workflow.lastRun
                      ? `Last run: ${formatRelativeTime(workflow.lastRun)}`
                      : 'Never run'}
                  </Typography>
                </ListItemContent>
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>

      {/* Delete Confirmation Dialog */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
        <ModalDialog variant='outlined' color='danger'>
          <ModalClose />
          <Typography level='h4' startDecorator={<WarningRoundedIcon />}>
            Delete Workflow
          </Typography>
          <Divider />
          <Typography level='body-md'>
            Are you sure you want to delete <strong>{workflows.find(w => w.id === deleteConfirmId)?.name}</strong>?
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            This action cannot be undone. All workflow data including execution history will be permanently deleted.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant='plain' color='neutral' onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant='solid' color='danger' onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Sheet>
  );
}

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
