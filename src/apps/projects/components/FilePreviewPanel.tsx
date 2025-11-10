import * as React from 'react';
import { Box, Typography, Sheet, CircularProgress, IconButton, Button } from '@mui/joy';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import EditIcon from '@mui/icons-material/Edit';

import type { FileEntry } from './ProjectFileTree';
import { FileEditor } from './FileEditor';


interface FilePreviewPanelProps {
  file: FileEntry | null;
  onClose: () => void;
  readOnly?: boolean;
}

export function FilePreviewPanel({ file, onClose, readOnly = false }: FilePreviewPanelProps) {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editMode, setEditMode] = React.useState(false);

  React.useEffect(() => {
    if (!file || file.kind !== 'file') {
      setContent(null);
      setError(null);
      return;
    }

    const loadFileContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const fileHandle = file.handle as FileSystemFileHandle;
        const fileObj = await fileHandle.getFile();

        // Check file size (limit to 1MB for preview)
        if (fileObj.size > 1024 * 1024) {
          setError('File too large for preview (max 1MB)');
          setLoading(false);
          return;
        }

        // Try to read as text
        const text = await fileObj.text();
        setContent(text);
      } catch (err: any) {
        setError(err.message || 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFileContent();
  }, [file]);

  if (!file) {
    return null;
  }

  // If in edit mode, show editor
  if (editMode) {
    return (
      <FileEditor
        file={file}
        onClose={() => {
          setEditMode(false);
          onClose();
        }}
      />
    );
  }

  // Otherwise show preview
  return (
    <Sheet
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'sm',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.level1',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
          <InsertDriveFileIcon fontSize="small" />
          <Typography
            level="title-sm"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {file.name}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!readOnly && (
            <Button
              size="sm"
              variant="outlined"
              color="primary"
              startDecorator={<EditIcon />}
              onClick={() => setEditMode(true)}
            >
              Edit
            </Button>
          )}
          <IconButton size="sm" variant="plain" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography level="body-sm" color="danger">
            {error}
          </Typography>
        ) : (
          <Typography
            component="pre"
            level="body-sm"
            sx={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {content}
          </Typography>
        )}
      </Box>
    </Sheet>
  );
}
