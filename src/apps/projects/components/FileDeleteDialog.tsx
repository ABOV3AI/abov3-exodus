import * as React from 'react';
import { Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/joy';
import WarningIcon from '@mui/icons-material/Warning';

export interface FileDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: 'file' | 'directory';
  isFolder: boolean;
}

/**
 * Confirmation dialog for delete operations
 * Shows appropriate warning based on whether deleting a file or folder
 */
export function FileDeleteDialog(props: FileDeleteDialogProps) {
  const { open, onClose, onConfirm, itemName, itemType, isFolder } = props;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog variant="outlined" role="alertdialog">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Delete {itemType === 'directory' ? 'Folder' : 'File'}?
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography level="body-md" sx={{ mb: 1 }}>
            Are you sure you want to delete:
          </Typography>
          <Typography level="title-md" sx={{ fontWeight: 'bold', mb: 2 }}>
            {itemName}
          </Typography>

          {isFolder && (
            <Typography level="body-sm" color="warning" sx={{ fontStyle: 'italic' }}>
              ⚠️ This folder and all its contents will be permanently deleted.
            </Typography>
          )}

          <Typography level="body-sm" color="danger" sx={{ mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button variant="plain" color="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" color="danger" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
}
