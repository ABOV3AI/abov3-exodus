import * as React from 'react';
import { Menu, MenuItem, ListItemDecorator, Divider } from '@mui/joy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import RefreshIcon from '@mui/icons-material/Refresh';

export interface FileContextMenuProps {
  open: boolean;
  anchorPosition: { top: number; left: number } | null;
  onClose: () => void;
  itemType: 'file' | 'directory';
  itemName: string;
  onEdit?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onRefresh?: () => void;
  readOnly?: boolean;
}

/**
 * Context menu for file operations
 * Shows different options based on whether the item is a file or directory
 */
export function FileContextMenu(props: FileContextMenuProps) {
  const {
    open,
    anchorPosition,
    onClose,
    itemType,
    onEdit,
    onRename,
    onDelete,
    onNewFile,
    onNewFolder,
    onRefresh,
    readOnly = false,
  } = props;

  const handleEdit = () => {
    onEdit?.();
    onClose();
  };

  const handleRename = () => {
    onRename?.();
    onClose();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  const handleNewFile = () => {
    onNewFile?.();
    onClose();
  };

  const handleNewFolder = () => {
    onNewFolder?.();
    onClose();
  };

  const handleRefresh = () => {
    onRefresh?.();
    onClose();
  };

  if (!anchorPosition) return null;

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorEl={null}
      slotProps={{
        root: {
          style: anchorPosition
            ? {
                position: 'fixed',
                top: anchorPosition.top,
                left: anchorPosition.left,
              }
            : undefined,
        },
      }}
      sx={{ zIndex: 1300 }}
    >
      {/* File-specific actions */}
      {itemType === 'file' && !readOnly && onEdit && (
        <MenuItem onClick={handleEdit}>
          <ListItemDecorator>
            <EditIcon />
          </ListItemDecorator>
          Edit
        </MenuItem>
      )}

      {/* Directory-specific actions */}
      {itemType === 'directory' && !readOnly && (
        <>
          {onNewFile && (
            <MenuItem onClick={handleNewFile}>
              <ListItemDecorator>
                <NoteAddIcon />
              </ListItemDecorator>
              New File
            </MenuItem>
          )}
          {onNewFolder && (
            <MenuItem onClick={handleNewFolder}>
              <ListItemDecorator>
                <CreateNewFolderIcon />
              </ListItemDecorator>
              New Folder
            </MenuItem>
          )}
          {(onNewFile || onNewFolder) && <Divider />}
        </>
      )}

      {/* Common actions */}
      {!readOnly && onRename && (
        <MenuItem onClick={handleRename}>
          <ListItemDecorator>
            <DriveFileRenameOutlineIcon />
          </ListItemDecorator>
          Rename
        </MenuItem>
      )}

      {!readOnly && onDelete && (
        <MenuItem onClick={handleDelete} color="danger">
          <ListItemDecorator>
            <DeleteIcon />
          </ListItemDecorator>
          Delete
        </MenuItem>
      )}

      {/* Refresh option for directories */}
      {itemType === 'directory' && onRefresh && (
        <>
          {!readOnly && (onRename || onDelete) && <Divider />}
          <MenuItem onClick={handleRefresh}>
            <ListItemDecorator>
              <RefreshIcon />
            </ListItemDecorator>
            Refresh
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
