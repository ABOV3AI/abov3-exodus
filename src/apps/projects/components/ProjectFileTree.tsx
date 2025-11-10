import * as React from 'react';
import { Box, IconButton, List, ListItem, ListItemButton, Typography, CircularProgress, Input, Snackbar } from '@mui/joy';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { FileContextMenu } from './FileContextMenu';
import { FileDeleteDialog } from './FileDeleteDialog';
import {
  deleteFileOrDirectory,
  renameFile,
  renameDirectory,
  validateFileName,
  createFile,
  createDirectory,
} from '~/modules/fileops/fileops.ui-operations';


interface FileEntry {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
}

interface FileTreeNodeProps {
  entry: FileEntry;
  depth: number;
  onFileClick?: (file: FileEntry) => void;
  onFileEdit?: (file: FileEntry) => void;
  parentHandle?: FileSystemDirectoryHandle;
  onRefresh?: () => void;
  readOnly?: boolean;
}

function FileTreeNode({ entry, depth, onFileClick, onFileEdit, parentHandle, onRefresh, readOnly = false }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [children, setChildren] = React.useState<FileEntry[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [newName, setNewName] = React.useState(entry.name);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const [notification, setNotification] = React.useState<{ message: string; color: 'success' | 'danger' } | null>(null);

  const loadChildren = async () => {
    if (entry.kind !== 'directory') return;

    setLoading(true);
    try {
      const dirHandle = entry.handle as FileSystemDirectoryHandle;
      const entries: FileEntry[] = [];

      for await (const [name, handle] of dirHandle.entries()) {
        // Skip hidden files and common ignored directories
        if (name.startsWith('.') || name === 'node_modules' || name === '__pycache__') {
          continue;
        }

        entries.push({
          name,
          path: `${entry.path}/${name}`,
          kind: handle.kind,
          handle: handle as FileSystemFileHandle | FileSystemDirectoryHandle,
        });
      }

      // Sort: directories first, then files, alphabetically
      entries.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
      });

      setChildren(entries);
    } catch (error) {
      console.error('Failed to load directory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!isExpanded && children.length === 0) {
      await loadChildren();
    }
    setIsExpanded(!isExpanded);
  };

  const handleClick = () => {
    if (isRenaming) return; // Don't trigger click while renaming
    if (entry.kind === 'file') {
      onFileClick?.(entry);
    } else {
      handleToggle();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!readOnly) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleEdit = () => {
    if (entry.kind === 'file') {
      onFileEdit?.(entry);
    }
  };

  const handleRename = () => {
    setIsRenaming(true);
    setNewName(entry.name);
  };

  const confirmRename = async () => {
    if (!parentHandle) {
      setNotification({ message: 'Cannot rename root directory', color: 'danger' });
      setIsRenaming(false);
      return;
    }

    const validation = validateFileName(newName);
    if (!validation.valid) {
      setNotification({ message: validation.error || 'Invalid name', color: 'danger' });
      return;
    }

    if (newName === entry.name) {
      setIsRenaming(false);
      return;
    }

    try {
      const result = entry.kind === 'file'
        ? await renameFile(parentHandle, entry.name, newName)
        : await renameDirectory(parentHandle, entry.name, newName);

      if (result.success) {
        setNotification({ message: `Renamed to "${newName}"`, color: 'success' });
        setIsRenaming(false);
        onRefresh?.();
      } else {
        setNotification({ message: result.error || 'Rename failed', color: 'danger' });
      }
    } catch (error) {
      setNotification({ message: 'Rename failed', color: 'danger' });
    }
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setNewName(entry.name);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!parentHandle) {
      setNotification({ message: 'Cannot delete root directory', color: 'danger' });
      return;
    }

    try {
      const result = await deleteFileOrDirectory(
        parentHandle,
        entry.name,
        entry.kind === 'directory' // recursive for directories
      );

      if (result.success) {
        setNotification({ message: `Deleted "${entry.name}"`, color: 'success' });
        onRefresh?.();
      } else {
        setNotification({ message: result.error || 'Delete failed', color: 'danger' });
      }
    } catch (error) {
      setNotification({ message: 'Delete failed', color: 'danger' });
    }
  };

  const handleNewFile = async () => {
    if (entry.kind !== 'directory') return;

    const fileName = prompt('Enter file name:');
    if (!fileName) return;

    const validation = validateFileName(fileName);
    if (!validation.valid) {
      setNotification({ message: validation.error || 'Invalid name', color: 'danger' });
      return;
    }

    const dirHandle = entry.handle as FileSystemDirectoryHandle;
    const result = await createFile(dirHandle, fileName);

    if (result.success) {
      setNotification({ message: `Created "${fileName}"`, color: 'success' });
      // Reload children
      setChildren([]);
      setIsExpanded(false);
      await handleToggle();
    } else {
      setNotification({ message: result.error || 'Failed to create file', color: 'danger' });
    }
  };

  const handleNewFolder = async () => {
    if (entry.kind !== 'directory') return;

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    const validation = validateFileName(folderName);
    if (!validation.valid) {
      setNotification({ message: validation.error || 'Invalid name', color: 'danger' });
      return;
    }

    const dirHandle = entry.handle as FileSystemDirectoryHandle;
    const result = await createDirectory(dirHandle, folderName);

    if (result.success) {
      setNotification({ message: `Created "${folderName}"`, color: 'success' });
      // Reload children
      setChildren([]);
      setIsExpanded(false);
      await handleToggle();
    } else {
      setNotification({ message: result.error || 'Failed to create folder', color: 'danger' });
    }
  };

  const handleRefreshNode = async () => {
    if (entry.kind === 'directory') {
      setChildren([]);
      setIsExpanded(false);
      await handleToggle();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  return (
    <>
      <ListItem
        sx={{ py: 0 }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <ListItemButton
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          sx={{
            py: 0.75,
            pl: depth * 2,
            pr: 1,
            gap: 0.75,
            minHeight: 32,
            '&:hover': {
              bgcolor: 'neutral.softHoverBg',
            },
          }}
        >
          {/* Expand/collapse icon (directories only) */}
          {entry.kind === 'directory' && !isRenaming && (
            <IconButton
              size="sm"
              variant="plain"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            >
              {loading ? (
                <CircularProgress size="sm" thickness={2} />
              ) : isExpanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          )}

          {/* File/folder icon */}
          {!isRenaming && (
            entry.kind === 'directory' ? (
              isExpanded ? (
                <FolderOpenIcon fontSize="small" sx={{ color: 'primary.500' }} />
              ) : (
                <FolderIcon fontSize="small" sx={{ color: 'neutral.500' }} />
              )
            ) : (
              <InsertDriveFileIcon fontSize="small" sx={{ color: 'neutral.400' }} />
            )
          )}

          {/* Name or rename input */}
          {isRenaming ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={confirmRename}
              autoFocus
              size="sm"
              sx={{ flex: 1, minWidth: 0 }}
            />
          ) : (
            <Typography
              level="body-sm"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {entry.name}
            </Typography>
          )}

          {/* Hover action buttons */}
          {hovering && !isRenaming && !readOnly && (
            <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
              {entry.kind === 'file' && onFileEdit && (
                <IconButton
                  size="sm"
                  variant="plain"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit();
                  }}
                  sx={{ minWidth: 24, minHeight: 24, p: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="sm"
                variant="plain"
                color="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                sx={{ minWidth: 24, minHeight: 24, p: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </ListItemButton>
      </ListItem>

      {/* Context Menu */}
      <FileContextMenu
        open={Boolean(contextMenu)}
        anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : null}
        onClose={() => setContextMenu(null)}
        itemType={entry.kind}
        itemName={entry.name}
        onEdit={entry.kind === 'file' ? handleEdit : undefined}
        onRename={handleRename}
        onDelete={handleDelete}
        onNewFile={entry.kind === 'directory' ? handleNewFile : undefined}
        onNewFolder={entry.kind === 'directory' ? handleNewFolder : undefined}
        onRefresh={entry.kind === 'directory' ? handleRefreshNode : undefined}
        readOnly={readOnly}
      />

      {/* Delete Confirmation Dialog */}
      <FileDeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        itemName={entry.name}
        itemType={entry.kind}
        isFolder={entry.kind === 'directory'}
      />

      {/* Notification Snackbar */}
      {notification && (
        <Snackbar
          open={Boolean(notification)}
          autoHideDuration={3000}
          onClose={() => setNotification(null)}
          color={notification.color}
          variant="solid"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          {notification.message}
        </Snackbar>
      )}

      {/* Children (if directory is expanded) */}
      {isExpanded && entry.kind === 'directory' && children.map((child) => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          onFileClick={onFileClick}
          onFileEdit={onFileEdit}
          parentHandle={entry.handle as FileSystemDirectoryHandle}
          onRefresh={handleRefreshNode}
          readOnly={readOnly}
        />
      ))}
    </>
  );
}


interface ProjectFileTreeProps {
  projectHandle: FileSystemDirectoryHandle;
  onFileClick?: (file: FileEntry) => void;
  onFileEdit?: (file: FileEntry) => void;
  readOnly?: boolean;
}

export function ProjectFileTree({ projectHandle, onFileClick, onFileEdit, readOnly = false }: ProjectFileTreeProps) {
  const rootEntry: FileEntry = {
    name: projectHandle.name,
    path: projectHandle.name,
    kind: 'directory',
    handle: projectHandle,
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <List size="sm" sx={{ py: 0.5, px: 0 }}>
        <FileTreeNode
          entry={rootEntry}
          depth={0}
          onFileClick={onFileClick}
          onFileEdit={onFileEdit}
          readOnly={readOnly}
        />
      </List>
    </Box>
  );
}

export type { FileEntry };
