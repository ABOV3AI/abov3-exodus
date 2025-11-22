import * as React from 'react';
import { Box, Button, IconButton, Input, Typography, Dropdown, Menu, MenuButton, MenuItem, Modal, ModalDialog, ModalClose, Divider } from '@mui/joy';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningRoundedIcon from '@mui/icons-material/WarningRounded';

import { useFlowCoreStoreEnhanced } from '../store-flowcore-enhanced';
import { TemplateGallery } from './TemplateGallery';
import { ExportDialog, ImportDialog } from './ImportExportDialog';
import { ExecutionHistory } from './ExecutionHistory';

export function WorkflowToolbar() {
  const { currentWorkflowId, workflows, updateWorkflowName, saveCurrentWorkflow, deleteWorkflow, runWorkflow } = useFlowCoreStoreEnhanced();

  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState(currentWorkflow?.name || '');

  // Dialog states
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showExport, setShowExport] = React.useState(false);
  const [showImport, setShowImport] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

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

  const handleDeleteConfirm = () => {
    if (currentWorkflowId) {
      deleteWorkflow(currentWorkflowId);
      setShowDeleteConfirm(false);
    }
  };

  if (!currentWorkflow) {
    return (
      <>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography level='h4'>FlowCore</Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Select or create a workflow to get started
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            startDecorator={<AccountTreeRoundedIcon />}
            variant='outlined'
            onClick={() => setShowTemplates(true)}
          >
            Browse Templates
          </Button>
          <Button
            startDecorator={<UploadIcon />}
            variant='outlined'
            onClick={() => setShowImport(true)}
          >
            Import
          </Button>
        </Box>
        <TemplateGallery open={showTemplates} onClose={() => setShowTemplates(false)} />
        <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
      </>
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
      <Dropdown>
        <MenuButton
          slots={{ root: IconButton }}
          slotProps={{ root: { variant: 'plain' } }}
        >
          <MoreVertRoundedIcon />
        </MenuButton>
        <Menu>
          <MenuItem onClick={() => setShowHistory(true)}>
            <HistoryIcon sx={{ mr: 1 }} />
            Execution History
          </MenuItem>
          <MenuItem onClick={() => setShowTemplates(true)}>
            <AccountTreeRoundedIcon sx={{ mr: 1 }} />
            Browse Templates
          </MenuItem>
          <MenuItem onClick={() => setShowExport(true)}>
            <DownloadIcon sx={{ mr: 1 }} />
            Export Workflow
          </MenuItem>
          <MenuItem onClick={() => setShowImport(true)}>
            <UploadIcon sx={{ mr: 1 }} />
            Import Workflow
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setShowDeleteConfirm(true)} color='danger'>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Workflow
          </MenuItem>
        </Menu>
      </Dropdown>
      {/* Dialogs */}
      <TemplateGallery open={showTemplates} onClose={() => setShowTemplates(false)} />
      {currentWorkflowId && (
        <>
          <ExportDialog
            open={showExport}
            onClose={() => setShowExport(false)}
            workflowId={currentWorkflowId}
          />
          <ExecutionHistory
            open={showHistory}
            onClose={() => setShowHistory(false)}
            workflowId={currentWorkflowId}
          />
        </>
      )}
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />

      {/* Delete Confirmation Dialog */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <ModalDialog variant='outlined' color='danger'>
          <ModalClose />
          <Typography level='h4' startDecorator={<WarningRoundedIcon />}>
            Delete Workflow
          </Typography>
          <Divider />
          <Typography level='body-md'>
            Are you sure you want to delete <strong>{currentWorkflow?.name}</strong>?
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            This action cannot be undone. All workflow data including execution history will be permanently deleted.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
            <Button variant='plain' color='neutral' onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant='solid' color='danger' onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </Box>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
